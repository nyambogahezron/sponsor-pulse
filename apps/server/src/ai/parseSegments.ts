import type { SegmentCategory, SponsorSegment } from '../types';

const VALID_CATEGORIES: SegmentCategory[] = [
  'sponsor',
  'shoutout',
  'course_promo',
  'merch',
  'product_sale',
  'event_promo',
  'intro_creator',
  'intro_external',
];

/**
 * Parses an LLM response string into SponsorSegment[].
 *
 * Handles LLM output shapes:
 *   - A bare JSON array:  [{"start":10,"end":60,"category":"sponsor"}]
 *   - A JSON object with a "segments" key:
 *     {"segments":[{"start":10,"end":60,"category":"sponsor"}]}
 *
 * Strips markdown code fences if the model ignores the system prompt.
 * Returns [] and logs a warning on any parse failure.
 */
export function parseSegments(raw: string): SponsorSegment[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.warn('[parseSegments] Failed to parse LLM response:', raw);
    return [];
  }

  const candidates = Array.isArray(parsed) ? parsed : (parsed as Record<string, unknown>)?.segments;

  if (!Array.isArray(candidates)) {
    console.warn('[parseSegments] Unexpected response shape:', parsed);
    return [];
  }

  return candidates
    .filter(
      (item): item is { start: number; end: number; category: SegmentCategory } =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).start === 'number' &&
        typeof (item as Record<string, unknown>).end === 'number' &&
        typeof (item as Record<string, unknown>).category === 'string' &&
        VALID_CATEGORIES.includes((item as Record<string, unknown>).category as SegmentCategory),
    )
    .map((item) => ({ start: item.start, end: item.end, category: item.category }))
    .sort((a, b) => a.start - b.start);
}
