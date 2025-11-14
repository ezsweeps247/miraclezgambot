# Quick Admin API Guide - For Adding Credits

Since you're having trouble accessing the admin panel on Railway due to the frontend deployment issue, I've created a quick admin API that you can use directly to manage user credits.

## 🔐 Authentication
All requests require Basic Authentication:
- Username: `admin`
- Password: `casino123!`

## 📋 Available Endpoints

### 1. List All Users and Their Balances
```bash
curl -X GET https://miraclezgambot-production.up.railway.app/api/quick-admin/users \
  -H "Authorization: Basic YWRtaW46Y2FzaW5vMTIzIQ=="
```

### 2. Check Specific User Balance
```bash
# Replace TELEGRAM_ID with actual user's Telegram ID
curl -X GET https://miraclezgambot-production.up.railway.app/api/quick-admin/user-balance/TELEGRAM_ID \
  -H "Authorization: Basic YWRtaW46Y2FzaW5vMTIzIQ=="
```

### 3. Add Credits to User Account
```bash
# Replace TELEGRAM_ID with actual user's Telegram ID
# Replace AMOUNT with number of credits to add
curl -X POST https://miraclezgambot-production.up.railway.app/api/quick-admin/add-credits \
  -H "Authorization: Basic YWRtaW46Y2FzaW5vMTIzIQ==" \
  -H "Content-Type: application/json" \
  -d '{
    "userTelegramId": TELEGRAM_ID,
    "amount": AMOUNT,
    "description": "Admin credit adjustment"
  }'
```

## 💡 Example: Add 100 Credits to User 123456789

```bash
curl -X POST https://miraclezgambot-production.up.railway.app/api/quick-admin/add-credits \
  -H "Authorization: Basic YWRtaW46Y2FzaW5vMTIzIQ==" \
  -H "Content-Type: application/json" \
  -d '{
    "userTelegramId": 123456789,
    "amount": 100,
    "description": "Manual credit top-up"
  }'
```

## 📱 For Easier Use

You can use these endpoints with:
1. **Postman** - Import the commands as API requests
2. **Thunder Client** (VS Code extension)
3. **Any REST client app** on your phone
4. **Terminal/Command Line** on your computer

## 🔑 Authorization Header Value
The Base64 encoded value for "admin:casino123!" is:
```
YWRtaW46Y2FzaW5vMTIzIQ==
```

## ✅ Response Examples

### Success Response:
```json
{
  "success": true,
  "message": "Successfully added 100 credits to user 123456789",
  "newBalance": 506,
  "user": {
    "telegramId": 123456789,
    "username": "testuser",
    "previousBalance": 406,
    "newBalance": 506
  }
}
```

### Error Response:
```json
{
  "error": "User not found"
}
```

## 🚨 Important Notes
1. These endpoints work even when the frontend is broken
2. All credit additions are logged in the transactions table
3. The API uses the same authentication as the admin panel
4. Credits are added immediately - no need to refresh or restart

## 📝 Next Steps After Railway Rebuild
Once you push the frontend fix to GitHub and Railway rebuilds:
1. The admin panel will be accessible at `/admin`
2. You can continue using either the admin panel or these API endpoints
3. The API endpoints will remain available as a backup

---

**Note**: Keep this guide handy as a backup method for managing user credits when the admin panel UI is inaccessible.