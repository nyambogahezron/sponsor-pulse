import * as crypto from 'node:crypto';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { AIProviderFactory } from '../ai/providers';
import { fetchTranscript, TranscriptNotAvailableError } from '../lib/transcript';
import { SEGMENT_CATEGORIES } from '../shared';
import type {
  AnalyzeResponse,
  ErrorResponse,
  SponsorSegment as ServerSponsorSegment,
} from '../types';
import { incrementFailureCount, incrementSuccessCount } from './health';

const segmentCache = new Map<string, AnalyzeResponse[]>();

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

analyze.get('/:hashPrefix', (context) => {
  const hashPrefix = context.req.param('hashPrefix');
  if (!hashPrefix || hashPrefix.length < 4) {
    return context.json<ErrorResponse>(
      { error: 'Invalid hash prefix.', code: 'INVALID_PREFIX' },
      400,
    );
  }

  const cachedResults = segmentCache.get(hashPrefix) || [];
  if (cachedResults.length === 0) {
    return context.json<ErrorResponse>(
      { error: 'No data for this prefix.', code: 'NOT_FOUND' },
      404,
    );
  }

  return context.json<AnalyzeResponse[]>(cachedResults);
});

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

      detectedSegments = rawAiSegments
        .filter((segmentCandidate) => {
          // The base validation passes without uuid
          const parsedValidation = ServerSponsorSegmentSchema.safeParse(segmentCandidate);
          if (!parsedValidation.success) {
            console.warn('[/analyze] Stripped hallucinatory/invalid segment:', segmentCandidate);
            return false;
          }
          return true;
        })
        .map(
          (validSegment): ServerSponsorSegment => ({
            uuid: crypto.randomUUID(),
            start: validSegment.start,
            end: validSegment.end,
            category: validSegment.category,
          }),
        );
    } catch (analysisError) {
      incrementFailureCount();
      console.error('[/analyze] AI analysis failed:', analysisError);
      return context.json<ErrorResponse>(
        { error: 'AI analysis failed.', code: 'ANALYSIS_FAILED' },
        502,
      );
    }

    incrementSuccessCount();

    const responsePayload: AnalyzeResponse = {
      videoId,
      segments: detectedSegments,
      provider: aiProviderInstance.name,
      analyzedAt: Date.now(),
    };

    // Calculate hash prefix and store in cache
    const hash = crypto.createHash('sha256').update(videoId).digest('hex');
    const prefix = hash.substring(0, 4);
    const existingGroup = segmentCache.get(prefix) || [];
    // Replace if it already exists in the cache, otherwise push
    const filteredGroup = existingGroup.filter((r) => r.videoId !== videoId);
    filteredGroup.push(responsePayload);
    segmentCache.set(prefix, filteredGroup);

    return context.json<AnalyzeResponse>(responsePayload);
  },
);

export default analyze;
