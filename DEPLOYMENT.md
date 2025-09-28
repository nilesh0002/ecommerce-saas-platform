# 🚀 Deployment Guide

## Backend Deployment Options

### Option 1: Render (Recommended)
1. **Create Render Account**: https://render.com
2. **Connect GitHub**: Link your repository
3. **Create Web Service**:
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
   - Environment: Node.js

### Option 2: Railway
1. **Create Railway Account**: https://railway.app
2. **Deploy from GitHub**: Connect repository
3. **Set Root Directory**: `/backend`

### Option 3: Vercel (Serverless)
1. **Install Vercel CLI**: `npm i -g vercel`
2. **Deploy**: `cd backend && vercel`

## Environment Variables Required

```env
DATABASE_URL=postgresql://user:pass@host:port/database
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
PORT=5000
NODE_ENV=production

# Razorpay
RAZORPAY_KEY_ID=rzp_live_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret_key
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Cloudflare R2
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=ecommerce-images
R2_PUBLIC_URL=https://your-custom-domain.com

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
ADMIN_EMAIL=admin@yourplatform.com
```

## Database Setup (Supabase)

1. **Create Supabase Project**: https://supabase.com
2. **Run SQL Migrations**:
   ```sql
   -- Execute in order:
   -- 1. database/schema.sql
   -- 2. database/ecommerce-schema.sql
   ```
3. **Copy Connection String** to `DATABASE_URL`

## Frontend Deployment (Vercel)

1. **Create Vercel Account**: https://vercel.com
2. **Import Project**: Connect GitHub repository
3. **Set Framework**: React
4. **Root Directory**: `/frontend`
5. **Environment Variables**:
   ```env
   REACT_APP_API_URL=https://your-backend-url.onrender.com
   REACT_APP_RAZORPAY_KEY_ID=rzp_live_your_key_id
   ```

## Post-Deployment Steps

1. **Test API Endpoints**: Use Postman/Thunder Client
2. **Configure Razorpay Webhooks**: Point to `https://your-backend-url/api/webhook/razorpay`
3. **Set up Custom Domains** (Optional)
4. **Configure CORS** for your frontend domain

## Quick Deploy Commands

```bash
# Push to GitHub
git remote add origin https://github.com/yourusername/hardware-ecommerce-saas.git
git branch -M main
git push -u origin main

# Deploy backend to Render
# (Use Render dashboard to connect GitHub)

# Deploy frontend to Vercel
cd frontend
npx vercel --prod
```