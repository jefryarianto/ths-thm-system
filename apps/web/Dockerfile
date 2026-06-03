# Build Stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config files for better layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/

# shamefully-hoist ensures all deps are at root node_modules (needed for pnpm workspace resolution)
RUN echo "shamefully-hoist=true" > .npmrc && pnpm install --no-frozen-lockfile --filter @ths-thm/web

COPY . .

RUN pnpm --filter @ths-thm/web build

# Production Stage
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "apps/web/server.js"]