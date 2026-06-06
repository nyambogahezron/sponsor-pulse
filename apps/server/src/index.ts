import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { timeout } from 'hono/timeout';
import { rateLimiter } from 'hono-rate-limiter';
import analyzeRoute from './routes/analyze';
import healthRoute from './routes/health';
import { logger } from './utils/logger';

const app = new Hono();

app.use('*', secureHeaders());
app.use('*', timeout(30000));
app.use(
  '*',
  rateLimiter({
    windowMs: 10 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-6',
    keyGenerator: (c) => {
      return c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1';
    },
    handler: (c) => {
      logger.warn({ ip: c.req.header('x-forwarded-for') }, 'Rate limit exceeded');
      return c.json({ error: 'Too Many Requests.', code: 'RATE_LIMIT_EXCEEDED' }, 429);
    },
  }),
);

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return 'http://localhost:3000';

      const allowedExtension = `chrome-extension://${process.env.EXTENSION_ID}`;
      if (origin === allowedExtension) return origin;

      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        // Allow local development
        return origin;
      }

      return null;
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24 h preflight cache
  }),
);

app.use('*', async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  let payload: any | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      const clonedReq = c.req.raw.clone();
      if (clonedReq.headers.get('content-type')?.includes('application/json')) {
        payload = await clonedReq.json();
      }
    } catch {}
  }

  logger.info({ method, path, payload }, 'Incoming request');

  await next();

  const ms = Date.now() - start;
  logger.info(
    {
      method,
      path,
      status: c.res.status,
      latencyMs: ms,
    },
    'Request completed',
  );
});

app.get('/', (c) => c.json({ msg: 'SponsorPulse server is running.', timestamp: Date.now() }));

app.route('/health', healthRoute);
app.route('/api/v1/analyze', analyzeRoute);

app.notFound((c) => c.json({ error: 'Not found.', code: 'NOT_FOUND' }, 404));

app.onError((err, c) => {
  logger.error({ err, path: c.req.path }, '[unhandled] Internal server error');
  return c.json({ error: 'Internal server error.', code: 'INTERNAL_ERROR' }, 500);
});

const port = Number(process.env.PORT ?? 3000);
logger.info(`SponsorPulse server listening on http://localhost:${port}`);

export default { port, fetch: app.fetch };
