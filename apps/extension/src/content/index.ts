import STYLES from '../styles/content.css?inline';
import type {
  FetchSponsorsMessage,
  FetchSponsorsResponse,
  ServerSponsorSegment,
  SponsorSegment,
} from '../types/types';

const LOG_PREFIX = '[SponsorPulse]';
const STYLE_ID = 'sp-styles';
const TOAST_ID = 'sp-toast';

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

function mapServerSegment(seg: ServerSponsorSegment): SponsorSegment {
  return {
    startTime: seg.start,
    endTime: seg.end,
    category: seg.category,
    confidence: 1.0,
    source: 'ai-server',
  };
}

async function requestSponsorsFromServer(videoId: string): Promise<SponsorSegment[]> {
  console.log(LOG_PREFIX, `Requesting segments for ${videoId}...`);
  const message: FetchSponsorsMessage = { action: 'FETCH_SPONSORS', videoId };

  try {
    const response: FetchSponsorsResponse = await chrome.runtime.sendMessage(message);

    if (response.error) {
      const { code, error } = response.error;
      if (code === 'NO_TRANSCRIPT') {
        console.log(LOG_PREFIX, 'Video has no transcript — no sponsor data possible.');
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
    console.warn(LOG_PREFIX, 'Could not find .ytp-progress-list to inject timeline blocks.');
    return;
  }

  // Clear existing timeline blocks
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

    const leftPercent = (segment.startTime / duration) * 100;
    const widthPercent = ((segment.endTime - segment.startTime) / duration) * 100;

    block.style.left = `${leftPercent}%`;
    block.style.width = `${widthPercent}%`;

    // Seek on click
    block.addEventListener('click', (e) => {
      e.stopPropagation();
      video.currentTime = segment.startTime;
    });

    progressList.appendChild(block);
  });
}

function hideToast(): void {
  const toast = document.getElementById(TOAST_ID);
  if (toast) {
    toast.classList.remove('sp-toast-visible');
    activeToastSegmentIndex = null;
  }
}

function showToast(segment: SponsorSegment, index: number, video: HTMLVideoElement): void {
  if (activeToastSegmentIndex === index) return; // Already showing for this segment

  let toast = document.getElementById(TOAST_ID);
  const player =
    document.querySelector('#movie_player') ||
    document.querySelector('.html5-video-player') ||
    document.body;

  if (!toast) {
    toast = document.createElement('div');
    toast.id = TOAST_ID;
    player.appendChild(toast);
  }

  activeToastSegmentIndex = index;

  toast.innerHTML = `
    <div class="sp-toast-pulse-icon">${PULSE_SVG}</div>
    <div class="sp-toast-content">
      <span class="sp-toast-title">${segment.category.replace('_', ' ')} Detected</span>
      <span class="sp-toast-detail">Ends at ${formatTimestamp(segment.endTime)}</span>
    </div>
    <button class="sp-toast-skip-btn">Skip</button>
  `;

  const skipBtn = toast.querySelector('.sp-toast-skip-btn') as HTMLButtonElement;
  skipBtn.addEventListener('click', () => {
    video.currentTime = segment.endTime;
    skippedSegments.add(index);
    hideToast();
  });

  // Small delay to ensure DOM is updated before adding visible class for transition
  requestAnimationFrame(() => {
    toast!.classList.add('sp-toast-visible');
  });
}

function attachTimeUpdateListener(): void {
  const video = document.querySelector('video');
  if (!video) return;

  if (timeUpdateHandler) {
    video.removeEventListener('timeupdate', timeUpdateHandler);
  }

  timeUpdateHandler = () => {
    const currentTime = video.currentTime;

    let segmentToShow: { index: number; segment: SponsorSegment } | null = null;

    for (let i = 0; i < currentVideoSegments.length; i++) {
      const segment = currentVideoSegments[i];
      if (skippedSegments.has(i)) continue;

      // 5 seconds before the segment starts, up to the end of the segment
      if (currentTime >= segment.startTime - 5 && currentTime < segment.endTime) {
        segmentToShow = { index: i, segment };
        break;
      }
    }

    if (segmentToShow) {
      showToast(segmentToShow.segment, segmentToShow.index, video);
    } else {
      hideToast();
    }
  };

  video.addEventListener('timeupdate', timeUpdateHandler);
}

async function handleNewVideo(): Promise<void> {
  if (!isWatchPage()) return;

  const videoId = getVideoId();
  if (!videoId || videoId === currentVideoId) return;

  // Strict network lifecycle: New video detected. Reset state.
  currentVideoId = videoId;
  currentVideoSegments = [];
  skippedSegments.clear();
  activeToastSegmentIndex = null;
  hideToast();

  ensureStylesInjected();

  // Make exactly ONE network call
  currentVideoSegments = await requestSponsorsFromServer(videoId);

  if (currentVideoSegments.length > 0) {
    console.log(LOG_PREFIX, `Found ${currentVideoSegments.length} segments.`);
    void injectTimelineBlocks();
    attachTimeUpdateListener();
  }
}

// Ensure clean one-call lifecycle using yt-navigate-finish
document.addEventListener('yt-navigate-finish', () => void handleNewVideo());

// Initial run for direct loads
void handleNewVideo();
