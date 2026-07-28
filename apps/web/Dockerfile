# Build Stage
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy dependency definition files first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/web/tsconfig.json ./apps/web/tsconfig.json
COPY apps/web/next.config.* ./apps/web/

# Install ALL dependencies (including devDeps for build)
RUN echo "shamefully-hoist=true" > .npmrc && pnpm install --frozen-lockfile --ignore-scripts

# Copy source files AFTER install (preserves layer cache)
COPY apps/web/ ./apps/web/
COPY packages/ ./packages/

# Build with realtime features enabled for production
RUN NEXT_PUBLIC_ENABLE_REALTIME=true pnpm --filter @ths-thm/web build

# Production Stage
FROM node:20-alpine

RUN apk add --no-cache dumb-init wget

WORKDIR /app

# Copy only runtime files from builder
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/apps/web/next.config.* ./

# Install only production dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate && \
    echo "shamefully-hoist=true" > .npmrc && pnpm install --frozen-lockfile --prod --ignore-scripts && \
    rm -f .npmrc

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
