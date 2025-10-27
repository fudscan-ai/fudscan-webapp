#!/bin/bash

# Vercel Deployment Script for FudScan AI
# This script handles database migrations and deployment

set -e

echo "🚀 Starting FudScan AI deployment to Vercel..."

# Check if we're in production
if [ "$VERCEL_ENV" = "production" ]; then
    echo "📦 Production deployment detected"
    
    # Generate Prisma client
    echo "🔧 Generating Prisma client..."
    npx prisma generate
    
    # Run database migrations
    echo "🗄️ Running database migrations..."
    npx prisma migrate deploy
    
    echo "✅ Database migrations completed"
else
    echo "🔧 Development/preview deployment"
    npx prisma generate
fi

echo "🎉 Deployment preparation completed!"
