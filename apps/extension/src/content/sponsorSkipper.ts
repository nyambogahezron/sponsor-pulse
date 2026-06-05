import type { ButtonState, SkipperSettings, SponsorSegment } from '../types/types';
import { DEFAULT_SKIPPER_SETTINGS } from '../types/types';

const LOG_PREFIX = '[SponsorPulse:Skipper]';
const TOAST_ID = 'sp-toast';
const OVERLAY_ID = 'sp-skip-overlay';
const TOAST_DURATION_MS = 3500;
const ACTION_BTN_ID = 'sp-analyze-btn';
const PLAYER_BTN_ID = 'sp-player-btn';

let activeSegments: SponsorSegment[] = [];
let settings: SkipperSettings = { ...DEFAULT_SKIPPER_SETTINGS };
let spikedSegments: Set<number> = new Set();
let timeUpdateHandler: ((e: Event) => void) | null = null;
let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
let currentSegmentIndex: number | null = null;

/** Loads user settings from chrome.storage.sync, falling back to defaults. */
export async function loadSkipperSettings(): Promise<SkipperSettings> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
      const result = await chrome.storage.sync.get('skipperSettings');
      if (result.skipperSettings) {
        settings = {
          ...DEFAULT_SKIPPER_SETTINGS,
          ...(result.skipperSettings as Partial<SkipperSettings>),
        };
      }
    }
  } catch {
    console.warn(LOG_PREFIX, 'Could not load settings, using defaults.');
  }
  return settings;
}

/** Sets the visual state of both injected buttons via `data-sp-state`. */
export function setButtonState(state: ButtonState): void {
  const actionBtn = document.getElementById(ACTION_BTN_ID);
  const playerBtn = document.getElementById(PLAYER_BTN_ID);

  for (const btn of [actionBtn, playerBtn]) {
    btn?.setAttribute('data-sp-state', state);
  }

  const label = actionBtn?.querySelector('span');
  if (!label) return;

  if (state === 'sponsor-detected') {
    label.textContent = `${activeSegments.length} Sponsor${activeSegments.length !== 1 ? 's' : ''} Found`;
  } else {
    label.textContent = 'SponsorPulse';
  }
}

const PULSE_ICON = `<svg viewBox="0 0 18 18" aria-hidden="true">
  <rect x="1" y="7" width="2" height="4" rx="1" opacity="0.5"/>
  <rect x="4" y="4" width="2" height="10" rx="1" opacity="0.75"/>
  <rect x="7" y="1" width="2" height="16" rx="1"/>
  <rect x="10" y="4" width="2" height="10" rx="1" opacity="0.75"/>
  <rect x="13" y="7" width="2" height="4" rx="1" opacity="0.5"/>
</svg>`;

function showToast(message: string, confidence?: number): void {
  document.getElementById(TOAST_ID)?.remove();

  const toast = document.createElement('div');
  toast.id = TOAST_ID;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <div class="sp-toast-icon">${PULSE_ICON}</div>
    <div class="sp-toast-body">
      <span class="sp-toast-message">${message}</span>
      ${confidence !== undefined ? `<span class="sp-toast-confidence">${(confidence * 100).toFixed(0)}% confidence</span>` : ''}
    </div>
    <div class="sp-toast-keys">
      <kbd>${settings.skipKey.toUpperCase()}</kbd> skip
      <kbd>${settings.spikeKey.toUpperCase()}</kbd> undo
    </div>
  `;

  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('sp-toast-visible'));
  setTimeout(() => {
    toast.classList.remove('sp-toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, TOAST_DURATION_MS);
}

function showSkipOverlay(segment: SponsorSegment, video: HTMLVideoElement): void {
  document.getElementById(OVERLAY_ID)?.remove();

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Sponsor segment detected');
  overlay.innerHTML = `
    <div class="sp-overlay-content">
      <div class="sp-overlay-icon">${PULSE_ICON}</div>
      <div class="sp-overlay-text">
        <span class="sp-overlay-title">Sponsor Detected</span>
        <span class="sp-overlay-detail">${(segment.confidence * 100).toFixed(0)}% confidence · Skip to ${formatTimestamp(segment.endTime)}</span>
      </div>
      <button class="sp-overlay-btn sp-overlay-skip" aria-label="Skip sponsor segment">
        Skip <kbd>${settings.skipKey.toUpperCase()}</kbd>
      </button>
      <button class="sp-overlay-btn sp-overlay-dismiss" aria-label="Dismiss">
        Keep <kbd>${settings.spikeKey.toUpperCase()}</kbd>
      </button>
    </div>
  `;

  const skipBtn = overlay.querySelector('.sp-overlay-skip') as HTMLButtonElement;
  const dismissBtn = overlay.querySelector('.sp-overlay-dismiss') as HTMLButtonElement;

  skipBtn.addEventListener('click', () => {
    video.currentTime = segment.endTime;
    overlay.remove();
    setButtonState('skipping');
    showToast('Skipped sponsor segment', segment.confidence);
    setTimeout(() => setButtonState(activeSegments.length > 0 ? 'sponsor-detected' : 'done'), 1500);
  });

  dismissBtn.addEventListener('click', () => {
    if (currentSegmentIndex !== null) spikedSegments.add(currentSegmentIndex);
    overlay.remove();
    showToast("Segment kept — won't skip again");
  });

  const player = document.querySelector('.html5-video-player') as HTMLElement;
  if (player) {
    player.style.position = 'relative';
    player.appendChild(overlay);
  } else {
    document.body.appendChild(overlay);
  }

  requestAnimationFrame(() => overlay.classList.add('sp-overlay-visible'));
}

/** Attaches `timeupdate` and `keydown` listeners to monitor and act on sponsor segments. */
export function startSkipper(segments: SponsorSegment[]): void {
  stopSkipper();

  activeSegments = segments;
  spikedSegments = new Set();

  if (segments.length === 0) {
    setButtonState('done');
    return;
  }

  setButtonState('sponsor-detected');
  console.log(LOG_PREFIX, `Monitoring ${segments.length} sponsor segment(s).`);

  const video = document.querySelector('video') as HTMLVideoElement;
  if (!video) {
    console.warn(LOG_PREFIX, 'No <video> element found.');
    return;
  }

  const actedSegments = new Set<number>();

  timeUpdateHandler = () => {
    const currentTime = video.currentTime;

    for (let i = 0; i < activeSegments.length; i++) {
      const seg = activeSegments[i];
      if (currentTime >= seg.startTime && currentTime < seg.endTime) {
        if (spikedSegments.has(i) || actedSegments.has(i)) continue;

        currentSegmentIndex = i;
        actedSegments.add(i);
        setButtonState('skipping');

        if (settings.autoSkip) {
          video.currentTime = seg.endTime;
          showToast('Skipped sponsor segment', seg.confidence);
          console.log(
            LOG_PREFIX,
            `Auto-skipped: ${formatTimestamp(seg.startTime)} → ${formatTimestamp(seg.endTime)}`,
          );
          setTimeout(
            () => setButtonState(activeSegments.length > 0 ? 'sponsor-detected' : 'done'),
            1500,
          );
        } else {
          showSkipOverlay(seg, video);
        }
        break;
      }
    }
  };

  video.addEventListener('timeupdate', timeUpdateHandler);

  keydownHandler = (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target as HTMLElement)?.isContentEditable
    )
      return;

    const key = e.key.toLowerCase();
    const currentTime = video.currentTime;

    if (key === settings.skipKey.toLowerCase()) {
      for (let i = 0; i < activeSegments.length; i++) {
        const seg = activeSegments[i];
        if (
          currentTime >= seg.startTime - 2 &&
          currentTime < seg.endTime &&
          !spikedSegments.has(i)
        ) {
          e.preventDefault();
          e.stopPropagation();
          video.currentTime = seg.endTime;
          document.getElementById(OVERLAY_ID)?.remove();
          setButtonState('skipping');
          showToast('Skipped sponsor segment', seg.confidence);
          setTimeout(
            () => setButtonState(activeSegments.length > 0 ? 'sponsor-detected' : 'done'),
            1500,
          );
          break;
        }
      }
    } else if (key === settings.spikeKey.toLowerCase()) {
      for (let i = 0; i < activeSegments.length; i++) {
        const seg = activeSegments[i];
        if (currentTime >= seg.startTime && currentTime < seg.endTime + 5) {
          e.preventDefault();
          e.stopPropagation();
          spikedSegments.add(i);
          document.getElementById(OVERLAY_ID)?.remove();
          showToast("Segment kept — won't skip again");
          setButtonState('sponsor-detected');
          break;
        }
      }
    }
  };

  document.addEventListener('keydown', keydownHandler, true);
}

/** Removes all listeners, overlays, and toasts from the current session. */
export function stopSkipper(): void {
  const video = document.querySelector('video') as HTMLVideoElement;
  if (video && timeUpdateHandler) video.removeEventListener('timeupdate', timeUpdateHandler);
  if (keydownHandler) document.removeEventListener('keydown', keydownHandler, true);

  timeUpdateHandler = null;
  keydownHandler = null;
  currentSegmentIndex = null;
  activeSegments = [];
  spikedSegments = new Set();

  document.getElementById(TOAST_ID)?.remove();
  document.getElementById(OVERLAY_ID)?.remove();
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
