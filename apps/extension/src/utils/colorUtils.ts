import type { SegmentCategory } from '../types/shared';
import type { CategoryColors } from '../types/storage';

export function applyColorsToDocument(colors: CategoryColors): void {
  if (!colors || Object.keys(colors).length === 0) return;
  const root = document.documentElement;
  for (const [category, hex] of Object.entries(colors) as [SegmentCategory, string][]) {
    if (hex && /^#[0-9a-fA-F]{3,8}$/.test(hex)) {
      root.style.setProperty(`--sp-color-${category}`, hex);
    }
  }
}

export function resetColorsOnDocument(): void {
  const root = document.documentElement;
  const allCategories: SegmentCategory[] = [
    'sponsor',
    'shoutout',
    'course_promo',
    'merch',
    'product_sale',
    'event_promo',
    'intro_creator',
    'intro_external',
  ];
  for (const category of allCategories) {
    root.style.removeProperty(`--sp-color-${category}`);
  }
}

export const DEFAULT_CATEGORY_COLORS: Record<SegmentCategory, string> = {
  sponsor: '#22c55e',
  merch: '#eab308',
  intro_creator: '#3b82f6',
  intro_external: '#8b5cf6',
  shoutout: '#ec4899',
  course_promo: '#f97316',
  product_sale: '#06b6d4',
  event_promo: '#ef4444',
};
