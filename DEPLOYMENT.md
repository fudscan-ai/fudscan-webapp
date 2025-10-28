# FUDSCAN AI - Vercel Deployment Guide

## Project Overview

FUDSCAN is an AI-powered crypto risk scanner built with:
- **Frontend**: Next.js 15.4.6, React 19, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **AI**: OpenAI GPT-4o for workflow orchestration
- **Database**: PostgreSQL (Prisma)
- **APIs**: DexScreener, Nansen, DeBank, AIBRK

### Current Functionality

 All 11 API tools configured and operational
 AI workflow orchestrator selecting tools correctly
 Real API calls being made to external services
 Database properly querying through junction tables
 Chat interface with streaming responses
 Admin dashboard for client and API tool management

---

## Prerequisites

Before deploying, ensure you have:

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Code pushed to GitHub
3. **API Keys**:
   - OpenAI API key (required)
   - DeBan

k API key (optional)
   - Nansen API key (optional)
4. **PostgreSQL Database**: Choose one:
   - **Option A**: Vercel Postgres (recommended for quick start)
   - **Option B**: Neon.tech (generous free tier)
   - **Option C**: Supabase (includes auth features)

---

## Step 1: Database Setup

### Option A: Vercel Postgres (Recommended)

**Important**: Use Vercel Postgres for your PostgreSQL database, NOT Vercel Blob. Blob is for file storage only.

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **Storage** → **Create Database** → **Postgres** (NOT Blob!)
3. Name your database (e.g., `fudscan-db`)
4. Choose region (select same as your app region, e.g., `us-east-1`)
5. Click **Create**
6. After creation, click on your database
7. Go to **.env.local** tab
8. Copy all the environment variables, especially:
   - `POSTGRES_URL` or `DATABASE_URL`
   - `POSTGRES_PRISMA_URL` (use this one for Prisma)
9. Save these for Step 3

**Note**: Vercel Postgres provides multiple connection strings:
- `POSTGRES_URL` - For connection pooling
- `POSTGRES_PRISMA_URL` - **Use this one** for Prisma (includes `?pgbouncer=true`)
- `POSTGRES_URL_NON_POOLING` - Direct connection

### Option B: Neon.tech

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project
3. Copy the connection string (looks like: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`)
4. Save this for Step 3

### Option C: Supabase

1. Go to [supabase.com](https://supabase.com) and create project
2. Go to **Settings** → **Database**
3. Copy **Connection string** (choose "Transaction" mode for Prisma)
4. Replace `[YOUR-PASSWORD]` with your actual password
5. Save this for Step 3

---

## Step 2: Push to GitHub

If not already done:

```bash
cd /Users/sdzl33/Documents/GitHub/fudscan-ai/fudscan-webapp

# Initialize git (if not already initialized)
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Vercel deployment"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/fudscan-webapp.git

# Push
git push -u origin main
```

---

## Step 3: Deploy to Vercel

### 3.1 Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select your GitHub repository
4. Click **Import**

### 3.2 Configure Project

1. **Project Name**: `fudscan-ai` (or your preferred name)
2. **Framework Preset**: Next.js (auto-detected)
3. **Root Directory**: `./` (leave default)
4. **Build Command**: Keep default or use `prisma generate && next build`
5. **Output Directory**: `.next` (default)

### 3.3 Environment Variables

Click **Environment Variables** and add the following:

#### Required Variables

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `DATABASE_URL` | `postgresql://...` | From Step 1 (your database provider) |
| `OPENAI_API_KEY` | `sk-proj-...` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `JWT_SECRET` | Random string | Run: `openssl rand -base64 32` |

#### Optional Variables

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `DEBANK_API_KEY` | Your key | [docs.open.debank.com](https://docs.open.debank.com/) |
| `NANSEN_API_KEY` | Your key | [nansen.ai/api](https://www.nansen.ai/api) |
| `CHROMA_URL` | `http://your-chroma-instance` | Only if using RAG/documents |
| `BLOB_READ_WRITE_TOKEN` | `vercel_blob_***` | Vercel Dashboard → Storage → Blob (for file uploads) |

#### Public Variables

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_BASE_URL` | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_DEFAULT_API_KEY` | `your_generated_api_key` |

**Important**: For `NEXT_PUBLIC_BASE_URL`, initially use `https://fudscan-ai.vercel.app` (or your chosen name), then update after deployment with your actual URL.

### 3.4 Deploy

1. Click **Deploy**
2. Wait 2-3 minutes for build to complete
3. Note your deployment URL (e.g., `https://fudscan-ai.vercel.app`)

---

## Step 4: Database Migration

After first deployment, you need to run Prisma migrations:

### Method 1: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Run migration
vercel env pull .env.local
npm run migrate
```

### Method 2: Local Migration

```bash
# Pull environment variables from Vercel
cd /Users/sdzl33/Documents/GitHub/fudscan-ai/fudscan-webapp

# Set DATABASE_URL to your production database
export DATABASE_URL="your_production_database_url_from_step_1"

# Run migrations
npx prisma migrate deploy

# OR create new migration if needed
npx prisma migrate dev --name init
```

### Method 3: Vercel Build Hook

Add a build hook to run migrations automatically:

1. **Update `package.json`**:
```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

2. Commit and push:
```bash
git add package.json
git commit -m "Add automatic migrations to build"
git push
```

---

## Step 5: Seed Database with API Tools

After migration, seed the database with API tools:

```bash
# Using your production database
export DATABASE_URL="your_production_database_url"
export OPENAI_API_KEY="your_openai_key"
export JWT_SECRET="your_jwt_secret"

# Create default client
node scripts/setupTestClient.js

# Add API tools (already configured)
node scripts/addRealApiTools.js
```

---

## Step 6: Update Environment Variables

After deployment, update `NEXT_PUBLIC_BASE_URL`:

1. Go to Vercel Dashboard → Your Project
2. Click **Settings** → **Environment Variables**
3. Find `NEXT_PUBLIC_BASE_URL`
4. Update to your actual URL: `https://your-app-name.vercel.app`
5. Click **Save**
6. **Redeploy** (go to Deployments → click ⋯ → Redeploy)

---

## Step 7: Verify Deployment

Test your deployment:

### 7.1 Check Homepage

Visit `https://your-app.vercel.app` - should load the chat interface

### 7.2 Test API

```bash
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about Bitcoin", "stream": false}'
```

Expected response: JSON with workflow and tools array populated

### 7.3 Check Admin Dashboard

Visit `https://your-app.vercel.app/admin/login`

Create admin user:
```bash
export DATABASE_URL="your_production_database_url"
node scripts/createAdmin.js
```

---

## Troubleshooting

### Build Fails with "Cannot find module 'typescript'"

**Solution**: Already fixed in `package.json` - `typescript` is in devDependencies

### Build Fails with "Prisma Client not found"

**Solution**: Already fixed - `postinstall` script runs `prisma generate`

### Database Connection Errors

**Check**:
1. `DATABASE_URL` is correctly set in Vercel environment variables
2. Connection string includes `?sslmode=require` for most cloud providers
3. Database is accessible from Vercel's IP ranges

### API Tools Not Loading

**Check**:
1. Database has been migrated (`npx prisma migrate deploy`)
2. API tools have been seeded (run `scripts/addRealApiTools.js`)
3. Client exists in database (run `scripts/setupTestClient.js`)

### Empty Tools Array in Responses

This was the bug we just fixed! Make sure:
1. Latest code is deployed
2. `src/pages/api/chat.js` has the corrected database query (line 205-230)

---

## Project Structure

```
fudscan-webapp/
├── src/
│   ├── pages/
│   │   ├── api/
│   │   │   ├── chat.js          # Chat endpoint (just fixed!)
│   │   │   ├── ai/
│   │   │   │   ├── ask.js       # Main AI workflow endpoint
│   │   │   │   └── ask_sync.js  # Synchronous version
│   │   │   └── admin/           # Admin API routes
│   │   ├── chat.js              # Main chat UI
│   │   └── admin/               # Admin dashboard
│   ├── lib/
│   │   ├── ai-workflow.js       # AI workflow orchestrator (GPT-4o)
│   │   ├── prisma.js            # Prisma client
│   │   └── chroma.js            # Vector DB (optional)
│   ├── components/
│   │   ├── ChatBox.js           # Chat interface
│   │   └── admin/               # Admin components
│   └── generated/prisma/        # Generated Prisma client (gitignored)
├── prisma/
│   └── schema.prisma            # Database schema
├── scripts/
│   ├── setupTestClient.js       # Create test client
│   ├── addRealApiTools.js       # Seed API tools
│   └── createAdmin.js           # Create admin user
├── .env                         # Local environment (gitignored)
├── .env.example                 # Template for environment variables
├── vercel.json                  # Vercel configuration
├── package.json                 # Dependencies and scripts
└── DEPLOYMENT.md                # This file
```

---

## Environment Variables Reference

### Complete .env Template

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require

# AI Services
OPENAI_API_KEY=sk-proj-...
CHROMA_URL=http://localhost:8000

# Security
JWT_SECRET=your_random_32_char_string

# External APIs
DEBANK_API_KEY=your_debank_key
NANSEN_API_KEY=your_nansen_key

# Public Variables
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
NEXT_PUBLIC_DEFAULT_API_KEY=test_api_key_12345
```

---

## Post-Deployment

### Enable Vercel Blob Storage (Optional - For File Uploads)

Vercel Blob is useful for storing uploaded documents in the admin dashboard:

1. **Create Blob Store**:
   - Go to Vercel Dashboard → Storage → Create Database → **Blob**
   - Name it (e.g., `fudscan-files`)
   - Click Create

2. **Get Blob Token**:
   - Click on your Blob store
   - Go to **.env.local** tab
   - Copy `BLOB_READ_WRITE_TOKEN`

3. **Add to Vercel Environment Variables**:
   ```
   BLOB_READ_WRITE_TOKEN=vercel_blob_***************
   ```

4. **Install Vercel Blob SDK** (if not already installed):
   ```bash
   npm install @vercel/blob
   ```

5. **Update Document Upload Handler** (src/pages/api/admin/documents/upload.js):
   ```javascript
   import { put } from '@vercel/blob';

   // Instead of saving to local filesystem, save to Blob
   const { url } = await put(`documents/${filename}`, fileBuffer, {
     access: 'public',
     addRandomSuffix: true
   });

   // Save the blob URL to database
   await prisma.document.create({
     data: {
       name: filename,
       url: url,  // Blob URL
       // ... other fields
     }
   });
   ```

**Note**: This is optional. The app works fine without Blob storage using database storage for documents.

### Enable Chroma Vector Database (Optional - For RAG)

If you want to use advanced RAG/document search features:

1. Deploy Chroma to a cloud service (e.g., Railway, Render)
2. Add `CHROMA_URL` environment variable in Vercel
3. Upload documents via `/admin/documents`

### Configure Custom Domain

1. Go to Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_BASE_URL` to your custom domain

### Monitor Application

- **Logs**: Vercel Dashboard → Your Project → Logs
- **Analytics**: Vercel Dashboard → Your Project → Analytics
- **Errors**: Check `/admin/dashboard` for API errors

---

## Updating Application

```bash
# Make changes locally
git add .
git commit -m "Your update message"
git push

# Vercel auto-deploys on push to main branch
```

---

## Support & Resources

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **Prisma Docs**: [prisma.io/docs](https://www.prisma.io/docs)
- **OpenAI API**: [platform.openai.com/docs](https://platform.openai.com/docs)

---

## Quick Start Commands

```bash
# Development
npm run dev

# Build
npm run build

# Database
npm run migrate        # Run migrations
npm run studio         # Open Prisma Studio

# Scripts
node scripts/setupTestClient.js      # Create client
node scripts/addRealApiTools.js      # Seed API tools
node scripts/createAdmin.js          # Create admin user
node scripts/testChat.js             # Test chat endpoint
```

---

**Last Updated**: 2025-10-28
**Version**: 1.0.0
