import STYLES from '../../public/styles/content.css?inline';

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

function isWatchPage(): boolean {
  return window.location.pathname === '/watch';
}

function ensureStylesInjected(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.appendChild(style);
}

function getVideoTitle(): string {
  for (const selector of TITLE_SELECTORS) {
    const text = document.querySelector<HTMLElement>(selector)?.textContent?.trim();
    if (text) return text;
  }
  return document.title.replace(/\s*[-–]\s*YouTube\s*$/i, '').trim() || 'Unknown title';
}

/**
 * Generic MutationObserver wrapper.
 * Resolves with the element as soon as `selector` matches, or null on timeout.
 */
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

/** Tries each action bar selector in order; returns first match or null. */
async function waitForActionBar(): Promise<HTMLElement | null> {
  for (const selector of ACTION_BAR_SELECTORS) {
    const el = await waitForElement<HTMLElement>(selector);
    if (el) return el;
  }
  console.warn('[SponsorPulse] Action bar not found.');
  return null;
}

function createActionBarButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = ACTION_BTN_ID;
  btn.setAttribute('aria-label', 'SponsorPulse: analyze this video');
  btn.innerHTML = `${PULSE_SVG}<span>SponsorPulse</span>`;
  btn.addEventListener('click', () => {
    const title = getVideoTitle();
    console.log(`[SponsorPulse] Action bar — "${title}"`);
    alert(`SponsorPulse\n\n${title}`);
  });
  return btn;
}

function createPlayerButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = PLAYER_BTN_ID;
  // `ytp-button` gives Chrome's YouTube player the correct base sizing/cursor.
  btn.className = 'ytp-button';
  btn.title = 'SponsorPulse — Analyze video';
  btn.setAttribute('aria-label', 'SponsorPulse: analyze this video');
  btn.innerHTML = PULSE_SVG;
  btn.addEventListener('click', () => {
    const title = getVideoTitle();
    console.log(`[SponsorPulse] Player bar — "${title}"`);
    alert(`SponsorPulse\n\n${title}`);
  });
  return btn;
}

async function injectActionBarButton(): Promise<void> {
  document.getElementById(ACTION_BTN_ID)?.remove();

  const actionBar = await waitForActionBar();
  if (!actionBar) return;
  if (document.getElementById(ACTION_BTN_ID)) return; // race guard

  ensureStylesInjected();
  actionBar.appendChild(createActionBarButton());
  console.log('[SponsorPulse] Analyze button → action bar.');
}

async function injectPlayerButton(): Promise<void> {
  document.getElementById(PLAYER_BTN_ID)?.remove();

  const playerBar = await waitForElement<HTMLElement>(PLAYER_BAR_SELECTOR);
  if (!playerBar) {
    console.warn('[SponsorPulse] Player control bar not found.');
    return;
  }
  if (document.getElementById(PLAYER_BTN_ID)) return;

  ensureStylesInjected();
  playerBar.prepend(createPlayerButton());
  console.log('[SponsorPulse] Waveform button → player control bar.');
}

async function injectAll(): Promise<void> {
  if (!isWatchPage()) return;
  await Promise.all([injectActionBarButton(), injectPlayerButton()]);
}

document.addEventListener('yt-navigate-finish', () => {
  void injectAll();
});
void injectAll();
