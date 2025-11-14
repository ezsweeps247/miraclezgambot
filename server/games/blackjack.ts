import { Router } from "express";
import { db } from "../db";
import { blackjackHands, balances, transactions, serverSeeds, clientSeeds, users } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateJWT, type AuthenticatedRequest } from "../auth";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { updateBonusWagering } from '../bonus-integration';

export const blackjackRouter = Router();

// Types
type Card = { rank: number; suit: number }; // rank 1..13 (A..K), suit 0..3 (♠♥♦♣)
type RuntimeState = {
  deck: number[];
  drawCount: number;
  playerHands: { cards: Card[]; bet: number; doubled: boolean; finished: boolean; result?: string; payout?: number }[];
  dealer: { cards: Card[]; hidden: boolean; peeked: boolean };
  splitDone: boolean;
  actionsCount: number;
};

// Helper functions
function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function hmacSHA256(key: string, msg: string): string {
  return createHash("sha256").update(key + msg).digest("hex");
}

function rFromHex(hex: string): number {
  // Use only first 8 hex chars (32 bits) to avoid overflow
  const slice = hex.slice(0, 8);
  const n = parseInt(slice, 16);
  return n / (2 ** 32); // [0,1)
}

function pfRandom(serverSeed: string, clientSeed: string, handNonce: number, drawIndex: number): number {
  const digest = hmacSHA256(serverSeed, `${clientSeed}:${handNonce}:${drawIndex}`);
  return rFromHex(digest);
}

function drawIndex(serverSeed: string, clientSeed: string, handNonce: number, drawIndexNum: number, n: number): number {
  const r = pfRandom(serverSeed, clientSeed, handNonce, drawIndexNum);
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

function drawCard(state: RuntimeState, serverSeed: string, clientSeed: string, handNonce: number): Card {
  const idx = drawIndex(serverSeed, clientSeed, handNonce, state.drawCount++, state.deck.length);
  const code = state.deck.splice(idx, 1)[0];
  return codeToCard(code);
}

function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && bestTotal(cards) === 21;
}

function cardValue(rank: number): number {
  if (rank === 1) return 11;
  if (rank >= 10) return 10;
  return rank;
}

function bestTotal(cards: Card[]): number {
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c.rank === 1) aces++;
    total += cardValue(c.rank);
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

// Perfect Pairs: Perfect 25:1, Colored 12:1, Mixed 6:1
function perfectPairsPayout(c1: Card, c2: Card): number {
  if (c1.rank !== c2.rank) return 0;
  if (c1.suit === c2.suit) return 25;
  const color = (s: number) => (s === 0 || s === 3) ? 'black' : 'red';
  return color(c1.suit) === color(c2.suit) ? 12 : 6;
}

// 21+3: SF 40:1, Trips 30:1, Straight 10:1, Flush 5:1
function plus3Payout(p1: Card, p2: Card, dealerUp: Card): number {
  const cards = [p1, p2, dealerUp];
  const suits = new Set(cards.map(c => c.suit)).size;
  const ranks = cards.map(c => c.rank).sort((a, b) => a - b);
  const allSameRank = ranks[0] === ranks[1] && ranks[1] === ranks[2];
  const isFlush = suits === 1;
  const isStraight = (() => {
    const r = [...ranks];
    const straight = (a: number, b: number, c: number) => (b === a + 1 && c === b + 1);
    if (straight(r[0], r[1], r[2])) return true;
    if (r[0] === 1 && r[1] === 2 && r[2] === 3) return true; // A,2,3
    const r2 = r.map(x => x === 1 ? 14 : x).sort((a, b) => a - b); // Q,K,A
    if (straight(r2[0], r2[1], r2[2])) return true;
    return false;
  })();
  if (isFlush && isStraight) return 40;
  if (allSameRank) return 30;
  if (isStraight) return 10;
  if (isFlush) return 5;
  return 0;
}

function summarizeResult(hands: { cards: Card[]; bet: number; doubled: boolean; finished: boolean; result?: string; payout?: number }[], dealer: Card[]): string {
  const lines: string[] = [];
  const dT = bestTotal(dealer);
  for (let i = 0; i < hands.length; i++) {
    const h = hands[i];
    const t = bestTotal(h.cards);
    lines.push(`Hand ${i + 1}: ${t} vs Dealer ${dT} — ${h.result ?? ""}`.trim());
  }
  return lines.join(" | ");
}

function settleAgainstDealer(state: RuntimeState): { profit: number; messages: string[] } {
  const dealerTotal = bestTotal(state.dealer.cards);
  const messages: string[] = [];
  let profit = 0;
  for (const h of state.playerHands) {
    const wager = h.bet;
    const total = bestTotal(h.cards);
    let payout = 0;
    if (total > 21) {
      payout = 0;
      h.result = "Bust";
    } else if (dealerTotal > 21) {
      payout = 2 * wager;
      h.result = "Win";
    } else if (total > dealerTotal) {
      payout = 2 * wager;
      h.result = "Win";
    } else if (total === dealerTotal) {
      payout = 1 * wager;
      h.result = "Push";
    } else {
      payout = 0;
      h.result = "Lose";
    }
    h.payout = payout;
    profit += (payout - wager);
  }
  messages.push(`Dealer stands on ${dealerTotal}`);
  return { profit, messages };
}

// Start hand
const startSchema = z.object({
  bet: z.number().min(0.01).max(10000),
  ppBet: z.number().min(0).max(10000).default(0),
  plus3Bet: z.number().min(0).max(10000).default(0),
});

blackjackRouter.post("/start", authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const { bet, ppBet = 0, plus3Bet = 0 } = startSchema.parse(req.body);
    const userId = req.user!.userId;

    // Get user's balance mode preference
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }
    
    // Get user balance
    const [userBalance] = await db.select().from(balances).where(eq(balances.userId, userId));
    if (!userBalance) {
      return res.status(400).json({ error: "User balance not found" });
    }

    const userBalanceMode = user.balanceMode || 'GC';
    const need = Math.round((bet + ppBet + plus3Bet) * 100);
    
    if (userBalanceMode === 'SC') {
      // SC Mode: Check Sweeps Cash balance
      const sweepsCashBalance = Number(userBalance.sweepsCashTotal) || 0;
      const sweepsCashBalanceInCents = Math.floor(sweepsCashBalance * 100);
      
      if (sweepsCashBalanceInCents < need) {
        return res.status(400).json({ error: "Insufficient sweeps cash balance" });
      }
    } else {
      // GC Mode: Check regular balance
      if (userBalance.available < need) {
        return res.status(400).json({ error: "Insufficient balance" });
      }
    }

    // Get active server seed
    const [activeSeed] = await db.select().from(serverSeeds).where(eq(serverSeeds.active, true));
    if (!activeSeed) {
      return res.status(500).json({ error: "No active server seed" });
    }

    // Get client seed
    const [clientSeedRow] = await db.select().from(clientSeeds)
      .where(eq(clientSeeds.userId, userId))
      .orderBy(desc(clientSeeds.createdAt))
      .limit(1);
    
    const clientSeed = clientSeedRow?.seed || "default-client-seed";

    // Get hand nonce (count of previous hands with this seed)
    const previousHands = await db.select({ count: blackjackHands.id })
      .from(blackjackHands)
      .where(and(
        eq(blackjackHands.userId, userId),
        eq(blackjackHands.serverSeedHash, activeSeed.hash)
      ));
    const handNonce = previousHands.length;

    // Create runtime state
    const rt: RuntimeState = {
      deck: makeDeck(),
      drawCount: 0,
      playerHands: [{ cards: [], bet: Math.round(bet * 100), doubled: false, finished: false }],
      dealer: { cards: [], hidden: true, peeked: false },
      splitDone: false,
      actionsCount: 0
    };

    // Deal cards: P, D, P, D
    const serverSeed = activeSeed.revealedSeed || randomBytes(32).toString('hex');
    rt.playerHands[0].cards.push(drawCard(rt, serverSeed, clientSeed, handNonce));
    rt.dealer.cards.push(drawCard(rt, serverSeed, clientSeed, handNonce));
    rt.playerHands[0].cards.push(drawCard(rt, serverSeed, clientSeed, handNonce));
    rt.dealer.cards.push(drawCard(rt, serverSeed, clientSeed, handNonce));

    // Deduct bets from balance based on mode
    if (userBalanceMode === 'SC') {
      // SC Mode: Update Sweeps Cash balance
      const totalChange = -(need / 100); // Convert cents to dollars for deduction
      const redeemableChange = -(need / 100); // Deduct from redeemable for bet
      
      // Import storage for sweeps cash balance update
      const { storage } = await import('../storage');
      await storage.updateSweepsCashBalance(userId, { totalChange, redeemableChange });
    } else {
      // GC Mode: Update regular balance
      await db.update(balances)
        .set({ available: userBalance.available - need })
        .where(eq(balances.userId, userId));
    }

    // Update bonus wagering
    await updateBonusWagering(userId, bet + ppBet + plus3Bet);
    
    // Record transaction
    await db.insert(transactions).values({
      userId,
      type: "BET",
      amount: need,
      meta: { game: "BLACKJACK", bet, ppBet, plus3Bet }
    });

    let balance = userBalance.available - need;
    const messages: string[] = [];

    // Resolve side bets immediately
    if (ppBet > 0) {
      const payout = perfectPairsPayout(rt.playerHands[0].cards[0], rt.playerHands[0].cards[1]);
      if (payout > 0) {
        const ret = Math.round(ppBet * (payout + 1) * 100);
        await db.update(balances)
          .set({ available: balance + ret })
          .where(eq(balances.userId, userId));
        balance += ret;
        messages.push(`Perfect Pairs hit: ${payout}:1 (return ${(ret / 100).toFixed(2)})`);
      } else {
        messages.push("Perfect Pairs lost");
      }
    }

    if (plus3Bet > 0) {
      const payout = plus3Payout(rt.playerHands[0].cards[0], rt.playerHands[0].cards[1], rt.dealer.cards[0]);
      if (payout > 0) {
        const ret = Math.round(plus3Bet * (payout + 1) * 100);
        await db.update(balances)
          .set({ available: balance + ret })
          .where(eq(balances.userId, userId));
        balance += ret;
        messages.push(`21+3 hit: ${payout}:1 (return ${(ret / 100).toFixed(2)})`);
      } else {
        messages.push("21+3 lost");
      }
    }

    // Check for player blackjack
    const playerBJ = isBlackjack(rt.playerHands[0].cards);
    const dealerUpRank = rt.dealer.cards[0].rank;
    let status: "in_play" | "settled" = "in_play";
    let result_summary = "";
    let profit = 0;

    const peekNeeded = (dealerUpRank === 1) || (dealerUpRank >= 10);
    if (playerBJ && !peekNeeded) {
      const ret = Math.round(bet * 2.5 * 100);
      await db.update(balances)
        .set({ available: balance + ret })
        .where(eq(balances.userId, userId));
      balance += ret;
      rt.playerHands[0].finished = true;
      rt.playerHands[0].result = "Blackjack 3:2";
      rt.playerHands[0].payout = ret;
      messages.push("Player Blackjack! Paid 3:2");
      profit += (ret - Math.round(bet * 100));
      status = "settled";
    } else if (playerBJ) {
      messages.push("Player Blackjack — waiting for dealer peek.");
    }

    // Insert hand record
    const [hand] = await db.insert(blackjackHands).values({
      userId,
      baseBet: Math.round(bet * 100),
      ppBet: Math.round(ppBet * 100),
      plus3Bet: Math.round(plus3Bet * 100),
      insuranceBet: 0,
      stateJson: rt,
      status,
      resultSummary: result_summary || null,
      profit,
      serverSeedHash: activeSeed.hash,
      clientSeed,
      handNonce
    }).returning();

    if (status === "settled") {
      const summary = summarizeResult(rt.playerHands, rt.dealer.cards);
      await db.update(blackjackHands)
        .set({ resultSummary: summary, profit, stateJson: rt })
        .where(eq(blackjackHands.id, hand.id));
    }

    // Get updated balance
    const [updatedBalance] = await db.select().from(balances).where(eq(balances.userId, userId));

    const response = {
      id: hand.id,
      status,
      baseBet: bet,
      ppBet,
      plus3Bet,
      insuranceOffered: dealerUpRank === 1,
      insuranceBet: 0,
      playerHands: rt.playerHands.map(h => ({
        cards: h.cards,
        bet: h.bet / 100,
        doubled: h.doubled,
        finished: h.finished,
        result: h.result,
        payout: h.payout ? h.payout / 100 : undefined
      })),
      dealer: {
        cards: rt.dealer.cards,
        hidden: rt.dealer.hidden,
        peeked: rt.dealer.peeked
      },
      serverSeedHash: activeSeed.hash,
      clientSeed,
      handNonce,
      created_at: hand.createdAt,
      balance: updatedBalance!.available / 100,
      messages
    };
    
    res.json(response);
  } catch (error: any) {
    console.error("Blackjack start error:", error);
    res.status(400).json({ error: error.message || "Failed to start game" });
  }
});

// Insurance
const insuranceSchema = z.object({
  handId: z.string().uuid(),
  amount: z.number().min(0.01).max(5000)
});

blackjackRouter.post("/insurance", authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const { handId, amount } = insuranceSchema.parse(req.body);
    const userId = req.user!.userId;

    const [hand] = await db.select().from(blackjackHands)
      .where(and(eq(blackjackHands.id, handId), eq(blackjackHands.userId, userId)));
    
    if (!hand) return res.status(404).json({ error: "Hand not found" });
    if (hand.status !== "in_play") return res.status(400).json({ error: "Hand already settled" });

    const rt = hand.stateJson as RuntimeState;
    if (rt.actionsCount > 0) return res.status(400).json({ error: "Insurance only before any action" });
    if (rt.dealer.cards[0].rank !== 1) return res.status(400).json({ error: "Insurance only when dealer shows Ace" });
    if (amount > hand.baseBet / 200) return res.status(400).json({ error: "Insurance cannot exceed half of base bet" });

    const insuranceAmount = Math.round(amount * 100);

    // Deduct insurance from balance
    const [userBalance] = await db.select().from(balances).where(eq(balances.userId, userId));
    if (userBalance!.available < insuranceAmount) {
      return res.status(400).json({ error: "Insufficient balance for insurance" });
    }

    await db.update(balances)
      .set({ available: userBalance!.available - insuranceAmount })
      .where(eq(balances.userId, userId));

    // Get server seed
    const [activeSeed] = await db.select().from(serverSeeds).where(eq(serverSeeds.active, true));
    const serverSeed = activeSeed!.revealedSeed || randomBytes(32).toString('hex');

    let balance = userBalance!.available - insuranceAmount;
    let messages: string[] = ["Insurance placed."];
    const dealerBJ = isBlackjack(rt.dealer.cards);
    let status: "in_play" | "settled" = "in_play";
    let profitDelta = 0;

    if (dealerBJ) {
      rt.dealer.hidden = false;
      rt.dealer.peeked = true;
      const playerBJ = isBlackjack(rt.playerHands[0].cards);
      const insReturn = insuranceAmount * 3;
      
      await db.update(balances)
        .set({ available: balance + insReturn })
        .where(eq(balances.userId, userId));
      balance += insReturn;
      messages.push("Dealer Blackjack. Insurance paid 2:1.");

      if (playerBJ) {
        await db.update(balances)
          .set({ available: balance + hand.baseBet })
          .where(eq(balances.userId, userId));
        balance += hand.baseBet;
        rt.playerHands[0].finished = true;
        rt.playerHands[0].result = "Push";
        rt.playerHands[0].payout = hand.baseBet;
      } else {
        rt.playerHands[0].finished = true;
        rt.playerHands[0].result = "Lose";
        rt.playerHands[0].payout = 0;
        profitDelta -= hand.baseBet;
      }
      status = "settled";
    } else {
      messages.push("Dealer does not have Blackjack. Insurance lost.");
    }

    await db.update(blackjackHands)
      .set({ insuranceBet: insuranceAmount, stateJson: rt, status })
      .where(eq(blackjackHands.id, handId));

    const [updatedBalance] = await db.select().from(balances).where(eq(balances.userId, userId));

    res.json({
      id: hand.id,
      status,
      baseBet: hand.baseBet / 100,
      ppBet: hand.ppBet / 100,
      plus3Bet: hand.plus3Bet / 100,
      insuranceOffered: rt.dealer.cards[0].rank === 1,
      insuranceBet: insuranceAmount / 100,
      playerHands: rt.playerHands.map(h => ({
        ...h,
        bet: h.bet / 100,
        payout: h.payout ? h.payout / 100 : undefined
      })),
      dealer: rt.dealer,
      serverSeedHash: hand.serverSeedHash,
      clientSeed: hand.clientSeed,
      handNonce: hand.handNonce,
      created_at: hand.createdAt,
      balance: updatedBalance!.available / 100,
      messages
    });
  } catch (error: any) {
    console.error("Insurance error:", error);
    res.status(400).json({ error: error.message || "Failed to place insurance" });
  }
});

// Player actions
const actionSchema = z.object({
  handId: z.string().uuid(),
  action: z.enum(["hit", "stand", "double", "split"]),
  handIndex: z.number().min(0).max(3).default(0)
});

blackjackRouter.post("/action", authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const { handId, action, handIndex = 0 } = actionSchema.parse(req.body);
    const userId = req.user!.userId;

    const [hand] = await db.select().from(blackjackHands)
      .where(and(eq(blackjackHands.id, handId), eq(blackjackHands.userId, userId)));
    
    if (!hand) return res.status(404).json({ error: "Hand not found" });
    
    if (hand.status !== "in_play") {
      const rt = hand.stateJson as RuntimeState;
      return res.json({
        id: hand.id,
        status: hand.status,
        baseBet: hand.baseBet / 100,
        ppBet: hand.ppBet / 100,
        plus3Bet: hand.plus3Bet / 100,
        insuranceOffered: rt.dealer.cards[0].rank === 1,
        insuranceBet: hand.insuranceBet / 100,
        playerHands: rt.playerHands.map(h => ({
          ...h,
          bet: h.bet / 100,
          payout: h.payout ? h.payout / 100 : undefined
        })),
        dealer: rt.dealer,
        serverSeedHash: hand.serverSeedHash,
        clientSeed: hand.clientSeed,
        handNonce: hand.handNonce,
        created_at: hand.createdAt,
        balance: 0,
        messages: ["Hand already settled"]
      });
    }

    const rt = hand.stateJson as RuntimeState;
    const messages: string[] = [];
    const active = rt.playerHands[handIndex];

    // Get server seed
    const [activeSeed] = await db.select().from(serverSeeds).where(eq(serverSeeds.active, true));
    const serverSeed = activeSeed!.revealedSeed || randomBytes(32).toString('hex');

    // Check for dealer peek if needed
    if (!rt.dealer.peeked && rt.dealer.cards[0].rank === 1) {
      rt.dealer.peeked = true;
      if (isBlackjack(rt.dealer.cards)) {
        rt.dealer.hidden = false;
        const { profit, messages: settleMessages } = settleAgainstDealer(rt);
        messages.push(...settleMessages);
        
        await db.update(blackjackHands)
          .set({ stateJson: rt, status: "settled", profit, resultSummary: summarizeResult(rt.playerHands, rt.dealer.cards) })
          .where(eq(blackjackHands.id, handId));

        const [userBalance] = await db.select().from(balances).where(eq(balances.userId, userId));
        
        res.json({
          id: hand.id,
          status: "settled",
          baseBet: hand.baseBet / 100,
          ppBet: hand.ppBet / 100,
          plus3Bet: hand.plus3Bet / 100,
          insuranceOffered: true,
          insuranceBet: hand.insuranceBet / 100,
          playerHands: rt.playerHands.map(h => ({
            ...h,
            bet: h.bet / 100,
            payout: h.payout ? h.payout / 100 : undefined
          })),
          dealer: rt.dealer,
          serverSeedHash: hand.serverSeedHash,
          clientSeed: hand.clientSeed,
          handNonce: hand.handNonce,
          created_at: hand.createdAt,
          balance: userBalance!.available / 100,
          messages
        });
        return;
      }
    }

    rt.actionsCount++;

    // Process action
    if (action === "hit") {
      active.cards.push(drawCard(rt, serverSeed, hand.clientSeed, hand.handNonce));
      const total = bestTotal(active.cards);
      if (total > 21) {
        active.finished = true;
        active.result = "Bust";
        messages.push("Player busts!");
      } else if (total === 21) {
        active.finished = true;
        messages.push("Player has 21!");
      }
    } else if (action === "stand") {
      active.finished = true;
      messages.push("Player stands.");
    } else if (action === "double") {
      if (active.cards.length !== 2) {
        return res.status(400).json({ error: "Double only allowed on initial 2 cards" });
      }
      
      const [userBalance] = await db.select().from(balances).where(eq(balances.userId, userId));
      if (userBalance!.available < active.bet) {
        return res.status(400).json({ error: "Insufficient balance for double" });
      }

      await db.update(balances)
        .set({ available: userBalance!.available - active.bet })
        .where(eq(balances.userId, userId));

      active.bet *= 2;
      active.doubled = true;
      active.cards.push(drawCard(rt, serverSeed, hand.clientSeed, hand.handNonce));
      active.finished = true;
      
      const total = bestTotal(active.cards);
      if (total > 21) {
        active.result = "Bust";
        messages.push("Doubled and bust!");
      } else {
        messages.push("Doubled down.");
      }
    } else if (action === "split") {
      if (active.cards.length !== 2 || active.cards[0].rank !== active.cards[1].rank) {
        return res.status(400).json({ error: "Cannot split these cards" });
      }
      if (rt.playerHands.length >= 4) {
        return res.status(400).json({ error: "Maximum splits reached" });
      }

      const [userBalance] = await db.select().from(balances).where(eq(balances.userId, userId));
      if (userBalance!.available < active.bet) {
        return res.status(400).json({ error: "Insufficient balance for split" });
      }

      await db.update(balances)
        .set({ available: userBalance!.available - active.bet })
        .where(eq(balances.userId, userId));

      const splitCard = active.cards.pop()!;
      active.cards.push(drawCard(rt, serverSeed, hand.clientSeed, hand.handNonce));
      
      rt.playerHands.push({
        cards: [splitCard, drawCard(rt, serverSeed, hand.clientSeed, hand.handNonce)],
        bet: active.bet,
        doubled: false,
        finished: false
      });
      
      messages.push("Hand split.");
    }

    // Check if all player hands are finished
    const allFinished = rt.playerHands.every(h => h.finished);
    
    if (allFinished) {
      // Dealer plays
      rt.dealer.hidden = false;
      while (bestTotal(rt.dealer.cards) < 17) {
        rt.dealer.cards.push(drawCard(rt, serverSeed, hand.clientSeed, hand.handNonce));
      }
      
      const { profit, messages: settleMessages } = settleAgainstDealer(rt);
      messages.push(...settleMessages);
      
      // Update balance with payouts
      let totalPayout = 0;
      for (const h of rt.playerHands) {
        if (h.payout && h.payout > 0) {
          totalPayout += h.payout;
        }
      }
      
      if (totalPayout > 0) {
        const [userBalance] = await db.select().from(balances).where(eq(balances.userId, userId));
        await db.update(balances)
          .set({ available: userBalance!.available + totalPayout })
          .where(eq(balances.userId, userId));
        
        await db.insert(transactions).values({
          userId,
          type: "PAYOUT",
          amount: totalPayout,
          meta: { game: "BLACKJACK", handId }
        });
      }
      
      await db.update(blackjackHands)
        .set({ 
          stateJson: rt, 
          status: "settled", 
          profit, 
          resultSummary: summarizeResult(rt.playerHands, rt.dealer.cards) 
        })
        .where(eq(blackjackHands.id, handId));
    } else {
      await db.update(blackjackHands)
        .set({ stateJson: rt })
        .where(eq(blackjackHands.id, handId));
    }

    const [userBalance] = await db.select().from(balances).where(eq(balances.userId, userId));

    res.json({
      id: hand.id,
      status: allFinished ? "settled" : "in_play",
      baseBet: hand.baseBet / 100,
      ppBet: hand.ppBet / 100,
      plus3Bet: hand.plus3Bet / 100,
      insuranceOffered: rt.dealer.cards[0].rank === 1,
      insuranceBet: hand.insuranceBet / 100,
      playerHands: rt.playerHands.map(h => ({
        ...h,
        bet: h.bet / 100,
        payout: h.payout ? h.payout / 100 : undefined
      })),
      dealer: rt.dealer,
      serverSeedHash: hand.serverSeedHash,
      clientSeed: hand.clientSeed,
      handNonce: hand.handNonce,
      created_at: hand.createdAt,
      balance: userBalance!.available / 100,
      messages
    });
  } catch (error: any) {
    console.error("Action error:", error);
    res.status(400).json({ error: error.message || "Failed to process action" });
  }
});

// Get history
blackjackRouter.get("/history", authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const hands = await db.select()
      .from(blackjackHands)
      .where(eq(blackjackHands.userId, userId))
      .orderBy(desc(blackjackHands.createdAt))
      .limit(limit);

    res.json(hands.map(h => ({
      id: h.id,
      created_at: h.createdAt,
      base_bet: h.baseBet / 100,
      pp_bet: h.ppBet / 100,
      plus3_bet: h.plus3Bet / 100,
      insurance_bet: h.insuranceBet / 100,
      result_summary: h.resultSummary,
      profit: (h.profit || 0) / 100,
      server_seed_hash: h.serverSeedHash,
      server_seed_revealed: h.serverSeedRevealed,
      client_seed: h.clientSeed,
      hand_nonce: h.handNonce
    })));
  } catch (error: any) {
    console.error("History error:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});