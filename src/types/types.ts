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

export interface SponsorSegment {
  startTime: number;
  endTime: number;
  confidence: number;
  source: 'ai-local' | 'crowdsourced';
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
