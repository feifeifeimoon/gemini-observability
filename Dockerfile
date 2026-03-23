# Stage 1: Base
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat su-exec
WORKDIR /app

# Stage 2: Dependencies
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma/
RUN npm ci

# Stage 3: Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --production

# Stage 4: Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4318
ENV DATABASE_URL="file:/app/data/dev.db"
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build and static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

RUN mkdir -p /app/data && chown nextjs:nodejs /app/data && chmod +x /app/docker-entrypoint.sh

EXPOSE 4318
ENTRYPOINT ["/app/docker-entrypoint.sh"]
