import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

// Check if we're in development mode (multiple indicators)
const isDevelopment = () => {
  return process.env.NODE_ENV === 'development' || 
         !process.env.NODE_ENV || // If NODE_ENV is not set, assume development
         process.env.REPL_OWNER !== undefined || // Replit environment
         process.env.PORT === '5000'; // Local development port
};

// Require JWT_SECRET in production, warn in development
const JWT_SECRET = process.env.JWT_SECRET;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim() || '';

if (!JWT_SECRET && !isDevelopment()) {
  console.error('CRITICAL: JWT_SECRET environment variable must be set in production!');
  throw new Error('JWT_SECRET is required for production deployment');
}

if (!JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET not set - using development fallback. This is INSECURE for production!');
}

const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'dev-insecure-fallback-do-not-use-in-production';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  auth_date: number;
  hash: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    telegramId: number;
    username?: string;
    firstName: string;
    lastName?: string;
  };
}

function verifyTelegramData(data: any): boolean {
  if (!data.hash) return false;
  
  const { hash, ...authData } = data;
  const checkString = Object.keys(authData)
    .sort()
    .map(key => `${key}=${authData[key]}`)
    .join('\n');
  
  const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');
  
  return hmac === hash;
}

export async function authenticateTelegram(req: Request, res: Response) {
  try {
    const initData = req.body.initData;
    
    // Log for debugging
    console.log('Telegram auth attempt:', initData ? 'initData present' : 'initData missing');
    
    if (!initData) {
      return res.status(400).json({ error: 'Missing initData' });
    }

    // Parse initData (URL encoded parameters)
    const urlParams = new URLSearchParams(initData);
    const userData = JSON.parse(urlParams.get('user') || '{}');
    const authDate = parseInt(urlParams.get('auth_date') || '0');
    const hash = urlParams.get('hash') || '';

    const telegramData = {
      ...userData,
      auth_date: authDate,
      hash
    };

    // Allow test mode ONLY in development
    const isTestMode = isDevelopment() && 
                       (initData === 'test-miraclez-2025' || initData === 'test');
    
    if (isTestMode) {
      console.log('⚠️  Test mode authentication (development only)');
      // Generate mock Telegram user data for testing
      const mockTelegramData = {
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        auth_date: Math.floor(Date.now() / 1000),
        hash: 'mock_hash'
      };
      
      let user = await storage.getUserByTelegramId(mockTelegramData.id);
      if (!user) {
        user = await storage.createUser({
          telegramId: mockTelegramData.id,
          username: mockTelegramData.username,
          firstName: mockTelegramData.first_name,
          lastName: mockTelegramData.last_name
        });
      }

      const token = jwt.sign(
        { 
          userId: user.id, 
          telegramId: mockTelegramData.id,
          username: mockTelegramData.username,
          firstName: mockTelegramData.first_name,
          lastName: mockTelegramData.last_name
        },
        EFFECTIVE_JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      return res.json({ 
        success: true, 
        token, // Include token in response for Telegram WebApp
        user: {
          id: user.id,
          telegramId: user.telegramId,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    }

    // CRITICAL: Verify Telegram signature to prevent unauthorized access
    if (!BOT_TOKEN || BOT_TOKEN.length === 0) {
      console.error('TELEGRAM_BOT_TOKEN not set - cannot verify Telegram data');
      console.error('BOT_TOKEN value:', BOT_TOKEN ? `'${BOT_TOKEN}'` : 'undefined/null');
      console.error('process.env.TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'SET' : 'NOT SET');
      return res.status(500).json({ error: 'Authentication service not configured' });
    }

    const isValid = verifyTelegramData(telegramData);
    if (!isValid) {
      console.error('❌ Invalid Telegram signature:', {
        userId: userData.id,
        username: userData.username,
        timestamp: authDate,
        botTokenSet: !!BOT_TOKEN,
        botTokenLength: BOT_TOKEN?.length || 0,
        initDataLength: initData.length,
        initDataSample: initData.substring(0, 50) + '...'
      });
      return res.status(401).json({ error: 'Invalid Telegram authentication' });
    }

    console.log('Telegram signature verified successfully');

    // Check for referral code in initData
    const referralCode = urlParams.get('start_param'); // Telegram WebApp passes referral as start_param
    
    // Find or create user
    let user = await storage.getUserByTelegramId(userData.id);
    if (!user) {
      user = await storage.createUser({
        telegramId: userData.id,
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
      });
      
      // CRITICAL: Create default balance for new user (for GC and SC)
      try {
        // Create GC balance
        await storage.createBalance({
          userId: user.id,
          available: 0,
          locked: 0,
          currency: 'GC'
        });
        
        // Create SC balance
        await storage.createBalance({
          userId: user.id,
          available: 0,
          locked: 0,
          currency: 'SC'
        });
        
        console.log(`Created default balances for new user ${user.id}`);
      } catch (balanceError) {
        console.error('Error creating default balance:', balanceError);
        // Balance might already exist, continue
      }
      
      // Process referral if present
      if (referralCode) {
        try {
          const { affiliateService } = await import('./affiliate/service');
          await affiliateService.processReferral(referralCode, user.id);
        } catch (error) {
          console.error('Error processing referral:', error);
          // Don't fail registration if referral processing fails
        }
      }
    }

    // Create JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      },
      EFFECTIVE_JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', // Allow cross-origin in production
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      success: true,
      token, // Include token in response for client-side storage
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

export async function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Check for token in Authorization header first (for Telegram WebApp)
  let token = req.headers.authorization?.replace('Bearer ', '');
  
  // Fallback to cookie if no Authorization header
  if (!token) {
    token = req.cookies.token;
  }

  if (!token) {
    // In development mode, auto-authenticate with mock user if no token is present
    if (isDevelopment()) {
      try {
        // Ensure mock user exists in database
        let mockUser = await storage.getUserByTelegramId(123456789);
        if (!mockUser) {
          mockUser = await storage.createUser({
            telegramId: 123456789,
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User'
          });
          
          // Create balance for mock user
          try {
            await storage.createBalance({
              userId: mockUser.id,
              available: 100000, // 1000 credits in cents
              locked: 0,
              currency: 'CREDITS'
            });
          } catch (error) {
            // Balance might already exist
          }
        }
        
        req.user = {
          userId: mockUser.id,
          telegramId: 123456789,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User'
        };
        return next();
      } catch (error) {
        console.error('Error creating mock user:', error);
        return res.status(500).json({ error: 'Authentication error' });
      }
    }
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    // In development mode, fallback to mock user if token is invalid
    if (isDevelopment()) {
      try {
        // Ensure mock user exists in database
        let mockUser = await storage.getUserByTelegramId(123456789);
        if (!mockUser) {
          mockUser = await storage.createUser({
            telegramId: 123456789,
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User'
          });
          
          // Create balance for mock user
          try {
            await storage.createBalance({
              userId: mockUser.id,
              available: 100000, // 1000 credits in cents
              locked: 0,
              currency: 'CREDITS'
            });
          } catch (error) {
            // Balance might already exist
          }
        }
        
        req.user = {
          userId: mockUser.id,
          telegramId: 123456789,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User'
        };
        return next();
      } catch (error) {
        console.error('Error creating mock user:', error);
        return res.status(500).json({ error: 'Authentication error' });
      }
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.cookies.token;
  console.log('[OptionalAuth] Token from cookies:', token ? 'exists' : 'missing');
  console.log('[OptionalAuth] All cookies:', Object.keys(req.cookies || {}));

  if (token) {
    try {
      const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET) as any;
      req.user = decoded;
      console.log('[OptionalAuth] User authenticated:', decoded.userId);
    } catch (error) {
      console.log('[OptionalAuth] Token verification failed:', error);
      // Token invalid but continue without auth
    }
  } else if (isDevelopment()) {
    // In development mode, auto-authenticate with mock user if no token
    try {
      // Ensure mock user exists in database
      let mockUser = await storage.getUserByTelegramId(123456789);
      if (!mockUser) {
        mockUser = await storage.createUser({
          telegramId: 123456789,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User'
        });
      }
      
      // Set user in request
      req.user = {
        userId: mockUser.id,
        telegramId: mockUser.telegramId || 123456789,
        username: mockUser.username || undefined,
        firstName: mockUser.firstName || 'Test',
        lastName: mockUser.lastName || undefined
      };
      
      console.log('[OptionalAuth] Dev mode - auto-authenticated as:', mockUser.id);
    } catch (error) {
      console.error('[OptionalAuth] Dev mode auto-auth failed:', error);
    }
  }

  next();
}
