FROM oven/bun:1.2-alpine AS dependencies

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM node:22-alpine AS builder

WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN DB_FILE_NAME=file:/tmp/print-requests-build.db node ./node_modules/next/dist/bin/next build --webpack

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock ./bun.lock

RUN mkdir -p /app/data/uploads

EXPOSE 3000

CMD ["sh", "-c", "node ./node_modules/drizzle-kit/bin.cjs migrate && exec node ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p 3000"]
