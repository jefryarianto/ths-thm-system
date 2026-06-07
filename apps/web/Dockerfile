# Build Stage
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config files for better layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/

# Install ONLY web dependencies
RUN echo "shamefully-hoist=true" > .npmrc && \
    pnpm install --no-frozen-lockfile --filter @ths-thm/web 2>&1 || true

COPY . .

# Build Next.js with env vars needed at build time
ENV NEXT_PUBLIC_API_URL=http://api:3001
RUN cd apps/web && node /app/node_modules/next/dist/bin/next build

# Production Stage
FROM node:20-alpine AS production

RUN apk add --no-cache openssl libc6-compat dumb-init

WORKDIR /app

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

ENV NODE_ENV=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/web/server.js"]
