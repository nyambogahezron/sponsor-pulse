import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { AIProviderFactory } from '../ai/providers';
import { fetchTranscript, TranscriptNotAvailableError } from '../lib/transcript';
import { SEGMENT_CATEGORIES } from '../shared';
import type { AnalyzeResponse, ErrorResponse } from '../types';
import { incrementFailureCount, incrementSuccessCount } from './health';

const SegmentCategorySchema = z.enum(SEGMENT_CATEGORIES);
const ServerSponsorSegmentSchema = z.object({
  start: z.number().min(0),
  end: z.number().min(0),
  category: SegmentCategorySchema,
});

const analyze = new Hono();

const analyzeRequestSchema = z
  .object({
    videoId: z.string().min(10).max(20),
    provider: z.enum(['gemini', 'openai', 'claude', 'deepseek']).optional(),
  })
  .strict();

analyze.post(
  '/',
  zValidator('json', analyzeRequestSchema, (validationResult, context) => {
    if (!validationResult.success) {
      return context.json<ErrorResponse>(
        {
          error: 'Invalid or missing videoId. Expected standard YouTube video ID.',
          code: 'INVALID_VIDEO_ID',
        },
        400,
      );
    }
  }),
  async (context) => {
    const { videoId, provider: requestedAiProvider } = context.req.valid('json');

    let videoTranscript: string;
    try {
      videoTranscript = await fetchTranscript(videoId);
    } catch (transcriptError) {
      if (transcriptError instanceof TranscriptNotAvailableError) {
        console.warn('[/analyze] No transcript for video:', videoId);
        return context.json<ErrorResponse>(
          {
            error: 'This video has no transcript or captions available.',
            code: 'NO_TRANSCRIPT',
          },
          404,
        );
      }
      console.error('[/analyze] Transcript fetch failed:', transcriptError);
      return context.json<ErrorResponse>(
        { error: 'Failed to fetch transcript.', code: 'TRANSCRIPT_FETCH_FAILED' },
        502,
      );
    }

    if (!videoTranscript.trim()) {
      return context.json<AnalyzeResponse>({
        videoId,
        segments: [],
        provider: 'none',
        analyzedAt: Date.now(),
      });
    }

    let aiProviderInstance: ReturnType<typeof AIProviderFactory.create>;
    try {
      aiProviderInstance = AIProviderFactory.create(requestedAiProvider);
    } catch (providerInitError) {
      console.error('[/analyze] Provider init failed:', providerInitError);
      return context.json<ErrorResponse>(
        { error: 'AI provider configuration error.', code: 'PROVIDER_INIT_FAILED' },
        500,
      );
    }

    let detectedSegments: AnalyzeResponse['segments'];
    try {
      const rawAiSegments = await aiProviderInstance.analyzeTranscript(videoTranscript);

      detectedSegments = rawAiSegments.filter((segmentCandidate) => {
        const parsedValidation = ServerSponsorSegmentSchema.safeParse(segmentCandidate);
        if (!parsedValidation.success) {
          console.warn('[/analyze] Stripped hallucinatory/invalid segment:', segmentCandidate);
          return false;
        }
        return true;
      });
    } catch (analysisError) {
      incrementFailureCount();
      console.error('[/analyze] AI analysis failed:', analysisError);
      return context.json<ErrorResponse>(
        { error: 'AI analysis failed.', code: 'ANALYSIS_FAILED' },
        502,
      );
    }

    incrementSuccessCount();
    return context.json<AnalyzeResponse>({
      videoId,
      segments: detectedSegments,
      provider: aiProviderInstance.name,
      analyzedAt: Date.now(),
    });
  },
);

export default analyze;
