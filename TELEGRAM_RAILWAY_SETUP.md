# 🚀 Fixing "Failed to load TELEBOT-19" Error on Railway

## The Problem
Your Telegram bot can't load the WebApp because the bot doesn't know where your Railway app is deployed.

## Quick Fix - 3 Steps

### Step 1: Get Your Railway App URL
1. Go to your Railway dashboard
2. Click on your deployed app
3. Find your app's URL (looks like: `https://your-app-name.up.railway.app`)
4. Copy this URL

### Step 2: Set Environment Variables in Railway
Go to your Railway app settings and add these environment variables:

```bash
# Required for Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
WEBAPP_URL=https://your-app-name.up.railway.app
WEBHOOK_URL=https://your-app-name.up.railway.app

# Required for Production
NODE_ENV=production
JWT_SECRET=your-32-character-secure-random-string-here

# Your Database (Railway provides this)
DATABASE_URL=postgresql://...
```

### Step 3: Configure Your Telegram Bot
1. Open Telegram and search for **@BotFather**
2. Send `/mybots` and select your bot (TELEBOT-19)
3. Choose **Bot Settings** → **Menu Button**
4. Select **Configure menu button**
5. Send your Railway app URL: `https://your-app-name.up.railway.app`

## Alternative: Update Bot WebApp URL via BotFather
If the menu button doesn't work, set the WebApp directly:
1. Message @BotFather
2. Send `/setmenubutton`
3. Select your bot
4. Send this JSON:
```json
{
  "type": "web_app",
  "text": "🎮 Open Casino",
  "web_app": {
    "url": "https://your-app-name.up.railway.app"
  }
}
```

## Verify Your Setup
After setting everything up:
1. Redeploy your Railway app (it will pick up the new environment variables)
2. Wait 2-3 minutes for deployment to complete
3. Open your Telegram bot
4. Send `/start` command
5. Click "🎮 Open Casino" button

## Common Issues & Solutions

### Still seeing "Failed to load"?
- **Check CORS**: Your Railway app should allow Telegram domains
- **Check HTTPS**: Railway provides HTTPS by default, but verify your URL uses `https://`
- **Check Bot Token**: Make sure TELEGRAM_BOT_TOKEN is exactly as BotFather gave you

### Bot not responding?
- Check Railway logs for any errors
- Verify TELEGRAM_BOT_TOKEN is set correctly
- Make sure WEBHOOK_URL matches your Railway URL

### WebApp loads but shows blank?
- This means connection works but there might be a frontend issue
- Check browser console for errors
- Verify JWT_SECRET is set in Railway

## Testing Locally First
To test if your bot setup is correct:
1. Set these in your local `.env`:
```bash
TELEGRAM_BOT_TOKEN=your_bot_token
WEBAPP_URL=https://your-local-ngrok-url.ngrok.io
```
2. Use ngrok to expose your local app: `ngrok http 5000`
3. Test with your bot

## Need More Help?
- Railway logs: Check your Railway dashboard → Deployments → View logs
- Bot issues: Message @BotFather with `/help`
- Casino not loading: Check browser console (F12) for JavaScript errors

---
**Remember**: Replace `your-app-name` with your actual Railway app name in all URLs above!