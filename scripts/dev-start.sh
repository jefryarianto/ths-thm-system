#!/bin/sh
set -e

echo "THS-THM Development Environment"
echo "================================"
echo ""
echo "1. Installing dependencies..."
pnpm install

echo ""
echo "2. Generating Prisma client..."
cd apps/api
pnpm exec prisma generate

echo ""
echo "3. Running migrations..."
pnpm exec prisma migrate deploy || pnpm exec prisma migrate dev --skip-generate

echo ""
echo "✅ Setup complete!"
echo ""
echo "Starting development servers..."
echo "API:  http://localhost:3001"
echo "Web:  http://localhost:3002"
echo ""

# Start both servers
concurrently "pnpm --filter @ths-thm/api start:dev" "pnpm --filter @ths-thm/web dev"
