import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { timeout } from 'hono/timeout';
import { rateLimiter } from 'hono-rate-limiter';
import { registerAnalyzeRoutes } from './routes/analyze';
import { registerHealthRoutes } from './routes/health';
import { logger } from './utils/logger';

const app = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: 'Invalid or missing videoId. Expected standard YouTube video ID.',
          code: 'INVALID_VIDEO_ID',
        },
        400 as const,
      );
    }
  },
});

app.use(
  '*',
  secureHeaders({
    crossOriginResourcePolicy: false,
  }),
);
app.use('*', timeout(30000));
app.use(
  '*',
  rateLimiter({
    windowMs: 10 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-6',
    keyGenerator: (context) => {
      return (
        context.req.header('x-forwarded-for') || context.req.header('x-real-ip') || '127.0.0.1'
      );
    },
    handler: (context) => {
      logger.warn({ ip: context.req.header('x-forwarded-for') }, 'Rate limit exceeded');
      return context.json({ error: 'Too Many Requests.', code: 'RATE_LIMIT_EXCEEDED' }, 429);
    },
  }),
);

app.use(
  '*',
  cors({
    origin: (originUrl) => {
      if (!originUrl) return 'http://localhost:3000';

      const allowedExtensionOrigin = process.env.EXTENSION_ID
        ? `chrome-extension://${process.env.EXTENSION_ID}`
        : null;

      if (allowedExtensionOrigin && originUrl === allowedExtensionOrigin) return originUrl;

      if (!allowedExtensionOrigin && originUrl.startsWith('chrome-extension://')) {
        return originUrl;
      }

      if (originUrl.startsWith('http://localhost') || originUrl.startsWith('http://127.0.0.1')) {
        return originUrl;
      }

      return null;
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }),
);

app.use('*', async (context, nextHandler) => {
  const requestStartTime = Date.now();
  const requestMethod = context.req.method;
  const requestPath = context.req.path;

  let requestPayload: unknown | undefined;
  if (requestMethod !== 'GET' && requestMethod !== 'HEAD') {
    try {
      const clonedRequest = context.req.raw.clone();
      if (clonedRequest.headers.get('content-type')?.includes('application/json')) {
        requestPayload = await clonedRequest.json();
      }
    } catch {
      // Body might not be valid JSON, ignore extraction
    }
  }

  logger.info(
    { method: requestMethod, path: requestPath, payload: requestPayload },
    'Incoming request',
  );

  await nextHandler();

  const requestLatencyMs = Date.now() - requestStartTime;
  logger.info(
    {
      method: requestMethod,
      path: requestPath,
      status: context.res.status,
      latencyMs: requestLatencyMs,
    },
    'Request completed',
  );
});

app.doc('/doc', {
  openapi: '3.1.0',
  info: {
    title: 'SponsorPulse API',
    version: '0.1.0-beta',
    description:
      'Backend API for SponsorPulse — analyzes YouTube transcripts via AI to detect sponsor segments.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Development' }],
});

app.get('/docs', swaggerUI({ url: '/doc' }));

app.get('/', (context) =>
  context.json({ msg: 'SponsorPulse server is running.', timestamp: Date.now() }),
);

registerHealthRoutes(app);
registerAnalyzeRoutes(app);

app.notFound((context) => context.json({ error: 'Not found.', code: 'NOT_FOUND' }, 404));

app.onError((error, context) => {
  logger.error({ error, path: context.req.path }, '[unhandled] Internal server error');
  return context.json({ error: 'Internal server error.', code: 'INTERNAL_ERROR' }, 500);
});

const serverPort = Number(process.env.PORT ?? 3000);
logger.info(`SponsorPulse server listening on http://localhost:${serverPort}`);

export default { port: serverPort, hostname: '0.0.0.0', fetch: app.fetch };
