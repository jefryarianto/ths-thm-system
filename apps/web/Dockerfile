# Build Stage
FROM node:22-alpine AS builder

RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate

WORKDIR /app

# Copy ALL source + dependency definition files (single copy for one install)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/ ./apps/
COPY packages/ ./packages/

# Install ALL dependencies (incl. devDeps) + run prepare scripts (prisma generate) once.
# supportedArchitectures + retries MUST live in pnpm-workspace.yaml (pnpm v11 ignores them in .npmrc).
RUN printf "\nsupportedArchitectures:\n  os:\n    - linux\n  cpu:\n    - x64\npreferOffline: true\nfetchRetries: 10\nfetchRetryFactor: 2\nfetchRetryMinTimeout: 5000\nfetchRetryMaxTimeout: 60000\nnetworkConcurrency: 4\n" >> pnpm-workspace.yaml && \
    pnpm install --frozen-lockfile --fetch-timeout 1200000

# Build with realtime features enabled for production
RUN NEXT_PUBLIC_ENABLE_REALTIME=true pnpm --filter @ths-thm/web build

# Production Stage
FROM node:22-alpine

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
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate && \
    printf "\nsupportedArchitectures:\n  os:\n    - linux\n  cpu:\n    - x64\npreferOffline: true\nfetchRetries: 10\nfetchRetryFactor: 2\nfetchRetryMinTimeout: 5000\nfetchRetryMaxTimeout: 60000\nnetworkConcurrency: 4\n" >> pnpm-workspace.yaml && \
    pnpm install --frozen-lockfile --prod --ignore-scripts

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]