import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { admins } from '@shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    username: string;
    role: string;
  };
}

export async function adminLogin(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const admin = await storage.getAdminByUsername(username);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await storage.updateAdminLastLogin(admin.id);

    // Create JWT
    const token = jwt.sign(
      { 
        adminId: admin.id,
        username: admin.username,
        role: admin.role
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    res.json({
      success: true,
      token: token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

export async function adminLogout(req: Request, res: Response) {
  res.clearCookie('adminToken');
  res.json({ success: true });
}

export function authenticateAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  // Try to get token from cookies first, then from Authorization header
  let token = req.cookies.adminToken;
  
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.admin = {
      id: decoded.adminId,
      username: decoded.username,
      role: decoded.role
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
}

export function requireAdminRole(roles: string[]) {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}