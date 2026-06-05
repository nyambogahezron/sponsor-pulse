export interface SponsorSegment {
  start: number;
  end: number;
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
