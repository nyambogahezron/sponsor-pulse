import STYLES from '../styles/content.css?inline';
import type {
  FetchSponsorsMessage,
  FetchSponsorsResponse,
  ServerSponsorSegment,
  SponsorSegment,
} from '../types/types';
import { loadSkipperSettings, setButtonState, startSkipper, stopSkipper } from './sponsorSkipper';

const LOG_PREFIX = '[SponsorPulse]';
const ACTION_BTN_ID = 'sp-analyze-btn';
const PLAYER_BTN_ID = 'sp-player-btn';
const STYLE_ID = 'sp-styles';

const ACTION_BAR_SELECTORS: readonly string[] = [
  'ytd-watch-metadata #top-level-buttons-computed',
  '#above-the-fold #top-level-buttons-computed',
  'ytd-video-primary-info-renderer #top-level-buttons-computed',
];

const PLAYER_BAR_SELECTOR = '.ytp-right-controls';

const TITLE_SELECTORS: readonly string[] = [
  'ytd-watch-metadata h1 yt-formatted-string',
  '#above-the-fold h1 yt-formatted-string',
  'h1.title.ytd-video-primary-info-renderer yt-formatted-string',
];

const PULSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" aria-hidden="true">
  <rect x="1"  y="7"  width="2" height="4"  rx="1" opacity="0.5"/>
  <rect x="4"  y="4"  width="2" height="10" rx="1" opacity="0.75"/>
  <rect x="7"  y="1"  width="2" height="16" rx="1"/>
  <rect x="10" y="4"  width="2" height="10" rx="1" opacity="0.75"/>
  <rect x="13" y="7"  width="2" height="4"  rx="1" opacity="0.5"/>
</svg>`;

let currentVideoId: string | null = null;
let analysisInProgress = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isWatchPage(): boolean {
  return window.location.pathname === '/watch';
}

function getVideoId(): string | null {
  return new URLSearchParams(window.location.search).get('v');
}

function getVideoTitle(): string {
  for (const selector of TITLE_SELECTORS) {
    const text = document.querySelector<HTMLElement>(selector)?.textContent?.trim();
    if (text) return text;
  }
  return document.title.replace(/\s*[-–]\s*YouTube\s*$/i, '').trim() || 'Unknown title';
}

function ensureStylesInjected(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.appendChild(style);
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

async function waitForActionBar(): Promise<HTMLElement | null> {
  for (const selector of ACTION_BAR_SELECTORS) {
    const el = await waitForElement<HTMLElement>(selector);
    if (el) return el;
  }
  console.warn(LOG_PREFIX, 'Action bar not found.');
  return null;
}

/**
 * Maps a raw server segment `{ start, end }` to the extension's local
 * `SponsorSegment` shape so the skipper can consume it without knowing about
 * the server's type definitions.
 */
function mapServerSegment(seg: ServerSponsorSegment): SponsorSegment {
  return {
    startTime: seg.start,
    endTime: seg.end,
    confidence: 1.0, // AI-server results treated as high-confidence
    source: 'ai-server',
  };
}

// ─── Core analysis flow ───────────────────────────────────────────────────────

/**
 * Sends a FETCH_SPONSORS message to the background worker and awaits the
 * response. Returns the mapped `SponsorSegment[]` array on success.
 *
 * Throws a descriptive Error on server errors or network failures so the
 * caller can update the button state accordingly.
 */
async function requestSponsorsFromServer(videoId: string): Promise<SponsorSegment[]> {
  const message: FetchSponsorsMessage = { action: 'FETCH_SPONSORS', videoId };

  const response: FetchSponsorsResponse = await chrome.runtime.sendMessage(message);

  if (response.error) {
    const { code, error } = response.error;
    // NO_TRANSCRIPT is not a real error — the video just has no captions
    if (code === 'NO_TRANSCRIPT') {
      console.log(LOG_PREFIX, 'Video has no transcript — no sponsor data possible.');
      return [];
    }
    throw new Error(`[${code}] ${error}`);
  }

  if (!response.segments) return [];
  return response.segments.map(mapServerSegment);
}

async function runSponsorDetection(videoId: string): Promise<void> {
  if (analysisInProgress) return;

  analysisInProgress = true;
  setButtonState('analyzing');
  console.log(LOG_PREFIX, `Starting sponsor detection for: ${videoId}`);

  try {
    // Step 1: crowdsourced data (future feature — currently always returns [])
    const crowdsourcedSegments = await fetchCrowdsourcedSegments(videoId);
    if (crowdsourcedSegments.length > 0) {
      startSkipper(crowdsourcedSegments);
      return;
    }

    // Step 2: ask the backend for AI analysis
    console.log(LOG_PREFIX, 'No crowdsourced data — calling SponsorPulse backend...');
    const segments = await requestSponsorsFromServer(videoId);

    if (segments.length > 0) {
      startSkipper(segments);
    } else {
      console.log(LOG_PREFIX, 'No sponsor segments detected.');
      setButtonState('done');
    }
  } catch (err) {
    console.error(LOG_PREFIX, 'Sponsor detection failed:', err);
    setButtonState('idle');
  } finally {
    analysisInProgress = false;
  }
}

// TODO: replace with actual API call to the crowdsourced backend
async function fetchCrowdsourcedSegments(_videoId: string): Promise<SponsorSegment[]> {
  return [];
}

// ─── Button & DOM injection ───────────────────────────────────────────────────

function onAnalyzeClick(): void {
  const videoId = getVideoId();
  if (!videoId) return;
  console.log(LOG_PREFIX, `Manual analysis triggered — "${getVideoTitle()}"`);
  stopSkipper();
  analysisInProgress = false;
  void runSponsorDetection(videoId);
}

function createActionBarButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = ACTION_BTN_ID;
  btn.setAttribute('aria-label', 'SponsorPulse: analyze this video');
  btn.setAttribute('data-sp-state', 'idle');
  btn.innerHTML = `${PULSE_SVG}<span>SponsorPulse</span>`;
  btn.addEventListener('click', onAnalyzeClick);
  return btn;
}

function createPlayerButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = PLAYER_BTN_ID;
  btn.className = 'ytp-button';
  btn.title = 'SponsorPulse — Analyze video';
  btn.setAttribute('aria-label', 'SponsorPulse: analyze this video');
  btn.setAttribute('data-sp-state', 'idle');
  btn.innerHTML = PULSE_SVG;
  btn.addEventListener('click', onAnalyzeClick);
  return btn;
}

async function injectActionBarButton(): Promise<void> {
  document.getElementById(ACTION_BTN_ID)?.remove();
  const actionBar = await waitForActionBar();
  if (!actionBar || document.getElementById(ACTION_BTN_ID)) return;
  ensureStylesInjected();
  actionBar.appendChild(createActionBarButton());
  console.log(LOG_PREFIX, 'Analyze button → action bar.');
}

async function injectPlayerButton(): Promise<void> {
  document.getElementById(PLAYER_BTN_ID)?.remove();
  const playerBar = await waitForElement<HTMLElement>(PLAYER_BAR_SELECTOR);
  if (!playerBar) {
    console.warn(LOG_PREFIX, 'Player control bar not found.');
    return;
  }
  if (document.getElementById(PLAYER_BTN_ID)) return;
  ensureStylesInjected();
  playerBar.prepend(createPlayerButton());
  console.log(LOG_PREFIX, 'Waveform button → player control bar.');
}

// ─── SPA navigation handler ───────────────────────────────────────────────────

async function injectAll(): Promise<void> {
  if (!isWatchPage()) return;

  const videoId = getVideoId();
  if (!videoId || videoId === currentVideoId) return;

  stopSkipper();
  currentVideoId = videoId;
  analysisInProgress = false;

  await loadSkipperSettings();
  await Promise.all([injectActionBarButton(), injectPlayerButton()]);
  void runSponsorDetection(videoId);
}

document.addEventListener('yt-navigate-finish', () => void injectAll());
void injectAll();
