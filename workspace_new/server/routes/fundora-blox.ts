import { Request, Response, Router } from 'express';
import { fundoraBloxAPI } from '../services/fundora-blox-api';
import { authenticateJWT } from '../auth';
import crypto from 'crypto';

const router = Router();

// Create a game session
router.post('/api/fundora-blox/session', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { stake = '1' } = req.body;
    
    // Get user's current balance from the database
    const storage = (req as any).storage;
    const balance = await storage.getUserBalance(user.id);
    
    // Convert stake to number
    const stakeAmount = parseFloat(stake);
    
    // Check if user has sufficient balance
    if (balance.available < stakeAmount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }
    
    // Create session with Fundora Blox API
    const sessionData = {
      externalPlayerId: user.id,
      playerName: user.username || `Player${user.id}`,
      initialCredits: balance.available,
      stake: stake
    };
    
    const session = await fundoraBloxAPI.createSession(sessionData);
    
    // Store session info in database for tracking
    await storage.createGameSession({
      userId: user.id,
      gameType: 'fundora-blox',
      sessionId: session.session,
      stake: stakeAmount,
      status: 'active',
      createdAt: new Date()
    });
    
    res.json({
      success: true,
      ...session
    });
  } catch (error: any) {
    console.error('Failed to create Fundora Blox session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create game session'
    });
  }
});

// Sync credits from main balance to Fundora Blox
router.post('/api/fundora-blox/sync-credits', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }
    
    const storage = (req as any).storage;
    const balance = await storage.getUserBalance(user.id);
    
    if (balance.available < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }
    
    // Create a unique reference for this transaction
    const reference = `LOAD_${user.id}_${Date.now()}`;
    
    // Load credits to Fundora Blox
    await fundoraBloxAPI.loadCredits(user.id, amount, reference);
    
    // Deduct from user's main balance
    await storage.updateUserBalance(user.id, -amount, 'fundora-blox-load', {
      reference,
      amount
    });
    
    res.json({
      success: true,
      message: `Successfully loaded ${amount} credits to Fundora Blox`
    });
  } catch (error: any) {
    console.error('Failed to sync credits:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync credits'
    });
  }
});

// Get Fundora Blox balance
router.get('/api/fundora-blox/balance', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    const balance = await fundoraBloxAPI.getBalance(user.id);
    
    res.json({
      success: true,
      ...balance
    });
  } catch (error: any) {
    console.error('Failed to get Fundora Blox balance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get balance'
    });
  }
});

// Redeem credits from Fundora Blox back to main balance
router.post('/api/fundora-blox/redeem', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }
    
    // Check Fundora Blox balance
    const fundoraBalance = await fundoraBloxAPI.getBalance(user.id);
    
    if (fundoraBalance.balance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient Fundora Blox balance'
      });
    }
    
    // Create a unique reference for this transaction
    const reference = `REDEEM_${user.id}_${Date.now()}`;
    
    // Redeem credits from Fundora Blox
    await fundoraBloxAPI.redeemCredits(user.id, amount, reference);
    
    // Add to user's main balance
    const storage = (req as any).storage;
    await storage.updateUserBalance(user.id, amount, 'fundora-blox-redeem', {
      reference,
      amount
    });
    
    res.json({
      success: true,
      message: `Successfully redeemed ${amount} credits from Fundora Blox`
    });
  } catch (error: any) {
    console.error('Failed to redeem credits:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to redeem credits'
    });
  }
});

// Webhook handler for game events
router.post('/api/webhooks/fundora-blox', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    const eventType = req.headers['x-event-type'] as string;
    
    // Verify webhook signature
    if (!fundoraBloxAPI.verifyWebhookSignature(req.body, signature)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const storage = (req as any).storage;
    
    // Handle different event types
    switch (eventType) {
      case 'game.ended':
        const { externalPlayerId, score, prize, gameId } = req.body;
        
        // Update user's statistics
        await storage.updateGameStats({
          userId: externalPlayerId,
          gameType: 'fundora-blox',
          score,
          prize,
          gameId
        });
        
        // If there's a prize, update balance
        if (prize > 0) {
          await storage.updateUserBalance(externalPlayerId, prize, 'fundora-blox-win', {
            gameId,
            score,
            prize
          });
        }
        
        break;
        
      case 'credits.loaded':
      case 'credits.redeemed':
        // These are confirmations, we can log them
        console.log(`Webhook: ${eventType}`, req.body);
        break;
        
      default:
        console.log(`Unknown webhook event type: ${eventType}`);
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.sendStatus(500);
  }
});

export default router;