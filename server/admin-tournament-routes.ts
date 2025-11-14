import { Request, Response, Router } from 'express';
import { db } from './db';
import { 
  tournaments, 
  tournamentEntries, 
  tournamentPrizes,
  users
} from '@shared/schema';
import { eq, sql, desc } from 'drizzle-orm';

const router = Router();

interface AuthenticatedRequest extends Request {
  admin?: { adminId: string };
}

// Create tournament
router.post('/create', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      description,
      game,
      entryFee,
      entryCurrency,
      prizePool,
      prizeCurrency,
      maxParticipants,
      minParticipants,
      startTime,
      endTime,
      leaderboardType,
      vipLevelRequired,
      isRecurring,
      recurringSchedule,
      bannerImage,
      prizes
    } = req.body;
    
    // Create tournament
    const [tournament] = await db
      .insert(tournaments)
      .values({
        name,
        description,
        game,
        entryFee: entryFee?.toString() || '0',
        entryCurrency: entryCurrency || 'GC',
        prizePool: prizePool?.toString() || '0',
        prizeCurrency: prizeCurrency || 'GC',
        maxParticipants,
        minParticipants: minParticipants || 2,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        leaderboardType: leaderboardType || 'HIGHEST_WIN',
        vipLevelRequired,
        isRecurring: isRecurring || false,
        recurringSchedule,
        bannerImage,
        createdBy: req.admin?.adminId,
        status: 'UPCOMING'
      })
      .returning();
    
    // Create prizes if provided
    if (prizes && Array.isArray(prizes)) {
      await db.insert(tournamentPrizes).values(
        prizes.map((prize: any) => ({
          tournamentId: tournament.id,
          rank: prize.rank,
          amount: prize.amount.toString(),
          currency: prize.currency || prizeCurrency || 'GC'
        }))
      );
    }
    
    res.json({ success: true, tournament });
  } catch (error) {
    console.error('Error creating tournament:', error);
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

// Update tournament status
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['UPCOMING', 'ACTIVE', 'FINISHED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    await db
      .update(tournaments)
      .set({ status, updatedAt: new Date() })
      .where(eq(tournaments.id, id));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating tournament status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Distribute prizes (called when tournament ends)
router.post('/:id/distribute-prizes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get tournament
    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id));
      
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    if (tournament.status !== 'FINISHED') {
      return res.status(400).json({ error: 'Tournament must be finished to distribute prizes' });
    }
    
    // Get prizes
    const prizes = await db
      .select()
      .from(tournamentPrizes)
      .where(eq(tournamentPrizes.tournamentId, id));
    
    // Get leaderboard (ordered by score)
    const entries = await db
      .select()
      .from(tournamentEntries)
      .where(eq(tournamentEntries.tournamentId, id))
      .orderBy(desc(tournamentEntries.score));
    
    // Assign ranks and prizes
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const rank = i + 1;
      const prize = prizes.find(p => p.rank === rank);
      
      await db
        .update(tournamentEntries)
        .set({
          rank,
          prizeWon: prize ? prize.amount : null
        })
        .where(eq(tournamentEntries.id, entry.id));
    }
    
    res.json({ success: true, prizesDistributed: prizes.length });
  } catch (error) {
    console.error('Error distributing prizes:', error);
    res.status(500).json({ error: 'Failed to distribute prizes' });
  }
});

// Delete tournament
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Delete entries first
    await db.delete(tournamentEntries).where(eq(tournamentEntries.tournamentId, id));
    
    // Delete prizes
    await db.delete(tournamentPrizes).where(eq(tournamentPrizes.tournamentId, id));
    
    // Delete tournament
    await db.delete(tournaments).where(eq(tournaments.id, id));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
});

// Get tournament statistics
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [participantCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(tournamentEntries)
      .where(eq(tournamentEntries.tournamentId, id));
      
    const [totalWagered] = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(CAST(${tournamentEntries.totalWagered} AS DECIMAL)), 0)` 
      })
      .from(tournamentEntries)
      .where(eq(tournamentEntries.tournamentId, id));
    
    const [totalGames] = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(${tournamentEntries.gamesPlayed}), 0)` 
      })
      .from(tournamentEntries)
      .where(eq(tournamentEntries.tournamentId, id));
    
    res.json({
      participantCount: participantCount.count || 0,
      totalWagered: totalWagered.total || 0,
      totalGames: totalGames.total || 0
    });
  } catch (error) {
    console.error('Error fetching tournament stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
