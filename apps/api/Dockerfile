# Build Stage
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat python3 make g++
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependency definition files first for caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY packages/templates/package.json ./packages/templates/package.json

# Install all dependencies
RUN echo "shamefully-hoist=true" > .npmrc && pnpm install --no-frozen-lockfile

# Skip unnecessary downloads for faster build
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

# Copy source files
COPY apps/api/ ./apps/api/
COPY packages/templates/ ./packages/templates/

# Generate Prisma client and build
RUN cd apps/api && pnpm exec prisma generate
RUN cd apps/api && pnpm run build

# Production Stage
FROM node:20-alpine AS production

RUN apk add --no-cache openssl libc6-compat dumb-init
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/packages/templates ./packages/templates

# Install all dependencies (including dev) — needed for prisma generate
# Must use npx from within apps/api to find prisma CLI (it's in api's devDeps)
RUN pnpm install --frozen-lockfile --ignore-scripts && \
    cd apps/api && npx prisma generate --schema=prisma/schema.prisma

ENV NODE_ENV=production
ENV APP_PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/main.js"]
