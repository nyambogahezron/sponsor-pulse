# syntax=docker/dockerfile:1

FROM oven/bun:alpine AS base
WORKDIR /usr/src/app

FROM base AS builder
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base AS release
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
USER bun
EXPOSE 3000
CMD ["bun", "run", "start"]
