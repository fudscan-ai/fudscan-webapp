#!/bin/bash

# Database Migration Script for Production
# Run this after setting up your production database

set -e

echo "🗄️ Setting up production database..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    exit 1
fi

echo "📊 Database URL configured: ${DATABASE_URL:0:20}..."

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Create initial migration if needed
echo "📝 Creating initial migration..."
npx prisma migrate dev --create-only --name init

# Deploy migrations
echo "🚀 Deploying migrations to production..."
npx prisma migrate deploy

# Create admin user
echo "👤 Creating admin user..."
node scripts/createAdmin.js

echo "✅ Database setup completed!"
echo "🔗 You can now access Prisma Studio with: npx prisma studio"
