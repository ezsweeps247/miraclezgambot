import crypto from 'crypto';
import { storage } from '../storage';
import { updateBonusWagering } from '../bonus-integration';
import { getHouseEdge } from './rtp-helper';
import { WebSocket } from 'ws';

interface MiracoasterPosition {
  id: string;
  userId: string;
  roundId: string;
  direction: 'up' | 'down';
  wager: number; // in cents
  leverage: number;
  entryPrice: number;
  bustPrice: number;
  exitPrice?: number;
  pnl?: number;
  roi?: number;
  status: 'open' | 'cashed' | 'busted';
  createdAt: Date;
  closedAt?: Date;
}

class MiracoasterEngine {
  private price: number = 1000.00;
  private tickIndex: number = 0;
  private roundId: string = '';
  private serverSeed: string = '';
  private serverHash: string = '';
  private zPrev: number = 0;
  private timer: NodeJS.Timeout | null = null;
  private tickMs: number = 1000;
  private enabled: boolean = true;
  private rtpMode: 'high' | 'medium' | 'low' = 'medium';
  private positions: Map<string, MiracoasterPosition> = new Map();
  private recentPositions: MiracoasterPosition[] = []; // Track recent completed positions
  private maxRecentPositions: number = 50; // Keep last 50 completed positions
  private listeners: Set<(event: any) => void> = new Set();

  constructor() {
    this.seedRound();
    this.start();
  }

  private sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private hmac256(key: string, msg: string): string {
    return crypto.createHmac('sha256', key).update(msg).digest('hex');
  }

  private seedRound() {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    this.roundId = `${y}-${m}-${d}`;
    
    // Generate new server seed for the round
    this.serverSeed = crypto.randomBytes(32).toString('hex');
    this.serverHash = this.sha256(this.serverSeed);
    
    // Reset price and state
    this.price = 1000.00;
    this.tickIndex = 0;
    this.zPrev = 0;
  }

  private gbmStep() {
    // Geometric Brownian Motion step using HMAC for randomness
    const hash = this.hmac256(this.serverSeed, `${this.roundId}:${this.tickIndex}`);
    
    // Convert hash to two uniform random numbers
    const a = parseInt(hash.slice(0, 8), 16) / 0xffffffff;
    const b = parseInt(hash.slice(8, 16), 16) / 0xffffffff;
    
    // Box-Muller transform to get normal distribution
    const z0 = Math.sqrt(-2 * Math.log(a || 1e-12)) * Math.cos(2 * Math.PI * (b || 1e-12));
    
    // Smooth the random walk
    const z = 0.85 * this.zPrev + 0.15 * z0;
    this.zPrev = z;
    
    // GBM parameters
    const mu = 0.0; // drift
    const sigma = 0.012; // volatility
    const dt = 1.0;
    
    // Calculate next price
    const nextPrice = this.price * Math.exp(mu * dt + sigma * Math.sqrt(dt) * z);
    this.price = Math.max(10, nextPrice); // Minimum price of 10
    this.tickIndex++;
  }

  private checkRoundBoundary() {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    const currentRoundId = `${y}-${m}-${d}`;
    
    if (currentRoundId !== this.roundId) {
      this.seedRound();
    }
  }

  private async settleBusts() {
    // Check all open positions for bust
    const positions = Array.from(this.positions.entries());
    for (const [userId, position] of positions) {
      if (position.status !== 'open') continue;
      
      const bustHit = position.direction === 'up' 
        ? this.price <= position.bustPrice
        : this.price >= position.bustPrice;
      
      if (bustHit) {
        // Position busted - user loses wager
        position.status = 'busted';
        position.exitPrice = this.price;
        position.pnl = -position.wager;
        position.roi = -1.0;
        position.closedAt = new Date();
        
        // Update user balance (already deducted wager when bet was placed)
        // No further deduction needed
        
        // Save to database
        await this.savePositionToDb(position);
        
        // Add to recent positions before removing
        this.addToRecentPositions(position);
        
        // Remove from active positions
        this.positions.delete(userId);
        
        // Emit bust event
        this.emit({
          type: 'miracoaster:bust',
          userId,
          position
        });
      }
    }
  }

  private async savePositionToDb(position: MiracoasterPosition) {
    // Save to database (implementation depends on storage)
    // This is a placeholder for the actual database save
    try {
      // Store in bets table without metadata (not supported)
      // Get user balance mode for bet record
      const user = await storage.getUser(position.userId);
      const userBalanceMode = user?.balanceMode || 'GC';
      
      await storage.createBet({
        userId: position.userId,
        game: 'MIRACOASTER', // Use uppercase for consistency
        amount: position.wager,
        result: position.status === 'cashed' ? 'WIN' : 'LOSE',
        profit: position.pnl || -position.wager,
        potential_win: position.wager * position.leverage,
        gameMode: userBalanceMode === 'SC' ? 'real' : 'fun' // Map balance mode to gameMode
      });
    } catch (error) {
      console.error('Failed to save Miracoaster position:', error);
    }
  }

  private async getFeeFromRtpMode(): Promise<number> {
    // Fetch dynamic house edge from database
    const houseEdge = await getHouseEdge('MIRACOASTER') / 100; // Convert percentage to decimal
    return houseEdge;
  }

  private async calculatePayout(wager: number, entryPrice: number, currentPrice: number, leverage: number, direction: 'up' | 'down'): Promise<number> {
    const fee = await this.getFeeFromRtpMode();
    const s = direction === 'up' ? 1 : -1;
    const r = s * (currentPrice - entryPrice) / entryPrice * leverage;
    const profitFactor = r > 0 ? (r - fee * r) : r;
    const value = Math.max(0, 1 + profitFactor);
    return Math.round(wager * value);
  }

  private tick() {
    this.checkRoundBoundary();
    this.gbmStep();
    this.settleBusts();
    
    // Emit tick event to all listeners
    this.emit({
      type: 'miracoaster:tick',
      price: this.price,
      tickIndex: this.tickIndex,
      roundId: this.roundId,
      serverHash: this.serverHash
    });
  }

  private emit(event: any) {
    const listeners = Array.from(this.listeners);
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Miracoaster listener error:', error);
      }
    }
  }

  public onEvent(listener: (event: any) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public start() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => this.tick(), this.tickMs);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public setSpeed(ms: number) {
    this.tickMs = ms;
    if (this.timer) {
      this.stop();
      this.start();
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public setRtpMode(mode: 'high' | 'medium' | 'low') {
    this.rtpMode = mode;
  }

  public getState() {
    return {
      price: this.price,
      tickIndex: this.tickIndex,
      roundId: this.roundId,
      serverHash: this.serverHash,
      enabled: this.enabled,
      rtpMode: this.rtpMode
    };
  }

  public async placeBet(userId: string, direction: 'up' | 'down', wager: number, leverage: number): Promise<MiracoasterPosition> {
    if (!this.enabled) {
      throw new Error('Game is disabled');
    }
    
    // Check if user already has an open position
    if (this.positions.has(userId)) {
      throw new Error('You already have an open position');
    }
    
    // Validate parameters
    if (!['up', 'down'].includes(direction)) {
      throw new Error('Invalid direction');
    }
    
    const leverageNum = Math.max(1, Math.min(1000, Number(leverage) || 1));
    const wagerCredits = Number(wager) || 0;
    const wagerCents = Math.round(wagerCredits * 100);
    
    if (wagerCredits < 1) {
      throw new Error('Minimum wager is 1.00 credits');
    }
    
    // Get user's balance mode preference
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check user balance based on balance mode
    const balance = await storage.getBalance(userId);
    if (!balance) {
      throw new Error('Balance not found');
    }
    
    const userBalanceMode = user.balanceMode || 'GC';
    
    if (userBalanceMode === 'SC') {
      // SC Mode: Check Sweeps Cash balance
      const sweepsCashBalance = Number(balance.sweepsCashTotal) || 0;
      const sweepsCashBalanceInCents = Math.floor(sweepsCashBalance * 100);
      
      if (sweepsCashBalanceInCents < wagerCents) {
        throw new Error('Insufficient sweeps cash balance');
      }
    } else {
      // GC Mode: Check regular balance
      if (balance.available < wagerCents) {
        throw new Error('Insufficient balance');
      }
    }
    
    // Calculate bust price
    const entryPrice = this.price;
    const bustPrice = direction === 'up'
      ? entryPrice * (1 - 1 / leverageNum)
      : entryPrice * (1 + 1 / leverageNum);
    
    // Create position
    const position: MiracoasterPosition = {
      id: crypto.randomUUID(),
      userId,
      roundId: this.roundId,
      direction,
      wager: wagerCents,
      leverage: leverageNum,
      entryPrice,
      bustPrice,
      status: 'open',
      createdAt: new Date()
    };
    
    // Store position
    this.positions.set(userId, position);
    
    // Deduct wager from user balance based on mode
    if (userBalanceMode === 'SC') {
      // SC Mode: Update Sweeps Cash balance
      const totalChange = -(wagerCents / 100); // Convert cents to dollars for deduction
      const redeemableChange = -(wagerCents / 100); // Deduct from redeemable for bet
      
      await storage.updateSweepsCashBalance(userId, { totalChange, redeemableChange });
    } else {
      // GC Mode: Update regular balance
      await storage.updateBalance(userId, balance.available - wagerCents, balance.locked);
    }
    
    // Update bonus wagering
    await updateBonusWagering(userId, wagerCredits);
    
    // Record transaction
    await storage.createTransaction({
      userId,
      type: 'BET',
      amount: -wagerCents,
      meta: {
        game: 'miracoaster',
        roundId: this.roundId,
        direction,
        leverage: leverageNum,
        entryPrice,
        balanceAfter: balance.available - wagerCents
      }
    });
    
    return position;
  }

  public async cashout(userId: string): Promise<{ position: MiracoasterPosition; payout: number }> {
    const position = this.positions.get(userId);
    
    if (!position || position.status !== 'open') {
      throw new Error('No open position found');
    }
    
    // Calculate payout
    const payout = await this.calculatePayout(
      position.wager,
      position.entryPrice,
      this.price,
      position.leverage,
      position.direction
    );
    
    const pnl = payout - position.wager;
    const roi = position.wager ? (pnl / position.wager) : 0;
    
    // Update position
    position.status = 'cashed';
    position.exitPrice = this.price;
    position.pnl = pnl;
    position.roi = roi;
    position.closedAt = new Date();
    
    // Get user and current balance for payout
    const user = await storage.getUser(userId);
    const balance = await storage.getBalance(userId);
    if (!balance || !user) {
      throw new Error('Balance or user not found');
    }
    
    const userBalanceMode = user.balanceMode || 'GC';
    
    // Update balance with payout based on mode
    if (userBalanceMode === 'SC') {
      // SC Mode: Add payout to Sweeps Cash balance
      const payoutChange = payout / 100; // Convert cents to dollars
      const redeemableChange = payout / 100; // Full payout is redeemable
      
      await storage.updateSweepsCashBalance(userId, { 
        totalChange: payoutChange, 
        redeemableChange 
      });
    } else {
      // GC Mode: Add payout to regular balance
      await storage.updateBalance(userId, balance.available + payout, balance.locked);
    }
    
    // Record transaction
    await storage.createTransaction({
      userId,
      type: 'PAYOUT',
      amount: payout,
      meta: {
        game: 'miracoaster',
        roundId: this.roundId,
        exitPrice: this.price,
        pnl,
        roi,
        balanceAfter: balance.available + payout
      }
    });
    
    // Save to database
    await this.savePositionToDb(position);
    
    // Add to recent positions before removing
    this.addToRecentPositions(position);
    
    // Remove from active positions
    this.positions.delete(userId);
    
    return { position, payout };
  }

  public async getUserPosition(userId: string): Promise<MiracoasterPosition | null> {
    const position = this.positions.get(userId);
    if (!position || position.status !== 'open') {
      return null;
    }
    
    // Calculate current value
    const currentValue = await this.calculatePayout(
      position.wager,
      position.entryPrice,
      this.price,
      position.leverage,
      position.direction
    );
    
    const pnl = currentValue - position.wager;
    const roi = position.wager ? (pnl / position.wager) : 0;
    
    return {
      ...position,
      pnl,
      roi,
      exitPrice: this.price
    };
  }

  private addToRecentPositions(position: MiracoasterPosition) {
    // Add to the beginning of the array
    this.recentPositions.unshift(position);
    
    // Keep only the most recent positions
    if (this.recentPositions.length > this.maxRecentPositions) {
      this.recentPositions = this.recentPositions.slice(0, this.maxRecentPositions);
    }
  }

  public async getAllPositions(): Promise<MiracoasterPosition[]> {
    const positions: MiracoasterPosition[] = [];
    
    for (const [userId, position] of Array.from(this.positions.entries())) {
      if (position.status === 'open') {
        // Calculate current value for each position
        const currentValue = await this.calculatePayout(
          position.wager,
          position.entryPrice,
          this.price,
          position.leverage,
          position.direction
        );
        
        const pnl = currentValue - position.wager;
        const roi = position.wager ? (pnl / position.wager) : 0;
        
        positions.push({
          ...position,
          pnl,
          roi,
          exitPrice: this.price
        });
      }
    }
    
    return positions;
  }

  public async getAllPositionsWithHistory(): Promise<{ active: MiracoasterPosition[], recent: MiracoasterPosition[] }> {
    return {
      active: await this.getAllPositions(),
      recent: this.recentPositions
    };
  }

  public getPriceHistory(limit: number = 100): number[] {
    // In a real implementation, we would store price history
    // For now, return current price
    return [this.price];
  }
}

// Create singleton instance
export const miracoasterEngine = new MiracoasterEngine();

// WebSocket handler
export function handleMiracoasterWebSocket(ws: WebSocket) {
  // Send initial state
  ws.send(JSON.stringify({
    type: 'miracoaster:state',
    ...miracoasterEngine.getState()
  }));
  
  // Subscribe to engine events
  const unsubscribe = miracoasterEngine.onEvent((event) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  });
  
  // Clean up on disconnect
  ws.on('close', () => {
    unsubscribe();
  });
}

// API handlers
export const miracoasterHandlers = {
  async getStatus(req: any, res: any) {
    res.json(miracoasterEngine.getState());
  },
  
  async getPosition(req: any, res: any) {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const position = await miracoasterEngine.getUserPosition(userId);
    if (position) {
      // Calculate current value for display
      const currentValue = await miracoasterEngine['calculatePayout'](
        position.wager,
        position.entryPrice,
        miracoasterEngine.getState().price,
        position.leverage,
        position.direction
      );
      
      res.json({
        ...position,
        currentValue
      });
    } else {
      res.json(null);
    }
  },
  
  async placeBet(req: any, res: any) {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { direction, wager, leverage } = req.body;
    
    try {
      // wager is already in credits, just pass it directly (placeBet will convert to cents internally)
      const position = await miracoasterEngine.placeBet(userId, direction, wager, leverage);
      res.json(position);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  
  async cashout(req: any, res: any) {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
      const result = await miracoasterEngine.cashout(userId);
      res.json({
        ...result.position,
        payout: result.payout
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  
  async getPriceHistory(req: any, res: any) {
    const limit = Math.min(1000, Number(req.query.limit) || 100);
    res.json(miracoasterEngine.getPriceHistory(limit));
  }
};