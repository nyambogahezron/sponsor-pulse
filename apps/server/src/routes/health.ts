import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute, z } from '@hono/zod-openapi';
import { analysisTotal } from '../middleware/metrics';

const HealthResponseSchema = z.object({
  status: z.string().openapi({ example: 'ok' }),
  timestamp: z.number().openapi({ example: 1719000000000 }),
  uptimeSeconds: z.number().openapi({ example: 3600 }),
  memory: z.object({
    rss: z.number(),
    heapTotal: z.number(),
    heapUsed: z.number(),
    external: z.number(),
  }),
  metrics: z.object({
    analysis: z.object({
      success: z.number().openapi({ example: 42 }),
      failure: z.number().openapi({ example: 3 }),
      total: z.number().openapi({ example: 45 }),
    }),
  }),
  aiModelState: z.object({
    provider: z.string().openapi({ example: 'gemini' }),
    status: z.string().openapi({ example: 'ready' }),
  }),
});

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  responses: {
    200: {
      content: { 'application/json': { schema: HealthResponseSchema } },
      description: 'Health check response with server metrics and memory usage',
    },
  },
  tags: ['health'],
});

export function registerHealthRoutes(app: OpenAPIHono): void {
  app.openapi(healthRoute, async (context) => {
    const currentMemoryUsage = process.memoryUsage();

    // Read counters directly from the prom-client metric values
    const analysisValues = await analysisTotal.get();
    let successCount = 0;
    let failureCount = 0;

    for (const { labels, value } of analysisValues.values) {
      if (labels.status === 'success') successCount += value;
      if (labels.status === 'failure') failureCount += value;
    }

    return context.json({
      status: 'ok',
      timestamp: Date.now(),
      uptimeSeconds: process.uptime(),
      memory: {
        rss: currentMemoryUsage.rss,
        heapTotal: currentMemoryUsage.heapTotal,
        heapUsed: currentMemoryUsage.heapUsed,
        external: currentMemoryUsage.external,
      },
      metrics: {
        analysis: {
          success: successCount,
          failure: failureCount,
          total: successCount + failureCount,
        },
      },
      aiModelState: {
        provider: process.env.ACTIVE_LLM ?? 'gemini',
        status: 'ready',
      },
    });
  });
}
