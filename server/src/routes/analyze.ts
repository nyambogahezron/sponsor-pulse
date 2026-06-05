import { Hono } from 'hono';
import { AIProviderFactory } from '../ai/providers';
import { fetchTranscript, TranscriptNotAvailableError } from '../lib/transcript';
import type { AnalyzeRequest, AnalyzeResponse, ErrorResponse } from '../types';

const analyze = new Hono();

analyze.post('/', async (c) => {
  // ── 1. Parse and validate request body ──────────────────────────────────────
  let body: AnalyzeRequest;
  try {
    body = await c.req.json<AnalyzeRequest>();
  } catch {
    return c.json<ErrorResponse>({ error: 'Invalid JSON body.', code: 'INVALID_BODY' }, 400);
  }

  const { videoId } = body;
  if (!videoId || typeof videoId !== 'string' || !/^[\w-]{11}$/.test(videoId)) {
    return c.json<ErrorResponse>(
      { error: 'Invalid or missing videoId.', code: 'INVALID_VIDEO_ID' },
      400,
    );
  }

  // ── 2. Fetch transcript ──────────────────────────────────────────────────────
  let transcript: string;
  try {
    transcript = await fetchTranscript(videoId);
  } catch (err) {
    if (err instanceof TranscriptNotAvailableError) {
      console.warn('[/analyze] No transcript for video:', videoId);
      return c.json<ErrorResponse>(
        {
          error: 'This video has no transcript or captions available.',
          code: 'NO_TRANSCRIPT',
        },
        404,
      );
    }
    console.error('[/analyze] Transcript fetch failed:', err);
    return c.json<ErrorResponse>(
      { error: 'Failed to fetch transcript.', code: 'TRANSCRIPT_FETCH_FAILED' },
      502,
    );
  }

  // ── 3. Guard: empty transcript ───────────────────────────────────────────────
  if (!transcript.trim()) {
    return c.json<AnalyzeResponse>({
      videoId,
      segments: [],
      provider: 'none',
      analyzedAt: Date.now(),
    });
  }

  // ── 4. Initialise AI provider ────────────────────────────────────────────────
  let provider;
  try {
    provider = AIProviderFactory.create();
  } catch (err) {
    console.error('[/analyze] Provider init failed:', err);
    return c.json<ErrorResponse>(
      { error: 'AI provider configuration error.', code: 'PROVIDER_INIT_FAILED' },
      500,
    );
  }

  // ── 5. Run AI analysis ───────────────────────────────────────────────────────
  let segments;
  try {
    segments = await provider.analyzeTranscript(transcript);
  } catch (err) {
    console.error('[/analyze] AI analysis failed:', err);
    return c.json<ErrorResponse>(
      { error: 'AI analysis failed.', code: 'ANALYSIS_FAILED' },
      502,
    );
  }

  // ── 6. Return result ─────────────────────────────────────────────────────────
  return c.json<AnalyzeResponse>({
    videoId,
    segments,
    provider: provider.name,
    analyzedAt: Date.now(),
  });
});

export default analyze;
