import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { apiKeys } from '@shared/schema';
import { eq } from 'drizzle-orm';

declare global {
  namespace Express {
    interface Request {
      apiKey?: typeof apiKeys.$inferSelect;
    }
  }
}

export async function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({
      error: 'Missing API key',
      message: 'Please provide an API key in the X-API-Key header'
    });
  }

  try {
    const [keyRecord] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.key, apiKey))
      .limit(1);

    if (!keyRecord) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      });
    }

    if (!keyRecord.isActive) {
      return res.status(403).json({
        error: 'API key inactive',
        message: 'This API key has been deactivated'
      });
    }

    req.apiKey = keyRecord;
    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred while authenticating your request'
    });
  }
}
