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
import { partition } from '../utils/arrayUtils';
import { runtime, storage } from '../utils/browserApi';
import { applyColorsToDocument } from '../utils/colorUtils';
import { logDebug, logWarn } from '../utils/logger';
import { isMobileControlsOpen } from '../utils/mobileUtils';
import { cleanPage } from '../utils/pageCleaner';
import { getUrlStartTime, isInPreviewPlayer } from '../utils/pageUtils';
import { detectChannelId, getProfileForChannel } from '../utils/skipProfiles';
import { evaluateRules } from '../utils/skipRuleParser';
import {
  cacheSegmentsForVideo,
  setupThumbnailObserver,
  teardownThumbnailObserver,
} from '../utils/thumbnailLabels';

const INJECTED_STYLE_ID = 'sp-styles';
const TOAST_CONTAINER_ID = 'sp-toast';
const UPCOMING_HINT_BAR_ID = 'sp-upcoming-bar';

const PULSE_ANIMATION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" aria-hidden="true">
  <rect x="1"  y="7"  width="2" height="4"  rx="1" opacity="0.5"/>
  <rect x="4"  y="4"  width="2" height="10" rx="1" opacity="0.75"/>
  <rect x="7"  y="1"  width="2" height="16" rx="1"/>
  <rect x="10" y="4"  width="2" height="10" rx="1" opacity="0.75"/>
  <rect x="13" y="7"  width="2" height="4"  rx="1" opacity="0.5"/>
</svg>`;

let activeVideoId: string | null = null;
let activeVideoSegments: SponsorSegment[] = [];
let currentlyDisplayedToastSegmentIndex: number | null = null;
let playerTimeUpdateListener: ((event: Event) => void) | null = null;
const manuallySkippedSegmentIndices: Set<number> = new Set();

let activeUserPreferences: UserPreferences = { ...DEFAULT_USER_PREFERENCES };
let isNotificationEnabled = DEFAULT_GLOBAL_SETTINGS.showNotification;
let activeNoticeVisibilityMode = DEFAULT_GLOBAL_SETTINGS.noticeVisibilityMode;
let isUpcomingHintEnabled = DEFAULT_GLOBAL_SETTINGS.showUpcomingHint;
let upcomingHintDurationSeconds = DEFAULT_GLOBAL_SETTINGS.upcomingHintSeconds;
let isAudioNotificationEnabled = DEFAULT_GLOBAL_SETTINGS.audioNotificationOnSkip;
let globalMinSegmentDuration = DEFAULT_GLOBAL_SETTINGS.minSegmentDuration;
let activeKeybinds: KeybindMap = { ...DEFAULT_KEYBINDS };
let activeSkipRules: SkipRule[] = [];
let isVideoCurrentlyMutedByExtension = false;

function isCurrentPageWatchPage(): boolean {
  return window.location.pathname === '/watch';
}

function extractVideoIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('v');
}

function injectExtensionStyles(): void {
  if (document.getElementById(INJECTED_STYLE_ID)) return;
  const styleElement = document.createElement('style');
  styleElement.id = INJECTED_STYLE_ID;
  styleElement.textContent = STYLES;
  document.head.appendChild(styleElement);
}

function playSkipAudioCue(): void {
  try {
    const audioContext = new AudioContext();
    const oscillatorNode = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillatorNode.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillatorNode.type = 'sine';
    oscillatorNode.frequency.value = 880;

    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);

    oscillatorNode.start(audioContext.currentTime);
    oscillatorNode.stop(audioContext.currentTime + 0.08);
    oscillatorNode.onended = () => {
      void audioContext.close();
    };
  } catch {
    // AudioContext may be restricted by browser autoplay policies
  }
}

function parseServerSegmentToLocal(serverSegment: ServerSponsorSegment): SponsorSegment {
  return {
    uuid: serverSegment.uuid,
    startTime: serverSegment.start,
    endTime: serverSegment.end,
    category: serverSegment.category,
    confidence: 1.0,
    source: 'ai-server',
    actionType: 'skip',
  };
}

type ResolvedSegmentAction = 'auto-skip' | 'mute' | 'show' | 'disabled';

function determineSegmentAction(
  segment: SponsorSegment,
  segmentIndex: number,
): ResolvedSegmentAction {
  if (manuallySkippedSegmentIndices.has(segmentIndex)) return 'disabled';

  const evaluatedRuleAction = evaluateRules(segment, activeSkipRules);
  if (evaluatedRuleAction === 'auto-skip') return 'auto-skip';
  if (evaluatedRuleAction === 'mute') return 'mute';
  if (evaluatedRuleAction === 'disabled') return 'disabled';
  if (evaluatedRuleAction === 'manual') return 'show';

  const categoryPreference = activeUserPreferences[segment.category];
  if (!categoryPreference) return 'disabled';
  if (categoryPreference.autoSkip) return 'auto-skip';
  if (categoryPreference.buttonAlerts) return 'show';

  return 'disabled';
}

async function fetchVideoSegmentsFromServer(videoId: string): Promise<SponsorSegment[]> {
  const payload: FetchSponsorsMessage = { action: 'FETCH_SPONSORS', videoId };

  try {
    const response: FetchSponsorsResponse = await runtime.sendMessage(payload);

    if (response.error) {
      if (response.error.code === 'NO_TRANSCRIPT') {
        logDebug('Video has no transcript.');
        return [];
      }
      logWarn(`[${response.error.code}] ${response.error.error}`);
      return [];
    }

    if (!response.segments) return [];
    return response.segments.map(parseServerSegmentToLocal);
  } catch (networkError) {
    logWarn(`Failed to request sponsors: ${String(networkError)}`);
    return [];
  }
}

function awaitDOMElement<T extends HTMLElement>(
  selectorString: string,
  timeoutMilliseconds = 8_000,
): Promise<T | null> {
  return new Promise((resolveElement) => {
    const existingElement = document.querySelector<T>(selectorString);
    if (existingElement) {
      resolveElement(existingElement);
      return;
    }

    const domObserver = new MutationObserver(() => {
      const foundElement = document.querySelector<T>(selectorString);
      if (foundElement) {
        domObserver.disconnect();
        clearTimeout(timeoutTimer);
        resolveElement(foundElement);
      }
    });

    const timeoutTimer = window.setTimeout(() => {
      domObserver.disconnect();
      resolveElement(null);
    }, timeoutMilliseconds);

    domObserver.observe(document.documentElement, { childList: true, subtree: true });
  });
}

function formatSecondsToDisplayTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function injectTimelineBlocksIntoPlayer(): Promise<void> {
  const progressContainer = await awaitDOMElement<HTMLElement>('.ytp-progress-list');
  if (!progressContainer) {
    logWarn('Could not find .ytp-progress-list container.');
    return;
  }

  if (isInPreviewPlayer(progressContainer) || isMobileControlsOpen()) return;

  progressContainer.querySelectorAll('.sp-timeline-block').forEach((existingBlock) => {
    existingBlock.remove();
  });

  const videoElement = document.querySelector('video');
  if (!videoElement) return;

  const videoDuration =
    videoElement.duration ||
    (await new Promise<number>((resolveDuration) => {
      if (videoElement.readyState > 0) resolveDuration(videoElement.duration);
      else
        videoElement.addEventListener(
          'loadedmetadata',
          () => resolveDuration(videoElement.duration),
          { once: true },
        );
    }));

  if (!videoDuration || videoDuration <= 0) return;

  activeVideoSegments.forEach((segment) => {
    const timelineBlock = document.createElement('div');
    timelineBlock.className = 'sp-timeline-block';
    timelineBlock.setAttribute('data-sp-category', segment.category);

    if (segment.actionType === 'mute') {
      timelineBlock.setAttribute('data-sp-action', 'mute');
    }

    const startPercentage = (segment.startTime / videoDuration) * 100;
    const widthPercentage = ((segment.endTime - segment.startTime) / videoDuration) * 100;

    timelineBlock.style.left = `${startPercentage}%`;
    timelineBlock.style.width = `${widthPercentage}%`;

    timelineBlock.addEventListener('click', (mouseEvent) => {
      mouseEvent.stopPropagation();
      videoElement.currentTime = segment.startTime;
    });

    progressContainer.appendChild(timelineBlock);
  });
}

function renderUpcomingSegmentHint(segment: SponsorSegment): void {
  const playerContainer =
    document.querySelector<HTMLElement>('#movie_player, .html5-video-player') ?? document.body;
  let hintBarElement = document.getElementById(UPCOMING_HINT_BAR_ID) as HTMLElement | null;

  if (!hintBarElement) {
    hintBarElement = document.createElement('div');
    hintBarElement.id = UPCOMING_HINT_BAR_ID;
    playerContainer.appendChild(hintBarElement);
  }

  hintBarElement.setAttribute('data-sp-category', segment.category);
  hintBarElement.classList.add('sp-upcoming-visible');
}

function removeUpcomingSegmentHint(): void {
  document.getElementById(UPCOMING_HINT_BAR_ID)?.classList.remove('sp-upcoming-visible');
}

function removeNotificationToast(): void {
  const toastElement = document.getElementById(TOAST_CONTAINER_ID);
  if (toastElement) {
    toastElement.classList.remove('sp-toast-visible');
    currentlyDisplayedToastSegmentIndex = null;
  }
}

function renderNotificationToast(
  segment: SponsorSegment,
  segmentIndex: number,
  videoElement: HTMLVideoElement,
): void {
  if (currentlyDisplayedToastSegmentIndex === segmentIndex) return;

  let toastElement = document.getElementById(TOAST_CONTAINER_ID);
  const playerContainer =
    document.querySelector<HTMLElement>('#movie_player, .html5-video-player') ?? document.body;

  if (!toastElement) {
    toastElement = document.createElement('div');
    toastElement.id = TOAST_CONTAINER_ID;
    toastElement.setAttribute('role', 'status');
    toastElement.setAttribute('aria-live', 'polite');
    playerContainer.appendChild(toastElement);
  }

  currentlyDisplayedToastSegmentIndex = segmentIndex;
  toastElement.className = '';

  if (activeNoticeVisibilityMode === 'mini') {
    toastElement.classList.add('sp-toast-mini');
  } else if (activeNoticeVisibilityMode === 'faded') {
    toastElement.classList.add('sp-toast-faded');
  }

  const humanReadableCategoryLabel = segment.category.replace(/_/g, ' ');

  toastElement.innerHTML = `
    <div class="sp-toast-pulse-icon" aria-hidden="true">${PULSE_ANIMATION_SVG}</div>
    <div class="sp-toast-content">
      <span class="sp-toast-title">${humanReadableCategoryLabel} detected</span>
      <span class="sp-toast-detail">Ends at ${formatSecondsToDisplayTime(segment.endTime)}</span>
    </div>
    <button class="sp-toast-skip-btn" aria-label="Skip ${humanReadableCategoryLabel} segment">Skip</button>
    <button class="sp-toast-dismiss-btn" aria-label="Mark segment as incorrect" title="Mark as wrong">✕</button>
  `;

  const skipButton = toastElement.querySelector('.sp-toast-skip-btn') as HTMLButtonElement;
  skipButton.addEventListener('click', () => {
    executeAutoSkip(videoElement, segment, segmentIndex);
  });

  const dismissButton = toastElement.querySelector('.sp-toast-dismiss-btn') as HTMLButtonElement;
  dismissButton.addEventListener('click', () => {
    manuallySkippedSegmentIndices.add(segmentIndex);
    void saveDismissedSegmentToStorage(segment);
    removeNotificationToast();
  });

  requestAnimationFrame(() => toastElement?.classList.add('sp-toast-visible'));
}

function generateSegmentFingerprint(segment: SponsorSegment): string {
  return `${segment.startTime.toFixed(1)}-${segment.endTime.toFixed(1)}-${segment.category}`;
}

async function fetchDismissedSegmentsFromStorage(videoId: string): Promise<Set<string>> {
  const storageData = (await storage.local.get('dismissedSegments')) as {
    dismissedSegments?: Record<string, string[]>;
  };
  const dismissedMap = storageData.dismissedSegments ?? {};
  return new Set(dismissedMap[videoId] ?? []);
}

async function saveDismissedSegmentToStorage(segment: SponsorSegment): Promise<void> {
  if (!activeVideoId) return;
  const storageData = (await storage.local.get('dismissedSegments')) as {
    dismissedSegments?: Record<string, string[]>;
  };
  const dismissedMap = storageData.dismissedSegments ?? {};
  const existingVideoDismissals = dismissedMap[activeVideoId] ?? [];
  const segmentFingerprint = generateSegmentFingerprint(segment);

  if (!existingVideoDismissals.includes(segmentFingerprint)) {
    dismissedMap[activeVideoId] = [...existingVideoDismissals, segmentFingerprint];
    await storage.local.set({ dismissedSegments: dismissedMap });
  }
}

function muteVideoPlayback(videoElement: HTMLVideoElement): void {
  if (!isVideoCurrentlyMutedByExtension) {
    videoElement.muted = true;
    isVideoCurrentlyMutedByExtension = true;
  }
}

function unmuteVideoPlayback(videoElement: HTMLVideoElement): void {
  if (isVideoCurrentlyMutedByExtension) {
    videoElement.muted = false;
    isVideoCurrentlyMutedByExtension = false;
  }
}

function executeAutoSkip(
  videoElement: HTMLVideoElement,
  segment: SponsorSegment,
  segmentIndex: number,
): void {
  videoElement.currentTime = segment.endTime;
  manuallySkippedSegmentIndices.add(segmentIndex);
  removeNotificationToast();
  removeUpcomingSegmentHint();
  unmuteVideoPlayback(videoElement);
  if (isAudioNotificationEnabled) playSkipAudioCue();
}

function createTimeUpdateHandler(videoElement: HTMLVideoElement): () => void {
  return () => {
    const currentPlaybackTime = videoElement.currentTime;
    let highestPriorityToastSegment: { index: number; segment: SponsorSegment } | null = null;
    let isPlaybackCurrentlyInsideMutedSegment = false;

    for (let segmentIndex = 0; segmentIndex < activeVideoSegments.length; segmentIndex++) {
      const segment = activeVideoSegments[segmentIndex];
      const actionToTake = determineSegmentAction(segment, segmentIndex);

      if (actionToTake === 'disabled') continue;

      const isInsideSegmentBoundaries =
        currentPlaybackTime >= segment.startTime && currentPlaybackTime < segment.endTime;

      if (isInsideSegmentBoundaries) {
        if (actionToTake === 'auto-skip') {
          executeAutoSkip(videoElement, segment, segmentIndex);
          continue;
        }

        if (actionToTake === 'mute') {
          muteVideoPlayback(videoElement);
          isPlaybackCurrentlyInsideMutedSegment = true;
          continue;
        }

        if (highestPriorityToastSegment === null) {
          highestPriorityToastSegment = { index: segmentIndex, segment };
        }
      }

      const isInsideUpcomingHintWindow =
        isUpcomingHintEnabled &&
        currentPlaybackTime >= segment.startTime - upcomingHintDurationSeconds &&
        currentPlaybackTime < segment.startTime &&
        !manuallySkippedSegmentIndices.has(segmentIndex);

      if (isInsideUpcomingHintWindow) {
        renderUpcomingSegmentHint(segment);
      }
    }

    if (!isPlaybackCurrentlyInsideMutedSegment) {
      unmuteVideoPlayback(videoElement);
    }

    if (highestPriorityToastSegment) {
      if (isNotificationEnabled) {
        renderNotificationToast(
          highestPriorityToastSegment.segment,
          highestPriorityToastSegment.index,
          videoElement,
        );
      }
    } else {
      removeNotificationToast();
    }
  };
}

function initializeVideoPlaybackObserver(): void {
  const videoElement = document.querySelector('video');
  if (!videoElement) return;

  if (playerTimeUpdateListener) {
    videoElement.removeEventListener('timeupdate', playerTimeUpdateListener);
  }

  playerTimeUpdateListener = createTimeUpdateHandler(videoElement);
  videoElement.addEventListener('timeupdate', playerTimeUpdateListener);
}

let activeKeybindListener: ((event: KeyboardEvent) => void) | null = null;

function initializeKeyboardShortcuts(): void {
  if (activeKeybindListener) {
    document.removeEventListener('keydown', activeKeybindListener);
  }

  activeKeybindListener = (keyboardEvent: KeyboardEvent) => {
    const targetElement = keyboardEvent.target as HTMLElement;
    const isUserTypingInInput =
      targetElement.tagName === 'INPUT' ||
      targetElement.tagName === 'TEXTAREA' ||
      targetElement.isContentEditable;

    if (isUserTypingInInput) return;

    const videoElement = document.querySelector('video');
    if (!videoElement) return;

    const currentPlaybackTime = videoElement.currentTime;
    const pressedKey = keyboardEvent.key;

    if (pressedKey === activeKeybinds.closeNotice) {
      removeNotificationToast();
      return;
    }

    const currentToastIndex = currentlyDisplayedToastSegmentIndex;

    if (pressedKey === activeKeybinds.skipSegment && currentToastIndex !== null) {
      const activeSegment = activeVideoSegments[currentToastIndex];
      if (activeSegment) {
        executeAutoSkip(videoElement, activeSegment, currentToastIndex);
      }
      return;
    }

    if (pressedKey === activeKeybinds.skipToEnd && currentToastIndex !== null) {
      const activeSegment = activeVideoSegments[currentToastIndex];
      if (activeSegment) {
        videoElement.currentTime = activeSegment.endTime;
      }
      return;
    }

    if (pressedKey === activeKeybinds.nextSegment) {
      const nextSegment = activeVideoSegments.find(
        (segment) => segment.startTime > currentPlaybackTime,
      );
      if (nextSegment) {
        videoElement.currentTime = nextSegment.startTime;
      }
      return;
    }

    if (pressedKey === activeKeybinds.prevSegment) {
      const previousSegment = [...activeVideoSegments]
        .reverse()
        .find((segment) => segment.startTime < currentPlaybackTime - 2);
      if (previousSegment) {
        videoElement.currentTime = previousSegment.startTime;
      }
      return;
    }
  };

  document.addEventListener('keydown', activeKeybindListener);
}

async function handleYouTubeNavigationEvent(): Promise<void> {
  cleanPage();

  if (!isCurrentPageWatchPage()) {
    teardownThumbnailObserver();
    setupThumbnailObserver();
    return;
  }

  teardownThumbnailObserver();

  const extractedVideoId = extractVideoIdFromUrl();
  if (!extractedVideoId || extractedVideoId === activeVideoId) return;

  activeVideoId = extractedVideoId;
  activeVideoSegments = [];
  manuallySkippedSegmentIndices.clear();
  currentlyDisplayedToastSegmentIndex = null;
  isVideoCurrentlyMutedByExtension = false;
  removeNotificationToast();
  removeUpcomingSegmentHint();

  injectExtensionStyles();

  const userStorageData = (await storage.local.get([
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

  activeUserPreferences = userStorageData.userPreferences ?? DEFAULT_USER_PREFERENCES;
  isNotificationEnabled =
    userStorageData.showNotification ?? DEFAULT_GLOBAL_SETTINGS.showNotification;
  activeNoticeVisibilityMode =
    userStorageData.noticeVisibilityMode ?? DEFAULT_GLOBAL_SETTINGS.noticeVisibilityMode;
  isUpcomingHintEnabled =
    userStorageData.showUpcomingHint ?? DEFAULT_GLOBAL_SETTINGS.showUpcomingHint;
  upcomingHintDurationSeconds =
    userStorageData.upcomingHintSeconds ?? DEFAULT_GLOBAL_SETTINGS.upcomingHintSeconds;
  isAudioNotificationEnabled =
    userStorageData.audioNotificationOnSkip ?? DEFAULT_GLOBAL_SETTINGS.audioNotificationOnSkip;
  globalMinSegmentDuration =
    userStorageData.minSegmentDuration ?? DEFAULT_GLOBAL_SETTINGS.minSegmentDuration;
  activeKeybinds = userStorageData.keybinds ?? DEFAULT_KEYBINDS;
  activeSkipRules = userStorageData.skipRules ?? [];

  if (userStorageData.categoryColors) {
    applyColorsToDocument(userStorageData.categoryColors);
  }

  const currentChannelId = detectChannelId();
  if (currentChannelId) {
    const channelProfile = await getProfileForChannel(currentChannelId);
    if (channelProfile) {
      activeUserPreferences = channelProfile.categoryPreferences;
      globalMinSegmentDuration = channelProfile.minSegmentDuration;
      logDebug(`Applied profile "${channelProfile.name}" for channel ${currentChannelId}`);
    }
  }

  const urlStartTime = getUrlStartTime();

  const dismissedSegmentFingerprints = await fetchDismissedSegmentsFromStorage(extractedVideoId);
  const fetchedSegments = await fetchVideoSegmentsFromServer(extractedVideoId);

  const [dismissed, remaining] = partition(fetchedSegments, (s) =>
    dismissedSegmentFingerprints.has(generateSegmentFingerprint(s)),
  );
  void dismissed;

  let filtered = remaining;
  if (globalMinSegmentDuration > 0) {
    filtered = filtered.filter((s) => s.endTime - s.startTime >= globalMinSegmentDuration);
  }
  if (urlStartTime > 0) {
    filtered = filtered.filter((s) => s.endTime > urlStartTime);
  }

  activeVideoSegments = filtered;
  cacheSegmentsForVideo(extractedVideoId, filtered);

  if (activeVideoSegments.length > 0) {
    logDebug(`Found ${activeVideoSegments.length} segments for ${extractedVideoId}.`);
    void injectTimelineBlocksIntoPlayer();
    initializeVideoPlaybackObserver();
    initializeKeyboardShortcuts();
  }
}

document.addEventListener('yt-navigate-finish', () => {
  void handleYouTubeNavigationEvent();
});
void handleYouTubeNavigationEvent();
