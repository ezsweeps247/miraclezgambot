# Miraclez Gaming - Telegram Casino WebApp

## Overview
Miraclez Gaming is a production-ready hybrid casino platform offering a provably fair gaming experience through both Telegram WebApp and standalone web access. It features core casino games (Dice, Slots, Crash, CryptoCoaster, Plinko, Keno, Tower Defense, Mines) and puzzle games (Enigma, Fundora Blox, Coin Flip), with real-time multiplayer capabilities and cryptographic proof of fairness. The platform includes wallet management, transaction history, deposit bonus systems, a comprehensive admin panel, and a 4-tier progressive jackpot system. The business vision is to provide an accessible, transparent, and engaging online casino experience to Telegram's user base and traditional web users.

## Recent Changes (November 15, 2025)
- **FUNDORA BLOX ROUTING RESTORATION**: Restored correct Fundora Blox routing to use the dark mobile-optimized version (FundoraBloxGame component at `/fundora-blox-game`) with MobileGameLayout, back button, and full mobile responsiveness. Updated home page and carousel links to point to `/fundora-blox-game` instead of `/fundora-blox`. The FundoraBloxGame component includes dark background theme, golden "BACK TO HOME" button, scale/context state for mobile optimization, and uses useGame store. All entry points (home page "All Games", carousel, direct navigation) now load the correct dark mobile-optimized version. Files updated: App.tsx, home.tsx, game-carousel.tsx. Result: Consistent dark mobile-optimized experience from all entry points matching user requirements.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
Built with React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui components, Wouter for routing, and React Query for server state management. Designed as a responsive Telegram WebApp for mobile-first usage, featuring a professional dark theme with dynamic background themes and a golden color scheme. It adheres to strict visibility standards for typography and icons (e.g., 14px minimum for interactive text, 20px for regular icons).

### Backend Architecture
Uses Node.js 20+ with Express.js for RESTful APIs and static file serving, integrating WebSockets for real-time features and JWT-based authentication.

### Database Design
PostgreSQL is the primary database, utilizing Drizzle ORM, supporting user management, balance tracking, transaction logging, game state persistence, and a provably fair system.

### Game Engine Architecture
Games are modular, featuring a provably fair system using HMAC-SHA256. Game logic is server-side for integrity, with responsive UI via optimistic updates and real-time rendering. Includes anonymous play support.

### Authentication & Authorization
A hybrid authentication system supports both Telegram WebApp (using `initData` verification with HMAC-SHA256) and standalone web access (email/password with bcrypt hashing and httpOnly cookie-based sessions). Both systems issue JWT tokens.

### Real-time Features
WebSocket connections facilitate real-time multiplayer functionality and live updates, including 5-second interval jackpot pool updates, with automatic reconnection logic.

### Wallet System
Manages user credits, distinguishing available and locked balances. All financial transactions are logged atomically with metadata.

### UI/UX Decisions
Features a professional dark theme with dynamic background themes (Classic, Neon, Luxury, Cosmic) and a theme toggle. Employs a golden color theme (#D4AF37). Includes an improved header, user avatar dropdown, streamlined bottom navigation, enhanced game card visuals, and mobile-responsive modals. Redesigned slide-in menu with search functionality and comprehensive navigation. UI elements are optimized for mobile readability and consistency.

### Feature Specifications
- **Casino Games**: Dice, Slots, Crash, CryptoCoaster, Plinko, Keno, Tower Defense, Mines.
- **Puzzle Games**: Enigma.
- **Provably Fair System**: HMAC-SHA256 across all games.
- **Responsible Gaming**: Comprehensive policy covering age verification, self-exclusion, and jurisdictional restrictions.
- **Admin Panel**: A comprehensive 98-feature admin panel.
- **Cryptocurrency Integration**: Deposits/withdrawals for BTC, ETH, USDT, LTC, DOGE, SOL.
- **Geofencing**: Jurisdiction control based on gambling laws.
- **Interactive Gameplay**: "STOP & CASH OUT" buttons with real-time multiplier display.
- **VIP-Integrated Bonus System**: VIP-based deposit multipliers, reduced wagering requirements, instant rakeback, and multi-tier daily deposit bonuses.
- **User Engagement Features**: Sound effects, automatic GC login streaks, manual SC streak claims, and a daily wheel spinner.
- **Progressive Jackpot System**: A 4-tier (MINI, MINOR, MAJOR, MEGA) provably fair system with cryptographic RNG, tiered contribution rates, bet-weighted probabilities, progressive seed floor growth, and real-time WebSocket updates.
- **PlayerPass1155 NFT System**: Signature-based NFT minting system using an ERC-1155 contract for player passes providing in-game bonuses, integrating viem for blockchain interactions and wagmi for wallet connection.
- **Account Abstraction**: Biconomy Smart Account v2 integration for gasless transactions.

## External Dependencies

### Core Technologies
- **PostgreSQL Database**: Via @neondatabase/serverless.
- **Telegram Bot API**: For bot functionality and WebApp authentication.
- **WebSocket Server**: Using the 'ws' library.

### Authentication Services
- **Telegram WebApp**: Primary authentication provider.
- **JWT**: Token-based session management using `jsonwebtoken`.

### Web3 / Blockchain
- **Ethers.js v6**: For direct blockchain interaction.
- **Viem / Wagmi**: For blockchain interactions and wallet connection (NFT system).
- **RainbowKit**: Wallet connection provider.
- **Biconomy Smart Account v2**: For gasless transactions (Account Abstraction).

### Development & Build Tools
- **Vite**: Frontend build tool.
- **Drizzle ORM**: Type-safe database operations with `drizzle-kit`.
- **TypeScript**: Full-stack type safety.
- **Hardhat**: For smart contract development and deployment.

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