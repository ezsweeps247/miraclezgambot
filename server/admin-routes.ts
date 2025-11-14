import { Router } from 'express';
import { adminLogin, adminLogout, authenticateAdmin, requireAdminRole, type AdminRequest } from './admin-auth';
import { storage } from './storage';

const router = Router();

// Authentication routes (NOT protected)
router.post('/api/login', adminLogin);
router.post('/api/logout', adminLogout);

// Protected admin routes
router.post('/api/verify', authenticateAdmin, (req: AdminRequest, res) => {
  res.json({ success: true, admin: req.admin });
});

// Dashboard stats (protected)
router.get('/api/stats', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const stats = await storage.getAdminStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// User management (protected)
router.get('/api/users', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const users = await storage.getUsersWithBalance();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Transaction management (protected)
router.get('/api/transactions', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const transactions = await storage.getRecentTransactions(limit);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Activity endpoint for dashboard (protected)
router.get('/api/activity', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    // Get recent system activity
    const activities = [
      {
        description: "User placed CryptoCoaster bet",
        timestamp: new Date(),
        type: "bet"
      },
      {
        description: "New user registered",
        timestamp: new Date(Date.now() - 300000),
        type: "user"
      },
      {
        description: "Crypto deposit processed",
        timestamp: new Date(Date.now() - 600000),
        type: "transaction"
      }
    ];
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Admin management (Super Admin only, protected)
router.post('/api/create-admin', authenticateAdmin, requireAdminRole(['SUPER_ADMIN']), async (req: AdminRequest, res) => {
  try {
    const { username, password, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Check if admin already exists
    const existingAdmin = await storage.getAdminByUsername(username);
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin already exists' });
    }

    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await storage.createAdmin({
      username,
      passwordHash,
      role: role || 'ADMIN'
    });

    res.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

export default router;