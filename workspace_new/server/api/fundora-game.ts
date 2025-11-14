import { Router } from 'express';
import { db } from '../db';
import { gameSessions, apiKeys } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { authenticateApiKey } from '../middleware/apiAuth';

const router = Router();

// Helper function to generate session token
function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

// Helper function to send webhook
async function sendWebhook(webhookUrl: string, webhookSecret: string, eventType: string, data: any) {
  try {
    const crypto = await import('crypto');
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(data))
      .digest('hex');

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Event-Type': eventType,
      },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error('Webhook delivery error:', error);
  }
}

// GET /api/game/sessions - List all sessions with filtering
router.get('/sessions', authenticateApiKey, async (req, res) => {
  try {
    const apiKeyId = req.apiKey!.id;
    const status = req.query.status as string;
    const externalPlayerId = req.query.playerId as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    let whereConditions = [eq(gameSessions.apiKeyId, apiKeyId)];
    
    if (status) {
      whereConditions.push(eq(gameSessions.status, status));
    }
    
    if (externalPlayerId) {
      whereConditions.push(eq(gameSessions.externalPlayerId, externalPlayerId));
    }

    const sessions = await db
      .select()
      .from(gameSessions)
      .where(and(...whereConditions))
      .orderBy(desc(gameSessions.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(gameSessions)
      .where(and(...whereConditions));

    res.json({
      sessions,
      pagination: {
        total: countResult.count,
        limit,
        offset,
        hasMore: offset + sessions.length < countResult.count,
      }
    });
  } catch (error) {
    console.error('List sessions error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to list sessions'
    });
  }
});

// POST /api/game/sessions - Create a new game session
router.post('/sessions', authenticateApiKey, async (req, res) => {
  try {
    const { externalPlayerId, playerName, initialCredits, stake } = req.body;

    if (initialCredits === undefined || initialCredits === null || !stake) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'initialCredits and stake are required'
      });
    }

    const sessionToken = generateSessionToken();

    const [session] = await db
      .insert(gameSessions)
      .values({
        sessionToken,
        apiKeyId: req.apiKey!.id,
        externalPlayerId,
        playerName,
        initialCredits: initialCredits.toString(),
        stake: stake.toString(),
        status: 'active',
      })
      .returning();

    // Send webhook for game.started event
    if (req.apiKey!.webhookUrl && req.apiKey!.webhookSecret) {
      await sendWebhook(
        req.apiKey!.webhookUrl,
        req.apiKey!.webhookSecret,
        'game.started',
        {
          sessionId: session.id,
          sessionToken: session.sessionToken,
          externalPlayerId: session.externalPlayerId,
          playerName: session.playerName,
          initialCredits: session.initialCredits,
          stake: session.stake,
          timestamp: new Date().toISOString(),
        }
      );
    }

    res.status(201).json({
      session: {
        id: session.id,
        sessionToken: session.sessionToken,
        externalPlayerId: session.externalPlayerId,
        playerName: session.playerName,
        initialCredits: session.initialCredits,
        stake: session.stake,
        status: session.status,
        createdAt: session.createdAt,
      },
      embedUrl: `${req.protocol}://${req.get('host')}?session=${session.sessionToken}`,
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to create game session'
    });
  }
});

// GET /api/game/sessions/:sessionToken - Get session details
router.get('/sessions/:sessionToken', authenticateApiKey, async (req, res) => {
  try {
    const { sessionToken } = req.params;

    const [session] = await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.sessionToken, sessionToken))
      .limit(1);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'No session found with this token'
      });
    }

    if (session.apiKeyId !== req.apiKey!.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This session belongs to a different API key'
      });
    }

    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve session'
    });
  }
});

// POST /api/game/sessions/:sessionToken/end - End a game session
router.post('/sessions/:sessionToken/end', authenticateApiKey, async (req, res) => {
  try {
    const { sessionToken } = req.params;
    const { score, prize, prizeType, blocksStacked, highestRow } = req.body;

    const [session] = await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.sessionToken, sessionToken))
      .limit(1);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'No session found with this token'
      });
    }

    if (session.apiKeyId !== req.apiKey!.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This session belongs to a different API key'
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        error: 'Session already ended',
        message: 'This session has already been completed'
      });
    }

    const [updatedSession] = await db
      .update(gameSessions)
      .set({
        score,
        prize: prize ? prize.toString() : null,
        prizeType,
        blocksStacked,
        highestRow,
        status: 'completed',
        endedAt: new Date(),
      })
      .where(eq(gameSessions.sessionToken, sessionToken))
      .returning();

    // Send webhook for game.ended event
    if (req.apiKey!.webhookUrl && req.apiKey!.webhookSecret) {
      await sendWebhook(
        req.apiKey!.webhookUrl,
        req.apiKey!.webhookSecret,
        'game.ended',
        {
          sessionId: updatedSession.id,
          sessionToken: updatedSession.sessionToken,
          externalPlayerId: updatedSession.externalPlayerId,
          playerName: updatedSession.playerName,
          score: updatedSession.score,
          prize: updatedSession.prize,
          prizeType: updatedSession.prizeType,
          blocksStacked: updatedSession.blocksStacked,
          highestRow: updatedSession.highestRow,
          timestamp: new Date().toISOString(),
        }
      );

      // Send prize.won event if there's a prize
      if (prize && prize > 0) {
        await sendWebhook(
          req.apiKey!.webhookUrl,
          req.apiKey!.webhookSecret,
          'prize.won',
          {
            sessionId: updatedSession.id,
            sessionToken: updatedSession.sessionToken,
            externalPlayerId: updatedSession.externalPlayerId,
            playerName: updatedSession.playerName,
            prize: updatedSession.prize,
            prizeType: updatedSession.prizeType,
            timestamp: new Date().toISOString(),
          }
        );
      }
    }

    res.json({
      session: updatedSession,
      message: 'Session ended successfully'
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to end session'
    });
  }
});

// POST /api/game/sessions/:sessionToken/events - Track gameplay events
router.post('/sessions/:sessionToken/events', authenticateApiKey, async (req, res) => {
  try {
    const { sessionToken } = req.params;
    const { eventType, data } = req.body;

    if (!eventType) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'eventType is required'
      });
    }

    const [session] = await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.sessionToken, sessionToken))
      .limit(1);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'No session found with this token'
      });
    }

    if (session.apiKeyId !== req.apiKey!.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This session belongs to a different API key'
      });
    }

    // Send webhook for gameplay events
    if (req.apiKey!.webhookUrl && req.apiKey!.webhookSecret) {
      await sendWebhook(
        req.apiKey!.webhookUrl,
        req.apiKey!.webhookSecret,
        `gameplay.${eventType}`,
        {
          sessionId: session.id,
          sessionToken: session.sessionToken,
          externalPlayerId: session.externalPlayerId,
          playerName: session.playerName,
          eventType,
          data,
          timestamp: new Date().toISOString(),
        }
      );
    }

    res.json({
      success: true,
      message: 'Event tracked successfully',
      eventType,
    });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to track gameplay event'
    });
  }
});

export default router;
