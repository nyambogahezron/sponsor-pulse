import * as crypto from 'node:crypto';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute, z } from '@hono/zod-openapi';
import type { AnalyzeRequest, AnalyzeResponse } from '@sponsor-pulse/shared';
import { AIProviderFactory } from '../ai/providers';
import { SEGMENT_CATEGORIES, type SponsorSegment as ServerSponsorSegment } from '../ai/segments';
import {
  analysisTotal,
  cacheOperationsTotal,
  transcriptFetchTotal,
} from '../middleware/metrics';
import { fetchTranscript, TranscriptNotAvailableError } from '../utils/transcript';
import { logger } from '../utils/logger';

export type { AnalyzeRequest, AnalyzeResponse };

export interface ErrorResponse {
  error: string;
  code: string;
}

const segmentCache = new Map<string, AnalyzeResponse[]>();

const SegmentCategorySchema = z.enum(SEGMENT_CATEGORIES);
const ServerSponsorSegmentSchema = z.object({
  start: z.number().min(0),
  end: z.number().min(0),
  category: SegmentCategorySchema,
});

const analyzeRequestSchema = z
  .object({
    videoId: z.string().min(10).max(20).openapi({
      example: 'dQw4w9WgXcQ',
      description: 'Standard YouTube video ID (11 characters)',
    }),
    provider: z.enum(['gemini', 'openai', 'claude', 'deepseek']).optional().openapi({
      example: 'gemini',
      description: 'AI provider to use for analysis',
    }),
  })
  .strict();

const ServerSponsorSegmentOpenApiSchema = z.object({
  uuid: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
  start: z.number().min(0).openapi({ example: 30 }),
  end: z.number().min(0).openapi({ example: 60 }),
  category: SegmentCategorySchema.openapi({ example: 'sponsor' }),
});

const AnalyzeResponseSchema = z.object({
  videoId: z.string().openapi({ example: 'dQw4w9WgXcQ' }),
  segments: z.array(ServerSponsorSegmentOpenApiSchema),
  provider: z.string().openapi({ example: 'gemini' }),
  analyzedAt: z.number().openapi({ example: 1719000000000 }),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
});

const getCacheRoute = createRoute({
  method: 'get',
  path: '/api/v1/analyze/{hashPrefix}',
  request: {
    params: z.object({
      hashPrefix: z
        .string()
        .min(4)
        .openapi({
          param: { name: 'hashPrefix', in: 'path' },
          example: 'a1b2',
          description: 'First 4 characters of the SHA-256 hash of the video ID (K-Anonymity)',
        }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(AnalyzeResponseSchema) } },
      description: 'Cached analysis results for this hash prefix',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid hash prefix',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'No data for this prefix',
    },
  },
  tags: ['analyze'],
});

const postAnalyzeRoute = createRoute({
  method: 'post',
  path: '/api/v1/analyze',
  request: {
    body: {
      content: { 'application/json': { schema: analyzeRequestSchema } },
      description: 'Video ID to analyze',
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: AnalyzeResponseSchema } },
      description: 'Analysis completed successfully',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid request',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'No transcript available',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'AI provider configuration error',
    },
    502: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Transcript fetch or AI analysis failed',
    },
  },
  tags: ['analyze'],
});

export function registerAnalyzeRoutes(app: OpenAPIHono): void {
  app.openapi(getCacheRoute, (context) => {
    const hashPrefix = context.req.param('hashPrefix');
    if (!hashPrefix || hashPrefix.length < 4) {
      return context.json({ error: 'Invalid hash prefix.', code: 'INVALID_PREFIX' }, 400 as const);
    }

    const cachedResults = segmentCache.get(hashPrefix) || [];
    if (cachedResults.length === 0) {
      cacheOperationsTotal.inc({ operation: 'miss' });
      return context.json({ error: 'No data for this prefix.', code: 'NOT_FOUND' }, 404 as const);
    }

    cacheOperationsTotal.inc({ operation: 'hit' });
    return context.json(cachedResults, 200 as const);
  });

  app.openapi(postAnalyzeRoute, async (context) => {
    let requestBody: z.infer<typeof analyzeRequestSchema>;
    try {
      requestBody = analyzeRequestSchema.parse(await context.req.json());
    } catch {
      return context.json(
        {
          error: 'Invalid or missing videoId. Expected standard YouTube video ID.',
          code: 'INVALID_VIDEO_ID',
        },
        400 as const,
      );
    }
    const { videoId, provider: requestedAiProvider } = requestBody;

    let videoTranscript: string;
    try {
      videoTranscript = await fetchTranscript(videoId);
      transcriptFetchTotal.inc({ status: 'success' });
    } catch (transcriptError) {
      if (transcriptError instanceof TranscriptNotAvailableError) {
        transcriptFetchTotal.inc({ status: 'not_available' });
        logger.warn({ videoId }, 'No transcript available for video');
        return context.json(
          { error: 'This video has no transcript or captions available.', code: 'NO_TRANSCRIPT' },
          404 as const,
        );
      }
      transcriptFetchTotal.inc({ status: 'failed' });
      logger.error({ err: transcriptError, videoId }, 'Transcript fetch failed');
      return context.json(
        { error: 'Failed to fetch transcript.', code: 'TRANSCRIPT_FETCH_FAILED' },
        502 as const,
      );
    }

    if (!videoTranscript.trim()) {
      return context.json(
        {
          videoId,
          segments: [],
          provider: 'none',
          analyzedAt: Date.now(),
        },
        200 as const,
      );
    }

    let aiProviderInstance: ReturnType<typeof AIProviderFactory.create>;
    try {
      aiProviderInstance = AIProviderFactory.create(requestedAiProvider);
    } catch (providerInitError) {
      logger.error({ err: providerInitError, requestedProvider: requestedAiProvider }, 'AI provider init failed');
      return context.json(
        { error: 'AI provider configuration error.', code: 'PROVIDER_INIT_FAILED' },
        500 as const,
      );
    }

    let detectedSegments: AnalyzeResponse['segments'];
    try {
      const rawAiSegments = await aiProviderInstance.analyzeTranscript(videoTranscript);

      detectedSegments = rawAiSegments
        .filter((segmentCandidate) => {
          const parsedValidation = ServerSponsorSegmentSchema.safeParse(segmentCandidate);
          if (!parsedValidation.success) {
            logger.warn({ segment: segmentCandidate }, 'Stripped invalid/hallucinatory AI segment');
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
      analysisTotal.inc({ provider: aiProviderInstance.name, status: 'failure' });
      logger.error({ err: analysisError, videoId, provider: aiProviderInstance.name }, 'AI analysis failed');
      return context.json({ error: 'AI analysis failed.', code: 'ANALYSIS_FAILED' }, 502 as const);
    }

    analysisTotal.inc({ provider: aiProviderInstance.name, status: 'success' });

    const responsePayload = {
      videoId,
      segments: detectedSegments,
      provider: aiProviderInstance.name,
      analyzedAt: Date.now(),
    };

    const hash = crypto.createHash('sha256').update(videoId).digest('hex');
    const prefix = hash.substring(0, 4);
    const existingGroup = segmentCache.get(prefix) || [];
    const filteredGroup = existingGroup.filter((r) => r.videoId !== videoId);
    filteredGroup.push(responsePayload);
    segmentCache.set(prefix, filteredGroup);
    cacheOperationsTotal.inc({ operation: 'write' });

    return context.json(responsePayload, 200 as const);
  });
}
