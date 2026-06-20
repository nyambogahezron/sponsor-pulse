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

COPY --from=builder /app/apps/server/node_modules ./node_modules
COPY --from=pruner /app/out/full/apps/server/src ./src
COPY --from=pruner /app/out/full/apps/server/package.json ./package.json
COPY --from=pruner /app/out/full/apps/server/tsconfig.json ./tsconfig.json

ENV NODE_ENV=production
USER bun
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
