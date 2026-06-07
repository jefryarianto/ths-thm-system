# Build Stage
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat python3 make g++
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config files first for better layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/templates/package.json packages/templates/

# Install all dependencies (skip scripts to avoid prisma generate before schema is available)
RUN echo "shamefully-hoist=true" > .npmrc && pnpm install --no-frozen-lockfile --ignore-scripts

COPY . .

# Skip unnecessary downloads for faster build
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

# Generate Prisma client
RUN cd apps/api && pnpm exec prisma generate
RUN cd apps/api && pnpm run build

# Production Stage
FROM node:20-alpine AS production

RUN apk add --no-cache openssl libc6-compat dumb-init
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy all node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Copy workspace packages source
COPY --from=builder /app/packages/templates ./packages/templates

# Copy necessary package.json files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

ENV NODE_ENV=production
ENV APP_PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/main.js"]

# Skip Prisma migrate in container, run from host instead
# docker-compose command: sh -c "node apps/api/dist/main.js"
