# Railway + Neon Deployment Checklist

## ✅ Fixed Issues
- [x] Health endpoint moved to first position in middleware stack
- [x] Admin authentication using correct database tables
- [x] Geolocation bypass for admin routes

## 🔧 Environment Variables Required in Railway

Copy these EXACTLY to your Railway environment variables:

### 1. DATABASE_URL (From Neon)
```
DATABASE_URL=postgresql://[username]:[password]@ep-raspy-darkness-afcywaay.ap-southeast-1.aws.neon.tech/production?sslmode=require
```
**Important:** 
- Copy the EXACT connection string from Neon dashboard
- Include `?sslmode=require` at the end
- Make sure password doesn't contain special characters that need encoding

### 2. JWT_SECRET
```
JWT_SECRET=your-super-secret-key-change-this-in-production
```
Generate a strong secret: `openssl rand -base64 32`

### 3. TELEGRAM_BOT_TOKEN
```
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
```

### 4. NODE_ENV
```
NODE_ENV=production
```

### 5. DO NOT SET PORT
Railway automatically provides PORT. Never set it manually!

## 🚀 Deployment Steps

### 1. Verify Local Build
```bash
npm run build
npm run db:push
```

### 2. Test Production Mode Locally
```bash
NODE_ENV=production DATABASE_URL=your-neon-url npm start
```

### 3. Push to GitHub
```bash
git add -A
git commit -m "Fix Railway deployment with health endpoint"
git push origin main
```

### 4. In Railway Dashboard
1. Go to your service settings
2. Click "Variables" tab
3. Add all environment variables above
4. Click "Deploy" tab
5. Trigger manual deploy if needed

### 5. Verify Deployment
After deployment completes, test these endpoints:

1. **Health Check:**
   ```
   https://your-app.railway.app/health
   ```
   Should return: `{"status":"healthy","timestamp":"..."}`

2. **Main App:**
   ```
   https://your-app.railway.app
   ```

3. **Admin Panel:**
   ```
   https://your-app.railway.app/admin
   ```
   Login: admin / casino123!

## 🔍 Troubleshooting

### If "Application failed to respond" persists:

1. **Check Railway Logs:**
   - Look for database connection errors
   - Check for missing environment variables
   - Verify PORT is not manually set

2. **Database Connection Issues:**
   - Verify DATABASE_URL is copied correctly
   - Ensure Neon database is not paused
   - Check if IP allowlist is configured (should be open to all)

3. **Common Errors:**
   ```
   Error: connect ECONNREFUSED
   → DATABASE_URL is missing or incorrect
   
   Error: JWT_SECRET is not defined
   → Add JWT_SECRET environment variable
   
   Error: TELEGRAM_BOT_TOKEN is required
   → Add TELEGRAM_BOT_TOKEN variable
   ```

## 📊 Your Neon Database Info
- **Endpoint:** ep-raspy-darkness-afcywaay
- **Region:** ap-southeast-1 (Singapore)
- **Branch:** production (primary)
- **Size:** 32.23 MB / 536.87 MB
- **Status:** Active ✅

## 🎯 Final Checklist
- [ ] All environment variables added to Railway
- [ ] Health endpoint returning JSON
- [ ] Database connected (check logs)
- [ ] Telegram bot responding
- [ ] Admin panel accessible
- [ ] Main app loading

Once all items are checked, your deployment should be working!