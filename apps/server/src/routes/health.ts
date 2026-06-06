import { Hono } from 'hono';

const healthRoute = new Hono();

// Mock counters (these would typically be stored in a DB or memory cache like Redis)
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
      provider: process.env.AI_PROVIDER || 'mocked',
      status: 'ready',
    },
  });
});

export default healthRoute;
