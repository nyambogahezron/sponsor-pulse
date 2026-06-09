import { Hono } from 'hono';

const healthRoute = new Hono();

// In-memory counters for analysis requests
let analysisSuccessCount = 0;
let analysisFailureCount = 0;

export const incrementSuccessCount = () => analysisSuccessCount++;
export const incrementFailureCount = () => analysisFailureCount++;

healthRoute.get('/', (c) => {
  const memoryUsage = process.memoryUsage();

  return c.json({
    status: 'ok',
    timestamp: Date.now(),
    uptimeSeconds: process.uptime(),
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
    },
    metrics: {
      analysis: {
        success: analysisSuccessCount,
        failure: analysisFailureCount,
        total: analysisSuccessCount + analysisFailureCount,
      },
    },
    aiModelState: {
      provider: process.env.ACTIVE_LLM || 'gemini',
      status: 'ready',
    },
  });
});

export default healthRoute;
