import type { SponsorSegment } from '../types';

/**
 * Parses an LLM response string into SponsorSegment[].
 *
 * Handles two common LLM output shapes:
 *   - A bare JSON array:  [{"start":10,"end":60}]
 *   - A JSON object with a "segments" key (some models wrap their response):
 *     {"segments":[{"start":10,"end":60}]}
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

  // Unwrap { segments: [...] } envelope if present
  const candidates = Array.isArray(parsed)
    ? parsed
    : (parsed as Record<string, unknown>)?.segments;

  if (!Array.isArray(candidates)) {
    console.warn('[parseSegments] Unexpected response shape:', parsed);
    return [];
  }

  return candidates
    .filter(
      (item): item is { start: number; end: number } =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).start === 'number' &&
        typeof (item as Record<string, unknown>).end === 'number',
    )
    .map((item) => ({ start: item.start, end: item.end }))
    .sort((a, b) => a.start - b.start);
}
