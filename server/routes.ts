import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { createHash, randomUUID } from 'crypto';
import cookieParser from 'cookie-parser';
import path from 'path';
import { storage } from "./storage";
import { db } from "./db";
import { eq, sql, and, gte } from "drizzle-orm";
import { balances, transactions } from "@shared/schema";
import { authenticateTelegram, authenticateJWT, optionalAuth, type AuthenticatedRequest } from './auth';
import { playSlots } from './games/slots';
import { playPlinko } from './games/plinko';
import { verifyResult, generateClientSeed } from './games/provably-fair';
import { getBot, initializeBot } from './telegram-bot';
import { blackjackRouter } from './games/blackjack';
import { hiloRouter } from './routes/hilo';
import { adminRouter } from './adminRoutes';
import * as fundoraBlox from './games/fundora-blox';
import { bonusRouter } from './routes/bonus-routes';
import { registerCryptoRoutes } from './crypto-routes';
import jurisdictionRoutes from './jurisdiction-routes';
import { jurisdictionMiddleware, gamblingJurisdictionCheck, depositJurisdictionCheck } from './middleware/jurisdiction-middleware';
import { responsibleGamingMiddleware } from './middleware/responsible-gaming-middleware';
import { analyticsRoutes } from './analytics-routes';
import { z } from 'zod';
import { responsibleGamingRoutes } from './responsible-gaming-routes';
import * as miraclezDice from './games/miraclez-dice';
import { miracoasterEngine, miracoasterHandlers, handleMiracoasterWebSocket } from './games/miracoaster';
import { setBroadcastBetFunction } from './broadcast-manager';
import * as towerDefense from './games/tower-defense';
import { validAvatarTypes } from '../shared/avatar-constants';
import { updateBonusWagering } from './bonus-integration';
import webAuthRouter from './webAuth';
import { apiLimiter, adminLimiter, authLimiter } from './middleware/rate-limit';
import jackpotRouter from './jackpot-routes';
import { broadcastAllJackpots, broadcastJackpotUpdate, broadcastJackpotWin } from './jackpot-websocket';
import { processJackpotContributions, checkJackpotWin } from './jackpot-integration';
import Decimal from 'decimal.js';
import { web3Router } from './web3/routes';
import { webhookRouter } from './web3/webhook';
import { web3Service } from './web3/index';

const diceBetSchema = z.object({
  amount: z.number().min(0.01).max(1000),
  side: z.enum(['UNDER', 'OVER']),
  target: z.number().min(2).max(98)
});

const miraclezDiceBetSchema = z.object({
  betAmount: z.number().min(1).max(100),
  target: z.number().min(3).max(11),
  side: z.enum(['UNDER', 'OVER']),
  clientSeed: z.string(),
  nonce: z.number(),
  gameMode: z.enum(['real', 'fun']).optional().default('fun')
});

const miraclezRiskSchema = z.object({
  amount: z.number().min(1),
  selection: z.array(z.number().min(1).max(6)).length(3),
  clientSeed: z.string(),
  nonce: z.number(),
  gameMode: z.enum(['real', 'fun']).optional().default('fun')
});

const slotsBetSchema = z.object({
  amount: z.number().min(0.01).max(1000),
  gameMode: z.enum(['real', 'fun']).optional().default('fun')
});

const crashBetSchema = z.object({
  amount: z.number().min(0.01).max(1000),
  autoCashout: z.number().min(1.01).optional()
});

const plinkoBetSchema = z.object({
  betAmount: z.string(),
  rows: z.number().min(8).max(16),
  risk: z.enum(['low', 'medium', 'high'])
});

const towerDefenseBetSchema = z.object({
  betAmount: z.number().min(0.1).max(1000),
  difficulty: z.enum(['easy', 'medium', 'hard'])
});

const towerDefenseDoubleUpSchema = z.object({
  amount: z.number().min(0.1),
  selectedCard: z.number().min(1).max(4)
});

const towerDefenseCollectSchema = z.object({
  amount: z.number().min(0.1)
});

const fundoraBloxStartSchema = z.object({
  stake: z.number().min(0).max(20) // Stake in dollars (0 for FREE, 0.5, 1, 2, 5, 10, 20)
});

const fundoraBloxEndSchema = z.object({
  stake: z.number().min(0).max(20), // Stake in dollars (must match what was used to start)
  highestRow: z.number().min(0).max(14),
  blocksStacked: z.number().min(0),
  prize: z.number().min(0), // Prize in dollars
  prizeType: z.enum(['cash', 'points']).nullable()
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Set up the broadcast function for global use
  setBroadcastBetFunction((bet: any) => broadcastBet(bet));
  
  // Note: All admin routes like /admin, /admin/dashboard, /admin-dashboard are handled by
  // the React app's client-side routing. In production, serveStatic() serves index.html
  // for all routes, and React Router takes over from there.
  
  // WebSocket server for crash game
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // WebSocket connections store
  const wsConnections = new Set<any>();
  const betSubscribers = new Set<any>();
  const cryptoSubscribers = new Set<any>();
  let simulatedBetsInterval: NodeJS.Timeout | null = null;
  let vaultAutoReleaseInterval: NodeJS.Timeout | null = null;
  let jackpotBroadcastInterval: NodeJS.Timeout | null = null;

  // Broadcast function for real-time chat
  function broadcastToAll(data: any) {
    wsConnections.forEach(ws => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify(data));
      }
    });
  }
  
  // Export broadcast function for admin usage
  (global as any).broadcastToAll = broadcastToAll;
  
  // Set up broadcast manager
  const { setBroadcastAllFunction, broadcastNewBet } = await import('./broadcast-manager');
  setBroadcastAllFunction(broadcastToAll);

  // Broadcast function for live bets
  async function broadcastBet(bet: any) {
    try {
      // Get user information for the bet - handle invalid UUIDs gracefully
      let username = `Player${bet.userId?.slice(-4) || '????'}`;
      
      // Only try to fetch user if userId looks like a valid UUID
      if (bet.userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bet.userId)) {
        try {
          const user = await storage.getUser(bet.userId);
          if (user?.username) {
            username = user.username;
          }
        } catch (error) {
          console.error('Error fetching user for broadcast:', error);
          // Continue with fallback username
        }
      }
      
      // If we already have a username from the bet object, use it
      if (bet.username) {
        username = bet.username;
      }
      
      // Calculate values correctly based on the bet data
      const betAmount = typeof bet.amount === 'number' ? bet.amount : Number(bet.amount) / 100;
      const profit = typeof bet.profit === 'number' ? bet.profit : Number(bet.profit) / 100;
      
      // Calculate multiplier and payout
      let multiplier = 1;
      let payout = betAmount;
      
      if (bet.result === 'WIN') {
        payout = profit > 0 ? betAmount + profit : betAmount;
        multiplier = payout / betAmount;
      } else if (bet.result === 'LOSE') {
        payout = 0;
        multiplier = 0;
      }
      
      const betData = {
        type: 'new_bet',
        bet: {
          id: bet.id,
          username: username,
          game: bet.game || 'Unknown',
          betAmount: betAmount,
          multiplier: multiplier,
          payout: payout,
          timestamp: Date.now(),
          userId: bet.userId
        }
      };
      
      // Broadcast to subscribers
      betSubscribers.forEach(ws => {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(JSON.stringify(betData));
        }
      });
    } catch (error) {
      console.error('Error broadcasting bet:', error);
    }
  }

  // Broadcast function for crypto transactions
  function broadcastCryptoTransaction(transaction: any) {
    const txData = {
      type: 'crypto_transaction',
      transaction: {
        id: transaction.id,
        type: transaction.type,
        currency: transaction.currency,
        amount: transaction.amount,
        usdValue: transaction.usdValue,
        status: transaction.status,
        timestamp: transaction.timestamp || Date.now(),
        confirmations: transaction.confirmations || 0,
        address: transaction.address
      }
    };
    
    // Broadcast to crypto subscribers
    cryptoSubscribers.forEach(ws => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify(txData));
      }
    });
    
    // Also broadcast to all connections for general updates
    broadcastToAll(txData);
  }
  
  // Export broadcast function for crypto transactions
  (global as any).broadcastCryptoTransaction = broadcastCryptoTransaction;
  
  app.use(cookieParser());
  
  // Add jurisdiction middleware to all routes
  app.use(jurisdictionMiddleware);
  
  // Initialize Telegram bot
  initializeBot();
  
  // Initialize Web3 service (optional - won't fail if env vars missing)
  web3Service.initialize().catch(err => {
    console.warn('Web3 service initialization failed:', err.message);
  });
  
  // Telegram webhook
  app.post(`/webhook/${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
    getBot().processUpdate(req.body);
    res.sendStatus(200);
  });

  // Auth routes with rate limiting
  app.post('/api/auth/telegram', authLimiter, authenticateTelegram);
  app.use('/api/auth/web', webAuthRouter);
  
  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  // Sweepstakes Rules PDF download endpoint - serve corrected content
  app.get('/sweepstakes-rules-pdf', (req, res) => {
    const pdfPath = path.join(process.cwd(), 'attached_assets', 'social-casino-official-rules-corrected.txt');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="Miraclez-Social-Casino-Official-Rules.txt"');
    res.sendFile(pdfPath, (err) => {
      if (err) {
        console.error('Error serving sweepstakes rules document:', err);
        res.status(404).send('Sweepstakes Rules document not found');
      }
    });
  });

  // Privacy Policy download endpoint - serve fully corrected content with updated Miraclez Gaming branding
  app.get('/privacy-policy-download', (req, res) => {
    const policyPath = path.join(process.cwd(), 'attached_assets', 'privacy-policy-corrected.txt');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Miraclez-Gaming-Privacy-Policy-v1.8.txt"');
    res.sendFile(policyPath, (err) => {
      if (err) {
        console.error('Error serving privacy policy document:', err);
        res.status(404).send('Privacy Policy document not found');
      }
    });
  });

  // GET /api/bets endpoint for fetching real bets
  app.get('/api/bets', optionalAuth, async (req: any, res) => {
    try {
      const { filter, limit = '30' } = req.query;
      const parsedLimit = Math.min(100, parseInt(limit, 10));
      
      let filterOptions: any = {};
      
      // Handle filters
      if (filter === 'my' && req.user?.userId) {
        filterOptions.userId = req.user.userId;
      } else if (filter === 'high') {
        // High roll filter - bets with amount >= 25 credits (2500 cents)
        filterOptions.minAmount = 2500;
      }
      
      // Get recent bets from database
      const bets = await storage.getRecentBets(parsedLimit, filterOptions);
      
      // Transform bets to match frontend expectations
      const transformedBets = bets.map(bet => ({
        id: bet.id,
        username: bet.username,
        game: bet.game,
        betAmount: bet.amount,
        multiplier: bet.multiplier,
        payout: bet.payout,
        timestamp: bet.timestamp,
        userId: bet.userId
      }));
      
      res.json({
        bets: transformedBets,
        total: transformedBets.length
      });
    } catch (error) {
      console.error('Error fetching bets:', error);
      res.status(500).json({ error: 'Failed to fetch bets' });
    }
  });

  // Admin routes - moved after API routes are registered

  // Register admin API routes with rate limiting
  app.use('/api/admin', adminLimiter, adminRouter);
  
  // Quick admin API routes (for direct database access when frontend is broken)
  const quickAdminApi = await import('./quickAdminApi');
  app.use(quickAdminApi.default);

  // Daily purchase limit endpoint - calculates rolling 24-hour spending
  app.get('/api/purchase-limit', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Sum all DEPOSIT transactions (purchases) in the last 24 hours
      const purchases = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, 'DEPOSIT'),
            gte(transactions.createdAt, twentyFourHoursAgo)
          )
        );
      
      // Calculate total spent (amount is in cents, convert to dollars)
      const totalSpent = purchases.reduce((sum, purchase) => {
        const meta = purchase.meta as any;
        
        // Only count real money purchases (check for usdAmount or specific payment methods)
        // Real purchases have usdAmount in meta or method fields like 'stripe', 'nowpayments', 'crypto'
        if (meta?.usdAmount !== undefined) {
          // Use usdAmount from meta if available (more accurate)
          return sum + Number(meta.usdAmount);
        }
        
        // Fallback: check for payment method indicators
        const method = meta?.method || '';
        if (method === 'stripe' || method === 'nowpayments' || method === 'crypto') {
          return sum + Number(purchase.amount) / 100; // Convert cents to dollars
        }
        
        // Skip non-purchase deposits (bonuses, admin credits, etc.)
        return sum;
      }, 0);
      
      const dailyLimit = 10000; // $10,000 daily limit
      const remaining = Math.max(0, dailyLimit - totalSpent);
      
      res.json({
        dailyLimit,
        spent: totalSpent,
        remaining,
        resetsAt: new Date(twentyFourHoursAgo.getTime() + 24 * 60 * 60 * 1000).toISOString()
      });
    } catch (error) {
      console.error('Error calculating purchase limit:', error);
      res.status(500).json({ error: 'Failed to calculate purchase limit' });
    }
  });

  // Public footer links endpoint
  app.get('/api/footer-links', async (req, res) => {
    try {
      const links = await storage.getActiveFooterLinks();
      res.json(links);
    } catch (error) {
      console.error('Error fetching footer links:', error);
      res.status(500).json({ error: 'Failed to fetch footer links' });
    }
  });

  // Crypto routes with deposit jurisdiction checks
  registerCryptoRoutes(app);
  
  // Jurisdiction routes
  app.use('/api/jurisdiction', jurisdictionRoutes);
  
  // KYC routes
  const { kycRoutes } = await import('./kyc-routes');
  app.use('/api/kyc', kycRoutes);
  
  // Responsible gaming routes
  app.get('/api/responsible-gaming/limits', authenticateJWT, responsibleGamingRoutes.getLimits);
  app.put('/api/responsible-gaming/limits', authenticateJWT, responsibleGamingRoutes.updateLimits);
  app.get('/api/responsible-gaming/stats', authenticateJWT, responsibleGamingRoutes.getStats);
  app.post('/api/responsible-gaming/cooling-off', authenticateJWT, responsibleGamingRoutes.activateCoolingOff);
  app.post('/api/responsible-gaming/self-exclusion', authenticateJWT, responsibleGamingRoutes.activateSelfExclusion);
  app.post('/api/responsible-gaming/check-limits', authenticateJWT, responsibleGamingRoutes.checkLimits);
  app.post('/api/responsible-gaming/session/start', authenticateJWT, responsibleGamingRoutes.startSession);
  app.post('/api/responsible-gaming/session/end', authenticateJWT, responsibleGamingRoutes.endSession);
  app.post('/api/responsible-gaming/reality-check', authenticateJWT, responsibleGamingRoutes.triggerRealityCheck);
  app.post('/api/responsible-gaming/reality-check/respond', authenticateJWT, responsibleGamingRoutes.respondToRealityCheck);

  // Analytics routes
  app.get('/api/analytics/dashboard', authenticateJWT, analyticsRoutes.getDashboardAnalytics);
  app.get('/api/analytics/realtime', authenticateJWT, analyticsRoutes.getRealtimeMetrics);
  app.post('/api/analytics/export', authenticateJWT, analyticsRoutes.exportAnalytics);
  
  // Blackjack routes
  app.use('/api/blackjack', blackjackRouter);
  app.use('/api/games/hilo', hiloRouter);
  
  // Bonus system routes
  app.use('/api/bonuses', bonusRouter);
  
  // Progressive Jackpot routes
  app.use('/api', jackpotRouter);
  
  // Roulette routes
  const { rouletteRouter } = await import('./games/roulette');
  app.use('/api/roulette', rouletteRouter);

  // Tournament routes
  const { tournamentRoutes } = await import('./tournament-routes');
  app.get('/api/tournaments', tournamentRoutes.getAllTournaments);
  app.get('/api/tournaments/:id', tournamentRoutes.getTournamentDetails);
  app.post('/api/tournaments/join', authenticateJWT, tournamentRoutes.joinTournament);
  app.get('/api/tournaments/:id/leaderboard', tournamentRoutes.getLeaderboard);
  app.get('/api/tournaments/:id/entry', authenticateJWT, tournamentRoutes.getUserEntry);
  app.post('/api/tournaments/claim-prize', authenticateJWT, tournamentRoutes.claimPrize);
  
  // Admin tournament routes
  const adminTournamentRouter = await import('./admin-tournament-routes');
  app.use('/api/admin/tournaments', adminTournamentRouter.default);
  
  // Web3/NFT routes
  app.use('/api/web3', web3Router);
  app.use('/api/web3/webhook', webhookRouter);
  
  // PlayerPass1155 NFT routes
  const { nftRouter } = await import('./api/nft');
  app.use('/api/nft', nftRouter);

  // User history dashboard routes
  app.get('/api/user/game-history', authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      const { timeRange = '6months', gameType } = req.query;
      
      // Calculate date range
      const now = new Date();
      let startDate: Date;
      switch (timeRange) {
        case '1month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case '3months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          break;
        case '1year':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        default: // 6months
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      }

      // Get game history from bets table
      const gameHistory = await storage.getGameHistory(userId, startDate, gameType);
      res.json(gameHistory);
    } catch (error) {
      console.error('Error fetching game history:', error);
      res.status(500).json({ error: 'Failed to fetch game history' });
    }
  });

  app.get('/api/user/deposit-history', authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      const { timeRange = '6months', status } = req.query;
      
      // Calculate date range
      const now = new Date();
      let startDate: Date;
      switch (timeRange) {
        case '1month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case '3months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          break;
        case '1year':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        default: // 6months
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      }

      // Get deposit history from crypto deposits and transactions
      const depositHistory = await storage.getDepositHistory(userId, startDate, status);
      res.json(depositHistory);
    } catch (error) {
      console.error('Error fetching deposit history:', error);
      res.status(500).json({ error: 'Failed to fetch deposit history' });
    }
  });

  app.get('/api/user/withdrawal-history', authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      const { timeRange = '6months', status } = req.query;
      
      // Calculate date range
      const now = new Date();
      let startDate: Date;
      switch (timeRange) {
        case '1month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case '3months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          break;
        case '1year':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        default: // 6months
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      }

      // Get withdrawal history from crypto withdrawals and transactions
      const withdrawalHistory = await storage.getWithdrawalHistory(userId, startDate, status);
      res.json(withdrawalHistory);
    } catch (error) {
      console.error('Error fetching withdrawal history:', error);
      res.status(500).json({ error: 'Failed to fetch withdrawal history' });
    }
  });
  
  // Affiliate routes
  app.use('/api/affiliate', (await import('./affiliate/routes')).affiliateRoutes);

  // Object storage routes for file uploads
  const { ObjectStorageService } = await import('./objectStorage');
  const objectStorageService = new ObjectStorageService();
  
  // Object upload endpoint
  app.post('/api/objects/upload', authenticateJWT, async (req, res) => {
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // User routes
  app.get('/api/me', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        avatarType: user.avatarType || 'default',
        avatarBackgroundColor: user.avatarBackgroundColor || '#9333ea',
        loginStreak: user.loginStreak || 0,
        longestStreak: user.longestStreak || 0,
        scStreakCount: user.scStreakCount || 0,
        longestScStreak: user.longestScStreak || 0,
        lastScClaimDate: user.lastScClaimDate
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user' });
    }
  });

  // User profile endpoint
  app.get('/api/user/:userId/profile', optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      let { userId } = req.params;
      
      // Handle "current" user case
      if (userId === 'current') {
        if (!req.user?.userId) {
          return res.status(401).json({ error: 'Authentication required for current user profile' });
        }
        userId = req.user.userId;
      }
      
      // Validate userId
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      // Get user profile with statistics
      const profile = await storage.getUserProfile(userId);
    
    // Add total tips received
    const totalTipsReceived = await storage.getTotalTipsReceived(userId);
      
      if (!profile) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Format the response
      res.json({
        username: profile.username,
        joinedOn: profile.joinedOn,
        totalBets: profile.totalBets,
        totalWagered: profile.totalWagered,
        totalRewarded: profile.totalRewarded,
        rank: profile.rank,
        rankLevel: profile.rankLevel,
        nextRank: profile.nextRank,
        nextRankLevel: profile.nextRankLevel,
        nextRankRequirement: profile.nextRankRequirement,
        currentProgress: profile.currentProgress,
        favoriteGame: profile.favoriteGame,
        favoriteCrypto: profile.favoriteCrypto,
        totalTipsReceived: totalTipsReceived,
        avatarType: profile.user.avatarType || 'boy',
        avatarBackgroundColor: profile.user.avatarBackgroundColor || '#9333ea'
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  // Wallet connection routes
  app.get('/api/user/wallets', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const wallets = await storage.getUserWallets(userId);
      res.json(wallets);
    } catch (error) {
      console.error('Error fetching user wallets:', error);
      res.status(500).json({ error: 'Failed to fetch wallets' });
    }
  });

  app.post('/api/user/connect-wallet', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { walletType, address, signature } = req.body;

      if (!walletType || !address) {
        return res.status(400).json({ error: 'Wallet type and address are required' });
      }

      // In a real implementation, you would verify the signature
      // For now, we'll create a mock wallet connection
      const wallet = await storage.connectWallet({
        userId,
        walletType,
        address,
        signature: signature || 'mock_signature',
        status: 'connected'
      });

      res.json({ success: true, wallet });
    } catch (error) {
      console.error('Error connecting wallet:', error);
      res.status(500).json({ error: 'Failed to connect wallet' });
    }
  });

  app.delete('/api/user/wallet/:walletId', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const walletId = req.params.walletId;

      await storage.disconnectWallet(userId, walletId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      res.status(500).json({ error: 'Failed to disconnect wallet' });
    }
  });

  // Update user avatar preferences
  app.put('/api/me/avatar', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { avatarType, avatarBackgroundColor } = req.body;
      
      // Validate input
      if (!avatarType || !avatarBackgroundColor) {
        return res.status(400).json({ error: 'Avatar type and background color are required' });
      }
      
      // Validate avatar type using imported constants
      if (!validAvatarTypes.includes(avatarType)) {
        return res.status(400).json({ error: 'Invalid avatar type' });
      }
      
      // Validate hex color format
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexColorRegex.test(avatarBackgroundColor)) {
        return res.status(400).json({ error: 'Invalid color format. Use hex color (e.g., #9333ea)' });
      }
      
      await storage.updateUserAvatar(userId, avatarType, avatarBackgroundColor);
      res.json({ success: true, message: 'Avatar updated successfully' });
    } catch (error: any) {
      console.error('Error updating avatar:', error);
      res.status(500).json({ error: error.message || 'Failed to update avatar' });
    }
  });

  // Update user sound preference
  app.put('/api/me/sound', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { soundEnabled } = req.body;
      
      if (typeof soundEnabled !== 'boolean') {
        return res.status(400).json({ error: 'soundEnabled must be a boolean' });
      }
      
      await storage.updateUserSoundPreference(userId, soundEnabled);
      res.json({ success: true, message: 'Sound preference updated successfully' });
    } catch (error: any) {
      console.error('Error updating sound preference:', error);
      res.status(500).json({ error: error.message || 'Failed to update sound preference' });
    }
  });

  // Check and update login streak
  app.post('/api/me/check-streak', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const lastLogin = user.lastLoginDate;
      
      let newStreak = user.loginStreak || 0;
      let longestStreak = user.longestStreak || 0;
      let rewardGiven = false;
      let rewardAmount = 0;
      
      // Calculate streak
      if (!lastLogin) {
        // First login ever
        newStreak = 1;
      } else if (lastLogin === today) {
        // Already logged in today, no change
        return res.json({ 
          streak: newStreak, 
          longestStreak,
          rewardGiven: false,
          alreadyClaimed: true 
        });
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastLogin === yesterdayStr) {
          // Consecutive day
          newStreak += 1;
        } else {
          // Streak broken
          newStreak = 1;
        }
      }
      
      // Update longest streak
      if (newStreak > longestStreak) {
        longestStreak = newStreak;
      }
      
      // Give streak rewards (GC only)
      if (newStreak >= 3) {
        rewardGiven = true;
        rewardAmount = Math.min(newStreak * 50, 500); // 50 GC per day, max 500 GC
        
        // Add reward to balance
        const balance = await storage.getBalance(userId);
        if (balance) {
          await storage.updateBalance(userId, balance.available + rewardAmount, balance.locked);
          
          // Create transaction record
          await storage.createTransaction({
            userId,
            type: 'DEPOSIT',
            amount: rewardAmount,
            meta: {
              source: 'login_streak_bonus',
              streak: newStreak,
              rewardAmount
            }
          });
        }
      }
      
      // Update user streak
      await storage.updateUserLoginStreak(userId, newStreak, longestStreak, new Date());
      
      res.json({ 
        streak: newStreak, 
        longestStreak,
        rewardGiven,
        rewardAmount,
        alreadyClaimed: false
      });
    } catch (error: any) {
      console.error('Error checking login streak:', error);
      res.status(500).json({ error: error.message || 'Failed to check login streak' });
    }
  });

  // Daily Wheel Spinner (atomic to prevent double spins)
  app.post('/api/me/spin-wheel', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const todayUTC = new Date().toISOString().split('T')[0]; // YYYY-MM-DD UTC
      
      // Use atomic spin operation to prevent double spins
      const result = await storage.spinWheelAtomic(userId, todayUTC);
      
      if (!result.success) {
        return res.json({ 
          success: false,
          error: result.error,
          alreadySpun: true,
          nextSpinAvailable: new Date(new Date(todayUTC).getTime() + 24*60*60*1000).toISOString()
        });
      }
      
      res.json({ 
        success: true,
        rewardType: result.rewardType,
        rewardAmount: result.rewardAmount
      });
    } catch (error: any) {
      console.error('Spin wheel error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to spin wheel' });
    }
  });

  // Manual SC streak claim (atomic to prevent race conditions)
  app.post('/api/me/claim-sc-streak', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const todayUTC = new Date().toISOString().split('T')[0]; // YYYY-MM-DD UTC
      
      // Use atomic claim operation to prevent double claims
      const result = await storage.claimScStreakAtomic(userId, todayUTC);
      
      if (!result.success) {
        return res.json({ 
          success: false,
          error: result.error,
          streak: result.streak, 
          longestScStreak: result.longestScStreak,
          alreadyClaimed: true,
          nextClaimAvailable: new Date(new Date(todayUTC).getTime() + 24*60*60*1000).toISOString()
        });
      }
      
      res.json({ 
        success: true,
        streak: result.streak, 
        longestScStreak: result.longestScStreak,
        rewardAmount: result.rewardAmount,
        rewardGiven: result.rewardAmount > 0,
        alreadyClaimed: false,
        nextClaimAvailable: new Date(new Date(todayUTC).getTime() + 24*60*60*1000).toISOString()
      });
    } catch (error: any) {
      console.error('Error claiming SC streak:', error);
      res.status(500).json({ error: error.message || 'Failed to claim SC streak' });
    }
  });

  // VIP System Routes
  app.get('/api/vip/status', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      
      // Get user's VIP status
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get current level info
      const currentLevel = await storage.getVipLevelByName(user.vipLevel || 'UNRANKED');
      const nextLevel = await storage.getNextVipLevel(user.vipLevel || 'UNRANKED');
      
      // Calculate progress
      let progress = 0;
      if (nextLevel) {
        const experienceForCurrentLevel = currentLevel?.experienceRequired || 0;
        const experienceForNextLevel = nextLevel.experienceRequired;
        const currentExperience = user.vipExperience || 0;
        
        progress = Math.floor(
          ((currentExperience - experienceForCurrentLevel) / 
           (experienceForNextLevel - experienceForCurrentLevel)) * 100
        );
      } else {
        // Max level reached
        progress = 100;
      }
      
      res.json({
        currentLevel: user.vipLevel || 'UNRANKED',
        currentExperience: user.vipExperience || 0,
        nextLevel: nextLevel?.level || null,
        nextLevelExperience: nextLevel?.experienceRequired || null,
        progress,
        levelColor: currentLevel?.color || '#6B7280',
        levelIcon: currentLevel?.icon || 'user',
        vipLevelReachedAt: user.vipLevelReachedAt || null
      });
    } catch (error) {
      console.error('Error fetching VIP status:', error);
      res.status(500).json({ error: 'Failed to fetch VIP status' });
    }
  });

  app.get('/api/vip/levels', async (req, res) => {
    try {
      const levels = await storage.getAllVipLevels();
      
      // Get benefits for each level
      const levelsWithBenefits = await Promise.all(
        levels.map(async (level) => {
          const benefits = await storage.getVipBenefitsByLevel(level.level);
          return {
            ...level,
            benefits: benefits.map(b => ({
              type: b.benefitType,
              value: b.value,
              description: b.description
            }))
          };
        })
      );
      
      res.json(levelsWithBenefits);
    } catch (error) {
      console.error('Error fetching VIP levels:', error);
      res.status(500).json({ error: 'Failed to fetch VIP levels' });
    }
  });

  app.get('/api/vip/rewards', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const rewards = await storage.getUserVipRewards(userId);
      
      res.json(rewards.map(reward => ({
        id: reward.id,
        type: reward.rewardType,
        amount: reward.amount / 100, // Convert from cents
        vipLevel: reward.vipLevel,
        status: reward.status,
        claimedAt: reward.claimedAt,
        expiresAt: reward.expiresAt,
        createdAt: reward.createdAt
      })));
    } catch (error) {
      console.error('Error fetching VIP rewards:', error);
      res.status(500).json({ error: 'Failed to fetch VIP rewards' });
    }
  });

  app.post('/api/vip/claim-reward/:rewardId', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const rewardId = parseInt(req.params.rewardId);
      
      const result = await storage.claimVipReward(userId, rewardId);
      
      if (result.success) {
        res.json({ success: true, message: 'Reward claimed successfully' });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Error claiming VIP reward:', error);
      res.status(500).json({ error: 'Failed to claim reward' });
    }
  });

  app.get('/api/balance', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      let balance = await storage.getBalance(req.user!.userId);
      
      // Auto-create balance if it doesn't exist (for legacy/new users)
      if (!balance) {
        console.warn(`Balance not found for user ${req.user!.userId}, creating default balance`);
        try {
          // Create GC balance
          await storage.createBalance({
            userId: req.user!.userId,
            available: 0,
            locked: 0,
            currency: 'GC'
          });
          
          // Create SC balance
          await storage.createBalance({
            userId: req.user!.userId,
            available: 0,
            locked: 0,
            currency: 'SC'
          });
          
          // Re-fetch balance
          balance = await storage.getBalance(req.user!.userId);
          
          if (!balance) {
            return res.status(500).json({ error: 'Failed to create balance' });
          }
        } catch (createError: any) {
          // Ignore unique constraint violations (concurrent requests may have created it)
          if (createError?.code === '23505' || createError?.message?.includes('unique')) {
            console.log(`Balance already exists for user ${req.user!.userId}, fetching existing`);
            balance = await storage.getBalance(req.user!.userId);
            if (!balance) {
              return res.status(500).json({ error: 'Failed to retrieve balance' });
            }
          } else {
            console.error('Error creating balance:', createError);
            return res.status(500).json({ error: 'Failed to create balance' });
          }
        }
      }
      
      res.json({
        available: balance.available / 100, // Convert from cents
        locked: balance.locked / 100,
        currency: 'SC',
        total: (balance.available + balance.locked) / 100,
        sweepsCashTotal: Number(balance.sweepsCashTotal) || 0,
        sweepsCashRedeemable: Number(balance.sweepsCashRedeemable) || 0,
        balanceMode: user.balanceMode || 'GC' // Include user's preferred balance mode
      });
    } catch (error) {
      console.error('Balance endpoint error:', error);
      res.status(500).json({ error: 'Failed to get balance' });
    }
  });

  // Get user's balance mode preference
  app.get('/api/balance-mode', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        balanceMode: user.balanceMode || 'GC'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get balance mode' });
    }
  });

  // Set user's balance mode preference
  app.post('/api/balance-mode', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { balanceMode } = req.body;
      
      // Validate balance mode
      if (!balanceMode || !['GC', 'SC'].includes(balanceMode)) {
        return res.status(400).json({ error: 'Invalid balance mode. Must be GC or SC' });
      }
      
      // Update user's balance mode preference
      await storage.updateUserBalanceMode(userId, balanceMode);
      
      res.json({
        success: true,
        balanceMode: balanceMode
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update balance mode' });
    }
  });

  // Vault endpoints
  const vaultStashSchema = z.object({
    amount: z.number().min(0.01),
    currency: z.enum(['GC', 'SC']),
    description: z.string().optional(),
    autoReleaseAt: z.string().optional()
  });

  // Get user's vault entries
  app.get('/api/vault/entries', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const vaultEntries = await storage.getUserVaultEntries(userId);
      res.json(vaultEntries);
    } catch (error) {
      console.error('Error fetching vault entries:', error);
      res.status(500).json({ error: 'Failed to fetch vault entries' });
    }
  });

  // Stash credits to vault
  app.post('/api/vault/stash', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const parsed = vaultStashSchema.parse(req.body);
      
      // Validate auto-release date is in the future
      if (parsed.autoReleaseAt) {
        const releaseDate = new Date(parsed.autoReleaseAt);
        if (releaseDate <= new Date()) {
          return res.status(400).json({ 
            error: 'Auto-release date must be in the future' 
          });
        }
      }

      // Use atomic storage method
      const vaultEntry = await storage.stashToVault({
        userId,
        amount: parsed.amount.toString(),
        currency: parsed.currency,
        description: parsed.description || null,
        autoReleaseAt: parsed.autoReleaseAt ? new Date(parsed.autoReleaseAt) : null,
        status: 'STASHED'
      });

      res.json({ success: true, vaultEntry });
    } catch (error) {
      console.error('Error stashing to vault:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to stash credits to vault' });
    }
  });

  // Release credits from vault
  app.post('/api/vault/release/:entryId', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const entryId = req.params.entryId;

      // Use atomic storage method
      const releasedEntry = await storage.releaseFromVault(entryId, userId);

      res.json({ success: true, vaultEntry: releasedEntry });
    } catch (error) {
      console.error('Error releasing from vault:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to release credits from vault' });
    }
  });

  // Rakeback system endpoints
  app.get('/api/rakeback/balance', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const balance = await storage.getRakebackBalance(userId);
      
      if (balance) {
        // Map database field names to frontend expected names
        res.json({
          userId: balance.userId,
          availableAmount: balance.availableBalance,
          totalEarned: balance.totalEarned,
          lastUpdated: balance.updatedAt
        });
      } else {
        // Return default structure for new users
        res.json({
          userId,
          availableAmount: 0,
          totalEarned: 0,
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error fetching rakeback balance:', error);
      res.status(500).json({ error: 'Failed to fetch rakeback balance' });
    }
  });

  app.get('/api/rakeback/transactions', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 50;
      const transactions = await storage.getRakebackTransactions(userId, limit);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching rakeback transactions:', error);
      res.status(500).json({ error: 'Failed to fetch rakeback transactions' });
    }
  });

  app.post('/api/rakeback/withdraw', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid withdrawal amount' });
      }

      const result = await storage.withdrawRakebackToBalance(userId, amount, 'SC');
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Get updated balances to return
      const rakebackBalance = await storage.getRakebackBalance(userId);
      const scBalance = await storage.getUserBalance(userId);

      res.json({ 
        success: true, 
        message: 'Rakeback withdrawn successfully',
        withdrawnAmount: amount,
        newRakebackBalance: rakebackBalance?.availableBalance || 0,
        newSCBalance: scBalance?.available || 0
      });
    } catch (error) {
      console.error('Error processing rakeback withdrawal:', error);
      res.status(500).json({ error: 'Failed to process rakeback withdrawal' });
    }
  });

  app.get('/api/rakeback/stats', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const balance = await storage.getRakebackBalance(userId);
      
      // Get lifetime totals from all transactions (not just last 10)
      const allTransactions = await storage.getRakebackTransactions(userId, 1000); // Get more transactions for accurate totals
      
      const totalEarned = allTransactions
        .filter(tx => tx.type === 'EARNED')
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      
      const totalWithdrawn = allTransactions
        .filter(tx => tx.type === 'WITHDRAWAL')
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

      res.json({
        currentBalance: balance?.availableBalance || 0,
        totalEarned: balance?.totalEarned || totalEarned, // Use balance table value if available, fallback to calculated
        totalWithdrawn,
        rakebackRate: 0.05 // 5% rakeback rate
      });
    } catch (error) {
      console.error('Error fetching rakeback stats:', error);
      res.status(500).json({ error: 'Failed to fetch rakeback stats' });
    }
  });

  // Sweeps Cash Redemption API
  app.post('/api/redeem/sweeps-cash', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { amount } = req.body;
      
      // Validate amount
      if (!amount || typeof amount !== 'number' || amount < 0.01) {
        return res.status(400).json({ error: 'Invalid redemption amount. Minimum is $0.01' });
      }
      
      // Get user's current balance and KYC status
      const [balance, user] = await Promise.all([
        storage.getBalance(userId),
        storage.getUser(userId)
      ]);
      
      if (!balance) {
        return res.status(404).json({ error: 'Balance not found' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Check KYC verification
      if (!user.kycVerified) {
        return res.status(403).json({ error: 'KYC verification required for redemption' });
      }
      
      // Check if user has sufficient redeemable balance
      const redeemableBalance = Number(balance.sweepsCashRedeemable) || 0;
      if (redeemableBalance < amount) {
        return res.status(400).json({ 
          error: 'Insufficient redeemable balance',
          available: redeemableBalance,
          requested: amount
        });
      }
      
      // For now, simulate a successful redemption request
      // In a real implementation, you would integrate with NOWPayments to create a withdrawal
      // and update the user's balance accordingly
      
      // TODO: Integrate with NOWPayments API for actual cash withdrawal
      // const nowPaymentsService = NOWPaymentsService.getInstance();
      // const withdrawalRequest = await nowPaymentsService.createWithdrawal(userId, amount, 'USD');
      
      // Create a transaction record for the redemption attempt
      const transaction = await storage.createTransaction({
        userId,
        type: 'WITHDRAW',
        amount: Math.round(amount * 100), // Convert to cents for storage
        meta: {
          redemptionType: 'sweeps_cash',
          description: `Sweeps Cash redemption request: $${amount.toFixed(2)}`,
          originalAmount: amount,
          currency: 'USD'
        }
      });
      
      // For demo purposes, deduct the amount from redeemable balance
      // In production, this would happen after withdrawal confirmation
      await storage.updateSweepsCashBalance(userId, {
        totalChange: 0,
        redeemableChange: -amount
      });
      
      res.json({
        success: true,
        message: 'Redemption request submitted successfully',
        transactionId: transaction.id,
        amount: amount,
        status: 'pending'
      });
      
    } catch (error) {
      console.error('Error processing sweeps cash redemption:', error);
      res.status(500).json({ error: 'Failed to process redemption request' });
    }
  });

  app.get('/api/transactions', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const transactions = await storage.getTransactions(req.user!.userId, limit);
      
      res.json(transactions.map(tx => ({
        ...tx,
        amount: tx.amount / 100 // Convert from cents
      })));
    } catch (error) {
      res.status(500).json({ error: 'Failed to get transactions' });
    }
  });

  // Daily Login System Routes
  app.get('/api/daily-login/status', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      
      // Get user's daily login status
      const userLogin = await storage.getUserDailyLoginStatus(userId);
      
      // Check if user has claimed today (using UTC date)
      const hasClaimedToday = await storage.hasClaimedDailyLoginToday(userId);
      
      // Get all available rewards
      const rewards = await storage.getDailyLoginRewards();
      
      // Calculate current streak and next day using UTC dates
      let currentStreak = 0;
      let nextClaimDay = 1;
      let canClaim = true;
      
      if (userLogin) {
        currentStreak = userLogin.currentStreak;
        
        if (hasClaimedToday) {
          nextClaimDay = Math.min(currentStreak + 1, 7);
          canClaim = false;
        } else {
          // Check if streak should reset using UTC dates
          const todayUTC = new Date().toISOString().split('T')[0];
          const lastLogin = userLogin.lastLoginDate;
          
          if (lastLogin) {
            const daysDiff = Math.floor((new Date(todayUTC).getTime() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff > 1) {
              // Streak should reset
              currentStreak = 0;
              nextClaimDay = 1;
            } else {
              nextClaimDay = Math.min(currentStreak + 1, 7);
            }
          } else {
            nextClaimDay = 1;
          }
        }
      }
      
      // Calculate next reset time (tomorrow at UTC midnight)
      const tomorrowUTC = new Date();
      tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);
      tomorrowUTC.setUTCHours(0, 0, 0, 0);
      
      res.json({
        currentStreak,
        nextClaimDay,
        canClaim,
        hasClaimedToday,
        nextResetAt: tomorrowUTC.toISOString(),
        rewards: rewards.map(reward => ({
          day: reward.day,
          goldCoins: reward.goldCoins,
          sweepCoins: Number(reward.sweepCoins),
          isActive: reward.isActive
        }))
      });
    } catch (error) {
      console.error('Error getting daily login status:', error);
      res.status(500).json({ error: 'Failed to get daily login status' });
    }
  });

  app.post('/api/daily-login/claim', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const todayUTC = new Date().toISOString().split('T')[0];
      
      // Use atomic claim operation that handles race conditions
      try {
        const reward = await storage.claimDailyLoginRewardAtomic(userId, todayUTC);
        
        res.json({
          success: true,
          day: reward.day,
          goldCoins: reward.goldCoins,
          sweepCoins: reward.sweepCoins,
          newStreak: reward.newStreak
        });
      } catch (error: any) {
        // Handle duplicate claim attempts
        if (error.message?.includes('Already claimed') || error.code === '23505') {
          return res.status(409).json({ error: 'Already claimed today' });
        }
        throw error;
      }
    } catch (error) {
      console.error('Error claiming daily login reward:', error);
      res.status(500).json({ error: 'Failed to claim daily login reward' });
    }
  });

  // Top Up Bonus System Routes
  app.get('/api/top-up-bonus/status', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      
      // Get user's top up bonus status
      const status = await storage.getUserTopUpBonusStatus(userId);
      
      const now = new Date();
      let canClaim = true;
      let nextAvailableAt: Date | null = null;
      let timeUntilNext = 0;

      if (status?.nextAvailableAt) {
        nextAvailableAt = new Date(status.nextAvailableAt);
        canClaim = now >= nextAvailableAt;
        
        if (!canClaim) {
          timeUntilNext = Math.max(0, nextAvailableAt.getTime() - now.getTime());
        }
      }

      res.json({
        canClaim,
        nextAvailableAt: nextAvailableAt?.toISOString() || null,
        timeUntilNext,
        totalClaims: status?.totalClaims || 0,
        rewardAmount: 2500 // Fixed amount of 2,500 GC
      });
    } catch (error) {
      console.error('Error getting top up bonus status:', error);
      res.status(500).json({ error: 'Failed to get top up bonus status' });
    }
  });

  app.post('/api/top-up-bonus/claim', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const now = new Date();
      
      // CSRF Protection: Validate origin for state-changing operations
      const origin = req.get('Origin') || req.get('Referer');
      const allowedOrigins = [
        'http://localhost:5000', 
        'https://localhost:5000',
        process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null,
        process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS}` : null
      ].filter(Boolean);
      
      if (origin && !allowedOrigins.some(allowed => allowed && origin.startsWith(allowed))) {
        console.warn(`Rejected top-up claim from invalid origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
        return res.status(403).json({ error: 'Invalid origin' });
      }
      
      // Use atomic claim operation that handles race conditions
      try {
        const reward = await storage.claimTopUpBonusAtomic(userId, now);
        
        res.json({
          success: true,
          goldCoins: reward.goldCoins,
          nextAvailableAt: reward.nextAvailableAt
        });
      } catch (error: any) {
        // Handle cooldown violations
        if (error.message?.includes('cooldown') || error.message?.includes('available')) {
          return res.status(429).json({ error: 'Top up bonus not available yet' });
        }
        throw error;
      }
    } catch (error) {
      console.error('Error claiming top up bonus:', error);
      res.status(500).json({ error: 'Failed to claim top up bonus' });
    }
  });

  app.get('/api/bets', optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const limit = parseInt(req.query.limit as string) || 10;
      const bets = await storage.getBets(req.user.userId, limit);
      
      res.json(bets.map(bet => ({
        ...bet,
        amount: bet.amount / 100,
        profit: bet.profit / 100
      })));
    } catch (error) {
      console.error('Failed to get bets:', error);
      res.status(500).json({ error: 'Failed to get bets' });
    }
  });

  // Games API - Recently Played Games
  app.get('/api/games/recent', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      
      // Get the last 3 unique games the user has played
      const recentGames = await storage.getRecentlyPlayedGames(userId, 3);
      
      res.json(recentGames);
    } catch (error) {
      console.error('Error fetching recently played games:', error);
      res.status(500).json({ error: 'Failed to fetch recently played games' });
    }
  });

  // Games API - Get User's Favorite Games
  app.get('/api/games/favorites', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      
      const favorites = await storage.getUserFavorites(userId);
      
      res.json(favorites);
    } catch (error) {
      console.error('Error fetching favorite games:', error);
      res.status(500).json({ error: 'Failed to fetch favorite games' });
    }
  });

  // Games API - Add Game to Favorites
  app.post('/api/games/favorites', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { gameName } = req.body;
      
      if (!gameName || typeof gameName !== 'string') {
        return res.status(400).json({ error: 'Game name is required' });
      }
      
      const result = await storage.addGameToFavorites(userId, gameName);
      
      res.json({ success: true, favorite: result });
    } catch (error: any) {
      console.error('Error adding game to favorites:', error);
      
      // Handle duplicate favorite error
      if (error.message?.includes('duplicate') || error.code === '23505') {
        return res.status(409).json({ error: 'Game is already in favorites' });
      }
      
      res.status(500).json({ error: 'Failed to add game to favorites' });
    }
  });

  // Games API - Remove Game from Favorites  
  app.delete('/api/games/favorites/:gameName', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { gameName } = req.params;
      
      const success = await storage.removeGameFromFavorites(userId, gameName);
      
      if (!success) {
        return res.status(404).json({ error: 'Favorite game not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing game from favorites:', error);
      res.status(500).json({ error: 'Failed to remove game from favorites' });
    }
  });

  // Development only - free credits
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/deposit/dev', authenticateJWT, async (req: AuthenticatedRequest, res) => {
      try {
        const amount = 1000 * 100; // 1000 credits in cents
        const balance = await storage.getBalance(req.user!.userId);
        
        if (!balance) {
          return res.status(404).json({ error: 'Balance not found' });
        }
        
        await storage.updateBalance(req.user!.userId, balance.available + amount, balance.locked);
        
        await storage.createTransaction({
          userId: req.user!.userId,
          type: 'DEPOSIT',
          amount,
          meta: { source: 'dev_freebie' }
        });
        
        res.json({ success: true, amount: amount / 100 });
      } catch (error) {
        res.status(500).json({ error: 'Failed to deposit' });
      }
    });
  }


  // Miracoaster routes
  app.get('/api/miracoaster/status', (req, res) => {
    miracoasterHandlers.getStatus(req, res);
  });

  app.get('/api/miracoaster/position', optionalAuth, async (req: any, res) => {
    miracoasterHandlers.getPosition(req, res);
  });

  app.post('/api/miracoaster/bet', optionalAuth, async (req: any, res) => {
    miracoasterHandlers.placeBet(req, res);
  });

  app.post('/api/miracoaster/cashout', optionalAuth, async (req: any, res) => {
    miracoasterHandlers.cashout(req, res);
  });

  app.get('/api/miracoaster/public-bets', async (req, res) => {
    const { active, recent } = await miracoasterEngine.getAllPositionsWithHistory();
    
    // Format active positions
    const formattedActive = active.map((pos: any) => ({
      id: pos.id,
      userId: pos.userId,
      username: `Player${pos.userId.slice(0, 6)}`,
      direction: pos.direction,
      wager: pos.wager,
      leverage: pos.leverage,
      entryPrice: pos.entryPrice,
      bustPrice: pos.bustPrice,
      currentPrice: miracoasterEngine.getState().price,
      status: pos.status,
      pnl: pos.pnl || 0,
      roi: pos.roi || 0,
      timestamp: pos.createdAt
    }));
    
    // Format recent completed positions
    const formattedRecent = recent.map((pos: any) => ({
      id: pos.id,
      userId: pos.userId,
      username: `Player${pos.userId.slice(0, 6)}`,
      direction: pos.direction,
      wager: pos.wager,
      leverage: pos.leverage,
      entryPrice: pos.entryPrice,
      bustPrice: pos.bustPrice,
      currentPrice: pos.exitPrice || miracoasterEngine.getState().price,
      status: pos.status,
      pnl: pos.pnl || 0,
      roi: pos.roi || 0,
      timestamp: pos.closedAt || pos.createdAt
    }));
    
    // Combine and sort by timestamp (most recent first)
    const allBets = [...formattedActive, ...formattedRecent]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50); // Limit to 50 most recent
    
    res.json(allBets);
  });

  app.get('/api/miracoaster/history', (req, res) => {
    miracoasterHandlers.getPriceHistory(req, res);
  });

  // Miraclez Dice routes
  app.get('/api/miraclez-dice/next', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const commitment = miraclezDice.getNextCommitment(userId);
      res.json(commitment);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get commitment' });
    }
  });

  app.post('/api/miraclez-dice/roll', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = miraclezDiceBetSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { betAmount, target, side, clientSeed, nonce, gameMode } = validation.data;
      const userId = req.user!.userId;

      const result = await miraclezDice.rollDice(
        userId,
        betAmount,
        target,
        side,
        clientSeed,
        nonce,
        gameMode
      );

      // Progressive Jackpot Integration (ALL real money bets contribute and have win chance)
      if (gameMode === 'real') {
        // Get user's balance mode to determine currency
        const user = await storage.getUser(userId);
        const currency = user?.balanceMode || 'SC';
        
        // Process jackpot contribution (every bet funds the pools)
        await processJackpotContributions(
          userId,
          new Decimal(betAmount),
          currency,
          'MIRACLEZ_DICE',
          broadcastToAll
        );
        
        // Check for jackpot win (every bet has a chance)
        const jackpotResult = await checkJackpotWin(
          userId,
          new Decimal(betAmount),
          currency,
          'MIRACLEZ_DICE',
          broadcastToAll
        );
        
        // Add jackpot info to response if won
        if (jackpotResult.won) {
          res.json({
            ...result,
            jackpot: {
              won: true,
              tier: jackpotResult.tier,
              amount: jackpotResult.amount?.toString()
            }
          });
          return;
        }
      }

      res.json(result);
    } catch (error: any) {
      console.error('Miraclez dice roll error:', error);
      res.status(400).json({ error: error.message || 'Failed to roll dice' });
    }
  });

  app.post('/api/miraclez-dice/risk', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = miraclezRiskSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { amount, selection, clientSeed, nonce, gameMode } = validation.data;
      const userId = req.user!.userId;

      const result = await miraclezDice.riskRoll(
        userId,
        amount,
        selection,
        clientSeed,
        nonce,
        gameMode
      );

      res.json(result);
    } catch (error: any) {
      console.error('Miraclez risk error:', error);
      res.status(400).json({ error: error.message || 'Failed to risk' });
    }
  });

  app.post('/api/miraclez-dice/take', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const { amount } = req.body;
      const userId = req.user!.userId;

      await miraclezDice.takeWinnings(userId, amount);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Miraclez take error:', error);
      res.status(400).json({ error: error.message || 'Failed to take winnings' });
    }
  });

  app.post('/api/miraclez-dice/rotate-seed', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const result = miraclezDice.rotateServerSeed(userId);
      res.json(result);
    } catch (error: any) {
      console.error('Miraclez rotate seed error:', error);
      res.status(400).json({ error: error.message || 'Failed to rotate seed' });
    }
  });

  // Keno game routes with provably-fair system
  app.get('/api/keno/next', optionalAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId || req.sessionID || 'anonymous';
      const kenoGame = await import('./games/keno');
      const commitment = await kenoGame.generateNextCommitment(userId);
      res.json(commitment);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate commitment' });
    }
  });

  app.post('/api/keno/bet', optionalAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId || req.sessionID || 'anonymous';
      const { betAmount, picks, risk, clientSeed, nonce } = req.body;
      
      const kenoGame = await import('./games/keno');
      const result = await kenoGame.playKeno(userId, betAmount, picks, risk, clientSeed, nonce);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
    }
  });

  app.post('/api/keno/verify', (req, res) => {
    try {
      const { serverSeedHash, serverSeed, clientSeed, nonce } = req.body;
      
      if (!serverSeedHash || !serverSeed || !clientSeed || nonce === undefined) {
        return res.status(400).json({ error: 'Missing parameters' });
      }
      
      const kenoGame = require('./games/keno');
      const result = kenoGame.verifyKeno(
        serverSeedHash as string,
        serverSeed as string,
        clientSeed as string,
        parseInt(nonce as string)
      );
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: 'Failed to verify keno' });
    }
  });

  app.post('/api/games/slots/spin', authenticateJWT, gamblingJurisdictionCheck, responsibleGamingMiddleware('BET'), async (req: AuthenticatedRequest, res) => {
    try {
      const data = slotsBetSchema.parse(req.body);
      const result = await playSlots(req.user!.userId, data);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
    }
  });

  // Mines game routes
  app.post('/api/mines/start', optionalAuth, async (req: any, res) => {
    try {
      const { betAmount, mines, clientSeed } = req.body;
      const userId = req.user?.userId || 'anonymous';
      
      // For authenticated users, check and deduct balance
      if (req.user) {
        const betAmountCents = Math.round(parseFloat(betAmount) * 100);
        
        // Get user's balance mode preference
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        // Check balance based on user's preferred mode
        const balance = await storage.getBalance(userId);
        if (!balance) {
          return res.status(404).json({ error: 'Balance not found' });
        }
        
        const userBalanceMode = user.balanceMode || 'GC';
        
        if (userBalanceMode === 'SC') {
          // SC Mode: Check Sweeps Cash balance
          const sweepsCashBalance = Number(balance.sweepsCashTotal) || 0;
          const sweepsCashBalanceInCents = Math.floor(sweepsCashBalance * 100);
          
          if (sweepsCashBalanceInCents < betAmountCents) {
            return res.status(400).json({ error: 'Insufficient sweeps cash balance' });
          }
        } else {
          // GC Mode: Check regular balance
          if (balance.available < betAmountCents) {
            return res.status(400).json({ error: 'Insufficient balance' });
          }
        }
        
        // Deduct bet amount based on balance mode
        if (userBalanceMode === 'SC') {
          // SC Mode: Deduct from sweeps cash
          const totalChange = -(betAmountCents / 100);
          const redeemableChange = -(betAmountCents / 100);
          await storage.updateSweepsCashBalance(userId, { totalChange, redeemableChange });
        } else {
          // GC Mode: Deduct from regular balance
          await db
            .update(balances)
            .set({ 
              available: balance.available - betAmountCents,
              locked: balance.locked + betAmountCents
            })
            .where(eq(balances.userId, userId));
        }
        
        // Update bonus wagering for authenticated users
        if (req.user) {
          await updateBonusWagering(userId, betAmount);
        }
        
        // Record transaction
        await db.insert(transactions).values({
          userId,
          type: 'BET',
          amount: -betAmountCents, // Negative for bet
          meta: { 
            game: 'mines', 
            mines, 
            betAmount: betAmountCents,
            balanceMode: userBalanceMode,
            description: `Mines bet - ${mines} mines (${userBalanceMode})`
          }
        });
      }
      
      const minesGame = await import('./games/mines');
      const result = await minesGame.startRound(userId, betAmount, mines, clientSeed);
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/mines/pick', optionalAuth, async (req: any, res) => {
    try {
      const { roundId, tileIndex } = req.body;
      const userId = req.user?.userId || 'anonymous';
      
      const minesGame = await import('./games/mines');
      const result = await minesGame.pickTile(roundId, tileIndex, userId);
      
      // If user hit a mine, handle the loss based on their balance mode
      if (req.user && result.state === 'boom') {
        // Get the round info to find bet amount
        const round = minesGame.activeRounds.get(roundId);
        
        if (round) {
          const betAmountCents = Math.round(parseFloat(round.betAmount.toString()) * 100);
          
          // Get user's balance mode preference
          const user = await storage.getUser(userId);
          if (user) {
            const userBalanceMode = user.balanceMode || 'GC';
            
            if (userBalanceMode === 'SC') {
              // SC Mode: Loss is already handled in the start route deduction
              // No additional balance updates needed for SC mode on loss
            } else {
              // GC Mode: Unlock the bet amount (they lost it, so just remove from locked)
              const balance = await storage.getBalance(userId);
              if (balance) {
                await db
                  .update(balances)
                  .set({ 
                    locked: Math.max(0, balance.locked - betAmountCents)
                  })
                  .where(eq(balances.userId, userId));
              }
            }
            
            // Record loss transaction  
            await db.insert(transactions).values({
              userId,
              type: 'BET',  // Use BET type for loss (no LOSS type in schema)
              amount: 0,  // No payout on loss
              meta: { 
                game: 'mines', 
                roundId,
                result: 'loss',
                balanceMode: userBalanceMode,
                description: `Mines loss - hit mine (${userBalanceMode})`
              }
            });
          }
        }
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/mines/cashout', optionalAuth, async (req: any, res) => {
    try {
      const { roundId } = req.body;
      const userId = req.user?.userId || 'anonymous';
      
      const minesGame = await import('./games/mines');
      const result = minesGame.cashOut(roundId, userId);
      
      // Update balance for authenticated users
      if (req.user && result.state === 'cashed') {
        const payoutCents = Math.round(parseFloat(result.payout) * 100);
        const betAmountCents = Math.round(payoutCents / result.currentMultiplier);
        
        // Get user's balance mode preference
        const user = await storage.getUser(userId);
        if (user) {
          const userBalanceMode = user.balanceMode || 'GC';
          
          if (userBalanceMode === 'SC') {
            // SC Mode: Update Sweeps Cash balance
            const totalChange = (payoutCents - betAmountCents) / 100; // Net change: payout - original bet
            const redeemableChange = (payoutCents - betAmountCents) / 100; // Win amount is redeemable
            
            await storage.updateSweepsCashBalance(userId, { totalChange, redeemableChange });
          } else {
            // GC Mode: Update regular balance
            const balance = await storage.getBalance(userId);
            if (balance) {
              // Update balance: add payout to available, remove bet from locked
              await db
                .update(balances)
                .set({ 
                  available: balance.available + payoutCents,
                  locked: Math.max(0, balance.locked - betAmountCents)
                })
                .where(eq(balances.userId, userId));
            }
          }
          
          // Record win transaction
          await db.insert(transactions).values({
            userId,
            type: 'PAYOUT',
            amount: payoutCents,
            meta: { 
              game: 'mines', 
              roundId,
              picks: result.picks,
              multiplier: result.currentMultiplier,
              payout: payoutCents,
              balanceMode: userBalanceMode,
              description: `Mines win - ${result.picks} safe picks at ${result.currentMultiplier.toFixed(2)}x (${userBalanceMode})`
            }
          });
        }
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/mines/verify', (req, res) => {
    try {
      const { serverSeedHash, serverSeed, clientSeed, nonce, mines } = req.query;
      
      const minesGame = require('./games/mines');
      const result = minesGame.verifyRound(
        serverSeedHash as string,
        serverSeed as string,
        clientSeed as string,
        parseInt(nonce as string),
        parseInt(mines as string)
      );
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Plinko game routes
  app.post('/api/plinko/bet', authenticateJWT, gamblingJurisdictionCheck, responsibleGamingMiddleware('BET'), async (req: AuthenticatedRequest, res) => {
    try {
      const data = plinkoBetSchema.parse(req.body);
      const betAmount = parseFloat(data.betAmount);
      
      if (isNaN(betAmount) || betAmount <= 0) {
        return res.status(400).json({ error: 'Invalid bet amount' });
      }
      
      const result = await playPlinko(req.user!.userId, betAmount, data.rows, data.risk);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
    }
  });

  // Tower Defense game routes
  app.post('/api/tower-defense/play', authenticateJWT, gamblingJurisdictionCheck, responsibleGamingMiddleware('BET'), async (req: AuthenticatedRequest, res) => {
    try {
      const data = towerDefenseBetSchema.parse(req.body);
      const userId = req.user!.userId;
      
      // Check balance
      const balance = await storage.getBalance(userId);
      if (!balance || balance.available < data.betAmount * 100) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }
      
      // Deduct bet amount
      await storage.updateBalance(userId, balance.available - data.betAmount * 100, balance.locked);
      
      // Play the game
      const user = await storage.getUser(userId);
      const result = towerDefense.playTowerDefense(
        data.betAmount,
        data.difficulty,
        userId,
        user?.username || `Player${userId.slice(-4)}`
      );
      
      // Update balance if won
      if (result.won) {
        const updatedBalance = await storage.getBalance(userId);
        if (updatedBalance) {
          await storage.updateBalance(userId, updatedBalance.available + result.payout * 100, updatedBalance.locked);
        }
      }
      
      // Update bonus wagering
      await updateBonusWagering(userId, data.betAmount);
      
      // Record transaction
      await storage.createTransaction({
        userId,
        type: result.won ? 'PAYOUT' : 'BET',
        amount: result.won ? result.payout * 100 : -data.betAmount * 100,
        meta: { 
          game: 'tower-defense', 
          difficulty: data.difficulty,
          multiplier: result.multiplier,
          profit: result.profit
        }
      });
      
      res.json(result);
    } catch (error) {
      console.error('Tower Defense play error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to play round' });
    }
  });

  app.post('/api/tower-defense/double-up', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const data = towerDefenseDoubleUpSchema.parse(req.body);
      const userId = req.user!.userId;
      
      const result = towerDefense.playDoubleUp(data.amount, data.selectedCard, userId);
      
      // Update balance if won
      if (result.won) {
        const balance = await storage.getBalance(userId);
        if (balance) {
          await storage.updateBalance(userId, balance.available + data.amount * 100, balance.locked);
        }
      }
      
      res.json(result);
    } catch (error) {
      console.error('Tower Defense double-up error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to double-up' });
    }
  });

  app.post('/api/tower-defense/collect', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const data = towerDefenseCollectSchema.parse(req.body);
      const userId = req.user!.userId;
      
      // The amount has already been added to balance during win,
      // this is just confirming collection
      res.json({ success: true, amount: data.amount });
    } catch (error) {
      console.error('Tower Defense collect error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to collect winnings' });
    }
  });

  // Fundora Blox game routes
  app.post('/api/fundora-blox/start', authenticateJWT, gamblingJurisdictionCheck, responsibleGamingMiddleware('BET'), async (req: AuthenticatedRequest, res) => {
    try {
      const data = fundoraBloxStartSchema.parse(req.body);
      const userId = req.user!.userId;
      
      const result = await fundoraBlox.startFundoraBloxGame({ 
        userId, 
        stake: data.stake // Pass stake in dollars (e.g., 0, 0.5, 1, 2, 5, 10, 20)
      });
      res.json(result);
    } catch (error) {
      console.error('Fundora Blox start error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to start game' });
    }
  });

  app.post('/api/fundora-blox/end', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const data = fundoraBloxEndSchema.parse(req.body);
      const userId = req.user!.userId;
      
      const result = await fundoraBlox.endFundoraBloxGame({
        userId,
        stake: data.stake, // Stake in dollars
        highestRow: data.highestRow,
        blocksStacked: data.blocksStacked,
        prize: data.prize, // Prize in dollars
        prizeType: data.prizeType
      });
      res.json(result);
    } catch (error) {
      console.error('Fundora Blox end error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to end game' });
    }
  });







  // Provably Fair routes
  app.get('/api/provably-fair/current', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const serverSeed = await storage.getActiveServerSeed();
      let clientSeed = await storage.getUserClientSeed(req.user!.userId);
      
      if (!clientSeed) {
        clientSeed = await storage.createClientSeed({
          userId: req.user!.userId,
          seed: generateClientSeed()
        });
      }
      
      const nonce = await storage.getUserNonce(req.user!.userId);
      
      res.json({
        serverSeedHash: serverSeed?.hash,
        clientSeed: clientSeed.seed,
        nextNonce: nonce
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get provably fair data' });
    }
  });

  app.post('/api/provably-fair/client-seed', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const { seed } = req.body;
      
      if (!seed || typeof seed !== 'string') {
        return res.status(400).json({ error: 'Invalid seed' });
      }
      
      await storage.createClientSeed({
        userId: req.user!.userId,
        seed
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to set client seed' });
    }
  });

  app.get('/api/provably-fair/verify', (req, res) => {
    try {
      const { serverSeed, clientSeed, nonce, game } = req.query;
      
      if (!serverSeed || !clientSeed || !nonce || !game) {
        return res.status(400).json({ error: 'Missing parameters' });
      }
      
      const result = verifyResult(
        serverSeed as string,
        clientSeed as string,
        parseInt(nonce as string),
        game as string
      );
      
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: 'Verification failed' });
    }
  });

  // Simulated bet generator for demonstration
  function startSimulatedBets() {
    if (simulatedBetsInterval) return;
    
    const games = ['Dice', 'Plinko', 'Mines', 'Limbo', 'Roulette', 'Blackjack', 'Keno', 'Slots'];
    const userNames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Drew', 'Quinn'];
    
    // Generate a few initial bets
    for (let i = 0; i < 5; i++) {
      const randomGame = games[Math.floor(Math.random() * games.length)];
      const randomUser = userNames[Math.floor(Math.random() * userNames.length)];
      const betAmount = Math.round((Math.random() * 50 + 0.5) * 100) / 100;
      const multiplier = Math.round((Math.random() * 10 + 0.5) * 100) / 100;
      const won = Math.random() > 0.6;
      
      broadcastNewBet({
        id: Math.random().toString(36).substring(7),
        userId: Math.random().toString(36).substring(7),
        username: randomUser,
        game: randomGame,
        amount: betAmount,
        multiplier: won ? multiplier : 0,
        profit: won ? betAmount * (multiplier - 1) : -betAmount,
        payout: won ? betAmount * multiplier : 0
      });
    }
    
    // Generate new bets periodically
    simulatedBetsInterval = setInterval(() => {
      if (betSubscribers.size > 0) {
        const randomGame = games[Math.floor(Math.random() * games.length)];
        const randomUser = userNames[Math.floor(Math.random() * userNames.length)];
        const betAmount = Math.round((Math.random() * 50 + 0.5) * 100) / 100;
        const multiplier = Math.round((Math.random() * 10 + 0.5) * 100) / 100;
        const won = Math.random() > 0.6;
        
        broadcastNewBet({
          id: Math.random().toString(36).substring(7),
          userId: Math.random().toString(36).substring(7),
          username: randomUser,
          game: randomGame,
          amount: betAmount,
          multiplier: won ? multiplier : 0,
          profit: won ? betAmount * (multiplier - 1) : -betAmount,
          payout: won ? betAmount * multiplier : 0
        });
      }
    }, 3000 + Math.random() * 5000); // Random interval between 3-8 seconds
  }
  
  function stopSimulatedBets() {
    if (simulatedBetsInterval) {
      clearInterval(simulatedBetsInterval);
      simulatedBetsInterval = null;
    }
  }
  
  // WebSocket handling for chat and live bets
  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');
    
    // Add to connections store for chat
    wsConnections.add(ws);
    
    // Start simulated bets when first client connects
    if (wsConnections.size === 1) {
      startSimulatedBets();
    }
    
    // Handle messages from client
    ws.on('message', (data: any) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscribe_bets') {
          betSubscribers.add(ws);
          // Send initial recent bets from database
          storage.getRecentBets(50).then(bets => {
            const transformedBets = bets.map(bet => ({
              id: bet.id,
              username: bet.username,
              game: bet.game,
              betAmount: bet.amount,
              multiplier: bet.multiplier,
              payout: bet.payout,
              timestamp: bet.timestamp,
              userId: bet.userId
            }));
            ws.send(JSON.stringify({
              type: 'initial_bets',
              bets: transformedBets
            }));
          }).catch(error => {
            console.error('Error fetching initial bets:', error);
            ws.send(JSON.stringify({
              type: 'initial_bets',
              bets: []
            }));
          });
        } else if (message.type === 'unsubscribe_bets') {
          betSubscribers.delete(ws);
        } else if (message.type === 'subscribe_crypto') {
          cryptoSubscribers.add(ws);
          console.log('Client subscribed to crypto transactions');
        } else if (message.type === 'unsubscribe_crypto') {
          cryptoSubscribers.delete(ws);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      wsConnections.delete(ws);
      betSubscribers.delete(ws);
      cryptoSubscribers.delete(ws);
      
      // Stop simulated bets if no more connections
      if (wsConnections.size === 0) {
        stopSimulatedBets();
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Live wins feed for casino-wide recent wins
  app.get('/api/casino/live-wins', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const recentWins = await storage.getRecentCasinoWins(limit);
      res.json(recentWins);
    } catch (error) {
      console.error('Error fetching live wins:', error);
      res.status(500).json({ error: 'Failed to fetch live wins' });
    }
  });


  // Tipping routes
  app.post('/api/tips/send', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const { toUserId, amount, message } = req.body;
      
      // Validate input
      if (!toUserId || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      if (amount < 0.01) {
        return res.status(400).json({ error: 'Minimum tip amount is 0.01 credits' });
      }
      
      // Prevent self-tipping
      if (req.user!.userId === toUserId) {
        return res.status(400).json({ error: 'Cannot tip yourself' });
      }
      
      // Validate recipient exists
      const recipient = await storage.getUser(toUserId);
      if (!recipient) {
        return res.status(404).json({ error: 'Recipient not found' });
      }
      
      // Send the tip
      const tip = await storage.sendTip(req.user!.userId, toUserId, amount, message);
      
      // Get user info for WebSocket broadcast
      const sender = await storage.getUser(req.user!.userId);
      const recipientName = recipient.username || `Player${recipient.id.slice(-4)}`;
      const senderName = sender?.username || `Player${req.user!.userId.slice(-4)}`;
      
      // Broadcast tip event via WebSocket
      const tipEvent = {
        type: 'tip',
        data: {
          id: tip.id,
          fromUserId: req.user!.userId,
          fromUsername: senderName,
          toUserId: toUserId,
          toUsername: recipientName,
          amount: amount,
          message: message,
          createdAt: tip.createdAt
        }
      };
      
      // Broadcast to all connected clients
      broadcastToAll(tipEvent);
      
      // Also create a system chat message
      const chatMessage = await storage.createChatMessage({
        userId: req.user!.userId,
        username: 'System',
        message: `🎉 ${senderName} tipped ${recipientName} ${amount} credits!`,
        userLevel: 'ADMIN'
      });
      
      // Broadcast the chat message too
      broadcastToAll({
        type: 'newChatMessage',
        message: chatMessage
      });
      
      res.json({ success: true, tip });
    } catch (error: any) {
      console.error('Failed to send tip:', error);
      if (error.message === 'Insufficient balance') {
        return res.status(400).json({ error: 'Insufficient balance' });
      }
      res.status(500).json({ error: 'Failed to send tip' });
    }
  });
  
  app.get('/api/tips/received', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const tips = await storage.getTipsReceived(req.user!.userId);
      res.json(tips);
    } catch (error) {
      console.error('Failed to get received tips:', error);
      res.status(500).json({ error: 'Failed to load tips' });
    }
  });
  
  app.get('/api/tips/sent', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const tips = await storage.getTipsSent(req.user!.userId);
      res.json(tips);
    } catch (error) {
      console.error('Failed to get sent tips:', error);
      res.status(500).json({ error: 'Failed to load tips' });
    }
  });

  // Chat routes
  app.get('/api/chat/messages', async (req, res) => {
    try {
      const messages = await storage.getRecentChatMessages(50);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      res.status(500).json([]);
    }
  });

  app.get('/api/chat/online-count', async (req, res) => {
    try {
      // Return the actual count of connected WebSocket clients
      const count = wsConnections.size;
      res.json({ count });
    } catch (error) {
      console.error('Error fetching online count:', error);
      res.status(500).json({ count: 0 });
    }
  });

  app.post('/api/chat/send', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message is required' });
      }

      if (message.length > 200) {
        return res.status(400).json({ error: 'Message too long' });
      }

      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const chatMessage = await storage.createChatMessage({
        userId: user.id,
        username: user.username || `Player${user.id.slice(-4)}`,
        message: message.trim(),
        userLevel: 'REGULAR'
      });

      // Broadcast to all connected WebSocket clients
      broadcastToAll({
        type: 'newChatMessage',
        message: chatMessage
      });

      res.json({ success: true, message: chatMessage });
    } catch (error) {
      console.error('Error sending chat message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // Limbo game routes
  app.post('/api/limbo/play', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const { amount, targetMultiplier, clientSeed } = req.body;
      
      const { playLimbo } = await import('./games/limbo');
      const result = await playLimbo(
        req.user!.userId,
        amount,
        targetMultiplier,
        clientSeed
      );
      
      res.json(result);
    } catch (error: any) {
      console.error('Limbo play error:', error);
      res.status(400).json({ error: error.message || 'Failed to play' });
    }
  });

  app.get('/api/limbo/seed', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const { getCurrentSeedInfo } = await import('./games/limbo');
      const seedInfo = await getCurrentSeedInfo(req.user!.userId);
      res.json(seedInfo);
    } catch (error) {
      console.error('Error fetching seed info:', error);
      res.status(500).json({ error: 'Failed to fetch seed info' });
    }
  });

  app.get('/api/limbo/bets', async (req, res) => {
    try {
      const { getRecentLimboBets } = await import('./games/limbo');
      const limit = parseInt(req.query.limit as string) || 20;
      const bets = await getRecentLimboBets(undefined, limit);
      res.json(bets);
    } catch (error) {
      console.error('Error fetching limbo bets:', error);
      res.status(500).json({ error: 'Failed to fetch bets' });
    }
  });

  // User redemption code route
  app.post('/api/redeem-code', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const { code } = req.body;
      
      // Validate code input
      if (!code || typeof code !== 'string' || code.trim().length === 0) {
        return res.status(400).json({ error: 'Redemption code is required' });
      }

      if (code.length > 50) {
        return res.status(400).json({ error: 'Invalid code format' });
      }

      // Get user and check if exists
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Create security context with IP and User-Agent hashing
      const ipHash = req.ip ? createHash('sha256').update(req.ip).digest('hex').substring(0, 32) : undefined;
      const userAgentHash = req.headers['user-agent'] 
        ? createHash('sha256').update(req.headers['user-agent']).digest('hex').substring(0, 32)
        : undefined;

      // Enhanced rate limiting: check both user and IP-based limits
      try {
        // Check per-user limit (3 attempts per 5 minutes)
        const recentUserRedemptions = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM redemption_code_usages 
          WHERE user_id = ${user.id} 
          AND redeemed_at > NOW() - INTERVAL '5 minutes'
        `);

        const userCount = Number((recentUserRedemptions.rows[0] as any)?.count || 0);
        if (userCount >= 3) {
          return res.status(429).json({ 
            error: 'Too many redemption attempts. Please wait a few minutes before trying again.' 
          });
        }

        // Check per-IP limit (5 attempts per 5 minutes) if IP hash available
        if (ipHash) {
          const recentIpRedemptions = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM redemption_code_usages 
            WHERE ip_hash = ${ipHash}
            AND redeemed_at > NOW() - INTERVAL '5 minutes'
          `);

          const ipCount = Number((recentIpRedemptions.rows[0] as any)?.count || 0);
          if (ipCount >= 5) {
            return res.status(429).json({ 
              error: 'Too many redemption attempts from this IP. Please wait before trying again.' 
            });
          }
        }
      } catch (rateLimitError) {
        console.error('Rate limiting check failed:', rateLimitError);
        // Continue without rate limiting if DB check fails
      }

      // Attempt to redeem the code
      const result = await storage.redeemCodeAtomic(user.id, code.trim().toUpperCase(), {
        ipHash,
        userAgentHash
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Success response
      res.json({
        success: true,
        message: 'Code redeemed successfully!',
        rewards: {
          gcCredited: result.gcCredited,
          scCredited: result.scCredited,
          bonusCreated: result.bonusCreated || false
        }
      });

    } catch (error) {
      console.error('Error redeeming code:', error);
      res.status(500).json({ error: 'Failed to redeem code. Please try again later.' });
    }
  });

  // Start vault auto-release scheduler (check every minute)
  console.log('Starting vault auto-release scheduler...');
  vaultAutoReleaseInterval = setInterval(async () => {
    try {
      await storage.processAutoReleases();
    } catch (error) {
      console.error('Error in vault auto-release scheduler:', error);
    }
  }, 60000); // Check every minute

  // Start jackpot broadcaster (every 5 seconds for real-time updates)
  console.log('Starting jackpot broadcaster...');
  jackpotBroadcastInterval = setInterval(async () => {
    try {
      await broadcastAllJackpots(broadcastToAll);
    } catch (error) {
      console.error('Error in jackpot broadcaster:', error);
    }
  }, 5000); // Broadcast every 5 seconds

  // Cleanup intervals on server shutdown
  const cleanup = () => {
    if (vaultAutoReleaseInterval) {
      clearInterval(vaultAutoReleaseInterval);
      vaultAutoReleaseInterval = null;
    }
    if (simulatedBetsInterval) {
      clearInterval(simulatedBetsInterval);
      simulatedBetsInterval = null;
    }
    if (jackpotBroadcastInterval) {
      clearInterval(jackpotBroadcastInterval);
      jackpotBroadcastInterval = null;
    }
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  return httpServer;
}
