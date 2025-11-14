import { Request, Response } from 'express';
import { db } from './db';
import { 
  tournaments, 
  tournamentEntries, 
  tournamentPrizes,
  users,
  balances,
  bets,
  transactions
} from '@shared/schema';
import { and, eq, gte, lte, sql, desc, asc } from 'drizzle-orm';
import { storage } from './storage';

interface AuthenticatedRequest extends Request {
  user?: { userId: string; telegramId: number };
}

export const tournamentRoutes = {
  // Get all active and upcoming tournaments
  getAllTournaments: async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      
      let allTournaments;
      
      if (status && ['UPCOMING', 'ACTIVE', 'FINISHED'].includes(status as string)) {
        const statusFilter = status as 'UPCOMING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';
        allTournaments = await db
          .select()
          .from(tournaments)
          .where(eq(tournaments.status, statusFilter))
          .orderBy(desc(tournaments.startTime));
      } else {
        allTournaments = await db
          .select()
          .from(tournaments)
          .orderBy(desc(tournaments.startTime));
      }
      
      // Get participant counts for each tournament
      const tournamentsWithCounts = await Promise.all(
        allTournaments.map(async (tournament) => {
          const [participantCount] = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(tournamentEntries)
            .where(eq(tournamentEntries.tournamentId, tournament.id));
            
          return {
            ...tournament,
            participantCount: participantCount.count || 0
          };
        })
      );
      
      res.json(tournamentsWithCounts);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      res.status(500).json({ error: 'Failed to fetch tournaments' });
    }
  },

  // Get tournament details
  getTournamentDetails: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, id));
        
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Get prizes
      const prizes = await db
        .select()
        .from(tournamentPrizes)
        .where(eq(tournamentPrizes.tournamentId, id))
        .orderBy(asc(tournamentPrizes.rank));
      
      // Get participant count
      const [participantCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tournamentEntries)
        .where(eq(tournamentEntries.tournamentId, id));
      
      res.json({
        ...tournament,
        prizes,
        participantCount: participantCount.count || 0
      });
    } catch (error) {
      console.error('Error fetching tournament details:', error);
      res.status(500).json({ error: 'Failed to fetch tournament details' });
    }
  },

  // Join a tournament
  joinTournament: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tournamentId } = req.body;
      const userId = req.user!.userId;
      
      // Get tournament details
      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, tournamentId));
        
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Check tournament status
      if (tournament.status !== 'UPCOMING' && tournament.status !== 'ACTIVE') {
        return res.status(400).json({ error: 'Tournament is not open for registration' });
      }
      
      // Check if already joined
      const [existingEntry] = await db
        .select()
        .from(tournamentEntries)
        .where(
          and(
            eq(tournamentEntries.tournamentId, tournamentId),
            eq(tournamentEntries.userId, userId)
          )
        );
        
      if (existingEntry) {
        return res.status(400).json({ error: 'Already joined this tournament' });
      }
      
      // Check max participants
      if (tournament.maxParticipants) {
        const [participantCount] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(tournamentEntries)
          .where(eq(tournamentEntries.tournamentId, tournamentId));
          
        if ((participantCount.count || 0) >= tournament.maxParticipants) {
          return res.status(400).json({ error: 'Tournament is full' });
        }
      }
      
      // Check VIP level requirement
      if (tournament.vipLevelRequired) {
        const user = await storage.getUser(userId);
        const vipLevels = ['UNRANKED', 'WOOD', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'JADE', 'SAPPHIRE', 'RUBY', 'DIAMOND'];
        const userLevel = vipLevels.indexOf(user?.vipLevel || 'UNRANKED');
        const requiredLevel = vipLevels.indexOf(tournament.vipLevelRequired);
        
        if (userLevel < requiredLevel) {
          return res.status(403).json({ error: `VIP level ${tournament.vipLevelRequired} or higher required` });
        }
      }
      
      // Check and deduct entry fee
      if (parseFloat(tournament.entryFee) > 0) {
        const balance = await storage.getBalance(userId);
        if (!balance) {
          return res.status(400).json({ error: 'Balance not found' });
        }
        
        const entryFeeInCents = Math.round(parseFloat(tournament.entryFee) * 100);
        
        if (tournament.entryCurrency === 'SC') {
          const scBalance = Math.floor(parseFloat(balance.sweepsCashTotal) * 100);
          if (scBalance < entryFeeInCents) {
            return res.status(400).json({ error: 'Insufficient SC balance' });
          }
          
          // Deduct from SC
          await storage.updateSweepsCashBalance(userId, {
            totalChange: -parseFloat(tournament.entryFee),
            redeemableChange: -parseFloat(tournament.entryFee)
          });
        } else {
          if (balance.available < entryFeeInCents) {
            return res.status(400).json({ error: 'Insufficient GC balance' });
          }
          
          // Deduct from GC
          await storage.updateBalance(userId, balance.available - entryFeeInCents, balance.locked);
        }
        
        // Record transaction
        await db.insert(transactions).values({
          userId,
          type: 'BET',
          amount: -entryFeeInCents,
          meta: {
            type: 'tournament_entry',
            tournamentId,
            tournamentName: tournament.name
          }
        });
      }
      
      // Create entry
      const [entry] = await db
        .insert(tournamentEntries)
        .values({
          tournamentId,
          userId,
          score: '0',
          totalWagered: '0',
          totalProfit: '0',
          highestMultiplier: '0',
          highestWin: '0',
          gamesPlayed: 0
        })
        .returning();
      
      res.json({ success: true, entry });
    } catch (error) {
      console.error('Error joining tournament:', error);
      res.status(500).json({ error: 'Failed to join tournament' });
    }
  },

  // Get tournament leaderboard
  getLeaderboard: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const entries = await db
        .select({
          entry: tournamentEntries,
          user: users
        })
        .from(tournamentEntries)
        .leftJoin(users, eq(tournamentEntries.userId, users.id))
        .where(eq(tournamentEntries.tournamentId, id))
        .orderBy(desc(tournamentEntries.score));
      
      const leaderboard = entries.map((item, index) => ({
        rank: index + 1,
        userId: item.entry.userId,
        username: item.user?.username || `Player${item.entry.userId.slice(-4)}`,
        vipLevel: item.user?.vipLevel || 'UNRANKED',
        score: item.entry.score,
        totalWagered: item.entry.totalWagered,
        totalProfit: item.entry.totalProfit,
        highestMultiplier: item.entry.highestMultiplier,
        highestWin: item.entry.highestWin,
        gamesPlayed: item.entry.gamesPlayed,
        prizeWon: item.entry.prizeWon,
        prizeClaimed: item.entry.prizeClaimed
      }));
      
      res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  },

  // Get user's tournament entry
  getUserEntry: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      
      const [entry] = await db
        .select()
        .from(tournamentEntries)
        .where(
          and(
            eq(tournamentEntries.tournamentId, id),
            eq(tournamentEntries.userId, userId)
          )
        );
      
      if (!entry) {
        return res.status(404).json({ error: 'Not joined this tournament' });
      }
      
      res.json(entry);
    } catch (error) {
      console.error('Error fetching user entry:', error);
      res.status(500).json({ error: 'Failed to fetch entry' });
    }
  },

  // Update tournament entry score (called after each bet)
  updateEntryScore: async (tournamentId: string, userId: string, bet: any) => {
    try {
      const [entry] = await db
        .select()
        .from(tournamentEntries)
        .where(
          and(
            eq(tournamentEntries.tournamentId, tournamentId),
            eq(tournamentEntries.userId, userId)
          )
        );
        
      if (!entry) return;
      
      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, tournamentId));
        
      if (!tournament || tournament.status !== 'ACTIVE') return;
      
      const betAmount = parseFloat(bet.amount) / 100;
      const profit = parseFloat(bet.profit) / 100;
      const multiplier = bet.multiplier || 0;
      const payout = betAmount + profit;
      
      let newScore = parseFloat(entry.score);
      
      switch (tournament.leaderboardType) {
        case 'HIGHEST_MULTIPLIER':
          if (multiplier > parseFloat(entry.highestMultiplier)) {
            newScore = multiplier;
          }
          break;
        case 'HIGHEST_WIN':
          if (payout > parseFloat(entry.highestWin)) {
            newScore = payout;
          }
          break;
        case 'TOTAL_WAGERED':
          newScore = parseFloat(entry.totalWagered) + betAmount;
          break;
        case 'TOTAL_PROFIT':
          newScore = parseFloat(entry.totalProfit) + profit;
          break;
      }
      
      await db
        .update(tournamentEntries)
        .set({
          score: newScore.toString(),
          totalWagered: (parseFloat(entry.totalWagered) + betAmount).toString(),
          totalProfit: (parseFloat(entry.totalProfit) + profit).toString(),
          highestMultiplier: Math.max(multiplier, parseFloat(entry.highestMultiplier)).toString(),
          highestWin: Math.max(payout, parseFloat(entry.highestWin)).toString(),
          gamesPlayed: entry.gamesPlayed + 1
        })
        .where(eq(tournamentEntries.id, entry.id));
    } catch (error) {
      console.error('Error updating tournament entry:', error);
    }
  },

  // Claim tournament prize
  claimPrize: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tournamentId } = req.body;
      const userId = req.user!.userId;
      
      const [entry] = await db
        .select()
        .from(tournamentEntries)
        .where(
          and(
            eq(tournamentEntries.tournamentId, tournamentId),
            eq(tournamentEntries.userId, userId)
          )
        );
        
      if (!entry) {
        return res.status(404).json({ error: 'Tournament entry not found' });
      }
      
      if (entry.prizeClaimed) {
        return res.status(400).json({ error: 'Prize already claimed' });
      }
      
      if (!entry.prizeWon || parseFloat(entry.prizeWon) <= 0) {
        return res.status(400).json({ error: 'No prize to claim' });
      }
      
      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, tournamentId));
        
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      const prizeAmount = parseFloat(entry.prizeWon);
      
      // Credit prize
      if (tournament.prizeCurrency === 'SC') {
        await storage.updateSweepsCashBalance(userId, {
          totalChange: prizeAmount,
          redeemableChange: prizeAmount
        });
      } else {
        const balance = await storage.getBalance(userId);
        if (balance) {
          await storage.updateBalance(
            userId,
            balance.available + Math.round(prizeAmount * 100),
            balance.locked
          );
        }
      }
      
      // Mark as claimed
      await db
        .update(tournamentEntries)
        .set({
          prizeClaimed: true,
          prizeClaimedAt: new Date()
        })
        .where(eq(tournamentEntries.id, entry.id));
      
      // Record transaction
      await db.insert(transactions).values({
        userId,
        type: 'PAYOUT',
        amount: Math.round(prizeAmount * 100),
        meta: {
          type: 'tournament_prize',
          tournamentId,
          tournamentName: tournament.name,
          rank: entry.rank
        }
      });
      
      res.json({ success: true, amount: prizeAmount });
    } catch (error) {
      console.error('Error claiming prize:', error);
      res.status(500).json({ error: 'Failed to claim prize' });
    }
  }
};
