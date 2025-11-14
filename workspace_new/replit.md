# Miraclez Gaming - Telegram Casino WebApp

## Overview
Miraclez Gaming is a production-ready hybrid casino platform offering a provably fair gaming experience through both Telegram WebApp and standalone web access. It features core casino games (Dice, Slots, Crash, CryptoCoaster, Plinko, Keno, Tower Defense, Mines) and puzzle games (Enigma), with real-time multiplayer capabilities and cryptographic proof of fairness. The platform includes wallet management, transaction history, deposit bonus systems, a 98-feature admin panel, and a 4-tier progressive jackpot system. The business vision is to provide an accessible, transparent, and engaging online casino experience to Telegram's user base and traditional web users.

## Recent Changes (October 30, 2025)
- **Header Layout Redesign**: Completely restructured header to match professional casino design. Layout: MRCZ title (left) → Balance + Home + Wallet buttons (center) → Miraclez circular logo (right). Sizing: 56px header height mobile, 40px buttons, 70px balance display. Proper spacing prevents overflow on all screen sizes. Golden MRCZ branding on left, circular Miraclez logo profile button on right.
- **Railway Deployment Fix**: Fixed dependency conflict causing Railway build failures. Downgraded Hardhat from v3.0.9 to v2.26.0 for compatibility with @nomicfoundation/hardhat-toolbox@6.1.0. Hardhat v3 requires hardhat-toolbox v7+ which isn't stable yet. Resolved "ERESOLVE could not resolve" npm errors.
- **October 28, 2025**: **PlayerPass1155 NFT System - PRODUCTION READY**: Completed signature-based NFT minting system with PlayerPass1155 ERC-1155 contract. Uses viem for blockchain interactions and wagmi for wallet connection. Features include server-side ECDSA signature generation, salt-based replay protection, and rate-limited mint endpoints (5/hour). Added database tables: wallets (user wallet linking), nftMints (mint records with salts), nftRewards (SC/GC reward policies). NFT utility bonuses: Player Pass grants +5% GC on wins and +2% SC on reloads. API routes: POST /api/nft/link-wallet, GET /api/nft/config, POST /api/nft/mint/pass, POST /api/nft/reward/after-mint, GET /api/nft/holds/:address. Frontend: NFTPane component with wallet connection, mint UI, balance display, and explorer links. Deployment scripts: deploy:playerpass, nft:set-signer. Fixed all TypeScript errors (ES2020 target for BigInt support). Updated README.md with comprehensive NFT documentation including architecture, deployment, API endpoints, and troubleshooting.
- **October 20, 2025**: **Blockchain Integration**: Added Biconomy Smart Account v2 integration for gasless transactions and Account Abstraction. Implemented ethers.js v6 for direct blockchain interaction. Created biconomy-service.ts with API endpoints for smart account creation and management. API routes: GET /api/biconomy/status, POST /api/biconomy/create-smart-account, GET /api/biconomy/smart-account-address.
- **Animation Performance Fix**: Resolved all AnimatePresence warnings by removing `mode="wait"` from components rendering multiple children simultaneously (JackpotTicker carousel, mobile dice, desktop dice). Eliminated 100+ browser console warnings per session, improving rendering performance and preventing visual glitches during page transitions.
- **October 19, 2025**: Cryptocurrency Icons Update - Resized cryptocurrency icons from 25px×25px to 50px×50px for better visibility. Arranged in a 2-row grid layout (3 icons per row: ETH/SOL/BNB, LTC/XRP/TRX) with enhanced hover effects. Icons now link directly to the crypto deposit page with pre-selected cryptocurrency and deposit tab active, streamlining the purchase flow. Added Solana (SOL) to supported currencies list. Mobile Accessibility Improvements - Updated text sizing across the platform to meet accessibility standards. All readable text now meets the 12px minimum standard (badges/indicators use 10px). Affected components: roll-up menu search input, wagering tracker labels, wallet modal tabs and descriptions. Header Optimization - Redesigned header layout for mobile devices to fit all elements on screen. Reduced header height from 56px to 48px on mobile, tightened spacing between elements (gap-0.5), and reduced MIRACLEZ logo from 40px to 24px on mobile. All button sizes reduced to h-10 (40px) while maintaining accessibility standards for touch targets.
- **October 16, 2025**: Telegram Authentication Fix - Fixed authentication stuck state for real Telegram users by implementing proper error handling. Security Fix - Removed hardcoded admin credentials. CSS Warning Fix - Resolved Tailwind CSS ambiguity warning. Production Documentation added. All core features verified working.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
Built with React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui components, Wouter for routing, and React Query for server state management. Designed as a responsive Telegram WebApp for mobile-first usage, featuring a professional dark theme with dynamic background themes and a golden color scheme.

### Backend Architecture
Uses Node.js 20+ with Express.js for RESTful APIs and static file serving. Integrates WebSockets for real-time features and JWT-based authentication with Telegram WebApp data verification.

### Database Design
PostgreSQL is the primary database, utilizing Drizzle ORM. The schema supports user management, balance tracking, transaction logging, game state persistence, and a provably fair system.

### Game Engine Architecture
Games are modular, featuring a provably fair system using HMAC-SHA256. Game logic is server-side for integrity, with responsive UI via optimistic updates and real-time rendering. Includes anonymous play support.

### Authentication & Authorization
A hybrid authentication system supports both Telegram WebApp and standalone web access. Telegram authentication uses `initData` verification with HMAC-SHA256. Web authentication uses email/password with bcrypt hashing and httpOnly cookie-based sessions. Both systems issue JWT tokens. Security features include production-enforced JWT_SECRET validation and rate limiting (50 attempts per 15 minutes for auth endpoints, counting only failed attempts).

### Real-time Features
WebSocket connections facilitate real-time multiplayer functionality and live updates, including 5-second interval jackpot pool updates, with automatic reconnection logic.

### Wallet System
Manages user credits, distinguishing available and locked balances. All financial transactions are logged atomically with metadata.

### UI/UX Decisions
Features a professional dark theme with dynamic background themes (Classic, Neon, Luxury, Cosmic) and a theme toggle. Employs a golden color theme (#D4AF37) matching the Miraclez logo. Includes an improved header, user avatar dropdown, streamlined bottom navigation, enhanced game card visuals, and mobile-responsive modals. Redesigned slide-in menu with purple gradient Social Casino header, search functionality, and comprehensive navigation. UI minimization includes a global 50% font size reduction and slim button styling for a minimalistic theme.

### Feature Specifications
- **Casino Games**: Dice, Slots, Crash, CryptoCoaster, Plinko, Keno, Tower Defense, Mines.
- **Puzzle Games**: Enigma (5 levels with marble physics and Oxyd stone matching).
- **Provably Fair System**: HMAC-SHA256 across all games.
- **Responsible Gaming**: Comprehensive policy covering age verification, gameplay tips, self-exclusion, jurisdictional restrictions, and account security.
- **Admin Panel**: A comprehensive 98-feature admin panel covering operations, financials, analytics, user management, RTP settings, bonuses, support, security, marketing, VIP management, compliance, game management, customer experience, advanced analytics, social features, platform optimization, AI/ML, and DevOps.
- **Cryptocurrency Integration**: Deposits/withdrawals for BTC, ETH, USDT, LTC, DOGE.
- **Geofencing**: Jurisdiction control based on gambling laws.
- **Interactive Gameplay**: "STOP & CASH OUT" buttons with real-time multiplier display.
- **VIP-Integrated Bonus System**: VIP-based deposit bonus multipliers, reduced wagering requirements, instant rakeback, and multi-tier daily deposit bonuses.
- **User Engagement Features**: Sound effects toggle, automatic GC login streaks, manual SC streak claims, and a daily wheel spinner for random rewards.
- **Progressive Jackpot System**: A 4-tier (MINI, MINOR, MAJOR, MEGA) provably fair system with cryptographic RNG, tiered contribution rates, bet-weighted probabilities, progressive seed floor growth, comprehensive audit trail, real-time WebSocket updates, independent tracking for GC and SC pools, and automatic contribution from all real-money bets.
- **Instant Withdrawal System (⚠️ NOT PRODUCTION READY)**: A risk-based instant withdrawal approval system for VIP users (Jade tier and above). Features comprehensive risk scoring and minimum deposit requirement. Critical issues remain, preventing production deployment.

## Web3/NFT System Architecture

### Smart Contracts
- **BUUNIX1155.sol**: ERC-1155 multi-token NFT contract with minter role management and soulbound token support. Built on OpenZeppelin contracts for security and standards compliance.
- **Key Features**: 
  - Minter authorization system - only authorized addresses can mint tokens
  - Soulbound tokens - owner can mark specific token IDs as non-transferable (account-bound NFTs)
  - Gas-optimized implementation with minimal dependencies
  - Custom transfer logic to enforce soulbound restrictions
- **Token IDs**: Defined enum system for achievement NFTs (First Win, High Roller), game-specific NFTs (Fundora Blox Master, Dice Champion), VIP tier badges (Bronze-Diamond), and special event NFTs.

### Backend Services
- **Signer Service** (`server/web3/signer.ts`): Manages operator wallet for transaction signing, provider initialization, gas price estimation, and transaction confirmation monitoring.
- **Web3 Service** (`server/web3/index.ts`): Core blockchain interaction service for NFT minting, balance queries, batch operations, and inventory management.
- **Routes** (`server/web3/routes.ts`): RESTful API endpoints for NFT operations including mint, inventory queries, transaction history, and metadata retrieval.
- **Webhooks** (`server/web3/webhook.ts`): Handlers for blockchain event processing, transaction confirmation updates, and manual inventory synchronization.

### Frontend Components
- **Web3Provider**: RainbowKit integration wrapper providing wallet connection across multiple chains (Ethereum, Polygon, BSC, testnets).
- **WalletButton**: Custom-styled wallet connection component matching Miraclez Gaming theme with chain selection and account management.
- **MintModal**: NFT minting interface with token selection, preview display, and transaction status tracking.
- **Inventory**: User NFT collection display with metadata, attributes, and balance information.

### Database Schema
- **nft_inventory**: Tracks user NFT holdings with wallet address, token IDs, balances, metadata, and sync timestamps.
- **nft_transactions**: Records all NFT operations (mint, transfer, burn) with transaction hashes, status tracking, confirmations, and block numbers.

### Chain Support
Supports multiple blockchain networks via configurable chain definitions: Ethereum mainnet, Polygon, Binance Smart Chain, plus testnets (Sepolia, Polygon Mumbai) for development.

### Environment Variables
Required for Web3 functionality:
- **RPC_URL**: Blockchain RPC endpoint URL
- **OPERATOR_PRIVATE_KEY**: Wallet private key for transaction signing
- **CONTRACT_ADDRESS**: Deployed NFT contract address
- **VITE_WALLETCONNECT_PROJECT_ID**: WalletConnect project ID (frontend)

Note: Web3 features gracefully degrade if environment variables are not configured. The system will log warnings but continue operating without blockchain functionality.

## External Dependencies

### Core Technologies
- **PostgreSQL Database**: Via @neondatabase/serverless.
- **Telegram Bot API**: For bot functionality and WebApp authentication.
- **WebSocket Server**: Using the 'ws' library.

### Authentication Services
- **Telegram WebApp**: Primary authentication provider.
- **JWT**: Token-based session management using `jsonwebtoken`.

### Development & Build Tools
- **Vite**: Frontend build tool.
- **Drizzle ORM**: Type-safe database operations with `drizzle-kit`.
- **TypeScript**: Full-stack type safety.

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework.
- **Radix UI**: Accessible component primitives.
- **shadcn/ui**: Pre-built component library.

### Runtime Dependencies
- **Express.js**: Web server framework.
- **bcrypt**: Password hashing.
- **React Query**: Server state management.
- **Wouter**: Lightweight client-side routing.

### Security & Cryptography
- **HMAC-SHA256**: For provably fair RNG.
- **crypto (Node.js)**: Built-in cryptographic functions.
- **express-rate-limit**: For API rate limiting.