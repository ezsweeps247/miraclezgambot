# 🎰 Miraclez Gaming - Premium Telegram/Web hybrid Casino Platform

<div align="center">
  <img src="client/public/mira logo_1755876002183.png" alt="Miraclez Gaming Logo" width="200"/>
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Node](https://img.shields.io/badge/node-%3E%3D%2020.0.0-brightgreen.svg)](https://nodejs.org)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-18.0-61dafb)](https://reactjs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://www.postgresql.org/)
  
  **A production-ready, provably fair casino platform integrated with Telegram WebApp**
</div>

## 🌟 Overview

Miraclez Gaming is a comprehensive online casino platform built as a Telegram WebApp, offering a complete suite of casino games with cryptographic proof of fairness. The platform features real-time multiplayer capabilities, cryptocurrency payments, and a sophisticated admin management system.

## 🎮 Casino Games Portfolio

### 🎲 **Dice Game**
- Classic dice rolling with customizable multipliers
- Roll over/under mechanics
- Adjustable win chance (1-98%)
- Auto-betting with stop conditions
- Instant payouts up to 9900x

### 🎰 **Slots Machine**
- 5-reel, 3-row video slot
- Multiple paylines
- Wild symbols and bonus features
- Progressive jackpot system
- Auto-spin functionality
- RTP: 97%

### 📈 **Crash Game**
- Real-time multiplayer crash game
- Live betting with other players
- Manual cash-out controls
- Auto cash-out settings
- Crash history display
- Multipliers up to 1000x

### 🎢 **MiraCoaster (Crypto Coaster)**
- Cryptocurrency market simulation
- Real-time price movements
- Manual STOP & CASH OUT buttons
- Live multiplier display
- Auto-betting with rounds
- Profit/loss tracking

### 💎 **Mines**
- Grid-based mine sweeper game
- Adjustable mine count (1-24)
- Progressive multipliers
- Cash out anytime
- Auto-play with rounds
- Max payout: 5,148,297x

### 🎯 **Plinko**
- Physics-based ball drop game
- Adjustable risk levels (Low/Medium/High)
- 8-16 rows configuration
- Realistic ball physics (0.5x speed)
- Multiple balls simultaneous play
- Auto-drop functionality

### 🎪 **Keno**
- Number selection game (1-40)
- Pick 1-10 numbers
- Instant draw results
- Payout based on matches
- Quick pick option
- Auto-play mode

### 🌊 **Limbo**
- Simple multiplier prediction
- Set target multiplier
- Instant results
- High risk, high reward
- Multipliers up to 1,000,000x
- Auto-betting system

### ⬆️ **HiLo**
- Card prediction game
- Guess higher or lower
- Chain wins for multipliers
- Skip option available
- Cash out anytime
- Perfect for quick plays

### 🎯 **Blackjack**
- Classic 21 card game
- Multiple hands support
- Insurance and split options
- Side bets available
- Dealer AI with realistic play
- Real-time card animations

### 🎡 **Roulette**
- European and American variants
- Inside and outside bets (Straight, Split, Street, Corner, Line)
- Neighbor bets and special patterns
- Race track betting
- Live wheel animation
- Comprehensive betting options
- Real-time spin physics

### 🏰 **Tower Defense**
- Strategic tower placement
- Wave-based enemy progression
- Multiple tower types and upgrades
- Path-finding AI enemies
- Real-time strategy gameplay
- Escalating difficulty
- RTP: 97.5%

### 🧩 **Fundora Blox**
- Physics-based block stacking
- Prize level progression system
- Perfect placement multipliers
- Real-time difficulty scaling
- Skill-based gameplay
- Cash out at any time
- RTP: 98.5%

### 🎮 **Enigma (Puzzle Game)**
- **FREE TO PLAY** - No betting required!
- Marble physics puzzle mechanics
- Oxyd stone matching challenges
- 5 progressive difficulty levels
- Relaxing puzzle gameplay
- Brain-teasing mechanics
- Perfect for casual play

## 💎 Key Features

### 🔐 **Provably Fair System**
- HMAC-SHA256 cryptographic verification
- Server and client seed system
- Nonce-based randomization
- Publicly verifiable results
- Seed rotation every 24 hours
- Complete transparency

### 💰 **Cryptocurrency Integration**
- **Supported Currencies:**
  - Bitcoin (BTC)
  - Ethereum (ETH)
  - Tether (USDT)
  - Litecoin (LTC)
  - Dogecoin (DOGE)
  - TRON (TRX)
  - Binance Coin (BNB)
  - Cardano (ADA)
  - Ripple (XRP)
- Real blockchain transactions via NOWPayments
- Instant deposits and withdrawals
- Live transaction flow visualization
- Animated crypto transaction tracking

### 📱 **Telegram Integration**
- Seamless WebApp authentication
- No separate registration required
- Telegram user data verification
- Bot notifications
- In-app wallet management
- Social features integration

### 🎨 **PlayerPass1155 NFT System**
- **Signature-Based Minting:**
  - Server-side ECDSA signature generation
  - Salt-based replay protection
  - Rate-limited minting (5 mints/hour per user)
  - ERC-1155 multi-token standard
  - Base Sepolia network support
  
- **In-Game Utility Bonuses:**
  - **Player Pass NFT:**
    - +5% GC (Gold Coins) on all game wins
    - +2% SC (Sweep Coins) on reloads/deposits
    - Automatic bonus application
  
- **Wallet Management:**
  - Multi-wallet support per user
  - WalletConnect integration via Wagmi
  - On-chain balance verification
  - Real-time balance updates
  
- **Security Features:**
  - Salt-based replay attack prevention
  - Rate limiting on mint endpoints
  - Signature verification on-chain
  - Authorized signer management
  
- **API Endpoints:**
  - `POST /api/nft/link-wallet` - Link wallet to user account
  - `GET /api/nft/config` - Get contract configuration
  - `POST /api/nft/mint/pass` - Generate mint signature
  - `POST /api/nft/reward/after-mint` - Award bonus rewards
  - `GET /api/nft/holds/:address` - Query NFT balances

### 💬 **Real-Time Features**
- **Live Community Chat**
  - Global chat room
  - Real-time messaging
  - Online user count
  - Emoji reactions
  - Anti-spam protection
  
- **Live Bets Feed**
  - Real-time bet streaming
  - High roller highlights (25+ credits)
  - Win/loss notifications
  - Community statistics

### 🏆 **Competitive Features**
- **Weekly Races**
  - Leaderboard competitions
  - Prize pools
  - Real-time rankings
  - Multiple categories
  
- **VIP System**
  - Tier-based rewards
  - Exclusive bonuses
  - Cashback programs
  - Personal account manager

- **Progressive Jackpot System**
  - 4-Tier jackpots (MINI, MINOR, MAJOR, MEGA)
  - Automatic contribution from all real-money bets
  - Random trigger with tiered odds (1 in 10K to 1 in 1M)
  - Separate GC and SC jackpot pools
  - Real-time pool updates via WebSocket
  - Instant win announcements
  - Minimum bet qualifications per tier

### 👨‍💼 **Admin Dashboard**
- **Comprehensive Management:**
  - User management and analytics
  - Real-time statistics dashboard
  - Financial reports and tracking
  - Game RTP adjustments
  - Transaction monitoring
  - Player behavior analytics
  
- **Security Features:**
  - Geolocation restrictions bypass for admins
  - Activity logging
  - Suspicious activity detection
  - Multi-admin support with roles
  - IP whitelisting

### 🛡️ **Responsible Gaming**
- **Player Protection:**
  - Deposit limits (daily/weekly/monthly)
  - Loss limits
  - Session time monitoring
  - Self-exclusion options
  - Reality checks
  - Cool-off periods
  
- **Compliance:**
  - Age verification
  - KYC/AML integration ready
  - Jurisdiction-based restrictions
  - Geofencing capabilities
  - Regulatory reporting

### 🎨 **UI/UX Features**
- **Theme System:**
  - Multiple background themes
  - Classic, Neon, Luxury, Cosmic categories
  - Dark mode optimized
  - Responsive design
  - Mobile-first approach
  
- **User Experience:**
  - Golden premium branding (#D4AF37)
  - Smooth animations
  - Quick game switching
  - Bottom navigation bar
  - Avatar dropdown menu
  - Instant game loading

### 📊 **Technical Features**
- **Performance:**
  - WebSocket real-time updates
  - Optimistic UI updates
  - Lazy loading
  - Code splitting
  - CDN ready
  
- **Security:**
  - JWT authentication
  - Session management
  - Rate limiting
  - DDoS protection
  - SQL injection prevention
  - XSS protection

## 🚀 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for lightning-fast builds
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **Framer Motion** for animations
- **React Query** for server state
- **Wouter** for routing

### Backend
- **Node.js 20+** with Express.js
- **TypeScript** for type safety
- **PostgreSQL** (Neon) database
- **Drizzle ORM** for database operations
- **WebSocket** for real-time features
- **JWT** for authentication
- **bcrypt** for password hashing

### Web3/Blockchain
- **Viem** for Ethereum interactions
- **Wagmi** for wallet connection
- **Hardhat** for smart contract development
- **OpenZeppelin Contracts** for ERC-1155
- **WalletConnect** for multi-wallet support
- **Base Sepolia** testnet (production ready for mainnet)

### Infrastructure
- **Railway** deployment ready
- **Neon** PostgreSQL hosting
- **Telegram Bot API** integration
- **NOWPayments** API for crypto
- **Stripe** integration ready

## 📦 Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/miraclez-gaming.git
cd miraclez-gaming
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
```env
# Database
DATABASE_URL=postgresql://user:password@host/database

# Authentication
JWT_SECRET=your-secret-key-here

# Telegram
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Cryptocurrency Payments (Optional)
NOWPAYMENTS_API_KEY=your-nowpayments-key
NOWPAYMENTS_IPN_SECRET=your-ipn-secret

# NFT System (Optional - only if using NFT features)
NFT_CONTRACT_ADDRESS=0x...              # Deployed PlayerPass1155 contract
NFT_BASE_URI=https://your-cdn.com/nft/
NFT_COLLECTION_NAME=BUUNIX Player Pass
NFT_COLLECTION_SYMBOL=BNX
RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
OPERATOR_PRIVATE_KEY=0x...              # Backend wallet for signing (KEEP SECURE)
```

4. **Set up the database:**
```bash
npm run db:push
```

5. **(Optional) Deploy NFT Smart Contract:**
```bash
# Add these scripts to package.json:
# "deploy:playerpass": "hardhat run contracts/scripts/deployPlayerPass.ts --network baseSepolia"
# "nft:set-signer": "hardhat run contracts/scripts/setSigner.ts --network baseSepolia"

# Deploy the PlayerPass1155 contract
npm run deploy:playerpass

# Copy the contract address to NFT_CONTRACT_ADDRESS in .env

# Authorize the backend signer
npm run nft:set-signer
```

6. **Run development server:**
```bash
npm run dev
```

7. **Access the application:**
- Frontend: http://localhost:5000
- Admin Panel: http://localhost:5000/admin
- NFT Verification: http://localhost:5000/pf-verify-nft

## 🌐 Deployment

### Railway Deployment
The application is pre-configured for Railway deployment with `railway.json` and `nixpacks.toml`:

1. **Push to GitHub:**
```bash
git push origin main
```

2. **Connect Railway:**
- Link your GitHub repository to Railway
- Railway auto-detects Node.js project

3. **Configure Environment Variables:**
Add all required variables from the `.env` section above, including:
- `DATABASE_URL` (use Railway PostgreSQL addon)
- `JWT_SECRET`
- `TELEGRAM_BOT_TOKEN`
- NFT variables (if using NFT features)

4. **Deploy NFT Contract (if needed):**
```bash
# From your local machine with RPC_URL and OPERATOR_PRIVATE_KEY configured
npm run deploy:playerpass
npm run nft:set-signer

# Update NFT_CONTRACT_ADDRESS in Railway environment variables
```

5. **Deploy Application:**
Railway automatically builds and deploys on every push.

**Railway Configuration:**
- Build Command: `npm install && npm run db:push && npm run build`
- Start Command: `npm start`
- Node.js Version: 20.x
- Hardhat is excluded from production builds via `nixpacks.toml`

See [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) for detailed instructions.

## 📱 API Endpoints

### Gaming Endpoints
- `POST /api/games/dice/play` - Play dice game
- `POST /api/games/slots/spin` - Spin slots
- `POST /api/games/crash/bet` - Place crash bet
- `POST /api/games/mines/start` - Start mines game
- `POST /api/games/plinko/drop` - Drop plinko ball
- `GET /api/games/history` - Get game history

### Wallet Endpoints
- `GET /api/balance` - Get user balance
- `POST /api/crypto/deposit` - Create deposit
- `POST /api/crypto/withdraw` - Request withdrawal
- `GET /api/transactions` - Transaction history

### NFT Endpoints
- `POST /api/nft/link-wallet` - Link user's wallet address
  ```json
  { "address": "0x...", "chainId": 84532 }
  ```
- `GET /api/nft/config` - Get contract configuration
  ```json
  { "contractAddress": "0x...", "chainId": 84532, "baseURI": "..." }
  ```
- `POST /api/nft/mint/pass` - Generate mint signature (rate-limited: 5/hour)
  ```json
  { "address": "0x...", "tokenId": 1, "amount": 1 }
  ```
  Returns: `{ "signature": "0x...", "salt": "..." }`
- `POST /api/nft/reward/after-mint` - Award post-mint bonuses
  ```json
  { "transactionHash": "0x..." }
  ```
- `GET /api/nft/holds/:address` - Query on-chain NFT balances
  ```json
  { "address": "0x...", "playerPassBalance": 1 }
  ```

### Admin Endpoints
- `POST /api/login` - Admin login
- `GET /api/stats` - Platform statistics
- `GET /api/users` - User management
- `POST /api/settings/rtp` - Adjust RTP

## 🎨 NFT System Architecture

### Smart Contracts
The platform uses **PlayerPass1155**, an ERC-1155 NFT contract with signature-based minting:

**Contract Features:**
- **Signature Verification:** Backend generates ECDSA signatures for authorized mints
- **Replay Protection:** Salt-based mechanism prevents signature reuse
- **Authorized Signers:** Only whitelisted backend wallets can generate valid signatures
- **Gas Optimization:** ERC-1155 for efficient multi-token minting
- **Network:** Base Sepolia (testnet), production-ready for Base mainnet

**Contract Location:** `contracts/PlayerPass1155.sol`

### Backend Integration

**Viem Client** (`server/web3/viem.ts`):
```typescript
import { publicClient, walletClient, signMint } from './server/web3/viem';

// Generate signature for minting
const { signature, salt } = await signMint(userAddress, tokenId, amount);
```

**Bonus Integration** (`server/utils/nft-bonuses.ts`):
```typescript
import { applyNFTBonuses, hasPlayerPass } from './server/utils/nft-bonuses';

// Apply NFT holder bonuses to game winnings
const { gcAmount, scAmount, bonusApplied } = await applyNFTBonuses(
  userId,    // UUID string
  baseGC,    // Original GC win amount
  baseSC     // Original SC win amount
);

// Check if user holds Player Pass
const hasPass = await hasPlayerPass(userId);
```

### Frontend Integration

**Wagmi Hooks** (`client/src/web3/wagmi.tsx`):
```typescript
import { useChainConfig, useLinkWallet, useMintPass, usePlayerPassBalance } from '@/web3/wagmi';

// Get chain configuration
const { chainId, contractAddress } = useChainConfig();

// Link wallet to user account
const { linkWallet, isLinking } = useLinkWallet();
await linkWallet({ address: '0x...', chainId: 84532 });

// Mint Player Pass NFT
const { mintPass, isMinting } = useMintPass();
await mintPass({ address: '0x...', tokenId: 1 });

// Check NFT balance
const { data: balance } = usePlayerPassBalance('0x...');
```

**Component:** `client/src/components/NFTPane.tsx` - Full UI with wallet connection and minting

### Database Schema

**Tables:**
- `wallets` - User wallet addresses (userId → address mapping)
- `nftMints` - Mint records with salts for replay protection
- `nftRewards` - SC/GC reward policies for NFT holders

### Security Features

**Rate Limiting:**
- 5 mints per hour per user
- Implemented via `express-rate-limit` on `/api/nft/mint/*` endpoints

**Signature Validation:**
- Server generates ECDSA signatures using authorized wallet
- Contract verifies signature on-chain before minting
- Salt prevents replay attacks

**Private Key Security:**
- `OPERATOR_PRIVATE_KEY` stored in environment variables only
- Never exposed to frontend
- Separate from user wallets

## 🔒 Security

- **Provably Fair:** All games use cryptographic proofs
- **Secure Authentication:** JWT with refresh tokens
- **Data Protection:** Encrypted sensitive data
- **Rate Limiting:** API request throttling
- **Audit Logging:** Complete activity tracking
- **Geofencing:** Jurisdiction-based access control
- **NFT Replay Protection:** Salt-based signature verification
- **Private Key Management:** Secure backend wallet isolation

## 📈 Business Features

- **Revenue Streams:**
  - House edge on all games
  - Transaction fees
  - Premium features
  - VIP memberships
  
- **Analytics:**
  - Player lifetime value
  - Game performance metrics
  - Revenue tracking
  - User acquisition costs
  - Retention analytics

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Demo:** [https://miraclez-gaming.railway.app](https://miraclez-gaming.railway.app)
- **Documentation:** [/docs](./docs)
- **Support:** support@miraclez.gaming
- **Telegram Bot:** [@MiraclezGamingBot](https://t.me/MiraclezGamingBot)

## 🛠️ Troubleshooting

### NFT System Issues

**"Viem not configured" error:**
- Ensure `RPC_URL` and `NFT_CONTRACT_ADDRESS` are set in environment variables
- Verify the RPC endpoint is accessible (test with curl/Postman)

**"Signature verification failed" on-chain:**
- Run `npm run nft:set-signer` to authorize the backend wallet
- Ensure `OPERATOR_PRIVATE_KEY` matches the authorized signer address
- Check that the salt hasn't been used before (database `nftMints` table)

**Rate limit exceeded:**
- Users are limited to 5 mints per hour
- Clear rate limit: Restart the server (rate limits are in-memory)
- Production: Implement Redis-backed rate limiting

**Wallet connection fails:**
- Ensure WalletConnect Project ID is configured (if using)
- Check network is Base Sepolia (chainId: 84532)
- Try different wallet (MetaMask, Coinbase Wallet, WalletConnect)

**TypeScript BigInt errors:**
- Ensure `tsconfig.json` has `"target": "ES2020"` or higher
- BigInt support requires ES2020+

### Database Issues

**Migration errors:**
```bash
npm run db:push --force
```

**Connection issues:**
- Verify `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Check network connectivity to database host

### Build Issues

**Hardhat compilation in production:**
- Hardhat is excluded via `nixpacks.toml`
- If issues persist, ensure `NODE_ENV=production` is set

**Missing dependencies:**
```bash
rm -rf node_modules package-lock.json
npm install
```

## 🙏 Acknowledgments

- **Telegram** for WebApp platform
- **NOWPayments** for crypto payment processing
- **Neon** for serverless PostgreSQL hosting
- **Railway** for deployment platform
- **shadcn/ui** for UI component library
- **Viem** for Ethereum interaction library
- **Wagmi** for React wallet hooks
- **WalletConnect** for multi-wallet support
- **OpenZeppelin** for secure smart contract libraries
- **Base** for L2 blockchain infrastructure

---

<div align="center">
  <strong>🎰 Built with ❤️ for the future of online gaming 🎰</strong>
  
  **© 2024 Miraclez Gaming - All Rights Reserved**
</div>
