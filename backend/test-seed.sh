#!/bin/bash

echo "🧪 Testing Seed Script..."

# Set environment
export DATABASE_URL="file:./prisma/dev.db"
export JWT_SECRET="test-secret"
export JWT_REFRESH_SECRET="test-refresh-secret"
export PORT=3000
export NODE_ENV=development
export CORS_ORIGIN="http://localhost:3001"

# Clean database
rm -f prisma/dev.db

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Push schema
echo "🗄️  Pushing schema..."
npx prisma db push --skip-generate

# Run seed
echo "🌱 Running seed..."
npx ts-node prisma/seed.ts

echo "✅ Test complete!"
