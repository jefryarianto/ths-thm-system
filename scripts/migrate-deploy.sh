#!/bin/bash
set -e

echo "🚀 Starting database migration deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL environment variable is not set${NC}"
    exit 1
fi

# Navigate to API directory
cd apps/api

echo -e "${YELLOW}📦 Generating Prisma client...${NC}"
pnpm exec prisma generate

echo -e "${YELLOW}🔄 Running Prisma migrations...${NC}"
pnpm exec prisma migrate deploy

echo -e "${YELLOW}🌱 Checking if seed is needed...${NC}"
# Check if tables are empty (first deployment)
TABLE_COUNT=$(pnpm exec prisma db execute --stdin <<< "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | grep -oE '[0-9]+' | head -1)

if [ "$TABLE_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}🌱 First deployment detected, running seed...${NC}"
    pnpm exec prisma db seed
else
    echo -e "${GREEN}✅ Tables already exist, skipping seed${NC}"
fi

echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
pnpm exec prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"User\";" 2>/dev/null && echo -e "${GREEN}✅ Users table accessible${NC}" || echo -e "${YELLOW}⚠️  Users table check failed${NC}"

echo -e "${GREEN}✅ Migration deployment completed successfully!${NC}"

# Return to root
cd ../..