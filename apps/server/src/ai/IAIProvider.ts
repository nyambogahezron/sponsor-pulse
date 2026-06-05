import type { SponsorSegment } from '../types';

export interface IAIProvider {
  readonly name: string;
  analyzeTranscript(transcript: string): Promise<SponsorSegment[]>;
}
