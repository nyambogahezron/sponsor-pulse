import type { SegmentCategory, ServerSponsorSegment } from './shared';

export type { SegmentCategory, ServerSponsorSegment };

export interface TimedEntry {
  start: number;
  duration: number;
  text: string;
}

export interface TranscriptChunk {
  startTime: number;
  endTime: number;
  text: string;
  score: number;
}

/** The action to perform when a segment is encountered */
export type SegmentActionType = 'skip' | 'mute';

export interface SponsorSegment {
  startTime: number;
  endTime: number;
  confidence: number;
  category: SegmentCategory;
  source: 'ai-local' | 'crowdsourced' | 'ai-server';
  /** How to handle this segment. 'skip' seeks past it; 'mute' silences audio only. */
  actionType?: SegmentActionType;
}

export interface AnalysisResult {
  videoId: string;
  segments: SponsorSegment[];
  analyzedAt: number;
  entryCount: number;
  chunkCount: number;
}

export interface SkipperSettings {
  autoSkip: boolean;
  skipKey: string;
  spikeKey: string;
}

export const DEFAULT_SKIPPER_SETTINGS: SkipperSettings = {
  autoSkip: true,
  skipKey: 's',
  spikeKey: 'd',
};

export type ButtonState = 'idle' | 'analyzing' | 'sponsor-detected' | 'skipping' | 'done';

export interface FetchSponsorsMessage {
  action: 'FETCH_SPONSORS';
  videoId: string;
}

export interface FetchSponsorsResponse {
  segments?: ServerSponsorSegment[];
  error?: { code: string; error: string };
}
