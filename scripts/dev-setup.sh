#!/bin/sh
# Development environment setup script for THS-THM System

set -e

echo "🚀 THS-THM System Development Environment Setup"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env created. Please review and update with your configuration."
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🔨 Building development image..."
docker-compose -f docker-compose.dev.yml build

echo ""
echo "📦 Starting services (PostgreSQL, Redis, Dev container)..."
docker-compose -f docker-compose.dev.yml up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

echo ""
echo "✅ Services started successfully!"
echo ""
echo "📍 Access points:"
echo "   🔌 API:             http://localhost:3001"
echo "   🎨 Web Dashboard:   http://localhost:3002"
echo "   📊 Prisma Studio:   http://localhost:5555"
echo "   🗄️  Database:        localhost:54321"
echo "   💾 Redis:           localhost:6379"
echo ""
echo "📋 Useful commands:"
echo "   View logs:          docker-compose -f docker-compose.dev.yml logs -f dev"
echo "   Stop services:      docker-compose -f docker-compose.dev.yml down"
echo "   Database reset:     docker-compose -f docker-compose.dev.yml exec dev pnpm db:seed"
echo "   Prisma Studio:      docker-compose -f docker-compose.dev.yml exec dev pnpm db:studio"
echo ""
echo "📚 Documentation:"
echo "   API Swagger:        http://localhost:3001/api/docs"
echo "   Next.js Dev:        Changes auto-reload on port 3002"
echo "   NestJS watch:       Changes auto-rebuild on port 3001"
echo ""
