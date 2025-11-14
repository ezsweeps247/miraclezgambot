import { Router } from 'express';
import { db } from '../db';
import { gameHistory } from '@shared/schema';
import { desc } from 'drizzle-orm';

const router = Router();

// POST /api/history - Save a game result
router.post('/', async (req, res) => {
  try {
    const { playerName, score, stake, prize, prizeType, blocksStacked, highestRow } = req.body;

    if (score === undefined || !stake || blocksStacked === undefined || highestRow === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'score, stake, blocksStacked, and highestRow are required'
      });
    }

    const [history] = await db
      .insert(gameHistory)
      .values({
        playerName: playerName || 'Anonymous',
        score,
        stake,
        prize: prize?.toString() || null,
        prizeType: prizeType || null,
        blocksStacked,
        highestRow,
      })
      .returning();

    // Broadcast to all connected WebSocket clients
    if (req.app.locals.wss) {
      req.app.locals.wss.clients.forEach((client: any) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify({
            type: 'new_game',
            data: history
          }));
        }
      });
    }

    res.json(history);
  } catch (error) {
    console.error('Error saving game history:', error);
    res.status(500).json({ error: 'Failed to save game history' });
  }
});

// GET /api/history - Get recent game history
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    
    const history = await db
      .select()
      .from(gameHistory)
      .orderBy(desc(gameHistory.createdAt))
      .limit(limit);

    res.json(history);
  } catch (error) {
    console.error('Error fetching game history:', error);
    res.status(500).json({ error: 'Failed to fetch game history' });
  }
});

export default router;
