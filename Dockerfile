# ── Stage 1: install dependencies ─────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Stage 2: build ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Stage 3: production runner ─────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Standalone Next.js output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static     ./.next/static
COPY --from=builder /app/public           ./public

# Drizzle migration deps — copied from builder so no extra npm install needed
COPY --from=builder /app/node_modules/drizzle-kit         ./node_modules/drizzle-kit
COPY --from=builder /app/node_modules/drizzle-orm         ./node_modules/drizzle-orm
COPY --from=builder /app/node_modules/mysql2              ./node_modules/mysql2
COPY --from=builder /app/node_modules/dotenv              ./node_modules/dotenv
COPY --from=builder /app/node_modules/.bin/drizzle-kit    ./node_modules/.bin/drizzle-kit
COPY --from=builder /app/drizzle.config.ts                ./drizzle.config.ts
COPY --from=builder /app/src/lib/db/schema.ts             ./src/lib/db/schema.ts

USER nextjs
EXPOSE 3000

# Run schema push before starting the server on every deploy
CMD ["sh", "-c", "./node_modules/.bin/drizzle-kit push && node server.js"]
