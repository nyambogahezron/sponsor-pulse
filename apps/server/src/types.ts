export type SegmentCategory =
  | 'sponsor'
  | 'shoutout'
  | 'course_promo'
  | 'merch'
  | 'product_sale'
  | 'event_promo'
  | 'intro_creator'
  | 'intro_external';

export interface SponsorSegment {
  start: number;
  end: number;
  category: SegmentCategory;
}

export interface AnalyzeRequest {
  videoId: string;
}

export interface AnalyzeResponse {
  videoId: string;
  segments: SponsorSegment[];
  provider: string;
  analyzedAt: number;
}

export interface ErrorResponse {
  error: string;
  code: string;
}
