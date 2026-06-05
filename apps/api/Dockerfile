# Build Stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config files first for better layer caching
copy pnpm-workspace.yaml package.json pnpm-lock.yaml ./
copy apps/api/package.json apps/api/
copy packages/shared/package.json packages/shared/
copy packages/templates/package.json packages/templates/

# shamefully-hoist ensures all deps are at root node_modules (needed for ESM resolution from workspace packages)
RUN echo "shamefully-hoist=true" > .npmrc && pnpm install --no-frozen-lockfile --filter @ths-thm/api --filter @ths-thm/shared --filter @ths-thm/templates

COPY . .

# Skip unnecessary downloads for faster build
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

RUN cd apps/api && npx prisma generate && pnpm run build

# Production Stage
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Copy built workspace packages (dist and metadata)
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/templates/dist ./packages/templates/dist
COPY --from=builder /app/packages/templates/package.json ./packages/templates/package.json

COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
ENV APP_PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "apps/api/dist/main.js"]