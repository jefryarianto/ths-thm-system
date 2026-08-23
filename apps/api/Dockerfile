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
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate

WORKDIR /app

# Copy workspace manifests + API package (needed by pnpm deploy for resolution)
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY --from=builder /app/apps/api/nest-cli.json ./apps/api/nest-cli.json

# Deploy ONLY @ths-thm/api with its production dependencies (no devDeps,
# no sibling workspace packages such as web/mobile). Result is a
# self-contained /app/api-deploy with exactly what the API needs at runtime.
RUN pnpm --filter @ths-thm/api deploy --prod --legacy --ignore-scripts /app/api-deploy

# pnpm deploy does not always copy workspace:* dependencies into node_modules.
# Use COPY --from=builder (not RUN cp) to reliably inject the built package
# from the builder stage, independent of any cleanup pnpm deploy may do.
COPY --from=builder /app/node_modules/@ths-thm/shared-types /app/api-deploy/node_modules/@ths-thm/shared-types

# Copy the Prisma client generated during the build stage into the deployed
# node_modules. The `prisma` CLI is a devDependency (not deployed with --prod),
# but the generated client at node_modules/.prisma is required at runtime.
COPY --from=builder /app/node_modules/.prisma /app/api-deploy/node_modules/.prisma

# Copy the Prisma CLI binary for running migrations in production
COPY --from=builder /app/node_modules/prisma /app/api-deploy/node_modules/prisma

# Move the deployed package to /app. Keep WORKDIR /app because storage paths
# are resolved relative to process.cwd() (e.g. documents.service.ts uses
# path.resolve('storage','documents')) and docker-compose mounts ./storage
# at /app/storage.
RUN cp -a /app/api-deploy/. /app/ && \
    rm -rf /app/api-deploy /app/apps /app/packages /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/tsconfig.base.json /app/src /app/test /app/coverage /app/api.log /app/*.tsbuildinfo && \
    rm -f /app/Dockerfile /app/Dockerfile.test /app/package-lock.json /app/ths-thm-system-*-firebase-adminsdk-*.json && \
    # Firebase admin SDK is initialized from env vars (FCM_PROJECT_ID/FCM_PRIVATE_KEY/FCM_CLIENT_EMAIL)
    # so the service-account JSON file is not needed in the image.
    true

ENV NODE_ENV=production
ENV APP_PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]