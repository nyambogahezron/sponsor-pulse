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
  source: 'ai-local' | 'crowdsourced' | 'ai-server';
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

// ─── Background Worker ↔ Content Script messaging protocol ───────────────────

/** Sent from the content script to the background worker to trigger analysis. */
export interface FetchSponsorsMessage {
  action: 'FETCH_SPONSORS';
  videoId: string;
}

/** Raw sponsor segment shape returned by the Hono backend. */
export interface ServerSponsorSegment {
  start: number;
  end: number;
}

/** Sent from the background worker back to the content script. */
export interface FetchSponsorsResponse {
  /** Present on success — raw segments from the server. */
  segments?: ServerSponsorSegment[];
  /** Present on failure — structured error from the server or a network error. */
  error?: { code: string; error: string };
}
