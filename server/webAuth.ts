import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { storage } from './storage';
import { z } from 'zod';
import { authLimiter } from './middleware/rate-limit';
import { verifyMessage } from 'ethers';
import { OAuth2Client } from 'google-auth-library';

const router = Router();

// JWT_SECRET is optional - web auth will be disabled if not provided
const JWT_SECRET = process.env.JWT_SECRET || null;

if (!JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET not set - web authentication disabled. Set JWT_SECRET to enable web-based login.');
}

// Google OAuth Client
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || null;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || null;
const googleClient = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET 
  ? new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/api/auth/google/callback`)
  : null;

if (!googleClient) {
  console.warn('⚠️  Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google authentication.');
}

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Register endpoint with rate limiting
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  if (!JWT_SECRET) {
    return res.status(503).json({ 
      success: false, 
      error: 'Web authentication is not configured. Please contact support.' 
    });
  }

  try {
    const validated = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(validated.email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validated.password, 10);

    // Create user
    const user = await storage.createUser({
      email: validated.email,
      passwordHash,
      firstName: validated.firstName,
      lastName: validated.lastName,
      username: validated.email.split('@')[0], // Use email prefix as username
    });

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Registration error details:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint with rate limiting
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  if (!JWT_SECRET) {
    return res.status(503).json({ 
      success: false, 
      error: 'Web authentication is not configured. Please contact support.' 
    });
  }

  try {
    const validated = loginSchema.parse(req.body);

    // Find user
    const user = await storage.getUserByEmail(validated.email);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Email check endpoint - check if email exists
router.post('/email/check', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await storage.getUserByEmail(email);
    res.json({ exists: !!user });
  } catch (error) {
    console.error('Email check error:', error);
    res.status(500).json({ error: 'Failed to check email' });
  }
});

// Web3 wallet authentication
router.post('/web3/login', authLimiter, async (req: Request, res: Response) => {
  if (!JWT_SECRET) {
    return res.status(503).json({ 
      success: false, 
      error: 'Web authentication is not configured.' 
    });
  }

  try {
    const { address, signature, message } = req.body;

    if (!address || !signature || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify the signature
    const recoveredAddress = verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check if user with this wallet exists
    let user = await storage.getUserByWallet(address);

    if (!user) {
      // Create new user with wallet address
      user = await storage.createUser({
        walletAddress: address,
        username: `Player${address.slice(-6)}`,
        email: null, // Optional for Web3 users
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        walletAddress: address
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ 
      success: true,
      user: {
        id: user.id,
        walletAddress: address,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Web3 login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Google OAuth - initiate flow
router.get('/google', (req: Request, res: Response) => {
  if (!googleClient) {
    return res.status(503).json({ 
      error: 'Google authentication is not configured.' 
    });
  }

  const authorizeUrl = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    prompt: 'consent'
  });

  res.redirect(authorizeUrl);
});

// Google OAuth - callback
router.get('/google/callback', async (req: Request, res: Response) => {
  if (!googleClient || !JWT_SECRET) {
    return res.status(503).send('Google authentication is not configured.');
  }

  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).send('Missing authorization code');
    }

    // Exchange code for tokens
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // Get user info
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: GOOGLE_CLIENT_ID!,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).send('Failed to get user info');
    }

    const { email, given_name, family_name, sub: googleId } = payload;

    // Check if user exists
    let user = await storage.getUserByEmail(email!);

    if (!user) {
      // Create new user
      user = await storage.createUser({
        email: email!,
        firstName: given_name || 'User',
        lastName: family_name,
        username: email!.split('@')[0],
        googleId,
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Redirect to home page
    res.redirect('/');
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

// Logout endpoint
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ success: true });
});

export default router;
