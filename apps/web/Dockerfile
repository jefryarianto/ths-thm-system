# Build Stage
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy source FIRST (before install)
COPY . .

# Then install (pnpm akan generate node_modules)
RUN echo "shamefully-hoist=true" > .npmrc && \
    pnpm install --no-frozen-lockfile --ignore-scripts --filter @ths-thm/web

# Build
RUN pnpm --filter @ths-thm/web build

# Production Stage
FROM node:20-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy all node_modules first
COPY --from=builder /app/node_modules ./node_modules

# Copy only runtime files
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./package.json

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["./node_modules/.bin/next", "start", "-p", "3000"]
