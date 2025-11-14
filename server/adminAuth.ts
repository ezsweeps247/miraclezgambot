import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { admins, adminLogs } from '@shared/schema';
import { db } from './db';
import { eq } from 'drizzle-orm';

// Ensure JWT_SECRET is set in production
const isProduction = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';

// In production, JWT_SECRET must be set from environment variable
let JWT_SECRET: string;
if (process.env.JWT_SECRET) {
  JWT_SECRET = process.env.JWT_SECRET;
} else if (isProduction) {
  // In production, we must have a JWT_SECRET
  console.error('CRITICAL: JWT_SECRET environment variable is not set in production!');
  throw new Error('JWT_SECRET must be set in production environment');
} else {
  // Only in development, use a default secret
  JWT_SECRET = 'development-secret-key-only';
  console.warn('Using development JWT secret. Set JWT_SECRET environment variable for production.');
}

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    username: string;
    role: string;
  };
}

export async function authenticateAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.adminToken;
   
    if (!token) {
      return res.status(401).json({ error: 'No admin token provided' });
    }
    const decoded = jwt.verify(token, JWT_SECRET) as any;
   
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.id, decoded.id))
      .limit(1);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin account' });
    }
    req.admin = {
      id: admin.id,
      username: admin.username,
      role: admin.role,
    };
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(401).json({ error: 'Invalid admin token' });
  }
}

export async function loginAdmin(username: string, password: string, ipAddress?: string, userAgent?: string) {
  try {
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.username, username))
      .limit(1);
    if (!admin) {
      throw new Error('Invalid credentials');
    }
    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }
    // Update last login
    await db
      .update(admins)
      .set({ lastLoginAt: new Date() })
      .where(eq(admins.id, admin.id));
    // Log the login - temporarily disabled due to table mismatch
    // await db.insert(adminLogs).values({
    // adminId: admin.id,
    // action: 'LOGIN',
    // ipAddress,
    // userAgent,
    // });
    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        role: admin.role
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    return {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
    };
  } catch (error) {
    console.error('Admin login error:', error);
    throw error;
  }
}

export async function createAdminUser(username: string, password: string, role: string = 'ADMIN') {
  const hashedPassword = await bcrypt.hash(password, 10);
 
  const [admin] = await db
    .insert(admins)
    .values({
      username,
      passwordHash: hashedPassword,
      role
    })
    .returning();
  return admin;
}

export async function logAdminAction(
  adminId: string,
  action: string,
  targetUserId?: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
) {
  await db.insert(adminLogs).values({
    adminId,
    action,
    targetUserId,
    details,
    ipAddress,
    userAgent,
  });
}
