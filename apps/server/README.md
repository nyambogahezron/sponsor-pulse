# SponsorPulse Backend Server

This is the high-performance backend service for the **SponsorPulse** Chrome Extension. It receives YouTube video IDs from the extension, fetches the video's transcript, and passes it to an AI Provider (LLM) to detect sponsor and advertisement segments, returning exact timestamps.

Built for speed and flexibility, it uses **[Bun](https://bun.sh/)** as the runtime and **[Hono](https://hono.dev/)** as the web framework. 

## ✨ Features

- **Model Agnostic AI Pipeline:** A pluggable architecture that supports switching seamlessly between Gemini, OpenAI, Claude, and DeepSeek via a single environment variable.
- **Strict JSON Enforcement:** AI system prompts are heavily optimized to return deterministic, strict JSON arrays without markdown wrapping.
- **Edge Ready:** Built with Hono, the framework is lightweight and can be easily deployed to edge environments like Cloudflare Workers or Vercel Edge.
- **Type-safe:** Fully written in TypeScript with shared response interfaces.

---

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have [Bun](https://bun.sh/) installed on your machine.
\`\`\`bash
curl -fsSL https://bun.sh/install | bash
\`\`\`

### 2. Install Dependencies
\`\`\`bash
cd server
bun install
\`\`\`

### 3. Environment Variables
Copy the example environment file and fill in your desired API keys.
\`\`\`bash
cp .env.example .env
\`\`\`

Inside `.env`, set `ACTIVE_LLM` to your preferred provider (`gemini`, `openai`, `claude`, or `deepseek`) and provide the corresponding API key.

### 4. Start the Server
Run the development server with hot-reloading:
\`\`\`bash
bun run dev
\`\`\`
*The server will start on `http://localhost:3000`*

---

## 📚 API Documentation

### `POST /api/v1/analyze`

Analyzes a YouTube video transcript for sponsor segments using the active AI provider.

**Request Body:**
\`\`\`json
{
  "videoId": "dQw4w9WgXcQ"
}
\`\`\`

**Success Response (200 OK):**
\`\`\`json
{
  "videoId": "dQw4w9WgXcQ",
  "segments": [
    {
      "start": 10.5,
      "end": 42.0
    }
  ],
  "provider": "gemini",
  "analyzedAt": 1780531770484
}
\`\`\`

**Error Responses:**
- `400 Bad Request`: Missing or invalid `videoId` or malformed JSON.
- `500 Internal Server Error`: Server configuration issue (e.g. missing API keys).
- `502 Bad Gateway`: AI Provider analysis failed or upstream transcript fetch failed.

### `GET /health`

Basic health check endpoint.

**Response:**
\`\`\`json
{
  "status": "ok",
  "ts": 1780531770484
}
\`\`\`

---

## 🧪 Testing

A Postman collection is included in the root of this project (`postman_collection.json`). 
1. Open Postman.
2. Click **Import** and select `postman_collection.json`.
3. The collection uses a `{{base_url}}` variable defaulting to `http://localhost:3000`.
4. Run the **Health Check** and **Analyze Video** requests.

You can also run typechecks using:
\`\`\`bash
bun run typecheck
\`\`\`

---

## 📊 Observability

The server ships with a full observability stack: **Prometheus** for metrics, **Grafana** for dashboards, and **Loki + Promtail** for log aggregation. Everything is wired via Docker Compose.

### Starting the stack

\`\`\`bash
# From apps/server/
docker compose up --build
\`\`\`

| Service    | URL                          | Purpose                        |
|------------|------------------------------|--------------------------------|
| Server     | http://localhost:3000        | API + `/metrics` scrape target |
| Prometheus | http://localhost:9090        | Metrics storage & query UI     |
| Grafana    | http://localhost:3001        | Dashboards (admin / admin)     |
| Loki       | internal (`:3100`)           | Log aggregation                |

### Metrics endpoint

\`\`\`
GET /metrics
\`\`\`

Returns Prometheus exposition-format text. Optionally protected with a Bearer token via the `METRICS_TOKEN` env var.

### Key metrics

| Metric | Type | Labels |
|---|---|---|
| `http_requests_total` | Counter | `method`, `path`, `status` |
| `http_request_duration_ms` | Histogram | `method`, `path`, `status` |
| `http_active_requests` | Gauge | `method` |
| `analysis_total` | Counter | `provider`, `status` |
| `cache_operations_total` | Counter | `operation` (hit/miss/write) |
| `transcript_fetch_total` | Counter | `status` |

### Grafana dashboard

The **SponsorPulse — API Observability** dashboard is auto-provisioned on startup. It includes:

- Request rate & latency percentiles (p50 / p95 / p99)
- Error rate by HTTP status code
- Active request gauge
- Analysis rate by provider and outcome
- Cache hit / miss / write rate + hit-ratio gauge
- Live server log stream (all levels + errors/warnings panel)

### Grafana credentials

Default: `admin` / `admin`. Override via env vars in `.env`:

\`\`\`
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your_secure_password
\`\`\`

### Log levels

Control verbosity with `LOG_LEVEL` in `.env` (`trace` | `debug` | `info` | `warn` | `error`). Default: `info`.
