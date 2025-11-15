# Miraclez Gaming - Telegram Casino WebApp

## Overview
Miraclez Gaming is a production-ready hybrid casino platform offering a provably fair gaming experience through both Telegram WebApp and standalone web access. It features core casino games (Dice, Slots, Crash, CryptoCoaster, Plinko, Keno, Tower Defense, Mines) and puzzle games (Enigma), with real-time multiplayer capabilities and cryptographic proof of fairness. The platform includes wallet management, transaction history, deposit bonus systems, a 98-feature admin panel, and a 4-tier progressive jackpot system. The business vision is to provide an accessible, transparent, and engaging online casino experience to Telegram's user base and traditional web users.

## Recent Changes (November 15, 2025)
- **FUNDORA BLOX BACKGROUND IMAGE UPDATE**: Added new gameplay screenshot as background image for Fundora Blox across all views. Desktop game page (fundora-blox-game.tsx) and mobile layout (MobileGameLayout.tsx) now display the gameplay image with cover sizing, center positioning, and fallback colors. Updated carousel card and home page card to use the new image. Image assets added to both `/game-images/fundora-blox.png` and `/game-backgrounds/fundora-blox-bg.png`. Background maintains proper contrast for UI readability on all screen sizes.
- **BACK TO HOME BUTTON REDESIGN (22 FILES)**: Complete visual overhaul of all "Back to Home" buttons with sleek, modern gradient styling. Applied consistent golden gradient (from #B8941A to #D4AF37, hover reverses to #F4D06F), rounded-xl corners, shadow-lg/xl effects, smooth 300ms transitions, and ArrowLeft icons (w-4 h-4) across all 22 files. Special handling: Roll-up menu button maintains w-full layout for drawer, Fundora Blox overlay button includes shadcn-aligned reset classes to prevent flash of unstyled content. All buttons now have identical appearance, professional look, and responsive behavior matching the golden theme. Files updated: 13 game pages (Dice, Plinko, Mines, Slots, Crash, Keno, Limbo, HiLo, Blackjack, Roulette, Tower Defense, Enigma, Fundora Blox), 6 navigation pages (Latest, Recent, Challenges, Originals, Favorites, roll-up menu), and 3 additional pages (MiraCoaster, Live Dealer, Fundora Blox New).
- **NAVIGATION BUTTON TEXT STANDARDIZATION**: Changed all "Back to Casino" button text to "Back to Home" across 22 files (all game pages, navigation pages, and components) for consistent terminology throughout the entire application.
- **POLICY & UTILITY PAGES VISIBILITY OVERHAUL (7 PAGES)**: Completed comprehensive visibility improvements for all 7 policy and utility pages (Affiliates, Redeem Codes, Provably Fair, Responsible Gaming, Privacy Policy, Terms of Service, Help Center). Updated all text from tiny 8-10px sizes to proper visibility standards matching the entire application. Affiliates page: Updated dashboard stats, analytics, referral codes, all tabs with proper sizing for earnings/commissions (removed 18 inline icon styles). Redeem Codes page: Updated form inputs, success/error messages, reward displays with text-sm minimum. Provably Fair page: Updated technical explanations, code blocks, verification steps with text-xl headers and text-sm body text. Responsible Gaming page: Updated 8 section headers (text-lg), 14 subsections (text-sm), all 9 icons to Tailwind classes. Privacy Policy page: Updated all section headers (text-xl), paragraphs/lists (text-sm), contact info properly sized. Terms of Service page: Updated all legal text, section headers (text-xl), subsections (text-lg), warnings/disclaimers (text-sm). Help Center page: Updated FAQ questions (text-base), answers (text-sm), search functionality, all icons to proper Tailwind sizes. Result: Complete unison across all policy and utility pages with perfect consistency, professional appearance, and mobile-friendly readability matching the rest of the app.
- **NAVIGATION PAGES VISIBILITY OVERHAUL (6 PAGES)**: Completed comprehensive visibility improvements for all 6 major navigation pages (Wallet, Vault, Originals, Challenges, Recently Played, Latest Releases). Updated all text from tiny 8-10px sizes to proper visibility standards: page titles 24-30px (text-2xl/3xl), section titles 18-20px (text-lg/xl), body text 14px minimum (text-sm), metadata 12px (text-xs). All icons converted from inline styles to Tailwind classes: regular UI icons 20px (w-5 h-5), headers 24px (w-6 h-6), empty states 48px (w-12 h-12). Wallet page: Updated daily rewards, crypto wallets, transaction history, quick actions, and removed unreachable dead code. Vault page: Updated balance cards, stash cards, entry history with proper form sizing. Originals page: Updated featured games, game cards, stats, and metadata. Challenges page: Updated challenge cards, tabs, progress indicators, daily rewards. Recently Played page: Increased game thumbnails from 64px to 80px, updated all game cards and metadata. Latest Releases page: Updated game cards, Coming Soon section, NEW badges, release dates. Result: All navigation pages now match app-wide visibility standards with perfect consistency and mobile-friendly readability.
- **COMPLETE VISIBILITY OVERHAUL - ALL GAMES & USER PAGES**: Comprehensive typography and icon size improvements across entire application. Established formal standards: 12px (text-xs) for non-interactive metadata only, 14px (text-sm) minimum for all interactive/body text, 16px+ (text-base) for important values, 18-20px (text-lg/xl) for section titles. Icon standards: 16px (small), 20px (regular), 24px (large). Updated all 13 game pages (Dice, Plinko, Mines, Slots, Crash, Keno, Limbo, HiLo, Blackjack, Roulette, Tower Defense, Fundora Blox, Enigma) plus Jackpot Ticker, Game Carousel, Live Bets Feed, Footer, and Chat Widget. Updated all 4 user information pages (User Profile, Settings, Transactions, Edit Avatar) with 2-3x larger text and properly sized icons. Fundora Blox received special attention with complete minimum size clamping (14px) across all components ensuring scale-based calculations never drop below visibility standards on any screen size. Result: Perfect consistency, professional appearance, mobile-friendly readability throughout the entire app.
- **FAVORITES PAGE VISIBILITY UPDATE**: Enhanced all text and icon sizes on the Favorites page to match app-wide visibility standards. Updated sign-in required state, page headers, error states, empty states, and game cards with 2-4x larger text (24-30px titles, 14-18px body text) and properly sized icons (20-48px). Game thumbnails increased to 80-96px. All interactive elements meet the 14px minimum standard ensuring mobile readability and consistency with the rest of the application.
- **COIN FLIP GAME ADDED**: Added Coin Flip game to the game carousel, positioned in the Originals category between Limbo and Keno. Game features 98% RTP, low volatility, and 2% house edge.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
Built with React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui components, Wouter for routing, and React Query for server state management. Designed as a responsive Telegram WebApp for mobile-first usage, featuring a professional dark theme with dynamic background themes and a golden color scheme. It adheres to strict visibility standards for typography and icons (e.g., 14px minimum for interactive text, 20px for regular icons).

### Backend Architecture
Uses Node.js 20+ with Express.js for RESTful APIs and static file serving. Integrates WebSockets for real-time features and JWT-based authentication with Telegram WebApp data verification.

### Database Design
PostgreSQL is the primary database, utilizing Drizzle ORM. The schema supports user management, balance tracking, transaction logging, game state persistence, and a provably fair system.

### Game Engine Architecture
Games are modular, featuring a provably fair system using HMAC-SHA256. Game logic is server-side for integrity, with responsive UI via optimistic updates and real-time rendering. Includes anonymous play support.

### Authentication & Authorization
A hybrid authentication system supports both Telegram WebApp and standalone web access. Telegram authentication uses `initData` verification with HMAC-SHA256. Web authentication uses email/password with bcrypt hashing and httpOnly cookie-based sessions. Both systems issue JWT tokens. Security features include production-enforced JWT_SECRET validation and rate limiting.

### Real-time Features
WebSocket connections facilitate real-time multiplayer functionality and live updates, including 5-second interval jackpot pool updates, with automatic reconnection logic.

### Wallet System
Manages user credits, distinguishing available and locked balances. All financial transactions are logged atomically with metadata.

### UI/UX Decisions
Features a professional dark theme with dynamic background themes (Classic, Neon, Luxury, Cosmic) and a theme toggle. Employs a golden color theme (#D4AF37) matching the Miraclez logo. Includes an improved header, user avatar dropdown, streamlined bottom navigation, enhanced game card visuals, and mobile-responsive modals. Redesigned slide-in menu with search functionality and comprehensive navigation. UI elements are optimized for mobile readability and consistency.

### Feature Specifications
- **Casino Games**: Dice, Slots, Crash, CryptoCoaster, Plinko, Keno, Tower Defense, Mines.
- **Puzzle Games**: Enigma.
- **Provably Fair System**: HMAC-SHA256 across all games.
- **Responsible Gaming**: Comprehensive policy covering age verification, self-exclusion, and jurisdictional restrictions.
- **Admin Panel**: A comprehensive 98-feature admin panel for operations, financials, analytics, user management, RTP settings, bonuses, and more.
- **Cryptocurrency Integration**: Deposits/withdrawals for BTC, ETH, USDT, LTC, DOGE, SOL.
- **Geofencing**: Jurisdiction control based on gambling laws.
- **Interactive Gameplay**: "STOP & CASH OUT" buttons with real-time multiplier display.
- **VIP-Integrated Bonus System**: VIP-based deposit multipliers, reduced wagering requirements, instant rakeback, and multi-tier daily deposit bonuses.
- **User Engagement Features**: Sound effects, automatic GC login streaks, manual SC streak claims, and a daily wheel spinner.
- **Progressive Jackpot System**: A 4-tier (MINI, MINOR, MAJOR, MEGA) provably fair system with cryptographic RNG, tiered contribution rates, bet-weighted probabilities, progressive seed floor growth, and real-time WebSocket updates.
- **PlayerPass1155 NFT System**: Signature-based NFT minting system using an ERC-1155 contract for player passes providing in-game bonuses. Integrates viem for blockchain interactions and wagmi for wallet connection.
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
- **Hardhat**: For smart contract development and deployment (v2.26.0).

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