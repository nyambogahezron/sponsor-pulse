import type { SegmentCategory } from '../types/shared';
import type { SponsorSegment } from '../types/types';

const videoLabelCache = new Map<string, SegmentCategory>();

const CATEGORY_PRIORITY: SegmentCategory[] = [
  'sponsor',
  'course_promo',
  'product_sale',
  'merch',
  'shoutout',
  'event_promo',
  'intro_creator',
  'intro_external',
];

const CATEGORY_SHORT_LABELS: Record<SegmentCategory, string> = {
  sponsor: 'Sponsor',
  shoutout: 'Shoutout',
  course_promo: 'Course',
  merch: 'Merch',
  product_sale: 'Sale',
  event_promo: 'Event',
  intro_creator: 'Intro',
  intro_external: 'Intro',
};

export function cacheSegmentsForVideo(videoId: string, segments: SponsorSegment[]): void {
  if (!segments.length) return;
  const presentCategories = new Set(segments.map((s) => s.category));
  const dominant = CATEGORY_PRIORITY.find((c) => presentCategories.has(c));
  if (dominant) videoLabelCache.set(videoId, dominant);
}

export function clearLabelCache(): void {
  videoLabelCache.clear();
}

const LABEL_CLASS = 'sp-thumb-label';

function extractVideoIdFromCard(card: Element): string | null {
  const link = card.querySelector<HTMLAnchorElement>(
    'a#thumbnail, a.yt-lockup-metadata-view-model__title-link, a[href*="watch?v="]',
  );
  if (!link?.href) return null;
  const m = link.href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getOrCreateLabel(card: Element): HTMLElement {
  const existing = card.querySelector<HTMLElement>(`.${LABEL_CLASS}`);
  if (existing) return existing;

  const label = document.createElement('div');
  label.className = LABEL_CLASS;

  const thumbContainer = card.querySelector<HTMLElement>(
    '#thumbnail, .yt-lockup-view-model__content-image',
  );
  if (thumbContainer) {
    thumbContainer.style.position = 'relative';
    thumbContainer.appendChild(label);
  }

  return label;
}

function applyLabelToCard(card: Element): void {
  const videoId = extractVideoIdFromCard(card);
  if (!videoId) return;
  const category = videoLabelCache.get(videoId);
  if (!category) return;
  const label = getOrCreateLabel(card);
  label.setAttribute('data-sp-category', category);
  label.textContent = CATEGORY_SHORT_LABELS[category] ?? category;
  label.style.display = 'block';
}

let observer: MutationObserver | null = null;

const VIDEO_CARD_SELECTORS = [
  'ytd-rich-item-renderer',
  'ytd-compact-video-renderer',
  'ytd-video-renderer',
  'ytd-grid-video-renderer',
].join(',');

function labelAllVisibleCards(): void {
  document.querySelectorAll(VIDEO_CARD_SELECTORS).forEach(applyLabelToCard);
}

export function setupThumbnailObserver(): void {
  if (observer) return;
  labelAllVisibleCards();

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.matches(VIDEO_CARD_SELECTORS)) applyLabelToCard(node);
        node.querySelectorAll(VIDEO_CARD_SELECTORS).forEach(applyLabelToCard);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

export function teardownThumbnailObserver(): void {
  observer?.disconnect();
  observer = null;
}
