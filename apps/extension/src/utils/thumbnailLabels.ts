import type { SegmentCategory } from '../types/shared';
import type { SponsorSegment } from '../types/types';

const VIDEO_ID_FROM_URL_PATTERN = /[?&]v=([a-zA-Z0-9_-]{11})/;

const videoLabelCache = new Map<string, SegmentCategory>();

const CATEGORY_DISPLAY_PRIORITY: SegmentCategory[] = [
  'sponsor',
  'course_promo',
  'product_sale',
  'merch',
  'shoutout',
  'event_promo',
  'intro_creator',
  'intro_external',
];

const CATEGORY_BADGE_LABELS: Record<SegmentCategory, string> = {
  sponsor: 'Sponsor',
  shoutout: 'Shoutout',
  course_promo: 'Course',
  merch: 'Merch',
  product_sale: 'Sale',
  event_promo: 'Event',
  intro_creator: 'Intro',
  intro_external: 'Intro',
};

const THUMBNAIL_LABEL_CLASS = 'sp-thumb-label';

const VIDEO_CARD_SELECTORS = [
  'ytd-rich-item-renderer',
  'ytd-compact-video-renderer',
  'ytd-video-renderer',
  'ytd-grid-video-renderer',
].join(',');

let thumbnailObserver: MutationObserver | null = null;

export function cacheSegmentsForVideo(videoId: string, segments: SponsorSegment[]): void {
  if (!segments.length) return;
  const presentCategories = new Set(segments.map((segment) => segment.category));
  const dominantCategory = CATEGORY_DISPLAY_PRIORITY.find((category) =>
    presentCategories.has(category),
  );
  if (dominantCategory) videoLabelCache.set(videoId, dominantCategory);
}

export function clearLabelCache(): void {
  videoLabelCache.clear();
}

function extractVideoIdFromCardLink(card: Element): string | null {
  const thumbnailLink = card.querySelector<HTMLAnchorElement>(
    'a#thumbnail, a.yt-lockup-metadata-view-model__title-link, a[href*="watch?v="]',
  );
  if (!thumbnailLink?.href) return null;
  const match = thumbnailLink.href.match(VIDEO_ID_FROM_URL_PATTERN);
  return match ? match[1] : null;
}

function getOrCreateThumbnailBadge(card: Element): HTMLElement {
  const existingBadge = card.querySelector<HTMLElement>(`.${THUMBNAIL_LABEL_CLASS}`);
  if (existingBadge) return existingBadge;

  const badge = document.createElement('div');
  badge.className = THUMBNAIL_LABEL_CLASS;

  const thumbnailContainer = card.querySelector<HTMLElement>(
    '#thumbnail, .yt-lockup-view-model__content-image',
  );
  if (thumbnailContainer) {
    thumbnailContainer.style.position = 'relative';
    thumbnailContainer.appendChild(badge);
  }

  return badge;
}

function applyBadgeToVideoCard(card: Element): void {
  const videoId = extractVideoIdFromCardLink(card);
  if (!videoId) return;
  const cachedCategory = videoLabelCache.get(videoId);
  if (!cachedCategory) return;
  const badge = getOrCreateThumbnailBadge(card);
  badge.setAttribute('data-sp-category', cachedCategory);
  badge.textContent = CATEGORY_BADGE_LABELS[cachedCategory] ?? cachedCategory;
  badge.style.display = 'block';
}

function applyBadgesToAllVisibleCards(): void {
  document.querySelectorAll(VIDEO_CARD_SELECTORS).forEach(applyBadgeToVideoCard);
}

export function setupThumbnailObserver(): void {
  if (thumbnailObserver) return;
  applyBadgesToAllVisibleCards();

  thumbnailObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const addedNode of mutation.addedNodes) {
        if (!(addedNode instanceof HTMLElement)) continue;
        if (addedNode.matches(VIDEO_CARD_SELECTORS)) applyBadgeToVideoCard(addedNode);
        addedNode.querySelectorAll(VIDEO_CARD_SELECTORS).forEach(applyBadgeToVideoCard);
      }
    }
  });

  thumbnailObserver.observe(document.body, { childList: true, subtree: true });
}

export function teardownThumbnailObserver(): void {
  thumbnailObserver?.disconnect();
  thumbnailObserver = null;
}
