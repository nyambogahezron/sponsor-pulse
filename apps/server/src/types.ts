export type {
  AnalyzeRequest,
  AnalyzeResponse,
  SegmentCategory,
  ServerSponsorSegment as SponsorSegment,
} from '@sponsor-pulse/shared';

export interface ErrorResponse {
  error: string;
  code: string;
}
