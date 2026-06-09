export type {
  AnalyzeRequest,
  AnalyzeResponse,
  SegmentCategory,
  ServerSponsorSegment as SponsorSegment,
} from './shared';

export interface ErrorResponse {
  error: string;
  code: string;
}
