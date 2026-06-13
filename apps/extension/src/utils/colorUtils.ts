import type { SegmentCategory } from '../types/shared';
import { SEGMENT_CATEGORIES } from '../types/shared';
import type { CategoryColors } from '../types/storage';

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{3,8}$/;

export function applyColorsToDocument(colors: CategoryColors): void {
  if (!colors || Object.keys(colors).length === 0) return;
  const documentRoot = document.documentElement;
  for (const [category, hexColor] of Object.entries(colors) as [SegmentCategory, string][]) {
    if (hexColor && HEX_COLOR_PATTERN.test(hexColor)) {
      documentRoot.style.setProperty(`--sp-color-${category}`, hexColor);
    }
  }
}

export function resetColorsOnDocument(): void {
  const documentRoot = document.documentElement;
  for (const category of SEGMENT_CATEGORIES) {
    documentRoot.style.removeProperty(`--sp-color-${category}`);
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
