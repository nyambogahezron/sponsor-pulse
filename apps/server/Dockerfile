FROM oven/bun:alpine AS base
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS pruner
RUN bun add -g turbo
COPY . .
RUN turbo prune server --docker

FROM base AS builder
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/json/bun.lock ./bun.lock
RUN bun install --ignore-scripts
COPY --from=pruner /app/out/full/ .

FROM base AS release
COPY --from=builder /app /app
WORKDIR /app/apps/server

ENV NODE_ENV=production
USER bun
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
