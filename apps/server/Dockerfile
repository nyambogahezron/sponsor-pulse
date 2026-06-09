FROM oven/bun:alpine AS base
WORKDIR /usr/src/app

FROM base AS builder
COPY package.json ./
RUN bun install --ignore-scripts

FROM base AS release
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY apps/server/src ./src
COPY apps/server/tsconfig.json ./

ENV NODE_ENV=production
USER bun
EXPOSE 3000

CMD ["bun", "run", "start"]
