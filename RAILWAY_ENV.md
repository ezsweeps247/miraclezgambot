# Railway Environment Variables Setup

## Required Environment Variables for Railway Deployment

Add these to your Railway project's Variables section:

### Core Configuration
```
NODE_ENV=production
JWT_SECRET=your-secure-jwt-secret-here
DATABASE_URL=postgresql://... (Railway provides this automatically)
```

### Admin Configuration
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password
```

### Telegram Bot Configuration
```
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
WEBHOOK_URL=https://your-app-name.up.railway.app
```
Replace `your-app-name` with your actual Railway app URL.

### Payment Integration (Optional)
```
STRIPE_SECRET_KEY=your-stripe-secret-key
NOWPAYMENTS_API_KEY=your-nowpayments-key
```

### Crypto Configuration (Optional)
```
BITCOIN_RPC_URL=your-bitcoin-rpc-url
ETHEREUM_RPC_URL=your-ethereum-rpc-url
```

## Important Notes

1. **DO NOT SET PORT** - Railway automatically provides this
2. **WEBHOOK_URL** must be your Railway app URL, not Replit
3. All sensitive keys should be kept secret and never committed to code
4. Admin credentials will create admin user on first startup
5. JWT_SECRET should be a long random string for security

## How to Set in Railway

1. Go to your Railway project
2. Click on your service
3. Go to "Variables" tab
4. Add each variable with its value
5. Railway will automatically redeploy

## Verification

After deployment, you can access:
- Main app: `https://your-app-name.up.railway.app`
- Admin panel: `https://your-app-name.up.railway.app/admin`
- Telegram bot will use webhook at: `https://your-app-name.up.railway.app/webhook/[BOT_TOKEN]`