# Build Stage
FROM node:22-alpine AS builder

# Install dependencies for native modules and Prisma
RUN apk add --no-cache openssl libc6-compat python3 make g++
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate

WORKDIR /app

# Copy dependency definition files first for caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/templates/package.json ./packages/templates/package.json

# Install all dependencies
RUN echo "shamefully-hoist=true" > .npmrc && pnpm install --frozen-lockfile --ignore-scripts --fetch-timeout 1200000

# Skip unnecessary downloads for faster build
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

# Clean up pnpm-created workspace node_modules before copying source
RUN rm -rf apps/api/node_modules packages/shared-types/node_modules packages/templates/node_modules 2>/dev/null; exit 0

# Copy source files
COPY apps/api/ ./apps/api/
COPY packages/shared-types/ ./packages/shared-types/
COPY packages/templates/ ./packages/templates/

# Build shared-types before building API
RUN cd packages/shared-types && pnpm run build

# Generate Prisma client and build
RUN cd apps/api && pnpm exec prisma generate
RUN cd apps/api && pnpm run build

# Remove .d.ts and .d.ts.map files from dist — they are not needed at
# runtime and their embedded relative paths (from tsconfig paths) cause
# MODULE_NOT_FOUND when NestJS/Swagger metadata scanning tries to resolve
# the TypeScript declaration import paths.
RUN find apps/api/dist -name '*.d.ts' -delete && \
    find apps/api/dist -name '*.d.ts.map' -delete

# ── Production Stage ──────────────────────────────────────────────
FROM node:22-alpine AS production

RUN apk add --no-cache openssl libc6-compat dumb-init poppler-utils

WORKDIR /app

# Copy built API output (dist + prisma schema)
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma

# Copy the entire root node_modules from builder.
COPY --from=builder /app/node_modules ./node_modules

# Copy shared-types source + dist (needed for fix below)
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/package.json

# ── Fix workspace package resolution ────────────────────────────────
RUN rm -rf node_modules/@ths-thm/shared-types && \
    mkdir -p node_modules/@ths-thm/shared-types/dist && \
    cp packages/shared-types/package.json node_modules/@ths-thm/shared-types/ && \
    cp packages/shared-types/dist/index.js node_modules/@ths-thm/shared-types/dist/ && \
    cp packages/shared-types/dist/index.d.ts node_modules/@ths-thm/shared-types/dist/ && \
    cp packages/shared-types/dist/index.js.map node_modules/@ths-thm/shared-types/dist/ && \
    cp packages/shared-types/dist/index.d.ts.map node_modules/@ths-thm/shared-types/dist/

# Copy startup wrapper
COPY apps/api/start.sh /app/start.sh
RUN chmod +x /app/start.sh

ENV NODE_ENV=production
ENV APP_PORT=3001
ENV NODE_PATH=/app/node_modules

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/start.sh"]
