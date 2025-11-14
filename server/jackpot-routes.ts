import { Router } from 'express';
import { storage } from './storage';
import { authenticateJWT, type AuthenticatedRequest } from './auth';

const router = Router();

// Get all jackpot pools
router.get('/jackpots', async (req, res) => {
  try {
    const pools = await storage.getAllJackpotPools();
    res.json(pools);
  } catch (error) {
    console.error('Error fetching jackpot pools:', error);
    res.status(500).json({ error: 'Failed to fetch jackpot pools' });
  }
});

// Get jackpot pools by currency
router.get('/jackpots/:currency', async (req, res) => {
  try {
    const currency = req.params.currency.toUpperCase() as 'GC' | 'SC';
    if (currency !== 'GC' && currency !== 'SC') {
      return res.status(400).json({ error: 'Invalid currency. Must be GC or SC' });
    }
    
    const pools = await storage.getJackpotPoolByCurrency(currency);
    res.json(pools);
  } catch (error) {
    console.error('Error fetching jackpot pools by currency:', error);
    res.status(500).json({ error: 'Failed to fetch jackpot pools' });
  }
});

// Get jackpot winners history
router.get('/jackpots/winners/all', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const winners = await storage.getJackpotWinners(limit);
    res.json(winners);
  } catch (error) {
    console.error('Error fetching jackpot winners:', error);
    res.status(500).json({ error: 'Failed to fetch jackpot winners' });
  }
});

// Get user's jackpot wins
router.get('/jackpots/winners/me', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const wins = await storage.getUserJackpotWins(userId);
    res.json(wins);
  } catch (error) {
    console.error('Error fetching user jackpot wins:', error);
    res.status(500).json({ error: 'Failed to fetch jackpot wins' });
  }
});

export default router;
