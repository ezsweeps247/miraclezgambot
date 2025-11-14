import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticateJWT, type AuthenticatedRequest } from '../auth';
import { hiloRounds, users, serverSeeds, clientSeeds, balances } from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';

export const hiloRouter = Router();

// Use authentication middleware
hiloRouter.use(authenticateJWT);

type Card = { rank: number; suit: number }; // 1..13, 0..3
type Runtime = { deck: number[]; drawCount: number; currentCode: number; skips: number };

// In-memory storage for active server seeds (hash -> actual seed)
const activeServerSeeds = new Map<string, string>();

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const hmacSHA256 = (key: string, msg: string) => crypto.createHmac('sha256', key).update(msg).digest('hex');

function rFromHex(hex: string) {
  // Process the hex string in chunks to avoid integer overflow
  // We'll use the first 13 hex chars (52 bits) for maximum precision in JS
  const slice = hex.slice(0, 13); // 13 hex chars = 52 bits (safe for JS numbers)
  
  // Convert to number safely within JavaScript's integer limits
  const n = parseInt(slice, 16);
  
  // Normalize to range (0,1]
  // 2^52 is the maximum value for 13 hex digits (52 bits)
  const maxValue = Math.pow(16, 13); // 16^13 = 2^52
  
  // Return normalized value in range (0, 1]
  const result = (n + 1) / maxValue;
  
  return result;
}

function drawIndex(serverSeed: string, clientSeed: string, roundNonce: number, drawIndexNum: number, n: number) {
  const digest = hmacSHA256(serverSeed, `${clientSeed}:${roundNonce}:${drawIndexNum}`);
  const r = rFromHex(digest);
  return Math.floor(r * n); // 0..n-1
}

function codeToCard(code: number): Card {
  const suit = Math.floor(code / 13);
  const rank = (code % 13) + 1;
  return { rank, suit };
}

function makeDeck(): number[] {
  return Array.from({ length: 52 }, (_, i) => i);
}

function drawCard(rt: Runtime, serverSeed: string, clientSeed: string, nonce: number): number {
  const idx = drawIndex(serverSeed, clientSeed, nonce, rt.drawCount++, rt.deck.length);
  const code = rt.deck.splice(idx, 1)[0];
  return code;
}

function computeQuote(rt: Runtime, current: Card): { higher: number; lower: number; equal: number } {
  let higher = 0, lower = 0, equal = 0;
  for (const code of rt.deck) {
    const c = codeToCard(code);
    if (c.rank > current.rank) higher++;
    else if (c.rank < current.rank) lower++;
    else equal++;
  }
  const n = rt.deck.length;
  const edge = 0.01; // 1% house edge
  const mult = (p: number) => p <= 0 ? 0 : Math.max(1.01, Math.floor(((1 - edge) / p) * 100) / 100);
  return { 
    higher: mult(higher / n), 
    lower: mult(lower / n), 
    equal: mult(equal / n) 
  };
}

// Get current seed and client seed for user
async function getUserSeeds(userId: string): Promise<{ serverSeedHash: string; actualServerSeed: string; clientSeed: string }> {
  // Get active server seed from DB
  const [activeSeed] = await db
    .select()
    .from(serverSeeds)
    .where(eq(serverSeeds.active, true))
    .limit(1);

  let serverSeedHash: string;
  let actualServerSeed: string;

  if (!activeSeed) {
    // Create new server seed if none exists
    actualServerSeed = crypto.randomBytes(32).toString('hex');
    serverSeedHash = sha256(actualServerSeed);
    
    // Store only the hash in DB, keep actual seed secret
    const [newSeed] = await db
      .insert(serverSeeds)
      .values({
        revealedSeed: null, // Keep null for active seeds (for security)
        hash: serverSeedHash,
        active: true
      })
      .returning();
    
    // Store actual seed in memory
    activeServerSeeds.set(serverSeedHash, actualServerSeed);
  } else {
    serverSeedHash = activeSeed.hash;
    
    // Get actual seed from memory
    actualServerSeed = activeServerSeeds.get(serverSeedHash) || '';
    
    // If not in memory (e.g., server restarted), use the hash as the seed
    // This maintains game continuity without exposing the original seed
    if (!actualServerSeed) {
      // Use the hash itself as the seed (it's already random)
      // This is a deterministic fallback that maintains game continuity
      actualServerSeed = serverSeedHash;
      
      // Store this fallback seed in memory for future use
      activeServerSeeds.set(serverSeedHash, actualServerSeed);
    }
  }

  // Get user's client seed
  const [userClientSeed] = await db
    .select()
    .from(clientSeeds)
    .where(eq(clientSeeds.userId, userId))
    .limit(1);

  const clientSeed = userClientSeed?.seed || crypto.randomBytes(16).toString('hex');
  
  if (!userClientSeed) {
    await db.insert(clientSeeds).values({ userId, seed: clientSeed });
  }

  return { serverSeedHash, actualServerSeed, clientSeed };
}

// Start a new Hi-Lo round
hiloRouter.post('/start', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userId = req.user.userId;

    // Get seeds
    const { serverSeedHash, actualServerSeed, clientSeed } = await getUserSeeds(userId);
    
    // Validate seeds
    if (!actualServerSeed || actualServerSeed.length === 0) {
      return res.status(500).json({ error: 'Server seed configuration error' });
    }
    
    if (!clientSeed || clientSeed.length === 0) {
      return res.status(500).json({ error: 'Client seed configuration error' });
    }

    // Count previous rounds for nonce
    const [nonceResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(hiloRounds)
      .where(and(
        eq(hiloRounds.userId, userId),
        eq(hiloRounds.serverSeedHash, serverSeedHash)
      ));

    const nonce = Number(nonceResult?.count || 0);

    // Initialize game state
    const rt: Runtime = { deck: makeDeck(), drawCount: 0, currentCode: -1, skips: 0 };
    const firstCode = drawCard(rt, actualServerSeed, clientSeed, nonce);
    
    if (firstCode === null || firstCode === undefined) {
      return res.status(500).json({ error: 'Failed to draw first card' });
    }
    
    rt.currentCode = firstCode;
    const quote = computeQuote(rt, codeToCard(rt.currentCode));

    // Insert new round
    const [round] = await db
      .insert(hiloRounds)
      .values({
        userId,
        stake: '0',
        prediction: null,
        startCard: firstCode,
        nextCard: null,
        multiplier: 0,
        win: false,
        profit: 0,
        serverSeedHash: serverSeedHash,
        clientSeed,
        roundNonce: nonce,
        drawHistory: [firstCode],
        status: 'in_play',
        runtime: rt
      })
      .returning();

    // Get user balance
    const [userBalance] = await db
      .select()
      .from(balances)
      .where(eq(balances.userId, userId))
      .limit(1);

    res.json({
      id: round.id,
      status: 'in_play',
      baseBet: 0,
      current: codeToCard(firstCode),
      roundNonce: nonce,
      serverSeedHash: serverSeedHash,
      clientSeed,
      balance: (userBalance?.available || 0) / 100, // Convert from cents to credits
      skips: 0,
      quote
    });
  } catch (error) {
    console.error('Error starting Hi-Lo round:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// Skip current card before betting
hiloRouter.post('/skip', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.body;

    // Get the round
    const [round] = await db
      .select()
      .from(hiloRounds)
      .where(and(
        eq(hiloRounds.id, id),
        eq(hiloRounds.userId, userId)
      ))
      .limit(1);

    if (!round || round.status !== 'in_play') {
      return res.status(400).json({ error: 'Round not in play' });
    }

    // Get actual server seed from memory
    const actualServerSeed = activeServerSeeds.get(round.serverSeedHash);
    
    if (!actualServerSeed) {
      return res.status(500).json({ error: 'Server seed not found in memory' });
    }

    // Get user balance
    const [userBalance] = await db
      .select()
      .from(balances)
      .where(eq(balances.userId, userId))
      .limit(1);

    const rt: Runtime = round.runtime as any;
    const hist: number[] = round.drawHistory as any;

    const nextCode = drawCard(rt, actualServerSeed, round.clientSeed, round.roundNonce);
    rt.currentCode = nextCode;
    rt.skips += 1;
    hist.push(nextCode);
    const quote = computeQuote(rt, codeToCard(rt.currentCode));

    // Update round
    await db
      .update(hiloRounds)
      .set({
        startCard: nextCode,
        drawHistory: hist,
        runtime: rt
      })
      .where(eq(hiloRounds.id, id));

    res.json({
      id,
      status: 'in_play',
      baseBet: 0,
      current: codeToCard(nextCode),
      roundNonce: round.roundNonce,
      serverSeedHash: round.serverSeedHash,
      clientSeed: round.clientSeed,
      balance: userBalance!.available / 100, // Convert from cents to credits
      skips: rt.skips,
      quote
    });
  } catch (error) {
    console.error('Error skipping card:', error);
    res.status(500).json({ error: 'Failed to skip card' });
  }
});

// Place bet (higher/lower/equal)
hiloRouter.post('/bet', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id, amount, prediction } = req.body;

    if (amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get the round
    const [round] = await db
      .select()
      .from(hiloRounds)
      .where(and(
        eq(hiloRounds.id, id),
        eq(hiloRounds.userId, userId)
      ))
      .limit(1);

    if (!round || round.status !== 'in_play') {
      return res.status(400).json({ error: 'Round not in play' });
    }

    // Convert amount to cents
    const amountCents = Math.round(amount * 100);
    
    // Get user's balance mode preference
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    
    // Get user balance
    const [userBalance] = await db
      .select()
      .from(balances)
      .where(eq(balances.userId, userId))
      .limit(1);

    if (!userBalance) {
      return res.status(400).json({ error: 'Balance not found' });
    }
    
    const userBalanceMode = user.balanceMode || 'GC';
    
    // Check balance based on user's preferred mode
    if (userBalanceMode === 'SC') {
      // SC Mode: Check Sweeps Cash balance
      const sweepsCashBalance = Number(userBalance.sweepsCashTotal) || 0;
      const sweepsCashBalanceInCents = Math.floor(sweepsCashBalance * 100);
      
      if (sweepsCashBalanceInCents < amountCents) {
        return res.status(400).json({ error: 'Insufficient sweeps cash balance' });
      }
    } else {
      // GC Mode: Check regular balance
      if (userBalance.available < amountCents) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }
    }

    // Get actual server seed from memory
    const actualServerSeed = activeServerSeeds.get(round.serverSeedHash);
    
    if (!actualServerSeed) {
      return res.status(500).json({ error: 'Server seed not found in memory' });
    }

    const rt: Runtime = round.runtime as any;
    const hist: number[] = round.drawHistory as any;
    const current = codeToCard(rt.currentCode);

    // Deduct bet amount based on balance mode
    if (userBalanceMode === 'SC') {
      // SC Mode: Deduct from Sweeps Cash balance
      const { storage } = await import('../storage');
      const totalChange = -(amountCents / 100); // Convert cents to dollars for deduction
      const redeemableChange = -(amountCents / 100); // Deduct from redeemable for bet
      
      await storage.updateSweepsCashBalance(userId, { totalChange, redeemableChange });
    } else {
      // GC Mode: Deduct from regular balance
      await db
        .update(balances)
        .set({ available: sql`${balances.available} - ${amountCents}` })
        .where(eq(balances.userId, userId));
    }

    // Calculate probabilities
    let higher = 0, lower = 0, equal = 0;
    for (const code of rt.deck) {
      const c = codeToCard(code);
      if (c.rank > current.rank) higher++;
      else if (c.rank < current.rank) lower++;
      else equal++;
    }
    const n = rt.deck.length;
    const pMap: any = { higher: higher / n, lower: lower / n, equal: equal / n };
    const edge = 0.01;
    const multiplier = Math.max(1.01, Math.floor(((1 - edge) / pMap[prediction]) * 100) / 100);

    // Draw next card
    const nextCode = drawCard(rt, actualServerSeed, round.clientSeed, round.roundNonce);
    hist.push(nextCode);
    const next = codeToCard(nextCode);

    // Determine outcome
    let outcome: 'higher' | 'lower' | 'equal' = 'equal';
    if (next.rank > current.rank) outcome = 'higher';
    else if (next.rank < current.rank) outcome = 'lower';
    else outcome = 'equal';

    const win = outcome === prediction;
    const payoutCents = win ? Math.round(amountCents * multiplier) : 0;
    const profitCents = payoutCents - amountCents;
    const payout = payoutCents / 100; // Convert to credits for display
    const profit = profitCents / 100; // Convert to credits for display

    // Update balance if won based on balance mode
    if (payoutCents > 0) {
      if (userBalanceMode === 'SC') {
        // SC Mode: Add payout to Sweeps Cash balance
        const { storage } = await import('../storage');
        const payoutChange = payoutCents / 100; // Convert cents to dollars
        const redeemableChange = payoutCents / 100; // Full payout is redeemable
        
        await storage.updateSweepsCashBalance(userId, { 
          totalChange: payoutChange, 
          redeemableChange 
        });
      } else {
        // GC Mode: Add payout to regular balance
        await db
          .update(balances)
          .set({ available: sql`${balances.available} + ${payoutCents}` })
          .where(eq(balances.userId, userId));
      }
    }

    // Update round
    await db
      .update(hiloRounds)
      .set({
        stake: amount.toString(), // Convert to string for decimal field
        prediction,
        nextCard: nextCode,
        multiplier: multiplier.toString(), // Convert to string for decimal field
        win,
        profit: (profitCents / 100).toString(), // Convert to string for decimal field
        status: 'settled',
        drawHistory: hist,
        runtime: null
      })
      .where(eq(hiloRounds.id, id));

    // Get updated balance
    const [updatedBalance] = await db
      .select()
      .from(balances)
      .where(eq(balances.userId, userId))
      .limit(1);

    res.json({
      id,
      status: 'settled',
      baseBet: amount,
      current,
      roundNonce: round.roundNonce,
      serverSeedHash: round.serverSeedHash,
      clientSeed: round.clientSeed,
      balance: updatedBalance!.available / 100, // Convert from cents to credits
      skips: rt.skips,
      quote: {
        higher: Math.max(1.01, Math.floor(((1 - edge) / pMap['higher']) * 100) / 100),
        lower: Math.max(1.01, Math.floor(((1 - edge) / pMap['lower']) * 100) / 100),
        equal: Math.max(1.01, Math.floor(((1 - edge) / pMap['equal']) * 100) / 100)
      },
      result: { next, outcome, win, payout, profit }
    });
  } catch (error) {
    console.error('Error placing bet:', error);
    res.status(500).json({ error: 'Failed to place bet' });
  }
});

// Get history
hiloRouter.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)));

    const rounds = await db
      .select()
      .from(hiloRounds)
      .where(and(
        eq(hiloRounds.userId, userId),
        eq(hiloRounds.status, 'settled')
      ))
      .orderBy(desc(hiloRounds.id))
      .limit(limit);

    res.json(rounds);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Verify round
hiloRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const { serverSeed, clientSeed, roundNonce, draws = 2 } = req.body;

    if (!serverSeed || !clientSeed || typeof roundNonce !== 'number') {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const rt: Runtime = { deck: makeDeck(), drawCount: 0, currentCode: -1, skips: 0 };
    const codes: number[] = [];
    for (let i = 0; i < Math.max(1, Math.min(52, draws)); i++) {
      codes.push(drawCard(rt, serverSeed, clientSeed, roundNonce));
    }

    res.json({ codes, cards: codes.map(codeToCard) });
  } catch (error) {
    console.error('Error verifying round:', error);
    res.status(500).json({ error: 'Failed to verify round' });
  }
});