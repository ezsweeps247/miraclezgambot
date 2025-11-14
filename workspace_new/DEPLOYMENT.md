# Deployment Guide for Railway with Neon Database

## Prerequisites
- GitHub account
- Railway account (https://railway.app)
- Neon database account (https://neon.tech)
- NOWPayments account for crypto payments (https://nowpayments.io)
- Telegram Bot Token (from @BotFather)

## Step 1: Push to GitHub

1. Create a new GitHub repository
2. In your local terminal, run these commands:

```bash
git init
git add .
git commit -m "Initial commit - Miraclez Gaming Casino Platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

## Step 2: Set up Neon Database

1. Go to https://neon.tech and create a new project
2. Copy the connection string (it will look like: `postgresql://username:password@host/database`)
3. Save this for Railway environment variables

## Step 3: Deploy on Railway

1. Go to https://railway.app and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will automatically detect the Node.js app

## Step 4: Configure Environment Variables

In Railway, go to your project settings and add these environment variables:

### Required Variables:
```
DATABASE_URL=your_neon_database_url
NODE_ENV=production
JWT_SECRET=generate_a_secure_random_string
SESSION_SECRET=generate_another_secure_random_string
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

### Payment Integration:
```
NOWPAYMENTS_API_KEY=your_nowpayments_api_key
NOWPAYMENTS_IPN_SECRET=your_ipn_secret
NOWPAYMENTS_SANDBOX=false
```

### Optional Stripe (if using):
```
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

### Domain Configuration:
```
REPLIT_DOMAINS=your-app-name.railway.app
WEBHOOK_URL=https://your-app-name.railway.app
WEBAPP_URL=https://your-app-name.railway.app
```

## Step 5: Database Migration

After deployment, run the database migration:

1. In Railway, go to your service
2. Open the shell/terminal
3. Run: `npm run db:push`

## Step 6: Configure Telegram WebApp

1. Message @BotFather on Telegram
2. Use `/setmenubutton` command
3. Select your bot
4. Choose "Configure menu button"
5. Enter your Railway app URL: `https://your-app-name.railway.app`

## Step 7: Verify Deployment

1. Visit your Railway app URL
2. Open your Telegram bot and click the menu button
3. The casino WebApp should load

## Troubleshooting

### Database Connection Issues
- Ensure your Neon database URL includes `?sslmode=require`
- Check that the DATABASE_URL is correctly set in Railway

### Telegram Bot Issues
- Verify your TELEGRAM_BOT_TOKEN is correct
- Ensure WEBHOOK_URL matches your Railway domain

### Payment Issues
- Verify NOWPayments API credentials
- Check that crypto addresses are valid for withdrawals

## Production Considerations

1. **Security**: 
   - Use strong, unique passwords for JWT_SECRET and SESSION_SECRET
   - Enable 2FA on all service accounts

2. **Scaling**:
   - Railway automatically handles scaling
   - Monitor database connections in Neon dashboard

3. **Backups**:
   - Neon provides automatic backups
   - Consider setting up additional backup strategies

## Support

For issues specific to:
- Railway deployment: https://docs.railway.app
- Neon database: https://neon.tech/docs
- Telegram Bot API: https://core.telegram.org/bots
- NOWPayments: https://documenter.getpostman.com/view/7907941/2s93JusNJt