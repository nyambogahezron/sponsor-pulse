import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import analyzeRoute from './routes/analyze';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({ origin: ['chrome-extension://*', 'http://localhost:*'] }));

app.get('/', (c) => c.json({ msg: 'SponsorPulse server is running.', timestamp: Date.now() }));

app.get('/health', (c) => c.json({ status: 'ok', ts: Date.now() }));

app.route('/api/v1/analyze', analyzeRoute);

app.notFound((c) => c.json({ error: 'Not found.', code: 'NOT_FOUND' }, 404));

app.onError((err, c) => {
  console.error('[unhandled]', err);
  return c.json({ error: 'Internal server error.', code: 'INTERNAL_ERROR' }, 500);
});

const port = Number(process.env.PORT ?? 3000);
console.info(`SponsorPulse server listening on http://localhost:${port}`);

export default { port, fetch: app.fetch };
