import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';
import type { Context, Next } from 'hono';

/**
 * Shared Prometheus registry for the SponsorPulse server.
 * All metrics are registered here and exported via /metrics.
 */
export const metricsRegistry = new Registry();

metricsRegistry.setDefaultLabels({ service: 'sponsor-pulse' });

collectDefaultMetrics({ register: metricsRegistry });

// HTTP Metrics

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'] as const,
  registers: [metricsRegistry],
});

export const httpRequestDurationMs = new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'path', 'status'] as const,
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  registers: [metricsRegistry],
});

export const httpActiveRequests = new Gauge({
  name: 'http_active_requests',
  help: 'Number of HTTP requests currently being processed',
  labelNames: ['method'] as const,
  registers: [metricsRegistry],
});

// Business Metrics

export const analysisTotal = new Counter({
  name: 'analysis_total',
  help: 'Total number of video analysis operations',
  labelNames: ['provider', 'status'] as const,
  registers: [metricsRegistry],
});

export const cacheOperationsTotal = new Counter({
  name: 'cache_operations_total',
  help: 'Total number of in-memory cache operations',
  labelNames: ['operation'] as const, // 'hit' | 'miss' | 'write'
  registers: [metricsRegistry],
});

export const transcriptFetchTotal = new Counter({
  name: 'transcript_fetch_total',
  help: 'Total number of YouTube transcript fetch attempts',
  labelNames: ['status'] as const, // 'success' | 'not_available' | 'failed'
  registers: [metricsRegistry],
});

// Request Middleware

/**
 * Hono middleware that tracks HTTP request metrics (count, duration, active).
 * Attach this before route handlers in index.ts.
 */
export const requestMetricsMiddleware = async (c: Context, next: Next): Promise<void> => {
  const method = c.req.method;
  // Normalize paths: strip query strings, collapse dynamic segments for cardinality
  const rawPath = c.req.path;
  const normalizedPath = normalizePath(rawPath);

  httpActiveRequests.inc({ method });
  const endTimer = httpRequestDurationMs.startTimer({ method, path: normalizedPath });

  try {
    await next();
  } finally {
    const status = String(c.res?.status ?? 0);
    endTimer({ status });
    httpRequestsTotal.inc({ method, path: normalizedPath, status });
    httpActiveRequests.dec({ method });
  }
};

// Helpers

/**
 * Collapses known high-cardinality path segments into placeholders
 * to prevent metric explosion (e.g. one label per video ID).
 */
function normalizePath(path: string): string {
  const withoutUuids = path
    .replace(/\/api\/v1\/analyze\/[^/]+$/, '/api/v1/analyze/:hashPrefix')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':uuid');
  // strip query strings — split always returns at least one element but TS types it as string|undefined
  return withoutUuids.split('?')[0] ?? withoutUuids;
}
