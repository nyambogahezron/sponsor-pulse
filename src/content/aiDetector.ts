import type { AnalysisResult, SponsorSegment, TimedEntry, TranscriptChunk } from '../types/types';

const LOG_PREFIX = '[SponsorPulse:AI]';
const CHUNK_WINDOW_SEC = 15;
const CONFIDENCE_THRESHOLD = 0.35;
const MERGE_GAP_SEC = 2;
const PAD_BEFORE_SEC = 2;
const PAD_AFTER_SEC = 1;

interface TriggerEntry {
  pattern: string;
  weight: number;
}

/**
 * Three-tier weighted keyword list.
 * Tier 1 (1.0) — near-certain sponsor phrases
 * Tier 2 (0.6) — known sponsor brand names
 * Tier 3 (0.3) — contextual / CTA support phrases
 */
const TRIGGER_KEYWORDS: readonly TriggerEntry[] = [
  { pattern: 'sponsored by', weight: 1.0 },
  { pattern: 'brought to you by', weight: 1.0 },
  { pattern: 'this video is sponsored', weight: 1.0 },
  { pattern: 'this portion is brought to you', weight: 1.0 },
  { pattern: 'thanks to our sponsor', weight: 1.0 },
  { pattern: 'use code', weight: 1.0 },
  { pattern: 'use my link', weight: 1.0 },
  { pattern: 'use my code', weight: 1.0 },
  { pattern: 'promo code', weight: 1.0 },
  { pattern: 'sign up with my link', weight: 1.0 },
  { pattern: "today's sponsor", weight: 1.0 },
  { pattern: 'a word from our sponsor', weight: 1.0 },
  { pattern: 'check out the link', weight: 0.9 },

  { pattern: 'squarespace', weight: 0.6 },
  { pattern: 'nordvpn', weight: 0.6 },
  { pattern: 'surfshark', weight: 0.6 },
  { pattern: 'expressvpn', weight: 0.6 },
  { pattern: 'raid shadow legends', weight: 0.6 },
  { pattern: 'skillshare', weight: 0.6 },
  { pattern: 'audible', weight: 0.6 },
  { pattern: 'keeps', weight: 0.6 },
  { pattern: 'manscaped', weight: 0.6 },
  { pattern: 'honey', weight: 0.6 },
  { pattern: 'established titles', weight: 0.6 },
  { pattern: 'brilliant', weight: 0.6 },
  { pattern: 'dashlane', weight: 0.6 },
  { pattern: 'curiositystream', weight: 0.6 },
  { pattern: 'nebula', weight: 0.6 },
  { pattern: 'betterhelp', weight: 0.6 },
  { pattern: 'ridge wallet', weight: 0.6 },
  { pattern: 'casetify', weight: 0.6 },
  { pattern: 'dbrand', weight: 0.6 },
  { pattern: 'glasswire', weight: 0.6 },
  { pattern: 'private internet access', weight: 0.6 },
  { pattern: 'hellofresh', weight: 0.6 },
  { pattern: 'function of beauty', weight: 0.6 },

  { pattern: 'free trial', weight: 0.3 },
  { pattern: 'first 100', weight: 0.3 },
  { pattern: 'first 200', weight: 0.3 },
  { pattern: 'first 1000', weight: 0.3 },
  { pattern: 'percent off', weight: 0.3 },
  { pattern: '% off', weight: 0.3 },
  { pattern: 'limited time', weight: 0.3 },
  { pattern: 'click the link', weight: 0.3 },
  { pattern: 'link in the description', weight: 0.3 },
  { pattern: 'description below', weight: 0.3 },
  { pattern: 'down below', weight: 0.3 },
  { pattern: 'special offer', weight: 0.3 },
  { pattern: 'exclusive deal', weight: 0.3 },
  { pattern: 'money back guarantee', weight: 0.3 },
  { pattern: 'risk free', weight: 0.3 },
  { pattern: 'no risk', weight: 0.3 },
  { pattern: 'discount code', weight: 0.3 },
];

/** Sum of top-5 weights — used to normalize chunk scores to 0..1. */
const MAX_POSSIBLE_SCORE = (() => {
  const sorted = [...TRIGGER_KEYWORDS].sort((a, b) => b.weight - a.weight);
  return sorted.slice(0, 5).reduce((sum, t) => sum + t.weight, 0);
})();

function extractCaptionTracksFromDOM(): Array<{
  baseUrl: string;
  languageCode: string;
  kind?: string;
  name: string;
}> {
  try {
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent ?? '';
      const idx = text.indexOf('ytInitialPlayerResponse');
      if (idx === -1) continue;

      const jsonStart = text.indexOf('{', idx);
      if (jsonStart === -1) continue;

      let depth = 0;
      let jsonEnd = jsonStart;
      for (let i = jsonStart; i < text.length; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') depth--;
        if (depth === 0) {
          jsonEnd = i + 1;
          break;
        }
      }

      const playerResponse = JSON.parse(text.slice(jsonStart, jsonEnd));
      const captionTracks =
        playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

      if (Array.isArray(captionTracks) && captionTracks.length > 0) {
        return captionTracks.map((track: Record<string, unknown>) => ({
          baseUrl: String(track.baseUrl ?? ''),
          languageCode: String(track.languageCode ?? ''),
          kind: track.kind ? String(track.kind) : undefined,
          name: String((track.name as Record<string, unknown>)?.simpleText ?? ''),
        }));
      }
    }
  } catch (err) {
    console.warn(LOG_PREFIX, 'Failed to extract caption tracks from DOM:', err);
  }
  return [];
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\n/g, ' ')
    .trim();
}

function parseSubtitleXML(xml: string): TimedEntry[] {
  const entries: TimedEntry[] = [];
  const doc = new DOMParser().parseFromString(xml, 'text/xml');

  for (const node of Array.from<Element>(doc.querySelectorAll('text'))) {
    const start = parseFloat(node.getAttribute('start') ?? '0');
    const duration = parseFloat(node.getAttribute('dur') ?? '0');
    const text = decodeEntities(node.textContent ?? '');
    if (text.length > 0) entries.push({ start, duration, text });
  }

  return entries;
}

/**
 * Fetches the transcript for a YouTube video.
 * Prefers English ASR track from `ytInitialPlayerResponse`, falls back
 * to manual English, any English track, or the raw timedtext API.
 */
export async function fetchTranscript(videoId: string): Promise<TimedEntry[]> {
  console.log(LOG_PREFIX, `Fetching transcript for video: ${videoId}`);

  const tracks = extractCaptionTracksFromDOM();

  if (tracks.length === 0) {
    console.log(LOG_PREFIX, 'No caption tracks in DOM, trying timedtext API...');
    const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=srv3`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const entries = parseSubtitleXML(await res.text());
        if (entries.length > 0) {
          console.log(LOG_PREFIX, `Fetched ${entries.length} entries via timedtext fallback.`);
          return entries;
        }
      }
    } catch {
      /* fall through */
    }

    console.warn(LOG_PREFIX, 'No captions available for this video.');
    return [];
  }

  const selectedTrack =
    tracks.find((t) => t.languageCode === 'en' && t.kind === 'asr') ??
    tracks.find((t) => t.languageCode === 'en' && !t.kind) ??
    tracks.find((t) => t.languageCode.startsWith('en')) ??
    tracks[0];

  console.log(
    LOG_PREFIX,
    `Selected track: "${selectedTrack.name}" (${selectedTrack.languageCode}, kind=${selectedTrack.kind ?? 'manual'})`,
  );

  try {
    const url = new URL(selectedTrack.baseUrl);
    url.searchParams.set('fmt', 'srv3');
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const entries = parseSubtitleXML(await res.text());
    console.log(LOG_PREFIX, `Parsed ${entries.length} timed entries.`);
    return entries;
  } catch (err) {
    console.error(LOG_PREFIX, 'Failed to fetch caption track:', err);
    return [];
  }
}

export class TranscriptAnalyzer {
  private readonly windowSec: number;
  private readonly threshold: number;

  constructor(windowSec = CHUNK_WINDOW_SEC, threshold = CONFIDENCE_THRESHOLD) {
    this.windowSec = windowSec;
    this.threshold = threshold;
  }

  /** Splits entries into fixed-width non-overlapping time windows. */
  chunkTranscript(entries: TimedEntry[]): TranscriptChunk[] {
    if (entries.length === 0) return [];

    const totalDuration = Math.ceil(
      entries[entries.length - 1].start + entries[entries.length - 1].duration,
    );
    const chunks: TranscriptChunk[] = [];

    for (let windowStart = 0; windowStart < totalDuration; windowStart += this.windowSec) {
      const windowEnd = windowStart + this.windowSec;
      const windowEntries = entries.filter(
        (e) => e.start < windowEnd && e.start + e.duration > windowStart,
      );
      if (windowEntries.length === 0) continue;
      chunks.push({
        startTime: windowStart,
        endTime: windowEnd,
        text: windowEntries.map((e) => e.text).join(' '),
        score: 0,
      });
    }

    return chunks;
  }

  /** Scores a chunk against the weighted keyword list; returns 0..1. */
  scoreChunk(chunk: TranscriptChunk): number {
    const lowerText = chunk.text.toLowerCase();
    let rawScore = 0;
    for (const trigger of TRIGGER_KEYWORDS) {
      if (lowerText.includes(trigger.pattern)) rawScore += trigger.weight;
    }
    return Math.min(rawScore / MAX_POSSIBLE_SCORE, 1.0);
  }

  /** Merges consecutive high-scoring chunks into padded sponsor segments. */
  aggregateSegments(chunks: TranscriptChunk[]): SponsorSegment[] {
    const sponsored = chunks
      .filter((c) => c.score >= this.threshold)
      .sort((a, b) => a.startTime - b.startTime);

    if (sponsored.length === 0) return [];

    const segments: SponsorSegment[] = [];
    let currentStart = sponsored[0].startTime;
    let currentEnd = sponsored[0].endTime;
    let confidenceSum = sponsored[0].score;
    let chunkCount = 1;

    for (let i = 1; i < sponsored.length; i++) {
      const chunk = sponsored[i];
      if (chunk.startTime <= currentEnd + MERGE_GAP_SEC) {
        currentEnd = chunk.endTime;
        confidenceSum += chunk.score;
        chunkCount++;
      } else {
        segments.push({
          startTime: Math.max(0, currentStart - PAD_BEFORE_SEC),
          endTime: currentEnd + PAD_AFTER_SEC,
          confidence: confidenceSum / chunkCount,
          source: 'ai-local',
        });
        currentStart = chunk.startTime;
        currentEnd = chunk.endTime;
        confidenceSum = chunk.score;
        chunkCount = 1;
      }
    }

    segments.push({
      startTime: Math.max(0, currentStart - PAD_BEFORE_SEC),
      endTime: currentEnd + PAD_AFTER_SEC,
      confidence: confidenceSum / chunkCount,
      source: 'ai-local',
    });

    return segments;
  }

  /** Full pipeline: fetch → chunk → score → aggregate. */
  async analyze(videoId: string): Promise<AnalysisResult> {
    const startMs = performance.now();
    const entries = await fetchTranscript(videoId);

    if (entries.length === 0) {
      console.log(LOG_PREFIX, 'No transcript entries — analysis aborted.');
      return { videoId, segments: [], analyzedAt: Date.now(), entryCount: 0, chunkCount: 0 };
    }

    const chunks = this.chunkTranscript(entries);
    await this.scoreChunksInBackground(chunks);
    const segments = this.aggregateSegments(chunks);

    console.log(
      LOG_PREFIX,
      `Done in ${Math.round(performance.now() - startMs)}ms — ${entries.length} entries, ${chunks.length} chunks, ${segments.length} segment(s).`,
    );

    for (const seg of segments) {
      console.log(
        LOG_PREFIX,
        `  ▸ ${formatTime(seg.startTime)} → ${formatTime(seg.endTime)} (${(seg.confidence * 100).toFixed(1)}%)`,
      );
    }

    return {
      videoId,
      segments,
      analyzedAt: Date.now(),
      entryCount: entries.length,
      chunkCount: chunks.length,
    };
  }

  /**
   * Scores chunks in idle-callback batches to avoid blocking the main thread.
   * Falls back to synchronous scoring if `requestIdleCallback` is unavailable.
   */
  private scoreChunksInBackground(chunks: TranscriptChunk[]): Promise<void> {
    return new Promise((resolve) => {
      if (typeof requestIdleCallback === 'undefined') {
        for (const chunk of chunks) chunk.score = this.scoreChunk(chunk);
        resolve();
        return;
      }

      let index = 0;
      const BATCH_SIZE = 10;

      const processBatch = (deadline: IdleDeadline) => {
        while (index < chunks.length && deadline.timeRemaining() > 1) {
          const end = Math.min(index + BATCH_SIZE, chunks.length);
          for (let i = index; i < end; i++) chunks[i].score = this.scoreChunk(chunks[i]);
          index = end;
        }
        if (index < chunks.length) requestIdleCallback(processBatch, { timeout: 500 });
        else resolve();
      };

      requestIdleCallback(processBatch, { timeout: 1000 });
    });
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
