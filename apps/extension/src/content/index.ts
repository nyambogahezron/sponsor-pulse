import STYLES from '../styles/content.css?inline';
import type { KeybindMap } from '../types/keybinds';
import { DEFAULT_KEYBINDS } from '../types/keybinds';
import type { LocalStorageSchema, SkipRule, UserPreferences } from '../types/storage';
import { DEFAULT_GLOBAL_SETTINGS, DEFAULT_USER_PREFERENCES } from '../types/storage';
import type {
  FetchSponsorsMessage,
  FetchSponsorsResponse,
  ServerSponsorSegment,
  SponsorSegment,
} from '../types/types';
import { applyColorsToDocument } from '../utils/colorUtils';
import { detectChannelId, getProfileForChannel } from '../utils/skipProfiles';
import { evaluateRules } from '../utils/skipRuleParser';
import {
  cacheSegmentsForVideo,
  setupThumbnailObserver,
  teardownThumbnailObserver,
} from '../utils/thumbnailLabels';

const LOG_PREFIX = '[SponsorPulse]';
const STYLE_ID = 'sp-styles';
const TOAST_ID = 'sp-toast';
const UPCOMING_BAR_ID = 'sp-upcoming-bar';

const PULSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" aria-hidden="true">
  <rect x="1"  y="7"  width="2" height="4"  rx="1" opacity="0.5"/>
  <rect x="4"  y="4"  width="2" height="10" rx="1" opacity="0.75"/>
  <rect x="7"  y="1"  width="2" height="16" rx="1"/>
  <rect x="10" y="4"  width="2" height="10" rx="1" opacity="0.75"/>
  <rect x="13" y="7"  width="2" height="4"  rx="1" opacity="0.5"/>
</svg>`;

let currentVideoId: string | null = null;
let currentVideoSegments: SponsorSegment[] = [];
let activeToastSegmentIndex: number | null = null;
let timeUpdateHandler: ((e: Event) => void) | null = null;
const skippedSegments: Set<number> = new Set();

let userPrefs: UserPreferences = { ...DEFAULT_USER_PREFERENCES };
let showNotification = DEFAULT_GLOBAL_SETTINGS.showNotification;
let noticeVisibilityMode = DEFAULT_GLOBAL_SETTINGS.noticeVisibilityMode;
let showUpcomingHint = DEFAULT_GLOBAL_SETTINGS.showUpcomingHint;
let upcomingHintSeconds = DEFAULT_GLOBAL_SETTINGS.upcomingHintSeconds;
let audioNotificationOnSkip = DEFAULT_GLOBAL_SETTINGS.audioNotificationOnSkip;
let minSegmentDuration = DEFAULT_GLOBAL_SETTINGS.minSegmentDuration;
let keybinds: KeybindMap = { ...DEFAULT_KEYBINDS };
let skipRules: SkipRule[] = [];
let isMuted = false;

function isWatchPage(): boolean {
  return window.location.pathname === '/watch';
}

function getVideoId(): string | null {
  return new URLSearchParams(window.location.search).get('v');
}

function ensureStylesInjected(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.appendChild(style);
}

function playSkipCue(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    // no-op: AudioContext unavailable
  }
}

function mapServerSegment(seg: ServerSponsorSegment): SponsorSegment {
  return {
    startTime: seg.start,
    endTime: seg.end,
    category: seg.category,
    confidence: 1.0,
    source: 'ai-server',
    actionType: 'skip',
  };
}

function resolveSegmentAction(
  segment: SponsorSegment,
  index: number,
): 'auto-skip' | 'mute' | 'show' | 'disabled' {
  if (skippedSegments.has(index)) return 'disabled';

  const ruleAction = evaluateRules(segment, skipRules);
  if (ruleAction === 'auto-skip') return 'auto-skip';
  if (ruleAction === 'mute') return 'mute';
  if (ruleAction === 'disabled') return 'disabled';
  if (ruleAction === 'manual') return 'show';

  const pref = userPrefs[segment.category];
  if (!pref) return 'disabled';
  if (pref.autoSkip) return 'auto-skip';
  if (pref.buttonAlerts) return 'show';
  return 'disabled';
}

async function requestSponsorsFromServer(videoId: string): Promise<SponsorSegment[]> {
  console.log(LOG_PREFIX, `Requesting segments for ${videoId}...`);
  const message: FetchSponsorsMessage = { action: 'FETCH_SPONSORS', videoId };

  try {
    const response: FetchSponsorsResponse = await chrome.runtime.sendMessage(message);

    if (response.error) {
      const { code, error } = response.error;
      if (code === 'NO_TRANSCRIPT') {
        console.log(LOG_PREFIX, 'Video has no transcript.');
        return [];
      }
      console.error(LOG_PREFIX, `[${code}] ${error}`);
      return [];
    }

    if (!response.segments) return [];
    return response.segments.map(mapServerSegment);
  } catch (error) {
    console.error(LOG_PREFIX, 'Failed to request sponsors:', error);
    return [];
  }
}

function waitForElement<T extends HTMLElement>(
  selector: string,
  timeoutMs = 8_000,
): Promise<T | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector<T>(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector<T>(selector);
      if (el) {
        observer.disconnect();
        clearTimeout(timer);
        resolve(el);
      }
    });

    const timer = window.setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function injectTimelineBlocks(): Promise<void> {
  const progressList = await waitForElement<HTMLElement>('.ytp-progress-list');
  if (!progressList) {
    console.warn(LOG_PREFIX, 'Could not find .ytp-progress-list.');
    return;
  }

  progressList.querySelectorAll('.sp-timeline-block').forEach((el) => {
    el.remove();
  });

  const video = document.querySelector('video');
  if (!video) return;

  const duration =
    video.duration ||
    (await new Promise<number>((resolve) => {
      if (video.readyState > 0) resolve(video.duration);
      else video.addEventListener('loadedmetadata', () => resolve(video.duration), { once: true });
    }));

  if (!duration || duration <= 0) return;

  currentVideoSegments.forEach((segment) => {
    const block = document.createElement('div');
    block.className = 'sp-timeline-block';
    block.setAttribute('data-sp-category', segment.category);
    if (segment.actionType === 'mute') block.setAttribute('data-sp-action', 'mute');

    const leftPercent = (segment.startTime / duration) * 100;
    const widthPercent = ((segment.endTime - segment.startTime) / duration) * 100;

    block.style.left = `${leftPercent}%`;
    block.style.width = `${widthPercent}%`;

    block.addEventListener('click', (e) => {
      e.stopPropagation();
      video.currentTime = segment.startTime;
    });

    progressList.appendChild(block);
  });
}

function showUpcomingBar(segment: SponsorSegment): void {
  const player =
    document.querySelector<HTMLElement>('#movie_player, .html5-video-player') ?? document.body;
  let bar = document.getElementById(UPCOMING_BAR_ID) as HTMLElement | null;

  if (!bar) {
    bar = document.createElement('div');
    bar.id = UPCOMING_BAR_ID;
    player.appendChild(bar);
  }

  bar.setAttribute('data-sp-category', segment.category);
  bar.classList.add('sp-upcoming-visible');
}

function hideUpcomingBar(): void {
  document.getElementById(UPCOMING_BAR_ID)?.classList.remove('sp-upcoming-visible');
}

function hideToast(): void {
  const toast = document.getElementById(TOAST_ID);
  if (toast) {
    toast.classList.remove('sp-toast-visible');
    activeToastSegmentIndex = null;
  }
}

function showToast(segment: SponsorSegment, index: number, video: HTMLVideoElement): void {
  if (activeToastSegmentIndex === index) return;

  let toast = document.getElementById(TOAST_ID);
  const player =
    document.querySelector<HTMLElement>('#movie_player, .html5-video-player') ?? document.body;

  if (!toast) {
    toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    player.appendChild(toast);
  }

  activeToastSegmentIndex = index;

  toast.className = '';
  if (noticeVisibilityMode === 'mini') toast.classList.add('sp-toast-mini');
  if (noticeVisibilityMode === 'faded') toast.classList.add('sp-toast-faded');

  const catLabel = segment.category.replace(/_/g, ' ');

  toast.innerHTML = `
    <div class="sp-toast-pulse-icon" aria-hidden="true">${PULSE_SVG}</div>
    <div class="sp-toast-content">
      <span class="sp-toast-title">${catLabel} detected</span>
      <span class="sp-toast-detail">Ends at ${formatTimestamp(segment.endTime)}</span>
    </div>
    <button class="sp-toast-skip-btn" aria-label="Skip ${catLabel} segment">Skip</button>
    <button class="sp-toast-dismiss-btn" aria-label="Mark segment as incorrect" title="Mark as wrong">✕</button>
  `;

  const skipBtn = toast.querySelector('.sp-toast-skip-btn') as HTMLButtonElement;
  skipBtn.addEventListener('click', () => {
    video.currentTime = segment.endTime;
    skippedSegments.add(index);
    hideToast();
  });

  const dismissBtn = toast.querySelector('.sp-toast-dismiss-btn') as HTMLButtonElement;
  dismissBtn.addEventListener('click', () => {
    skippedSegments.add(index);
    void persistDismissedSegment(segment);
    hideToast();
  });

  requestAnimationFrame(() => toast?.classList.add('sp-toast-visible'));
}

function segmentFingerprint(seg: SponsorSegment): string {
  return `${seg.startTime.toFixed(1)}-${seg.endTime.toFixed(1)}-${seg.category}`;
}

async function loadDismissedForVideo(videoId: string): Promise<Set<string>> {
  const { dismissedSegments = {} } = (await chrome.storage.local.get('dismissedSegments')) as {
    dismissedSegments: Record<string, string[]>;
  };
  return new Set(dismissedSegments[videoId] ?? []);
}

async function persistDismissedSegment(segment: SponsorSegment): Promise<void> {
  if (!currentVideoId) return;
  const { dismissedSegments = {} } = (await chrome.storage.local.get('dismissedSegments')) as {
    dismissedSegments: Record<string, string[]>;
  };
  const existing = dismissedSegments[currentVideoId] ?? [];
  const fp = segmentFingerprint(segment);
  if (!existing.includes(fp)) {
    dismissedSegments[currentVideoId] = [...existing, fp];
    await chrome.storage.local.set({ dismissedSegments });
  }
}

function muteVideo(video: HTMLVideoElement): void {
  if (!isMuted) {
    video.muted = true;
    isMuted = true;
  }
}

function unmuteVideo(video: HTMLVideoElement): void {
  if (isMuted) {
    video.muted = false;
    isMuted = false;
  }
}

function attachTimeUpdateListener(): void {
  const video = document.querySelector('video');
  if (!video) return;

  if (timeUpdateHandler) video.removeEventListener('timeupdate', timeUpdateHandler);

  timeUpdateHandler = () => {
    const currentTime = video.currentTime;
    let segmentToShow: { index: number; segment: SponsorSegment } | null = null;
    let inMuteSegment = false;

    for (let i = 0; i < currentVideoSegments.length; i++) {
      const segment = currentVideoSegments[i];
      const action = resolveSegmentAction(segment, i);
      if (action === 'disabled') continue;

      const inSegment = currentTime >= segment.startTime && currentTime < segment.endTime;

      if (inSegment) {
        if (action === 'auto-skip') {
          video.currentTime = segment.endTime;
          skippedSegments.add(i);
          hideToast();
          hideUpcomingBar();
          unmuteVideo(video);
          if (audioNotificationOnSkip) playSkipCue();
          continue;
        }

        if (action === 'mute') {
          muteVideo(video);
          inMuteSegment = true;
          continue;
        }

        if (segmentToShow === null) {
          segmentToShow = { index: i, segment };
        }
      }

      if (
        showUpcomingHint &&
        currentTime >= segment.startTime - upcomingHintSeconds &&
        currentTime < segment.startTime &&
        !skippedSegments.has(i)
      ) {
        showUpcomingBar(segment);
      }
    }

    if (!inMuteSegment) unmuteVideo(video);

    if (segmentToShow) {
      if (showNotification) showToast(segmentToShow.segment, segmentToShow.index, video);
    } else {
      hideToast();
    }
  };

  video.addEventListener('timeupdate', timeUpdateHandler);
}

let keybindListener: ((e: KeyboardEvent) => void) | null = null;

function attachKeybindListener(): void {
  if (keybindListener) document.removeEventListener('keydown', keybindListener);

  keybindListener = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      return;

    const video = document.querySelector('video');
    if (!video) return;

    const currentTime = video.currentTime;
    const key = e.key;

    if (key === keybinds.closeNotice) {
      hideToast();
      return;
    }

    const activeIdx = activeToastSegmentIndex;

    if (key === keybinds.skipSegment && activeIdx !== null) {
      const seg = currentVideoSegments[activeIdx];
      if (seg) {
        video.currentTime = seg.endTime;
        skippedSegments.add(activeIdx);
        hideToast();
      }
      return;
    }

    if (key === keybinds.skipToEnd && activeIdx !== null) {
      const seg = currentVideoSegments[activeIdx];
      if (seg) {
        video.currentTime = seg.endTime;
      }
      return;
    }

    if (key === keybinds.nextSegment) {
      const next = currentVideoSegments.find((s) => s.startTime > currentTime);
      if (next) video.currentTime = next.startTime;
      return;
    }

    if (key === keybinds.prevSegment) {
      const prev = [...currentVideoSegments].reverse().find((s) => s.startTime < currentTime - 2);
      if (prev) video.currentTime = prev.startTime;
      return;
    }
  };

  document.addEventListener('keydown', keybindListener);
}

async function handleNewVideo(): Promise<void> {
  if (!isWatchPage()) {
    teardownThumbnailObserver();
    setupThumbnailObserver();
    return;
  }

  teardownThumbnailObserver();

  const videoId = getVideoId();
  if (!videoId || videoId === currentVideoId) return;

  currentVideoId = videoId;
  currentVideoSegments = [];
  skippedSegments.clear();
  activeToastSegmentIndex = null;
  isMuted = false;
  hideToast();
  hideUpcomingBar();

  ensureStylesInjected();

  const result = (await chrome.storage.local.get([
    'userPreferences',
    'showNotification',
    'noticeVisibilityMode',
    'showUpcomingHint',
    'upcomingHintSeconds',
    'audioNotificationOnSkip',
    'minSegmentDuration',
    'keybinds',
    'categoryColors',
    'skipRules',
  ])) as Partial<LocalStorageSchema>;

  userPrefs = result.userPreferences ?? DEFAULT_USER_PREFERENCES;
  showNotification = result.showNotification ?? DEFAULT_GLOBAL_SETTINGS.showNotification;
  noticeVisibilityMode =
    result.noticeVisibilityMode ?? DEFAULT_GLOBAL_SETTINGS.noticeVisibilityMode;
  showUpcomingHint = result.showUpcomingHint ?? DEFAULT_GLOBAL_SETTINGS.showUpcomingHint;
  upcomingHintSeconds = result.upcomingHintSeconds ?? DEFAULT_GLOBAL_SETTINGS.upcomingHintSeconds;
  audioNotificationOnSkip =
    result.audioNotificationOnSkip ?? DEFAULT_GLOBAL_SETTINGS.audioNotificationOnSkip;
  minSegmentDuration = result.minSegmentDuration ?? DEFAULT_GLOBAL_SETTINGS.minSegmentDuration;
  keybinds = result.keybinds ?? DEFAULT_KEYBINDS;
  skipRules = result.skipRules ?? [];

  if (result.categoryColors) applyColorsToDocument(result.categoryColors);

  const channelId = detectChannelId();
  if (channelId) {
    const profile = await getProfileForChannel(channelId);
    if (profile) {
      userPrefs = profile.categoryPreferences;
      minSegmentDuration = profile.minSegmentDuration;
      console.log(LOG_PREFIX, `Applied profile "${profile.name}" for channel ${channelId}`);
    }
  }

  const dismissed = await loadDismissedForVideo(videoId);
  let segments = await requestSponsorsFromServer(videoId);

  if (minSegmentDuration > 0) {
    segments = segments.filter((s) => s.endTime - s.startTime >= minSegmentDuration);
  }

  segments = segments.filter((s) => !dismissed.has(segmentFingerprint(s)));
  currentVideoSegments = segments;
  cacheSegmentsForVideo(videoId, segments);

  if (currentVideoSegments.length > 0) {
    console.log(LOG_PREFIX, `Found ${currentVideoSegments.length} segments.`);
    void injectTimelineBlocks();
    attachTimeUpdateListener();
    attachKeybindListener();
  }
}

document.addEventListener('yt-navigate-finish', () => void handleNewVideo());
void handleNewVideo();
