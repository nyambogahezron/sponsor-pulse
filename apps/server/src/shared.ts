export const SEGMENT_CATEGORIES = [
  'sponsor',
  'shoutout',
  'course_promo',
  'merch',
  'product_sale',
  'event_promo',
  'intro_creator',
  'intro_external'
] as const;

export type SegmentCategory = typeof SEGMENT_CATEGORIES[number];

export interface ServerSponsorSegment {
  start: number;
  end: number;
  category: SegmentCategory;
}

export interface AnalyzeRequest {
  videoId: string;
  transcript?: string;
}

export interface AnalyzeResponse {
  videoId: string;
  segments: ServerSponsorSegment[];
  provider: string;
  analyzedAt: number;
}
