import type { OpenAPIHono } from '@hono/zod-openapi';
import { metricsRegistry } from '../middleware/metrics';
import { logger } from '../utils/logger';

/**
 * Registers the GET /metrics route.
 *
 * Optionally protected by a Bearer token: set METRICS_TOKEN in the environment.
 * If unset, the endpoint is open (suitable for local dev / internal networks).
 */
export function registerMetricsRoute(app: OpenAPIHono): void {
  app.get('/metrics', async (c) => {
    const metricsToken = process.env.METRICS_TOKEN;

    if (metricsToken) {
      const authHeader = c.req.header('authorization') ?? '';
      const providedToken = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

      if (providedToken !== metricsToken) {
        logger.warn({ path: '/metrics' }, 'Unauthorized metrics scrape attempt');
        return c.text('Forbidden', 403);
      }
    }

    const metrics = await metricsRegistry.metrics();
    return c.text(metrics, 200, {
      'Content-Type': metricsRegistry.contentType,
    });
  });
}
