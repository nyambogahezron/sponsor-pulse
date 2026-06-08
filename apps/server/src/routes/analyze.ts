import { zValidator } from '@hono/zod-validator';
import { SEGMENT_CATEGORIES } from '@sponsor-pulse/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import { AIProviderFactory } from '../ai/providers';
import { fetchTranscript, TranscriptNotAvailableError } from '../lib/transcript';
import type { AnalyzeResponse, ErrorResponse } from '../types';

const SegmentCategorySchema = z.enum(SEGMENT_CATEGORIES);
const ServerSponsorSegmentSchema = z.object({
  start: z.number().min(0),
  end: z.number().min(0),
  category: SegmentCategorySchema,
});

const analyze = new Hono();

const analyzeSchema = z
  .object({
    videoId: z
      .string()
      .length(64)
      .regex(/^[a-f0-9]{64}$/, 'Invalid hashed videoId format'),
  })
  .strict();

analyze.post(
  '/',
  zValidator('json', analyzeSchema, (result, c) => {
    if (!result.success) {
      return c.json<ErrorResponse>(
        {
          error: 'Invalid or missing videoId. Expected 64-character SHA-256 hash.',
          code: 'INVALID_VIDEO_ID',
        },
        400,
      );
    }
  }),
  async (c) => {
    const { videoId } = c.req.valid('json');

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

    if (!transcript.trim()) {
      return c.json<AnalyzeResponse>({
        videoId,
        segments: [],
        provider: 'none',
        analyzedAt: Date.now(),
      });
    }

    let provider: ReturnType<typeof AIProviderFactory.create>;
    try {
      provider = AIProviderFactory.create();
    } catch (err) {
      console.error('[/analyze] Provider init failed:', err);
      return c.json<ErrorResponse>(
        { error: 'AI provider configuration error.', code: 'PROVIDER_INIT_FAILED' },
        500,
      );
    }

    let segments: AnalyzeResponse['segments'];
    try {
      const rawSegments = await provider.analyzeTranscript(transcript);

      segments = rawSegments.filter((seg) => {
        const parsed = ServerSponsorSegmentSchema.safeParse(seg);
        if (!parsed.success) {
          console.warn('[/analyze] Stripped hallucinatory/invalid segment:', seg);
          return false;
        }
        return true;
      });
    } catch (err) {
      console.error('[/analyze] AI analysis failed:', err);
      return c.json<ErrorResponse>({ error: 'AI analysis failed.', code: 'ANALYSIS_FAILED' }, 502);
    }

    return c.json<AnalyzeResponse>({
      videoId,
      segments,
      provider: provider.name,
      analyzedAt: Date.now(),
    });
  },
);

export default analyze;
