# Miraclez Gaming - Production Setup Guide

## Prerequisites

- Node.js 20+
- PostgreSQL database (Neon, Railway, or any managed PostgreSQL)
- Railway account or similar cloud platform
- Domain name (optional, for custom domain)

## Hybrid Authentication Platform

Miraclez Gaming supports **two authentication methods**:

1. **Telegram WebApp Authentication**: Seamless login for Telegram users via initData verification
2. **Web Authentication**: Email/password login for standalone web access

Both methods share the same user database and session management system.

## Required Environment Variables

### Critical Security Variables (REQUIRED for production)

```bash
# Authentication & Security
JWT_SECRET=<generate-strong-random-secret-256-bit>               # Required for all authentication
WALLET_ENCRYPTION_KEY=<generate-strong-random-secret-256-bit>    # Required for wallet security
TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>                     # Required for Telegram auth

# Database
DATABASE_URL=<postgresql-connection-string>

# Admin Credentials (change defaults!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong-password-not-default>

# Environment
NODE_ENV=production
PORT=5000
```

### Authentication Flow Details

**Telegram Users:**
- Access via Telegram WebApp
- Authenticated using HMAC-SHA256 signature verification
- Session managed via JWT tokens
- No password required

**Web Users:**
- Access via web browser at your domain
- Register with email/password
- Password hashing with bcrypt (10 rounds)
- Session managed via httpOnly cookies
- JWT tokens with 7-day expiration

### Optional Variables

```bash
# Payment Integration (optional)
NOWPAYMENTS_API_KEY=<your-nowpayments-api-key>
NOWPAYMENTS_WEBHOOK_SECRET=<webhook-secret>

# Frontend URLs
WEBAPP_URL=<your-web-app-url>
FRONTEND_ORIGIN=<your-frontend-origin>

# Railway/Platform-specific
RAILWAY_STATIC_URL=<auto-set-by-railway>
RAILWAY_ENVIRONMENT=production
```

## Generating Secure Secrets

### JWT_SECRET and WALLET_ENCRYPTION_KEY

Use one of these methods to generate secure random secrets:

```bash
# Method 1: OpenSSL
openssl rand -base64 32

# Method 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Method 3: Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Deployment Steps

### 1. Prepare Database

1. Create PostgreSQL database on your hosting platform (Neon, Railway, etc.)
2. Copy the connection string (DATABASE_URL)
3. The app will automatically run migrations on first start

### 2. Configure Environment Variables

1. Set all required environment variables in your platform's dashboard
2. **CRITICAL**: Never use default values for JWT_SECRET, WALLET_ENCRYPTION_KEY, or ADMIN_PASSWORD
3. Verify all secrets are set correctly

### 3. Deploy Application

#### Railway Deployment

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy using the provided configuration
4. Railway will automatically:
   - Build the application (`npm run build`)
   - Start the server (`npm run start`)
   - Serve on the configured PORT

#### Manual Deployment

```bash
# 1. Install dependencies
npm install

# 2. Build the application
npm run build

# 3. Push database schema
npm run db:push

# 4. Start production server
npm run start
```

### 4. Verify Deployment

1. Check health endpoint: `https://your-domain.com/health`
2. Verify admin panel access: `https://your-domain.com/admin`
3. Test Telegram WebApp integration: Open bot in Telegram
4. Test web authentication: Visit `https://your-domain.com/login`

### 5. Configure Hybrid Access

**For Telegram Users:**
1. Set up Telegram Bot with @BotFather
2. Configure WebApp URL in bot settings
3. Set TELEGRAM_BOT_TOKEN environment variable
4. Users access via Telegram bot

**For Web Users:**
1. Direct users to `https://your-domain.com`
2. Unauthenticated users automatically redirected to `/login`
3. New users can register at `/register`
4. Sessions persist for 7 days via secure cookies

## Security Checklist

- [ ] JWT_SECRET is set to a strong random value (not default)
- [ ] WALLET_ENCRYPTION_KEY is set to a strong random value (not default)
- [ ] ADMIN_PASSWORD is changed from default "casino123!"
- [ ] NODE_ENV is set to "production"
- [ ] Database connection uses SSL/TLS
- [ ] All webhooks use HTTPS
- [ ] Rate limiting is enabled (automatic)
- [ ] CORS is properly configured for your domains

## Rate Limiting

The following rate limits are automatically enforced:

- **Auth Endpoints** (login/register): 5 requests per 15 minutes per IP
- **Admin Endpoints**: 10 requests per 15 minutes per IP
- **API Endpoints**: 60 requests per minute per IP
- **Webhooks**: 30 requests per minute per IP

## Monitoring & Health Checks

### Health Check Endpoint

```bash
GET /health
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-09T12:00:00.000Z"
}
```

### Application Logs

Monitor these key log patterns:

- `⚠️  JWT_SECRET not set` - Critical security warning
- `⚠️  WALLET_ENCRYPTION_KEY not set` - Critical security warning
- `CRITICAL: JWT_SECRET environment variable must be set` - Production startup failure

## Troubleshooting

### Application Won't Start

1. **Check environment variables**: Ensure JWT_SECRET is set (required in production)
2. **Database connection**: Verify DATABASE_URL is correct
3. **Port conflicts**: Ensure PORT is available (default: 5000)

### Authentication Issues

1. **Web auth disabled**: Set JWT_SECRET environment variable
2. **Telegram auth fails**: Verify TELEGRAM_BOT_TOKEN is correct
3. **Cookie issues**: Ensure secure cookies are enabled in production

### Database Errors

1. **Migration fails**: Run `npm run db:push --force`
2. **Connection timeout**: Check DATABASE_URL and network connectivity
3. **SSL required**: Add `?sslmode=require` to DATABASE_URL if needed

## Performance Optimization

### Database

- Enable connection pooling (automatic with @neondatabase/serverless)
- Configure appropriate pool size based on traffic
- Monitor slow queries in production

### Caching

- Static assets are cached by default
- API responses use appropriate Cache-Control headers
- Consider adding Redis for session storage (optional)

### Scaling

The application is configured for VM deployment:
- Maintains WebSocket connections
- Stateful server memory
- Suitable for bots, multiplayer features, and real-time updates

## Backup & Recovery

### Database Backups

1. Configure automatic backups on your database platform
2. Test restore procedures regularly
3. Keep at least 7 days of backups

### Application State

1. User balances and transactions are in database (backed up)
2. Wallet encryption keys stored securely in environment
3. Game states are recoverable from database

## Support

For deployment issues:
1. Check application logs
2. Review environment variables
3. Verify database connectivity
4. Contact platform support if needed

---

## 🔴 Mock/Placeholder Implementations - Production Integration Required

The following components use mock data or placeholder implementations and **MUST** be replaced with real API integrations before production deployment:

### 1. Crypto Price API (server/crypto/exchange-rates.ts)
**Status:** ⚠️ Mock Implementation  
**Current:** Returns hardcoded fallback prices (BTC: $45,000, ETH: $2,800, etc.)  
**Required:** Integrate with real crypto price API (CoinGecko, CryptoCompare, Binance)  
**Impact:** Affects deposit/withdrawal exchange rates

### 2. Blockchain Monitoring (server/crypto/blockchain-monitor.ts)
**Status:** ⚠️ Mock Implementation  
**Current:** Simulates blockchain transactions with random confirmations  
**Required:** Integrate with real blockchain APIs (Etherscan, Blockchain.com)  
**Impact:** Crypto deposit confirmations and withdrawal broadcasting

### 3. Instant Withdrawal Risk Scoring (server/instant-withdrawal-service.ts)
**Status:** ⚠️ Partial Mock  
**Current:** Uses placeholder risk calculations  
**Required:** Implement real cohort analysis and fraud detection  
**Impact:** Automated withdrawal approval decisions

### 4. VPN/Proxy Detection (server/geofencing/jurisdiction-checker.ts)
**Status:** ⚠️ Basic Implementation  
**Current:** Simple heuristic-based VPN detection  
**Required:** Professional VPN detection service (IPQualityScore, MaxMind)  
**Impact:** Compliance and geo-blocking accuracy

### 5. MiraCoaster Position Persistence (server/games/miracoaster.ts)
**Status:** ⚠️ Placeholder  
**Current:** `savePositionToDb()` is a stub function  
**Required:** Implement database persistence for game positions  
**Impact:** Game state recovery

### 6. Admin Authentication
**Status:** ✅ FIXED (Was using hardcoded credentials)  
**Previous:** Used `admin:casino123!` hardcoded credentials  
**Current:** JWT-based authentication via `authenticateAdmin` middleware  
**Action Required:** Ensure JWT_SECRET is strong and secure

## Production Readiness Checklist

### ✅ Production Ready Components
- Core game logic (Dice, Slots, Crash, Plinko, Keno, Mines, Tower Defense)
- Provably fair system (HMAC-SHA256)
- User authentication (Telegram WebApp + Email/Password)
- Database schema and ORM
- Admin panel with JWT authentication
- WebSocket real-time features
- Progressive jackpot system
- 10-tier VIP system
- Basic geo-restriction
- Rate limiting and security

### ⚠️ Requires Integration Before Production
- [ ] Real-time crypto price feeds
- [ ] Actual blockchain transaction monitoring
- [ ] Production-grade fraud detection
- [ ] Professional VPN/proxy detection service
- [ ] Complete payment gateway integration (NOWPayments)
- [ ] Game position persistence (MiraCoaster)

### 🔐 Security Status
- ✅ Hardcoded admin credentials removed
- ✅ JWT authentication implemented
- ✅ Session management configured
- ✅ Password hashing (bcrypt)
- ✅ Rate limiting enabled
- ⚠️ Ensure all secrets are production-grade

## Environment Variables - Complete Reference

### Required for Production
```bash
JWT_SECRET=<strong-random-256-bit-secret>           # CRITICAL
WALLET_ENCRYPTION_KEY=<strong-random-256-bit>       # CRITICAL
DATABASE_URL=<postgresql-connection-string>         # CRITICAL
NODE_ENV=production                                 # CRITICAL
TELEGRAM_BOT_TOKEN=<valid-bot-token>               # For Telegram users
```

### Payment Integration (When Implemented)
```bash
NOWPAYMENTS_API_KEY=<api-key>
NOWPAYMENTS_WEBHOOK_SECRET=<webhook-secret>
```

### Blockchain APIs (When Implemented)
```bash
ETHERSCAN_API_KEY=<api-key>
BLOCKCHAIN_API_KEY=<api-key>
```

### Price Feeds (When Implemented)
```bash
COINGECKO_API_KEY=<api-key>
CRYPTOCOMPARE_API_KEY=<api-key>
```

### Fraud Detection (When Implemented)
```bash
IPQUALITYSCORE_API_KEY=<api-key>
MAXMIND_LICENSE_KEY=<license-key>
```

## Deployment Timeline Recommendation

**Phase 1 - MVP (Current State):**
- ✅ Core casino functionality
- ✅ User authentication
- ✅ Basic payment processing
- ⚠️ Use with caution: Mock implementations present

**Phase 2 - Production Ready:**
- Integrate real crypto price APIs
- Set up blockchain monitoring
- Implement fraud detection
- Add VPN detection service
- Complete payment integrations

**Phase 3 - Scale:**
- Add Redis caching
- Implement CDN
- Set up load balancing
- Add advanced analytics

---

**Last Updated:** October 16, 2025  
**Security Fixes:** Admin authentication hardcoded credentials removed, JWT implemented  
**Status:** Development complete, Production requires API integrations
