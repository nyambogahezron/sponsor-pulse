export const SEGMENT_CATEGORIES = [
  'sponsor',
  'shoutout',
  'course_promo',
  'merch',
  'product_sale',
  'event_promo',
  'intro_creator',
  'intro_external',
] as const;

export type SegmentCategory = (typeof SEGMENT_CATEGORIES)[number];

export interface SponsorSegment {
  uuid: string;
  start: number;
  end: number;
  category: SegmentCategory;
}

export function parseSegments(rawLlmResponse: string): Omit<SponsorSegment, 'uuid'>[] {
  const cleanedJsonString = rawLlmResponse
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  let parsedJsonPayload: unknown;
  try {
    parsedJsonPayload = JSON.parse(cleanedJsonString);
  } catch {
    console.warn('[parseSegments] Failed to parse LLM response:', rawLlmResponse);
    return [];
  }

  const segmentCandidates = Array.isArray(parsedJsonPayload)
    ? parsedJsonPayload
    : (parsedJsonPayload as Record<string, unknown>)?.segments;

  if (!Array.isArray(segmentCandidates)) {
    console.warn('[parseSegments] Unexpected response shape:', parsedJsonPayload);
    return [];
  }

  return segmentCandidates
    .filter(
      (
        segmentCandidate: unknown,
      ): segmentCandidate is { start: number; end: number; category: SegmentCategory } => {
        if (typeof segmentCandidate !== 'object' || segmentCandidate === null) return false;

        const candidate = segmentCandidate as Record<string, unknown>;
        return (
          typeof candidate.start === 'number' &&
          typeof candidate.end === 'number' &&
          typeof candidate.category === 'string' &&
          (SEGMENT_CATEGORIES as readonly string[]).includes(candidate.category)
        );
      },
    )
    .map((validSegment) => ({
      start: validSegment.start,
      end: validSegment.end,
      category: validSegment.category,
    }))
    .sort((segmentA, segmentB) => segmentA.start - segmentB.start);
}
