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

# Production Stage
FROM node:22-alpine AS production

# poppler-utils: menyediakan pdftoppm yang dipakai pdf-poppler (endpoint PNG kartu)
RUN apk add --no-cache openssl libc6-compat dumb-init poppler-utils

WORKDIR /app

# Copy built API output (dist + prisma schema)
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma

# Copy the entire root node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# ── Fix @ths-thm/shared-types module resolution ──────────────────────
# pnpm workspace symlinks are NOT reliably preserved by Docker COPY,
# so we recreate the module explicitly using individual COPY + RUN.
# Docker COPY follows symlinks but may flatten the chain or produce
# broken entries. This step always creates a clean, real directory.
COPY --from=builder /app/packages/shared-types/package.json /tmp/stage-shared-types/package.json
COPY --from=builder /app/packages/shared-types/dist/index.js /tmp/stage-shared-types/dist/index.js
COPY --from=builder /app/packages/shared-types/dist/index.js.map /tmp/stage-shared-types/dist/index.js.map
COPY --from=builder /app/packages/shared-types/dist/index.d.ts /tmp/stage-shared-types/dist/index.d.ts
COPY --from=builder /app/packages/shared-types/dist/index.d.ts.map /tmp/stage-shared-types/dist/index.d.ts.map
RUN rm -rf /app/node_modules/@ths-thm/shared-types && \
    mkdir -p /app/node_modules/@ths-thm/shared-types/dist && \
    cp /tmp/stage-shared-types/package.json /app/node_modules/@ths-thm/shared-types/ && \
    cp /tmp/stage-shared-types/dist/* /app/node_modules/@ths-thm/shared-types/dist/ && \
    rm -rf /tmp/stage-shared-types

ENV NODE_ENV=production
ENV APP_PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
