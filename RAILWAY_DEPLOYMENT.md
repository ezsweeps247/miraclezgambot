# Railway Deployment Guide for Miraclez Gaming

## ✅ Application is Production-Ready!

Your application has been configured and tested for Railway deployment. Here's how to deploy it:

## 1. Prerequisites

- GitHub account
- Railway account (https://railway.app)
- Neon database (already configured)

## 2. Push to GitHub

```bash
git init
git add .
git commit -m "Initial production deployment"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## 3. Deploy on Railway

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will automatically detect the configuration

## 4. Configure Environment Variables

In Railway dashboard, add these environment variables:

### Required Variables:
- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `JWT_SECRET` - Generate a secure random string
- `SESSION_SECRET` - Generate another secure random string
- `NODE_ENV` - Set to "production"
- `PORT` - Leave empty (Railway provides this)

### Optional Variables (if using):
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `TELEGRAM_BOT_USERNAME` - Your bot username
- `NOWPAYMENTS_API_KEY` - For crypto payments
- `STRIPE_SECRET_KEY` - For Stripe payments
- `STRIPE_PUBLISHABLE_KEY` - Stripe public key

### Set your domain:
- `WEBAPP_URL` - https://your-app.railway.app
- `WEBHOOK_URL` - https://your-app.railway.app

## 5. Database Migration

Railway will automatically run `npm run db:push` during build to set up your database schema.

## 6. Custom Domain (Optional)

1. In Railway settings, go to "Domains"
2. Add your custom domain
3. Update DNS records as instructed

## 7. Monitor Deployment

- Railway will show build logs in real-time
- Health check endpoint: `/health`
- Admin panel: `/admin`
- Default admin credentials: 
  - Username: `admin`
  - Password: `casino123!`
  - **CHANGE THIS IMMEDIATELY AFTER FIRST LOGIN**

## 8. Post-Deployment Checklist

- [ ] Change admin password
- [ ] Test all games
- [ ] Verify payment integrations
- [ ] Test Telegram WebApp integration
- [ ] Check WebSocket connections
- [ ] Monitor logs for any errors

## Build Commands

Railway will use these commands automatically:
- Build: `npm install && npm run build && npm run db:push`
- Start: `npm run start`

## Troubleshooting

### 🔴 Registration Failed (500 Error) - IMMEDIATE FIX REQUIRED

**If you're getting a 500 error on registration**, this is because JWT_SECRET is missing on Railway:

1. **Go to your Railway dashboard immediately**
2. **Click on your deployed service**
3. **Go to "Variables" tab**
4. **Add this critical variable**:
   ```
   JWT_SECRET=generate-a-secure-32-character-minimum-random-string-here
   ```
   Generate a secure secret using: `openssl rand -hex 32`

5. **Railway will automatically redeploy** - wait 2-3 minutes

**Why this happens**: The registration endpoint requires JWT_SECRET to generate authentication tokens. Without it, registration fails with a 500 error.

### General Deployment Issues

If deployment fails:
1. Check Railway build logs
2. Verify all environment variables are set (especially JWT_SECRET!)
3. Ensure DATABASE_URL is correct (Railway provides this automatically with PostgreSQL)
4. Check that Neon database is accessible

## Security Notes

1. Never commit `.env` files to Git
2. Use strong, unique passwords for admin accounts
3. Rotate JWT secrets regularly
4. Enable 2FA on Railway and GitHub accounts
5. Monitor access logs regularly

## Support

For Railway-specific issues: https://docs.railway.app
For app issues: Check the admin logs at `/admin`

---
Your application is configured and ready for production deployment on Railway!