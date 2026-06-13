import { Hono } from 'hono';

const healthRoute = new Hono();

let analysisSuccessCount = 0;
let analysisFailureCount = 0;

export const incrementSuccessCount = (): void => {
  analysisSuccessCount++;
};

export const incrementFailureCount = (): void => {
  analysisFailureCount++;
};

healthRoute.get('/', (context) => {
  const currentMemoryUsage = process.memoryUsage();

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
        success: analysisSuccessCount,
        failure: analysisFailureCount,
        total: analysisSuccessCount + analysisFailureCount,
      },
    },
    aiModelState: {
      provider: process.env.ACTIVE_LLM ?? 'gemini',
      status: 'ready',
    },
  });
});

export default healthRoute;
