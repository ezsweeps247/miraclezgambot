import { Router } from 'express';
import { authenticateAdmin, loginAdmin, AdminRequest, logAdminAction, createAdminUser } from './adminAuth';
import { users, transactions, balances, admins, adminLogs, bets, redemptionCodes, redemptionCodeUsages, type InsertRedemptionCode, supportTickets, supportTicketMessages, emailCampaigns, emailCampaignRecipients, ipWhitelist, liveGameSessions, playerBehaviorProfiles, riskAssessments, playerSegments, fraudAlerts, withdrawalQueue, paymentProviderStatus, transactionDisputes, cryptoWalletMonitoring, promotionalCalendar, retentionCampaigns, vipTierConfiguration, personalizedOffers, highRollerProfiles, loyaltyRewardCatalog, regulatoryReports, auditTrail, adminMfaSettings, instantWithdrawalSettings, userWithdrawalStats, cryptoWithdrawals } from '@shared/schema';
import { db } from './db';
import { eq, desc, and, or, gte, lte, ilike, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { storage } from './storage';
import { getBot, initializeBot } from './telegram-bot';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

// CSV utility function
function convertToCSV(data: any[], headers: string[]): string {
  const headerRow = headers.join(',');
  const rows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      
      // Handle null/undefined
      if (value === null || value === undefined) return '';
      
      // Handle Date objects
      if (value instanceof Date) {
        return value.toISOString();
      }
      
      // Handle objects and arrays - stringify them
      if (typeof value === 'object') {
        const stringValue = JSON.stringify(value);
        // Always wrap JSON in quotes and escape internal quotes
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      // Handle primitive values
      const stringValue = String(value);
      // Wrap in quotes if contains comma, newline, or quote
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });
  return [headerRow, ...rows].join('\n');
}

// Configure multer for banner uploads
const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'banners');
    // Ensure directory exists
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'banner-' + uniqueSuffix + ext);
  }
});

const bannerUpload = multer({
  storage: bannerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, jpeg, png, webp) are allowed'));
    }
  }
});

export const adminRouter = Router();

// Debug endpoint to test authentication (remove in production)
adminRouter.get('/debug/auth-test', (req, res) => {
  const authHeader = req.headers.authorization;
  const hasAuth = !!authHeader;
  const tokenFormat = authHeader ? authHeader.substring(0, 20) + '...' : 'none';
  console.log('[Admin Debug] Auth test - has header:', hasAuth, 'format:', tokenFormat);
  res.json({ 
    hasAuthHeader: hasAuth,
    headerFormat: tokenFormat,
    jwtSecretConfigured: !!process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV,
    railwayEnv: process.env.RAILWAY_ENVIRONMENT
  });
});

// Admin login
adminRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('[Admin Login] Login attempt for username:', username);
    const result = await loginAdmin(username, password, req.ip, req.headers['user-agent']);
    console.log('[Admin Login] Login successful, token generated');
    res.json(result);
  } catch (error: any) {
    console.error('[Admin Login] Login failed:', error.message);
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

// Verify admin authentication (for login check)
adminRouter.post('/verify', authenticateAdmin, async (req: AdminRequest, res) => {
  res.json({ success: true, admin: req.admin });
});

// Dashboard data endpoint
adminRouter.get('/dashboard', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    // Get various stats for dashboard
    const [totalUsersResult, activeUsersResult, totalBetsResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(gte(users.lastSessionStart, new Date(Date.now() - 24 * 60 * 60 * 1000))),
      db.select({
        count: sql<number>`count(*)`,
        sum: sql<number>`COALESCE(sum(amount), 0)`,
        winnings: sql<number>`COALESCE(sum(CASE WHEN profit > 0 THEN profit ELSE 0 END), 0)`
      }).from(bets)
    ]);

    // Get recent users
    const recentUsers = await db
      .select({
        id: users.id,
        username: users.username,
        createdAt: users.createdAt
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(10);

    // Get recent transactions  
    const recentTransactions = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        createdAt: transactions.createdAt,
        username: users.username
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .orderBy(desc(transactions.createdAt))
      .limit(10);

    // Get recent bets
    const recentBets = await db
      .select({
        id: bets.id,
        game: bets.game,
        amount: bets.amount,
        profit: bets.profit,
        createdAt: bets.createdAt,
        username: users.username
      })
      .from(bets)
      .leftJoin(users, eq(bets.userId, users.id))
      .orderBy(desc(bets.createdAt))
      .limit(10);

    res.json({
      totalUsers: totalUsersResult[0].count,
      activeUsers: activeUsersResult[0].count,
      totalBets: totalBetsResult[0].count,
      totalBetAmount: totalBetsResult[0].sum,
      totalWinnings: totalBetsResult[0].winnings,
      totalDeposits: 0, // You can calculate this from transactions
      totalWithdrawals: 0, // You can calculate this from transactions
      recentUsers,
      recentTransactions,
      recentBets
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Check admin authentication status
adminRouter.get('/me', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    console.log('[Admin Me] Fetching admin info for:', req.admin);
    const adminId = req.admin!.id;
    
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.id, adminId))
      .limit(1);
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    res.json({
      id: admin.id,
      username: admin.username,
      role: admin.role,
    });
  } catch (error) {
    console.error('Error fetching admin data:', error);
    res.status(500).json({ error: 'Failed to fetch admin data' });
  }
});

// Ban/unban user
adminRouter.put('/users/:userId/ban', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId } = req.params;
    const { banned, reason } = req.body;
    
    await db.execute(sql`
      UPDATE users 
      SET is_in_self_exclusion = ${banned}, 
          self_exclusion_reason = ${reason || 'Admin action'},
          updated_at = NOW()
      WHERE id = ${userId}
    `);
    
    await logAdminAction(
      req.admin!.id,
      banned ? 'BAN_USER' : 'UNBAN_USER',
      userId,
      { reason },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user ban status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Adjust user balance
adminRouter.put('/users/:userId/balance', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId } = req.params;
    const { amount, action, reason } = req.body; // action: 'add' | 'remove'
    
    const adjustmentAmount = action === 'add' ? Math.abs(amount) : -Math.abs(amount);
    
    await db.execute(sql`
      UPDATE users 
      SET balance = balance + ${adjustmentAmount},
          updated_at = NOW()
      WHERE id = ${userId}
    `);
    
    // Log transaction
    await db.execute(sql`
      INSERT INTO transactions (id, user_id, amount, type, meta, created_at)
      VALUES (gen_random_uuid(), ${userId}, ${adjustmentAmount}, ${action === 'add' ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT'}, 
              ${JSON.stringify({ reason, adminId: req.admin!.id })}, NOW())
    `);
    
    await logAdminAction(
      req.admin!.id,
      'ADJUST_BALANCE',
      userId,
      { amount: adjustmentAmount, reason },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error adjusting user balance:', error);
    res.status(500).json({ error: 'Failed to adjust balance' });
  }
});

// Get user transaction history
adminRouter.get('/users/:userId/transactions', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId } = req.params;
    const { limit = '50', offset = '0' } = req.query;
    
    const transactions = await db.execute(sql`
      SELECT id, amount, type, meta, created_at
      FROM transactions 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit as string)}
      OFFSET ${parseInt(offset as string)}
    `);
    
    res.json({ transactions: transactions.rows });
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500).json({ error: 'Failed to fetch user transactions' });
  }
});

// Get platform settings
adminRouter.get('/platform/settings', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    // Return current platform configuration
    const settings = {
      maintenance_mode: process.env.MAINTENANCE_MODE === 'true',
      max_bet_limit: process.env.MAX_BET_LIMIT || '10000',
      min_withdrawal: process.env.MIN_WITHDRAWAL || '10',
      max_withdrawal: process.env.MAX_WITHDRAWAL || '50000',
      platform_commission: process.env.PLATFORM_COMMISSION || '2.5',
      currency: process.env.PLATFORM_CURRENCY || 'USD',
      telegram_bot_enabled: !!process.env.TELEGRAM_BOT_TOKEN,
      registration_enabled: process.env.REGISTRATION_ENABLED !== 'false'
    };
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching platform settings:', error);
    res.status(500).json({ error: 'Failed to fetch platform settings' });
  }
});

// Update platform settings
adminRouter.put('/platform/settings', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const settings = req.body;
    
    // Update environment variables (in production this should update a config file or database)
    Object.entries(settings).forEach(([key, value]) => {
      process.env[key.toUpperCase()] = String(value);
    });
    
    await logAdminAction(
      req.admin!.id,
      'UPDATE_PLATFORM_SETTINGS',
      undefined,
      settings,
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating platform settings:', error);
    res.status(500).json({ error: 'Failed to update platform settings' });
  }
});

// Get security logs
adminRouter.get('/security/logs', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { limit = '100', offset = '0', type } = req.query;
    
    let query = sql`
      SELECT id, admin_id, action, target_user_id, details, ip_address, user_agent, created_at
      FROM admin_audit_logs 
    `;
    
    if (type) {
      query = sql`${query} WHERE action = ${type}`;
    }
    
    query = sql`${query} 
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit as string)}
      OFFSET ${parseInt(offset as string)}
    `;
    
    const logs = await db.execute(query);
    
    res.json({ logs });
  } catch (error) {
    console.error('Error fetching security logs:', error);
    res.status(500).json({ error: 'Failed to fetch security logs' });
  }
});

// Send message to user
adminRouter.post('/users/:userId/message', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId } = req.params;
    const { message, type = 'INFO' } = req.body;
    
    // Store message in notifications table (assuming we have one)
    await db.execute(sql`
      INSERT INTO notifications (id, user_id, message, type, is_read, created_at)
      VALUES (gen_random_uuid(), ${userId}, ${message}, ${type}, false, NOW())
    `);
    
    await logAdminAction(
      req.admin!.id,
      'SEND_USER_MESSAGE',
      userId,
      { message, type },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending user message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get all users with advanced search and filters
adminRouter.get('/users', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';
    const vipLevel = req.query.vipLevel as string;
    const status = req.query.status as string; // 'active', 'banned', 'all'
    const minBalance = req.query.minBalance ? parseFloat(req.query.minBalance as string) : undefined;
    const maxBalance = req.query.maxBalance ? parseFloat(req.query.maxBalance as string) : undefined;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const offset = (page - 1) * limit;

    const whereClauses = [];
    
    // Enhanced search: username, first name, last name, telegram ID, user ID
    if (search) {
      whereClauses.push(
        or(
          ilike(users.username, `%${search}%`),
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`),
          sql`${users.telegramId}::text LIKE ${`%${search}%`}`,
          ilike(users.id, `%${search}%`)
        )
      );
    }

    // VIP level filter
    if (vipLevel && vipLevel !== 'all') {
      whereClauses.push(eq(users.vipLevel, vipLevel as any));
    }

    // Status filter (active/banned)
    if (status === 'banned') {
      whereClauses.push(eq(users.isInSelfExclusion, true));
    } else if (status === 'active') {
      whereClauses.push(eq(users.isInSelfExclusion, false));
    }

    // Date range filter
    if (dateFrom) {
      whereClauses.push(sql`${users.createdAt} >= ${dateFrom}`);
    }
    if (dateTo) {
      whereClauses.push(sql`${users.createdAt} <= ${dateTo}`);
    }

    // Balance range filter - add to where clauses using COALESCE to handle NULL
    if (minBalance !== undefined) {
      whereClauses.push(sql`COALESCE(${balances.available}, 0) >= ${minBalance}`);
    }
    if (maxBalance !== undefined) {
      whereClauses.push(sql`COALESCE(${balances.available}, 0) <= ${maxBalance}`);
    }

    const baseQuery = db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        telegramId: users.telegramId,
        createdAt: users.createdAt,
        vipLevel: users.vipLevel,
        isInSelfExclusion: users.isInSelfExclusion,
        balance: balances.available,
        sweepsCashTotal: balances.sweepsCashTotal,
      })
      .from(users)
      .leftJoin(balances, eq(users.id, balances.userId));

    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .leftJoin(balances, eq(users.id, balances.userId));

    // Apply where clauses
    const whereClause = whereClauses.length > 0 ? and(...whereClauses) : undefined;
    
    const usersList = await baseQuery
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCountResult = await countQuery.where(whereClause);

    res.json({
      users: usersList,
      total: totalCountResult[0]?.count || 0,
      page,
      totalPages: Math.ceil((totalCountResult[0]?.count || 0) / limit),
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user details
adminRouter.get('/users/:userId', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        telegramId: users.telegramId,
        createdAt: users.createdAt,
        lastSessionStart: users.lastSessionStart,
        balance: balances.available,
        lockedBalance: balances.locked,
      })
      .from(users)
      .leftJoin(balances, eq(users.id, balances.userId))
      .where(eq(users.id, req.params.userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user details
adminRouter.put('/users/:userId', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { username, firstName, lastName } = req.body;
    
    await db
      .update(users)
      .set({
        username,
        firstName,
        lastName,
      })
      .where(eq(users.id, req.params.userId));

    await logAdminAction(
      req.admin!.id,
      'UPDATE_USER',
      req.params.userId,
      req.body,
      req.ip,
      req.headers['user-agent']
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Enable/Disable user account
adminRouter.post('/users/:userId/status', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { action } = req.body; // 'enable' or 'disable'
    const userId = req.params.userId;
    
    if (!['enable', 'disable'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use "enable" or "disable"' });
    }
    
    if (action === 'disable') {
      // Set user in self-exclusion indefinitely
      await db
        .update(users)
        .set({
          isInSelfExclusion: true,
          selfExclusionUntil: new Date('2099-12-31'),
          selfExclusionType: 'PERMANENT'
        })
        .where(eq(users.id, userId));
    } else {
      // Remove self-exclusion
      await db
        .update(users)
        .set({
          isInSelfExclusion: false,
          selfExclusionUntil: null,
          selfExclusionType: null
        })
        .where(eq(users.id, userId));
    }
    
    await logAdminAction(
      req.admin!.id,
      action === 'disable' ? 'DISABLE_USER' : 'ENABLE_USER',
      userId,
      { action },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Bulk user actions
adminRouter.post('/users/bulk/status', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userIds, action } = req.body; // action: 'ban' or 'unban'
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds must be a non-empty array' });
    }
    
    if (!['ban', 'unban'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use "ban" or "unban"' });
    }
    
    if (action === 'ban') {
      await db
        .update(users)
        .set({
          isInSelfExclusion: true,
          selfExclusionUntil: new Date('2099-12-31'),
          selfExclusionType: 'PERMANENT'
        })
        .where(sql`${users.id} = ANY(${userIds})`);
    } else {
      await db
        .update(users)
        .set({
          isInSelfExclusion: false,
          selfExclusionUntil: null,
          selfExclusionType: null
        })
        .where(sql`${users.id} = ANY(${userIds})`);
    }
    
    await logAdminAction(
      req.admin!.id,
      action === 'ban' ? 'BULK_BAN_USERS' : 'BULK_UNBAN_USERS',
      null,
      { userIds, count: userIds.length },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ success: true, count: userIds.length });
  } catch (error) {
    console.error('Error bulk updating user status:', error);
    res.status(500).json({ error: 'Failed to bulk update user status' });
  }
});

// Bulk tag users
adminRouter.post('/users/bulk/tag', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userIds, tagId } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds must be a non-empty array' });
    }
    
    if (!tagId) {
      return res.status(400).json({ error: 'tagId is required' });
    }
    
    // Insert tags for all users (ignore duplicates)
    const tagAssignments = userIds.map(userId => ({
      userId,
      tagId,
      assignedBy: req.admin!.id
    }));
    
    await db
      .insert(playerTagAssignments)
      .values(tagAssignments)
      .onConflictDoNothing();
    
    await logAdminAction(
      req.admin!.id,
      'BULK_TAG_USERS',
      null,
      { userIds, tagId, count: userIds.length },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ success: true, count: userIds.length });
  } catch (error) {
    console.error('Error bulk tagging users:', error);
    res.status(500).json({ error: 'Failed to bulk tag users' });
  }
});

// Bulk adjust balance
adminRouter.post('/users/bulk/balance', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userIds, amount, type, note } = req.body; // type: 'add' or 'subtract'
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds must be a non-empty array' });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }
    
    if (!['add', 'subtract'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Use "add" or "subtract"' });
    }
    
    const amountInCents = Math.floor(amount * 100);
    const adjustment = type === 'add' ? amountInCents : -amountInCents;
    
    // Update balances for all users
    await db
      .update(balances)
      .set({
        available: sql`${balances.available} + ${adjustment}`
      })
      .where(sql`${balances.userId} = ANY(${userIds})`);
    
    // Create transaction records for each user
    for (const userId of userIds) {
      await db.insert(transactions).values({
        userId,
        type: type === 'add' ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT',
        amount: amountInCents,
        meta: { adminId: req.admin!.id, note }
      });
    }
    
    await logAdminAction(
      req.admin!.id,
      'BULK_ADJUST_BALANCE',
      null,
      { userIds, amount, type, count: userIds.length, note },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ success: true, count: userIds.length });
  } catch (error) {
    console.error('Error bulk adjusting balance:', error);
    res.status(500).json({ error: 'Failed to bulk adjust balance' });
  }
});

// Get user gameplay history
adminRouter.get('/users/:userId/gameplay', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    
    let whereConditions = [eq(bets.userId, userId)];
    if (dateFrom) {
      whereConditions.push(gte(bets.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      whereConditions.push(lte(bets.createdAt, new Date(dateTo)));
    }
    const whereClause = and(...whereConditions);
    
    const [gameplay, totalCountResult] = await Promise.all([
      db
        .select({
          id: bets.id,
          game: bets.game,
          amount: bets.amount,
          profit: bets.profit,
          result: bets.result,
          createdAt: bets.createdAt,
          nonce: bets.nonce,
          serverSeedId: bets.serverSeedId
        })
        .from(bets)
        .where(whereClause)
        .orderBy(desc(bets.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(bets)
        .where(whereClause)
    ]);
    
    res.json({
      gameplay,
      total: totalCountResult[0].count,
      page,
      totalPages: Math.ceil(totalCountResult[0].count / limit),
    });
  } catch (error) {
    console.error('Error fetching gameplay:', error);
    res.status(500).json({ error: 'Failed to fetch gameplay history' });
  }
});

// Get user KYC data
adminRouter.get('/users/:userId/kyc', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const userId = req.params.userId;
    
    // Get user details with stats
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        telegramId: users.telegramId,
        createdAt: users.createdAt,
        kycVerified: users.kycVerified,
        kycRequiredAt: users.kycRequiredAt,
        riskLevel: users.riskLevel,
        referralCode: users.referralCode,
        referredBy: users.referredBy,
        isInSelfExclusion: users.isInSelfExclusion,
        selfExclusionUntil: users.selfExclusionUntil,
        selfExclusionType: users.selfExclusionType,
        isInCoolingOff: users.isInCoolingOff,
        coolingOffUntil: users.coolingOffUntil,
        lastSessionStart: users.lastSessionStart,
        totalSessionTime: users.totalSessionTime,
        balance: balances.available,
        lockedBalance: balances.locked,
      })
      .from(users)
      .leftJoin(balances, eq(users.id, balances.userId))
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get aggregated stats
    const stats = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT b.id) as total_bets,
        COALESCE(SUM(b.amount), 0) as total_wagered,
        COALESCE(SUM(b.profit), 0) as total_profit,
        COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END), 0) as total_deposits,
        COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN ABS(t.amount) ELSE 0 END), 0) as total_withdrawals
      FROM users u
      LEFT JOIN bets b ON u.id = b.user_id
      LEFT JOIN transactions t ON u.id = t.user_id
      WHERE u.id = ${userId}
      GROUP BY u.id
    `);
    
    res.json({
      ...user,
      stats: stats[0] || {
        total_bets: 0,
        total_wagered: 0,
        total_profit: 0,
        total_deposits: 0,
        total_withdrawals: 0
      }
    });
  } catch (error) {
    console.error('Error fetching KYC data:', error);
    res.status(500).json({ error: 'Failed to fetch KYC data' });
  }
});

// Recharge user balance
adminRouter.post('/users/:userId/recharge', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { amount, reason, currency = 'GC' } = req.body; // currency: 'GC' | 'SC'
    const userId = req.params.userId;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!['GC', 'SC'].includes(currency)) {
      return res.status(400).json({ error: 'Currency must be GC or SC' });
    }

    // Update balance based on currency
    if (currency === 'GC') {
      await db
        .update(balances)
        .set({
          available: sql`${balances.available} + ${amount}`,
        })
        .where(eq(balances.userId, userId));
    } else {
      // SC update
      await db
        .update(balances)
        .set({
          sweepsCashTotal: sql`${balances.sweepsCashTotal} + ${amount}`,
          sweepsCashRedeemable: sql`${balances.sweepsCashRedeemable} + ${amount}`,
        })
        .where(eq(balances.userId, userId));
    }

    // Create transaction record
    await db.insert(transactions).values({
      userId,
      type: currency === 'GC' ? 'DEPOSIT' : 'SWEEPS_DEPOSIT',
      amount,
      meta: { 
        reason: reason || `Admin recharge: ${amount} ${currency}`, 
        adminId: req.admin!.id,
        currency,
        source: 'admin_manual_add'
      },
    });

    await logAdminAction(
      req.admin!.id,
      'RECHARGE_USER',
      userId,
      { amount, reason, currency },
      req.ip,
      req.headers['user-agent']
    );

    res.json({ success: true, message: `Added ${amount} ${currency} to user balance` });
  } catch (error) {
    console.error('Error recharging user:', error);
    res.status(500).json({ error: 'Failed to recharge user' });
  }
});

// Redeem user balance
adminRouter.post('/users/:userId/redeem', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { amount, reason, currency = 'GC' } = req.body; // currency: 'GC' | 'SC'
    const userId = req.params.userId;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!['GC', 'SC'].includes(currency)) {
      return res.status(400).json({ error: 'Currency must be GC or SC' });
    }

    // Check if user has enough balance
    const [balance] = await db
      .select()
      .from(balances)
      .where(eq(balances.userId, userId))
      .limit(1);

    if (!balance) {
      return res.status(404).json({ error: 'Balance not found' });
    }

    // Check sufficient balance for currency type
    if (currency === 'GC' && balance.available < amount) {
      return res.status(400).json({ error: 'Insufficient GC balance' });
    }
    
    const scTotal = parseFloat(String(balance.sweepsCashTotal || 0));
    if (currency === 'SC' && scTotal < amount) {
      return res.status(400).json({ error: 'Insufficient SC balance' });
    }

    // Update balance based on currency
    if (currency === 'GC') {
      await db
        .update(balances)
        .set({
          available: sql`${balances.available} - ${amount}`,
        })
        .where(eq(balances.userId, userId));
    } else {
      // SC update
      await db
        .update(balances)
        .set({
          sweepsCashTotal: sql`${balances.sweepsCashTotal} - ${amount}`,
          sweepsCashRedeemable: sql`${balances.sweepsCashRedeemable} - ${amount}`,
        })
        .where(eq(balances.userId, userId));
    }

    // Create transaction record
    await db.insert(transactions).values({
      userId,
      type: currency === 'GC' ? 'WITHDRAW' : 'SWEEPS_WITHDRAWAL',
      amount: -amount,
      meta: { 
        reason: reason || `Admin redemption: ${amount} ${currency}`, 
        adminId: req.admin!.id,
        currency,
        source: 'admin_manual_remove'
      },
    });

    await logAdminAction(
      req.admin!.id,
      'REDEEM_USER',
      userId,
      { amount, reason, currency },
      req.ip,
      req.headers['user-agent']
    );

    res.json({ success: true, message: `Removed ${amount} ${currency} from user balance` });
  } catch (error) {
    console.error('Error redeeming user balance:', error);
    res.status(500).json({ error: 'Failed to redeem user balance' });
  }
});

// Reset user password
adminRouter.post('/users/:userId/reset-password', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.params.userId;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Note: Users table doesn't have a password field - users authenticate via Telegram
    // This endpoint might not be applicable for regular users
    return res.status(400).json({ error: 'Password reset not available for regular users' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Get user transactions
adminRouter.get('/users/:userId/transactions', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const transactionsList = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(transactionsList);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get all transactions with filtering
adminRouter.get('/transactions', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const type = req.query.type as string;

    let whereConditions = [];
    if (dateFrom) {
      whereConditions.push(gte(transactions.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      whereConditions.push(lte(transactions.createdAt, new Date(dateTo)));
    }
    if (type) {
      whereConditions.push(eq(transactions.type, type as any));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [transactionsList, totalCountResult] = await Promise.all([
      db
        .select({
          id: transactions.id,
          userId: transactions.userId,
          username: users.username,
          type: transactions.type,
          amount: transactions.amount,
          meta: transactions.meta,
          createdAt: transactions.createdAt,
        })
        .from(transactions)
        .leftJoin(users, eq(transactions.userId, users.id))
        .where(whereClause)
        .orderBy(desc(transactions.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(transactions)
        .where(whereClause)
    ]);

    // Calculate totals
    const [totals] = await db
      .select({
        totalDeposits: sql<number>`COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0)`,
        totalWithdrawals: sql<number>`COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0)`,
        totalBets: sql<number>`COALESCE(SUM(CASE WHEN type = 'bet' THEN amount ELSE 0 END), 0)`,
        totalWins: sql<number>`COALESCE(SUM(CASE WHEN type = 'win' THEN amount ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(whereClause);

    res.json({
      transactions: transactionsList,
      total: totalCountResult[0].count,
      page,
      totalPages: Math.ceil(totalCountResult[0].count / limit),
      totals,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get admin activity logs
adminRouter.get('/logs', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const logs = await db
      .select({
        id: adminLogs.id,
        adminUsername: admins.username,
        action: adminLogs.action,
        targetUserId: adminLogs.targetUserId,
        details: adminLogs.details,
        ipAddress: adminLogs.ipAddress,
        createdAt: adminLogs.createdAt,
      })
      .from(adminLogs)
      .leftJoin(admins, eq(adminLogs.adminId, admins.id))
      .orderBy(desc(adminLogs.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Get all game RTP settings
adminRouter.get('/game-settings', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    // Get settings from the game_settings table we created
    const settings = await db.execute(sql`
      SELECT * FROM game_settings ORDER BY game_name
    `);
    
    res.json(settings.rows || []);
  } catch (error) {
    console.error('Error fetching game settings:', error);
    res.status(500).json({ error: 'Failed to fetch game settings' });
  }
});

// Update specific game RTP settings
adminRouter.put('/game-settings/:gameName/rtp', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { gameName } = req.params;
    const { rtp, minBet, maxBet, isEnabled } = req.body;
    
    // Validate RTP value
    if (rtp && (rtp < 80 || rtp > 99.99)) {
      return res.status(400).json({ error: 'RTP must be between 80% and 99.99%' });
    }
    
    await db.execute(sql`
      UPDATE game_settings 
      SET 
        rtp_value = COALESCE(${rtp}, rtp_value),
        min_bet = COALESCE(${minBet}, min_bet),
        max_bet = COALESCE(${maxBet}, max_bet),
        is_enabled = COALESCE(${isEnabled}, is_enabled),
        updated_at = NOW()
      WHERE game_name = ${gameName}
    `);
    
    await logAdminAction(
      req.admin!.id,
      'UPDATE_GAME_RTP',
      undefined,
      { gameName, rtp, minBet, maxBet, isEnabled },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating RTP:', error);
    res.status(500).json({ error: 'Failed to update RTP settings' });
  }
});

// Advanced game configuration endpoint
adminRouter.put('/game-settings/:gameName/advanced', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { gameName } = req.params;
    const { 
      rtp, 
      minBet, 
      maxBet, 
      isEnabled, 
      theme, 
      multipliers, 
      specialFeatures, 
      riskSettings 
    } = req.body;
    
    // Validate RTP value
    if (rtp && (rtp < 80 || rtp > 99.99)) {
      return res.status(400).json({ error: 'RTP must be between 80% and 99.99%' });
    }

    // Update game settings in database
    await db.execute(sql`
      UPDATE game_settings 
      SET 
        rtp_value = COALESCE(${rtp}, rtp_value),
        min_bet = COALESCE(${minBet}, min_bet),
        max_bet = COALESCE(${maxBet}, max_bet),
        is_enabled = COALESCE(${isEnabled}, is_enabled),
        house_edge = COALESCE(${rtp ? 100 - rtp : null}, house_edge),
        updated_at = NOW()
      WHERE game_name = ${gameName}
    `);

    // Store advanced settings in a separate table or JSON column
    // For now, we'll log them as admin actions
    await logAdminAction(
      req.admin!.id,
      'UPDATE_ADVANCED_GAME_CONFIG',
      undefined,
      { 
        gameName, 
        rtp, 
        minBet, 
        maxBet, 
        isEnabled, 
        theme, 
        multipliers, 
        specialFeatures, 
        riskSettings 
      },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating advanced game configuration:', error);
    res.status(500).json({ error: 'Failed to update advanced game configuration' });
  }
});

// Get financial summary
adminRouter.get('/financial-summary', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const summary = await db.execute(sql`
      SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN profit < 0 THEN ABS(profit) ELSE 0 END) as daily_revenue,
        SUM(CASE WHEN profit > 0 THEN profit ELSE 0 END) as daily_payouts,
        COUNT(DISTINCT user_id) as unique_players,
        COUNT(*) as total_bets
      FROM bets
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ error: 'Failed to fetch financial summary' });
  }
});

// Update game RTP settings
adminRouter.put('/game-settings/:gameName', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { gameName } = req.params;
    const { rtpMode } = req.body;
    
    if (!['HIGH', 'MEDIUM', 'LOW'].includes(rtpMode)) {
      return res.status(400).json({ error: 'Invalid RTP mode' });
    }
    
    await storage.updateGameSettings(gameName, rtpMode, req.admin!.id);
    
    // Log the action
    await logAdminAction(
      req.admin!.id,
      'UPDATE_GAME_RTP',
      undefined,
      { gameName, rtpMode },
      req.ip,
      req.headers['user-agent']
    );
    
    const updatedSettings = await storage.getGameSettings(gameName);
    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating game settings:', error);
    res.status(500).json({ error: 'Failed to update game settings' });
  }
});

// Get dashboard statistics
adminRouter.get('/dashboard/stats', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    // Build date conditions
    let dateConditionBets = sql`TRUE`;
    let dateConditionTransactions = sql`TRUE`;
    let dateConditionUsers = sql`TRUE`;
    
    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom as string);
      const toDate = new Date(dateTo as string);
      dateConditionBets = sql`created_at >= ${fromDate} AND created_at <= ${toDate}`;
      dateConditionTransactions = sql`created_at >= ${fromDate} AND created_at <= ${toDate}`;
      dateConditionUsers = sql`created_at >= ${fromDate} AND created_at <= ${toDate}`;
    }
    
    const stats = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE ${dateConditionUsers}) as total_users,
        (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '24 hours') as new_users_24h,
        (SELECT COUNT(*) FROM users WHERE is_in_self_exclusion = true) as banned_users,
        (SELECT COUNT(*) FROM bets WHERE ${dateConditionBets}) as bets_count,
        (SELECT COUNT(*) FROM bets WHERE created_at > NOW() - INTERVAL '24 hours') as bets_24h,
        (SELECT COALESCE(SUM(amount), 0) FROM bets WHERE ${dateConditionBets}) as volume,
        (SELECT COALESCE(SUM(amount), 0) FROM bets WHERE created_at > NOW() - INTERVAL '24 hours') as volume_24h,
        (SELECT COALESCE(SUM(profit), 0) FROM bets WHERE ${dateConditionBets}) as profit,
        (SELECT COALESCE(SUM(profit), 0) FROM bets WHERE created_at > NOW() - INTERVAL '24 hours') as profit_24h,
        (SELECT COUNT(DISTINCT user_id) FROM bets WHERE created_at > NOW() - INTERVAL '24 hours') as active_users_24h,
        (SELECT COALESCE(SUM(CASE WHEN profit < 0 THEN ABS(profit) ELSE 0 END), 0) FROM bets WHERE ${dateConditionBets}) as total_revenue,
        (SELECT COALESCE(SUM(CASE WHEN profit > 0 THEN profit ELSE 0 END), 0) FROM bets WHERE ${dateConditionBets}) as total_payouts,
        (SELECT COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' THEN ABS(amount) ELSE 0 END), 0) FROM transactions WHERE ${dateConditionTransactions}) as total_withdrawals,
        (SELECT COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END), 0) FROM transactions WHERE ${dateConditionTransactions}) as total_deposits
    `);
    
    const statsData = (stats[0] || {}) as any;
    // Calculate net profit (revenue - payouts - operational expenses estimate)
    const operationalExpenses = (statsData?.total_withdrawals || 0) * 0.03; // 3% processing fees estimate
    
    res.json({
      ...statsData,
      net_profit: (statsData?.total_revenue || 0) - (statsData?.total_payouts || 0) - operationalExpenses,
      operational_expenses: operationalExpenses
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get bot configuration
adminRouter.get('/bot-config', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    res.json({ 
      hasToken: !!botToken,
      tokenPrefix: botToken ? botToken.substring(0, 10) + '...' : null 
    });
  } catch (error) {
    console.error('Error fetching bot config:', error);
    res.status(500).json({ error: 'Failed to fetch bot configuration' });
  }
});

// Update bot token
adminRouter.post('/bot-config/update', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    // Update environment variable
    process.env.TELEGRAM_BOT_TOKEN = token;
    
    // Reinitialize bot with new token
    try {
      await initializeBot();
      
      // Log the action
      await logAdminAction(
        req.admin!.id,
        'UPDATE_BOT_TOKEN',
        undefined,
        { tokenPrefix: token.substring(0, 10) + '...' },
        req.ip,
        req.headers['user-agent']
      );
      
      res.json({ success: true, message: 'Bot token updated successfully' });
    } catch (botError) {
      process.env.TELEGRAM_BOT_TOKEN = ''; // Reset on error
      res.status(400).json({ error: 'Invalid bot token' });
    }
  } catch (error) {
    console.error('Error updating bot token:', error);
    res.status(500).json({ error: 'Failed to update bot token' });
  }
});

// Toggle all games on/off
adminRouter.post('/games/toggle-all', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { enabled } = req.body;
    
    await db.execute(sql`
      UPDATE game_settings 
      SET is_enabled = ${enabled},
          updated_at = NOW()
    `);
    
    await logAdminAction(
      req.admin!.id,
      enabled ? 'ENABLE_ALL_GAMES' : 'DISABLE_ALL_GAMES',
      undefined,
      { enabled },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ success: true, message: `All games ${enabled ? 'enabled' : 'disabled'}` });
  } catch (error) {
    console.error('Error toggling games:', error);
    res.status(500).json({ error: 'Failed to toggle games' });
  }
});

// Send message to community chat
adminRouter.post('/chat/send-message', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { message, type = 'announcement' } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Store the message in chat_messages table with admin sender
    const chatMessageResult = await db.execute(sql`
      INSERT INTO chat_messages (user_id, username, message, is_admin, message_type)
      VALUES (
        ${req.admin!.id},
        'Admin',
        ${message},
        true,
        ${type}
      )
      RETURNING *
    `);
    
    // Broadcast to all connected WebSocket clients
    const broadcastData = {
      type: 'chat_message',
      message: {
        id: chatMessageResult[0].id,
        username: 'Admin',
        message: message,
        isAdmin: true,
        messageType: type,
        timestamp: Date.now()
      }
    };
    
    // Broadcast via the global function
    if ((global as any).broadcastToAll) {
      (global as any).broadcastToAll(broadcastData);
    }
    
    await logAdminAction(
      req.admin!.id,
      'SEND_CHAT_MESSAGE',
      undefined,
      { message: message.substring(0, 100) },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ success: true, message: 'Message sent to community chat' });
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Create initial admin user (only if no admins exist)
adminRouter.post('/setup', async (req, res) => {
  try {
    const adminCount = await db.select({ count: sql<number>`count(*)` }).from(admins);
    
    if (adminCount[0].count > 0) {
      return res.status(400).json({ error: 'Admin already exists' });
    }

    const { username, password, email, fullName } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const admin = await createAdminUser(username, password, 'ADMIN');
    res.json({ success: true, message: 'Admin user created' });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// Bonus Management Endpoints
adminRouter.get('/bonus-stats', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const stats = await storage.getAdminBonusStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching bonus stats:', error);
    res.status(500).json({ error: 'Failed to fetch bonus stats' });
  }
});

adminRouter.get('/bonus-activity', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const activity = await storage.getAdminBonusActivity(limit);
    res.json(activity);
  } catch (error) {
    console.error('Error fetching bonus activity:', error);
    res.status(500).json({ error: 'Failed to fetch bonus activity' });
  }
});

// Footer Links Management Endpoints
adminRouter.get('/footer-links', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const links = await storage.getAllFooterLinks();
    res.json(links);
  } catch (error) {
    console.error('Error fetching footer links:', error);
    res.status(500).json({ error: 'Failed to fetch footer links' });
  }
});

adminRouter.post('/footer-links', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { section, title, url, orderIndex, isActive } = req.body;
    
    if (!section || !title) {
      return res.status(400).json({ error: 'Section and title are required' });
    }
    
    const link = await storage.createFooterLink({
      section,
      title,
      url,
      orderIndex: orderIndex ?? 0,
      isActive: isActive ?? true
    });
    
    await logAdminAction(
      req.admin!.id,
      'CREATE_FOOTER_LINK',
      undefined,
      { section, title, url },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json(link);
  } catch (error) {
    console.error('Error creating footer link:', error);
    res.status(500).json({ error: 'Failed to create footer link' });
  }
});

adminRouter.put('/footer-links/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const linkId = parseInt(req.params.id);
    const updates = req.body;
    
    await storage.updateFooterLink(linkId, updates);
    
    await logAdminAction(
      req.admin!.id,
      'UPDATE_FOOTER_LINK',
      undefined,
      { linkId, updates },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating footer link:', error);
    res.status(500).json({ error: 'Failed to update footer link' });
  }
});

adminRouter.delete('/footer-links/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const linkId = parseInt(req.params.id);
    
    await storage.deleteFooterLink(linkId);
    
    await logAdminAction(
      req.admin!.id,
      'DELETE_FOOTER_LINK',
      undefined,
      { linkId },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting footer link:', error);
    res.status(500).json({ error: 'Failed to delete footer link' });
  }
});

// Site Settings Management Endpoints
adminRouter.get('/site-settings', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const settings = await storage.getAllSiteSettings();
    const settingsMap: Record<string, string> = {};
    
    settings.forEach(setting => {
      settingsMap[setting.settingKey] = setting.settingValue;
    });
    
    res.json(settingsMap);
  } catch (error) {
    console.error('Error fetching site settings:', error);
    res.status(500).json({ error: 'Failed to fetch site settings' });
  }
});

// Upload banner image
adminRouter.post('/site-settings/banner', authenticateAdmin, bannerUpload.single('banner'), async (req: AdminRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const adminId = req.admin!.id;
    const bannerPath = `/uploads/banners/${req.file.filename}`;
    
    // Save the banner path to site settings
    await storage.setSiteSetting('banner_image', bannerPath, adminId);
    
    // Log the admin action
    await logAdminAction(
      adminId,
      'UPDATE_BANNER_IMAGE',
      undefined,
      { oldPath: req.body.oldPath, newPath: bannerPath },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ 
      success: true, 
      bannerUrl: bannerPath,
      message: 'Banner uploaded successfully' 
    });
  } catch (error) {
    console.error('Error uploading banner:', error);
    res.status(500).json({ error: 'Failed to upload banner' });
  }
});

// Update site settings (generic)
adminRouter.put('/site-settings', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { settings } = req.body;
    const adminId = req.admin!.id;
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid settings data' });
    }
    
    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      await storage.setSiteSetting(key, String(value), adminId);
    }
    
    await logAdminAction(
      adminId,
      'UPDATE_SITE_SETTINGS',
      undefined,
      { settings },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating site settings:', error);
    res.status(500).json({ error: 'Failed to update site settings' });
  }
});

// Redemption Code Management Routes

// Create redemption code
adminRouter.post('/redemption-codes', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const {
      code,
      description,
      maxUses,
      perUserLimit,
      expiresAt,
      gcAmount,
      scAmount,
      bonusType,
      bonusPercentage,
      minVipLevel,
      notes,
      scWageringMultiplier
    } = req.body;

    // Enhanced validation with proper number and date checking
    if (!code || typeof code !== 'string' || code.length < 3 || code.length > 50) {
      return res.status(400).json({ error: 'Code must be between 3 and 50 characters long' });
    }

    if (!description || typeof description !== 'string' || description.length > 500) {
      return res.status(400).json({ error: 'Description is required and must be under 500 characters' });
    }

    // Validate numeric fields with proper NaN checks
    const maxUsesNum = Number(maxUses);
    const perUserLimitNum = Number(perUserLimit);
    const gcAmountNum = gcAmount ? Number(gcAmount) : null;
    const scAmountNum = scAmount ? Number(scAmount) : null;
    const bonusPercentageNum = bonusPercentage ? Number(bonusPercentage) : null;
    const scWageringMultiplierNum = scWageringMultiplier ? Number(scWageringMultiplier) : 0;

    if (!Number.isFinite(maxUsesNum) || maxUsesNum <= 0 || maxUsesNum > 1000000) {
      return res.status(400).json({ error: 'Max uses must be a valid number between 1 and 1,000,000' });
    }

    if (!Number.isFinite(perUserLimitNum) || perUserLimitNum <= 0 || perUserLimitNum > maxUsesNum) {
      return res.status(400).json({ error: 'Per user limit must be a valid number between 1 and max uses' });
    }

    if (gcAmountNum !== null && (!Number.isFinite(gcAmountNum) || gcAmountNum < 0 || gcAmountNum > 1000000)) {
      return res.status(400).json({ error: 'GC amount must be a valid number between 0 and 1,000,000' });
    }

    if (scAmountNum !== null && (!Number.isFinite(scAmountNum) || scAmountNum < 0 || scAmountNum > 100000)) {
      return res.status(400).json({ error: 'SC amount must be a valid number between 0 and 100,000' });
    }

    if (!gcAmountNum && !scAmountNum) {
      return res.status(400).json({ error: 'Either GC amount or SC amount must be specified' });
    }

    if (bonusPercentageNum !== null && (!Number.isFinite(bonusPercentageNum) || bonusPercentageNum < 0 || bonusPercentageNum > 500)) {
      return res.status(400).json({ error: 'Bonus percentage must be between 0 and 500' });
    }

    if (!Number.isFinite(scWageringMultiplierNum) || scWageringMultiplierNum < 0 || scWageringMultiplierNum > 100) {
      return res.status(400).json({ error: 'SC wagering multiplier must be between 0 and 100' });
    }

    // Validate expiration date if provided
    let expiresAtDate = null;
    if (expiresAt) {
      expiresAtDate = new Date(expiresAt);
      if (isNaN(expiresAtDate.getTime()) || expiresAtDate <= new Date()) {
        return res.status(400).json({ error: 'Expiration date must be a valid future date' });
      }
    }

    // Check if code already exists
    const existingCode = await storage.getRedemptionCodeByCode(code.toUpperCase());
    if (existingCode) {
      return res.status(400).json({ error: 'Code already exists' });
    }

    const redemptionCodeData: InsertRedemptionCode = {
      code: code.toUpperCase(),
      description: description.trim(),
      maxUses: maxUsesNum,
      perUserLimit: perUserLimitNum,
      expiresAt: expiresAtDate,
      gcAmount: gcAmountNum,
      scAmount: scAmountNum,
      bonusType: bonusType || null,
      bonusPercentage: bonusPercentageNum,
      minVipLevel: minVipLevel || null,
      createdBy: req.admin!.id,
      notes: notes ? notes.trim() : null,
      scWageringMultiplier: scWageringMultiplierNum
    };

    const newCode = await storage.createRedemptionCode(redemptionCodeData);

    await logAdminAction(
      req.admin!.id,
      'CREATE_REDEMPTION_CODE',
      undefined,
      { codeId: newCode.id, code: newCode.code, description: newCode.description },
      req.ip,
      req.headers['user-agent']
    );

    res.json({ success: true, code: newCode });
  } catch (error) {
    console.error('Error creating redemption code:', error);
    res.status(500).json({ error: 'Failed to create redemption code' });
  }
});

// List redemption codes
adminRouter.get('/redemption-codes', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { limit = '50', adminId } = req.query;
    
    const codes = await storage.listRedemptionCodes(
      adminId as string | undefined,
      parseInt(limit as string)
    );

    res.json({ codes });
  } catch (error) {
    console.error('Error listing redemption codes:', error);
    res.status(500).json({ error: 'Failed to list redemption codes' });
  }
});

// Deactivate redemption code
adminRouter.patch('/redemption-codes/:id/deactivate', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const codeId = parseInt(id);

    if (isNaN(codeId)) {
      return res.status(400).json({ error: 'Invalid code ID' });
    }

    await storage.deactivateRedemptionCode(codeId);

    await logAdminAction(
      req.admin!.id,
      'DEACTIVATE_REDEMPTION_CODE',
      undefined,
      { codeId },
      req.ip,
      req.headers['user-agent']
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deactivating redemption code:', error);
    res.status(500).json({ error: 'Failed to deactivate redemption code' });
  }
});

// Get redemption code statistics
adminRouter.get('/redemption-codes/stats', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    // Get basic stats with proper null handling
    const totalCodesResult = await db.select({
      totalCodes: sql<number>`COUNT(*)`
    }).from(redemptionCodes);

    const activeCodesResult = await db.select({
      activeCodes: sql<number>`COUNT(*)`
    }).from(redemptionCodes)
    .where(eq(redemptionCodes.isActive, true));

    const totalRedemptionsResult = await db.select({
      totalRedemptions: sql<number>`COUNT(*)`
    }).from(redemptionCodeUsages);

    const totalGcCreditedResult = await db.select({
      totalGcCredited: sql<string>`COALESCE(SUM(gc_credited), 0)`
    }).from(redemptionCodeUsages);

    const totalScCreditedResult = await db.select({
      totalScCredited: sql<string>`COALESCE(SUM(sc_credited), 0)`
    }).from(redemptionCodeUsages);

    // Get top codes by usage
    const topCodesByUsage = await db.select({
      code: redemptionCodes.code,
      notes: redemptionCodes.notes,
      usedCount: redemptionCodes.usedCount,
      maxUses: redemptionCodes.maxUses
    })
    .from(redemptionCodes)
    .orderBy(desc(redemptionCodes.usedCount))
    .limit(10);

    // Get recent redemptions
    const recentRedemptions = await db.select({
      userId: redemptionCodeUsages.userId,
      code: redemptionCodes.code,
      gcCredited: redemptionCodeUsages.gcCredited,
      scCredited: redemptionCodeUsages.scCredited,
      redeemedAt: redemptionCodeUsages.redeemedAt
    })
    .from(redemptionCodeUsages)
    .innerJoin(redemptionCodes, eq(redemptionCodeUsages.codeId, redemptionCodes.id))
    .orderBy(desc(redemptionCodeUsages.redeemedAt))
    .limit(20);

    const stats = {
      totalCodes: Number(totalCodesResult[0]?.totalCodes || 0),
      activeCodes: Number(activeCodesResult[0]?.activeCodes || 0),
      totalRedemptions: Number(totalRedemptionsResult[0]?.totalRedemptions || 0),
      totalGcCredited: Number(totalGcCreditedResult[0]?.totalGcCredited || 0),
      totalScCredited: parseFloat(totalScCreditedResult[0]?.totalScCredited || '0'),
      topCodesByUsage: topCodesByUsage || [],
      recentRedemptions: recentRedemptions || []
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching redemption code stats:', error);
    res.status(500).json({ error: 'Failed to fetch redemption code statistics' });
  }
});

// CSV Export Endpoints

// Advanced Analytics: Revenue Trending
adminRouter.get('/analytics/revenue-trends', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { period = 'daily', dateFrom, dateTo } = req.query;
    
    const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo as string) : new Date();
    
    let dateFormat: string;
    switch (period) {
      case 'hourly':
        dateFormat = `DATE_TRUNC('hour', ${bets.createdAt})`;
        break;
      case 'weekly':
        dateFormat = `DATE_TRUNC('week', ${bets.createdAt})`;
        break;
      case 'monthly':
        dateFormat = `DATE_TRUNC('month', ${bets.createdAt})`;
        break;
      default: // daily
        dateFormat = `DATE(${bets.createdAt})`;
    }
    
    const trends = await db.execute(sql`
      SELECT 
        ${sql.raw(dateFormat)} as period,
        COUNT(*) as bet_count,
        COUNT(DISTINCT user_id) as unique_players,
        COALESCE(SUM(amount), 0) as total_volume,
        COALESCE(SUM(CASE WHEN profit < 0 THEN ABS(profit) ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN profit > 0 THEN profit ELSE 0 END), 0) as total_payouts,
        COALESCE(AVG(amount), 0) as avg_bet_size
      FROM ${bets}
      WHERE created_at >= ${fromDate} AND created_at <= ${toDate}
      GROUP BY period
      ORDER BY period ASC
    `);
    
    res.json(trends);
  } catch (error) {
    console.error('Error fetching revenue trends:', error);
    res.status(500).json({ error: 'Failed to fetch revenue trends' });
  }
});

// Advanced Analytics: Player Retention Cohorts
adminRouter.get('/analytics/player-retention', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { period = 'daily' } = req.query;
    
    // Calculate retention for the past 12 cohorts
    const cohorts = await db.execute(sql`
      WITH user_cohorts AS (
        SELECT 
          id as user_id,
          DATE(created_at) as cohort_date
        FROM ${users}
        WHERE created_at >= NOW() - INTERVAL '90 days'
      ),
      user_activity AS (
        SELECT DISTINCT
          user_id,
          DATE(created_at) as activity_date
        FROM ${bets}
        WHERE created_at >= NOW() - INTERVAL '90 days'
      ),
      cohort_sizes AS (
        SELECT 
          cohort_date,
          COUNT(*) as cohort_size
        FROM user_cohorts
        GROUP BY cohort_date
      ),
      retention_data AS (
        SELECT 
          uc.cohort_date,
          DATE_PART('day', ua.activity_date - uc.cohort_date) as days_since_join,
          COUNT(DISTINCT uc.user_id) as active_users
        FROM user_cohorts uc
        LEFT JOIN user_activity ua ON uc.user_id = ua.user_id
        WHERE ua.activity_date IS NOT NULL
        GROUP BY uc.cohort_date, days_since_join
      )
      SELECT 
        rd.cohort_date,
        rd.days_since_join,
        rd.active_users,
        cs.cohort_size,
        ROUND((rd.active_users::numeric / cs.cohort_size::numeric * 100), 2) as retention_rate
      FROM retention_data rd
      JOIN cohort_sizes cs ON rd.cohort_date = cs.cohort_date
      ORDER BY rd.cohort_date DESC, rd.days_since_join ASC
    `);
    
    res.json(cohorts);
  } catch (error) {
    console.error('Error fetching player retention:', error);
    res.status(500).json({ error: 'Failed to fetch player retention data' });
  }
});

// Advanced Analytics: Game Performance Trends
adminRouter.get('/analytics/game-performance', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo as string) : new Date();
    
    const gameStats = await db.execute(sql`
      SELECT 
        game,
        COUNT(*) as total_bets,
        COUNT(DISTINCT user_id) as unique_players,
        COALESCE(SUM(amount), 0) as total_volume,
        COALESCE(SUM(CASE WHEN profit < 0 THEN ABS(profit) ELSE 0 END), 0) as house_revenue,
        COALESCE(SUM(CASE WHEN profit > 0 THEN profit ELSE 0 END), 0) as player_winnings,
        COALESCE(AVG(amount), 0) as avg_bet,
        ROUND(
          COALESCE(SUM(CASE WHEN profit < 0 THEN ABS(profit) ELSE 0 END), 0)::numeric / 
          NULLIF(SUM(amount), 0)::numeric * 100, 
          2
        ) as house_edge_pct
      FROM ${bets}
      WHERE created_at >= ${fromDate} AND created_at <= ${toDate}
      GROUP BY game
      ORDER BY total_volume DESC
    `);
    
    // Get daily trends for top 5 games
    const topGames = (gameStats as any[]).slice(0, 5).map(g => g.game);
    
    const dailyTrends = await db.execute(sql`
      SELECT 
        DATE(created_at) as date,
        game,
        COUNT(*) as bets,
        COALESCE(SUM(amount), 0) as volume
      FROM ${bets}
      WHERE created_at >= ${fromDate} 
        AND created_at <= ${toDate}
        AND game = ANY(${topGames}::text[])
      GROUP BY DATE(created_at), game
      ORDER BY date ASC, game
    `);
    
    res.json({
      overall: gameStats,
      trends: dailyTrends
    });
  } catch (error) {
    console.error('Error fetching game performance:', error);
    res.status(500).json({ error: 'Failed to fetch game performance data' });
  }
});

// Advanced Analytics: Real-time Monitoring
adminRouter.get('/analytics/realtime', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Live players (active in last 5 minutes)
    const [livePlayersResult] = await db
      .select({ count: sql<number>`COUNT(DISTINCT user_id)` })
      .from(bets)
      .where(gte(bets.createdAt, fiveMinAgo));
    
    // Bets per minute
    const [betsPerMinResult] = await db
      .select({ count: count() })
      .from(bets)
      .where(gte(bets.createdAt, fiveMinAgo));
    
    // Current hour stats
    const [hourStatsResult] = await db.execute(sql`
      SELECT 
        COUNT(*) as bets,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(CASE WHEN profit < 0 THEN ABS(profit) ELSE 0 END), 0) as revenue
      FROM ${bets}
      WHERE created_at >= ${oneHourAgo}
    `);
    
    // Today's stats
    const [todayStatsResult] = await db.execute(sql`
      SELECT 
        COUNT(*) as bets,
        COUNT(DISTINCT user_id) as players,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(CASE WHEN profit < 0 THEN ABS(profit) ELSE 0 END), 0) as revenue
      FROM ${bets}
      WHERE created_at >= ${oneDayAgo}
    `);
    
    // Biggest wins in last hour
    const biggestWins = await db
      .select({
        id: bets.id,
        username: users.username,
        game: bets.game,
        betAmount: bets.betAmount,
        payout: bets.payout,
        profit: bets.profit,
        createdAt: bets.createdAt
      })
      .from(bets)
      .leftJoin(users, eq(bets.userId, users.id))
      .where(and(
        gte(bets.createdAt, oneHourAgo),
        sql`profit > 0`
      ))
      .orderBy(desc(bets.profit))
      .limit(10);
    
    // Active games distribution
    const activeGames = await db.execute(sql`
      SELECT 
        game,
        COUNT(*) as bets,
        COUNT(DISTINCT user_id) as players
      FROM ${bets}
      WHERE created_at >= ${fiveMinAgo}
      GROUP BY game
      ORDER BY bets DESC
    `);
    
    res.json({
      live: {
        activePlayers: livePlayersResult.count || 0,
        betsPerMinute: Math.floor((betsPerMinResult.count || 0) / 5),
        activeGames: activeGames
      },
      currentHour: hourStatsResult[0] || { bets: 0, volume: 0, revenue: 0 },
      today: todayStatsResult[0] || { bets: 0, players: 0, volume: 0, revenue: 0 },
      biggestWins: biggestWins
    });
  } catch (error) {
    console.error('Error fetching realtime analytics:', error);
    res.status(500).json({ error: 'Failed to fetch realtime analytics' });
  }
});

// Export users to CSV
adminRouter.get('/export/users', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const usersList = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        telegramId: users.telegramId,
        vipLevel: users.vipLevel,
        isInSelfExclusion: users.isInSelfExclusion,
        createdAt: users.createdAt,
        balance: balances.available,
        sweepsCashTotal: balances.sweepsCashTotal,
      })
      .from(users)
      .leftJoin(balances, eq(users.id, balances.userId))
      .orderBy(desc(users.createdAt));

    const headers = ['id', 'username', 'firstName', 'lastName', 'telegramId', 'vipLevel', 'isInSelfExclusion', 'createdAt', 'balance', 'sweepsCashTotal'];
    const csv = convertToCSV(usersList, headers);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=users-export-${Date.now()}.csv`);
    res.send(csv);

    await logAdminAction(
      req.admin!.id,
      'EXPORT_USERS_CSV',
      null,
      { recordCount: usersList.length },
      req.ip,
      req.headers['user-agent']
    );
  } catch (error) {
    console.error('Error exporting users to CSV:', error);
    res.status(500).json({ error: 'Failed to export users' });
  }
});

// Export transactions to CSV
adminRouter.get('/export/transactions', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    
    let whereConditions = [];
    if (dateFrom) {
      whereConditions.push(gte(transactions.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      whereConditions.push(lte(transactions.createdAt, new Date(dateTo)));
    }
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    const transactionsList = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        username: users.username,
        type: transactions.type,
        amount: transactions.amount,
        meta: transactions.meta,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .where(whereClause)
      .orderBy(desc(transactions.createdAt))
      .limit(10000); // Limit for performance

    const headers = ['id', 'userId', 'username', 'type', 'amount', 'meta', 'createdAt'];
    const csv = convertToCSV(transactionsList, headers);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions-export-${Date.now()}.csv`);
    res.send(csv);

    await logAdminAction(
      req.admin!.id,
      'EXPORT_TRANSACTIONS_CSV',
      null,
      { recordCount: transactionsList.length },
      req.ip,
      req.headers['user-agent']
    );
  } catch (error) {
    console.error('Error exporting transactions to CSV:', error);
    res.status(500).json({ error: 'Failed to export transactions' });
  }
});

// Export game history/bets to CSV
adminRouter.get('/export/bets', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    
    let whereConditions = [];
    if (dateFrom) {
      whereConditions.push(gte(bets.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      whereConditions.push(lte(bets.createdAt, new Date(dateTo)));
    }
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    const betsList = await db
      .select({
        id: bets.id,
        userId: bets.userId,
        username: users.username,
        gameType: bets.gameType,
        betAmount: bets.betAmount,
        result: bets.result,
        payout: bets.payout,
        profit: bets.profit,
        createdAt: bets.createdAt,
      })
      .from(bets)
      .leftJoin(users, eq(bets.userId, users.id))
      .where(whereClause)
      .orderBy(desc(bets.createdAt))
      .limit(10000); // Limit for performance

    const headers = ['id', 'userId', 'username', 'gameType', 'betAmount', 'result', 'payout', 'profit', 'createdAt'];
    const csv = convertToCSV(betsList, headers);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=bets-export-${Date.now()}.csv`);
    res.send(csv);

    await logAdminAction(
      req.admin!.id,
      'EXPORT_BETS_CSV',
      null,
      { recordCount: betsList.length },
      req.ip,
      req.headers['user-agent']
    );
  } catch (error) {
    console.error('Error exporting bets to CSV:', error);
    res.status(500).json({ error: 'Failed to export bets' });
  }
});

// Export redemption codes to CSV
adminRouter.get('/export/redemption-codes', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const codesList = await db
      .select({
        id: redemptionCodes.id,
        code: redemptionCodes.code,
        gcAmount: redemptionCodes.gcAmount,
        scAmount: redemptionCodes.scAmount,
        maxUses: redemptionCodes.maxUses,
        usedCount: redemptionCodes.usedCount,
        expiresAt: redemptionCodes.expiresAt,
        isActive: redemptionCodes.isActive,
        notes: redemptionCodes.notes,
        createdAt: redemptionCodes.createdAt,
      })
      .from(redemptionCodes)
      .orderBy(desc(redemptionCodes.createdAt));

    const headers = ['id', 'code', 'gcAmount', 'scAmount', 'maxUses', 'usedCount', 'expiresAt', 'isActive', 'notes', 'createdAt'];
    const csv = convertToCSV(codesList, headers);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=redemption-codes-export-${Date.now()}.csv`);
    res.send(csv);

    await logAdminAction(
      req.admin!.id,
      'EXPORT_REDEMPTION_CODES_CSV',
      null,
      { recordCount: codesList.length },
      req.ip,
      req.headers['user-agent']
    );
  } catch (error) {
    console.error('Error exporting redemption codes to CSV:', error);
    res.status(500).json({ error: 'Failed to export redemption codes' });
  }
});

// Export admin logs to CSV
adminRouter.get('/export/admin-logs', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const logsList = await db
      .select({
        id: adminLogs.id,
        adminId: adminLogs.adminId,
        adminUsername: admins.username,
        action: adminLogs.action,
        targetId: adminLogs.targetId,
        details: adminLogs.details,
        ipAddress: adminLogs.ipAddress,
        userAgent: adminLogs.userAgent,
        createdAt: adminLogs.createdAt,
      })
      .from(adminLogs)
      .leftJoin(admins, eq(adminLogs.adminId, admins.id))
      .orderBy(desc(adminLogs.createdAt))
      .limit(10000); // Limit for performance

    const headers = ['id', 'adminId', 'adminUsername', 'action', 'targetId', 'details', 'ipAddress', 'userAgent', 'createdAt'];
    const csv = convertToCSV(logsList, headers);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=admin-logs-export-${Date.now()}.csv`);
    res.send(csv);

    await logAdminAction(
      req.admin!.id,
      'EXPORT_ADMIN_LOGS_CSV',
      null,
      { recordCount: logsList.length },
      req.ip,
      req.headers['user-agent']
    );
  } catch (error) {
    console.error('Error exporting admin logs to CSV:', error);
    res.status(500).json({ error: 'Failed to export admin logs' });
  }
});

// ============================================
// PHASE 2: ADVANCED OPERATIONS
// ============================================

// Support Tickets Management
adminRouter.get('/support-tickets', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { status, priority, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let query = db
      .select({
        id: supportTickets.id,
        userId: supportTickets.userId,
        subject: supportTickets.subject,
        message: supportTickets.message,
        category: supportTickets.category,
        priority: supportTickets.priority,
        status: supportTickets.status,
        assignedTo: supportTickets.assignedTo,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        resolvedAt: supportTickets.resolvedAt,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        assignedToUsername: admins.username,
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .leftJoin(admins, eq(supportTickets.assignedTo, admins.id))
      .orderBy(desc(supportTickets.createdAt))
      .limit(limitNum)
      .offset(offset);

    if (status) {
      query = query.where(eq(supportTickets.status, status as string)) as any;
    }

    const tickets = await query;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(supportTickets);

    res.json({
      tickets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(count),
        pages: Math.ceil(Number(count) / limitNum),
      },
    });

    await logAdminAction(
      req.admin!.id,
      'VIEW_SUPPORT_TICKETS',
      null,
      { filters: { status, priority } },
      req.ip,
      req.headers['user-agent']
    );
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
});

adminRouter.get('/support-tickets/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;

    const [ticket] = await db
      .select({
        id: supportTickets.id,
        userId: supportTickets.userId,
        subject: supportTickets.subject,
        message: supportTickets.message,
        category: supportTickets.category,
        priority: supportTickets.priority,
        status: supportTickets.status,
        assignedTo: supportTickets.assignedTo,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        resolvedAt: supportTickets.resolvedAt,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .where(eq(supportTickets.id, id));

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const messages = await db
      .select()
      .from(supportTicketMessages)
      .where(eq(supportTicketMessages.ticketId, id))
      .orderBy(supportTicketMessages.createdAt);

    res.json({ ticket, messages });
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    res.status(500).json({ error: 'Failed to fetch ticket details' });
  }
});

adminRouter.patch('/support-tickets/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const { status, priority, assignedTo } = req.body;

    const updateData: any = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedAt = new Date();
    }

    const [updated] = await db
      .update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, id))
      .returning();

    await logAdminAction(
      req.admin!.id,
      'UPDATE_SUPPORT_TICKET',
      id,
      updateData,
      req.ip,
      req.headers['user-agent']
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

adminRouter.post('/support-tickets/:id/messages', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const [newMessage] = await db
      .insert(supportTicketMessages)
      .values({
        ticketId: id,
        senderId: req.admin!.id,
        senderType: 'ADMIN',
        message,
      })
      .returning();

    await db
      .update(supportTickets)
      .set({ updatedAt: new Date(), status: 'IN_PROGRESS' })
      .where(eq(supportTickets.id, id));

    await logAdminAction(
      req.admin!.id,
      'REPLY_SUPPORT_TICKET',
      id,
      { message },
      req.ip,
      req.headers['user-agent']
    );

    res.json(newMessage);
  } catch (error) {
    console.error('Error adding ticket message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Email Campaigns
adminRouter.get('/email-campaigns', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const campaigns = await db
      .select({
        id: emailCampaigns.id,
        name: emailCampaigns.name,
        subject: emailCampaigns.subject,
        targetSegment: emailCampaigns.targetSegment,
        status: emailCampaigns.status,
        scheduledFor: emailCampaigns.scheduledFor,
        sentAt: emailCampaigns.sentAt,
        totalRecipients: emailCampaigns.totalRecipients,
        successfulSends: emailCampaigns.successfulSends,
        failedSends: emailCampaigns.failedSends,
        opens: emailCampaigns.opens,
        clicks: emailCampaigns.clicks,
        createdAt: emailCampaigns.createdAt,
        createdByUsername: admins.username,
      })
      .from(emailCampaigns)
      .leftJoin(admins, eq(emailCampaigns.createdBy, admins.id))
      .orderBy(desc(emailCampaigns.createdAt));

    res.json(campaigns);

    await logAdminAction(
      req.admin!.id,
      'VIEW_EMAIL_CAMPAIGNS',
      null,
      null,
      req.ip,
      req.headers['user-agent']
    );
  } catch (error) {
    console.error('Error fetching email campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch email campaigns' });
  }
});

adminRouter.post('/email-campaigns', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { name, subject, content, targetSegment, scheduledFor } = req.body;

    const [campaign] = await db
      .insert(emailCampaigns)
      .values({
        name,
        subject,
        content,
        targetSegment,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status: scheduledFor ? 'SCHEDULED' : 'DRAFT',
        createdBy: req.admin!.id,
      })
      .returning();

    await logAdminAction(
      req.admin!.id,
      'CREATE_EMAIL_CAMPAIGN',
      campaign.id,
      { name, targetSegment },
      req.ip,
      req.headers['user-agent']
    );

    res.json(campaign);
  } catch (error) {
    console.error('Error creating email campaign:', error);
    res.status(500).json({ error: 'Failed to create email campaign' });
  }
});

adminRouter.post('/email-campaigns/:id/send', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;

    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, id));

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      return res.status(400).json({ error: 'Campaign already sent or in progress' });
    }

    await db
      .update(emailCampaigns)
      .set({ status: 'SENDING', sentAt: new Date() })
      .where(eq(emailCampaigns.id, id));

    await logAdminAction(
      req.admin!.id,
      'SEND_EMAIL_CAMPAIGN',
      id,
      { name: campaign.name },
      req.ip,
      req.headers['user-agent']
    );

    res.json({ message: 'Campaign sending initiated', campaign });
  } catch (error) {
    console.error('Error sending email campaign:', error);
    res.status(500).json({ error: 'Failed to send email campaign' });
  }
});

// Live Game Monitoring
adminRouter.get('/live-game-sessions', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const sessions = await db
      .select({
        id: liveGameSessions.id,
        userId: liveGameSessions.userId,
        game: liveGameSessions.game,
        startedAt: liveGameSessions.startedAt,
        totalBets: liveGameSessions.totalBets,
        totalWagered: liveGameSessions.totalWagered,
        totalWon: liveGameSessions.totalWon,
        netProfit: liveGameSessions.netProfit,
        currentStreak: liveGameSessions.currentStreak,
        highestBet: liveGameSessions.highestBet,
        lastActivityAt: liveGameSessions.lastActivityAt,
        username: users.username,
        vipLevel: users.vipLevel,
      })
      .from(liveGameSessions)
      .leftJoin(users, eq(liveGameSessions.userId, users.id))
      .where(eq(liveGameSessions.isActive, true))
      .orderBy(desc(liveGameSessions.lastActivityAt))
      .limit(100);

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching live game sessions:', error);
    res.status(500).json({ error: 'Failed to fetch live game sessions' });
  }
});

// IP Whitelist Management
adminRouter.get('/ip-whitelist', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const whitelist = await db
      .select({
        id: ipWhitelist.id,
        ipAddress: ipWhitelist.ipAddress,
        description: ipWhitelist.description,
        isActive: ipWhitelist.isActive,
        expiresAt: ipWhitelist.expiresAt,
        createdAt: ipWhitelist.createdAt,
        addedByUsername: admins.username,
      })
      .from(ipWhitelist)
      .leftJoin(admins, eq(ipWhitelist.addedBy, admins.id))
      .orderBy(desc(ipWhitelist.createdAt));

    res.json(whitelist);

    await logAdminAction(
      req.admin!.id,
      'VIEW_IP_WHITELIST',
      null,
      null,
      req.ip,
      req.headers['user-agent']
    );
  } catch (error) {
    console.error('Error fetching IP whitelist:', error);
    res.status(500).json({ error: 'Failed to fetch IP whitelist' });
  }
});

adminRouter.post('/ip-whitelist', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { ipAddress, description, expiresAt } = req.body;

    if (!ipAddress) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    const [entry] = await db
      .insert(ipWhitelist)
      .values({
        ipAddress,
        description,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        addedBy: req.admin!.id,
      })
      .returning();

    await logAdminAction(
      req.admin!.id,
      'ADD_IP_WHITELIST',
      entry.id,
      { ipAddress, description },
      req.ip,
      req.headers['user-agent']
    );

    res.json(entry);
  } catch (error) {
    console.error('Error adding IP to whitelist:', error);
    res.status(500).json({ error: 'Failed to add IP to whitelist' });
  }
});

adminRouter.delete('/ip-whitelist/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .delete(ipWhitelist)
      .where(eq(ipWhitelist.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'IP whitelist entry not found' });
    }

    await logAdminAction(
      req.admin!.id,
      'REMOVE_IP_WHITELIST',
      id,
      { ipAddress: deleted.ipAddress },
      req.ip,
      req.headers['user-agent']
    );

    res.json({ message: 'IP removed from whitelist' });
  } catch (error) {
    console.error('Error removing IP from whitelist:', error);
    res.status(500).json({ error: 'Failed to remove IP from whitelist' });
  }
});

// Advanced Reports
adminRouter.post('/reports/generate', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { reportType, dateFrom, dateTo, filters } = req.body;

    let reportData: any = {};

    switch (reportType) {
      case 'revenue':
        const revenueData = await db
          .select({
            date: sql<string>`DATE(${transactions.createdAt})`,
            totalDeposits: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DEPOSIT' THEN ${transactions.amount} ELSE 0 END)`,
            totalWithdrawals: sql<number>`SUM(CASE WHEN ${transactions.type} = 'WITHDRAW' THEN ${transactions.amount} ELSE 0 END)`,
            netRevenue: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DEPOSIT' THEN ${transactions.amount} WHEN ${transactions.type} = 'WITHDRAW' THEN -${transactions.amount} ELSE 0 END)`,
          })
          .from(transactions)
          .where(
            and(
              gte(transactions.createdAt, new Date(dateFrom)),
              lte(transactions.createdAt, new Date(dateTo))
            )
          )
          .groupBy(sql`DATE(${transactions.createdAt})`)
          .orderBy(sql`DATE(${transactions.createdAt})`);
        reportData = revenueData;
        break;

      case 'user-activity':
        const userActivityData = await db
          .select({
            userId: users.id,
            username: users.username,
            vipLevel: users.vipLevel,
            totalBets: sql<number>`COUNT(DISTINCT ${bets.id})`,
            totalWagered: sql<number>`SUM(${bets.amount})`,
            totalProfit: sql<number>`SUM(${bets.profit})`,
          })
          .from(users)
          .leftJoin(bets, eq(users.id, bets.userId))
          .where(
            and(
              gte(bets.createdAt, new Date(dateFrom)),
              lte(bets.createdAt, new Date(dateTo))
            )
          )
          .groupBy(users.id, users.username, users.vipLevel)
          .orderBy(desc(sql`SUM(${bets.amount})`))
          .limit(100);
        reportData = userActivityData;
        break;

      case 'game-performance':
        const gamePerformanceData = await db
          .select({
            game: bets.game,
            totalBets: sql<number>`COUNT(*)`,
            totalWagered: sql<number>`SUM(${bets.amount})`,
            totalPayout: sql<number>`SUM(${bets.profit})`,
            averageBet: sql<number>`AVG(${bets.amount})`,
          })
          .from(bets)
          .where(
            and(
              gte(bets.createdAt, new Date(dateFrom)),
              lte(bets.createdAt, new Date(dateTo))
            )
          )
          .groupBy(bets.game)
          .orderBy(desc(sql`SUM(${bets.amount})`));
        reportData = gamePerformanceData;
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    await logAdminAction(
      req.admin!.id,
      'GENERATE_REPORT',
      null,
      { reportType, dateFrom, dateTo },
      req.ip,
      req.headers['user-agent']
    );

    res.json({ reportType, dateFrom, dateTo, data: reportData });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// ==================== PHASE 3: PLAYER INTELLIGENCE ====================

// Player Behavior Analytics
adminRouter.get('/player-behavior/overview', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const profiles = await db
      .select()
      .from(playerBehaviorProfiles)
      .orderBy(desc(playerBehaviorProfiles.lifetimeValue))
      .limit(100);

    const stats = await db
      .select({
        totalPlayers: sql<number>`COUNT(*)`,
        avgLifetimeValue: sql<number>`AVG(${playerBehaviorProfiles.lifetimeValue})`,
        totalRevenue: sql<number>`SUM(${playerBehaviorProfiles.netRevenue})`,
        whales: sql<number>`COUNT(CASE WHEN ${playerBehaviorProfiles.playerValue} = 'WHALE' THEN 1 END)`,
        vips: sql<number>`COUNT(CASE WHEN ${playerBehaviorProfiles.playerValue} = 'VIP' THEN 1 END)`,
        highChurnRisk: sql<number>`COUNT(CASE WHEN ${playerBehaviorProfiles.churnRisk} = 'HIGH' THEN 1 END)`,
      })
      .from(playerBehaviorProfiles);

    res.json({ profiles, stats: stats[0] });
  } catch (error) {
    console.error('Error fetching player behavior overview:', error);
    res.status(500).json({ error: 'Failed to fetch player behavior data' });
  }
});

adminRouter.get('/player-behavior/:userId', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId } = req.params;
    
    const [profile] = await db
      .select()
      .from(playerBehaviorProfiles)
      .where(eq(playerBehaviorProfiles.userId, userId));

    if (!profile) {
      return res.status(404).json({ error: 'Player behavior profile not found' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error fetching player behavior profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Risk Management
adminRouter.get('/risk-management/dashboard', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const assessments = await db
      .select()
      .from(riskAssessments)
      .where(or(
        eq(riskAssessments.riskLevel, 'HIGH'),
        eq(riskAssessments.riskLevel, 'CRITICAL')
      ))
      .orderBy(desc(riskAssessments.lastAssessmentDate))
      .limit(50);

    const stats = await db
      .select({
        totalAssessments: sql<number>`COUNT(*)`,
        criticalRisk: sql<number>`COUNT(CASE WHEN ${riskAssessments.riskLevel} = 'CRITICAL' THEN 1 END)`,
        highRisk: sql<number>`COUNT(CASE WHEN ${riskAssessments.riskLevel} = 'HIGH' THEN 1 END)`,
        underReview: sql<number>`COUNT(CASE WHEN ${riskAssessments.isUnderReview} THEN 1 END)`,
      })
      .from(riskAssessments);

    res.json({ assessments, stats: stats[0] });
  } catch (error) {
    console.error('Error fetching risk management dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch risk data' });
  }
});

adminRouter.post('/risk-management/assess/:userId', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId } = req.params;
    const { riskScore, riskLevel, riskFactors, notes } = req.body;

    const [assessment] = await db
      .insert(riskAssessments)
      .values({
        userId,
        riskScore,
        riskLevel,
        riskFactors,
        reviewNotes: notes,
        reviewedBy: req.admin!.id,
        isUnderReview: true,
      })
      .returning();

    await logAdminAction(
      req.admin!.id,
      'CREATE_RISK_ASSESSMENT',
      userId,
      { riskScore, riskLevel },
      req.ip,
      req.headers['user-agent']
    );

    res.json(assessment);
  } catch (error) {
    console.error('Error creating risk assessment:', error);
    res.status(500).json({ error: 'Failed to create risk assessment' });
  }
});

adminRouter.patch('/risk-management/:assessmentId', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { assessmentId } = req.params;
    const { actionTaken, reviewNotes, monitoringLevel } = req.body;

    const [updated] = await db
      .update(riskAssessments)
      .set({
        actionTaken,
        reviewNotes,
        monitoringLevel,
        actionDate: new Date(),
        reviewedBy: req.admin!.id,
        updatedAt: new Date(),
      })
      .where(eq(riskAssessments.id, assessmentId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Risk assessment not found' });
    }

    await logAdminAction(
      req.admin!.id,
      'UPDATE_RISK_ASSESSMENT',
      assessmentId,
      { actionTaken, monitoringLevel },
      req.ip,
      req.headers['user-agent']
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating risk assessment:', error);
    res.status(500).json({ error: 'Failed to update risk assessment' });
  }
});

// Player Segmentation
adminRouter.get('/segmentation/overview', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const segments = await db
      .select({
        segmentType: playerSegments.segmentType,
        count: sql<number>`COUNT(*)`,
        avgConfidence: sql<number>`AVG(${playerSegments.confidenceScore})`,
      })
      .from(playerSegments)
      .groupBy(playerSegments.segmentType)
      .orderBy(desc(sql`COUNT(*)`));

    const recentSegments = await db
      .select()
      .from(playerSegments)
      .orderBy(desc(playerSegments.assignedDate))
      .limit(50);

    res.json({ segments, recentSegments });
  } catch (error) {
    console.error('Error fetching segmentation overview:', error);
    res.status(500).json({ error: 'Failed to fetch segmentation data' });
  }
});

adminRouter.post('/segmentation/assign', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId, segmentType, confidenceScore, criteriaData } = req.body;

    const [segment] = await db
      .insert(playerSegments)
      .values({
        userId,
        segmentType,
        confidenceScore,
        criteriaData,
      })
      .returning();

    await logAdminAction(
      req.admin!.id,
      'ASSIGN_SEGMENT',
      userId,
      { segmentType },
      req.ip,
      req.headers['user-agent']
    );

    res.json(segment);
  } catch (error) {
    console.error('Error assigning segment:', error);
    res.status(500).json({ error: 'Failed to assign segment' });
  }
});

adminRouter.get('/segmentation/users/:segmentType', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { segmentType } = req.params;

    const segmentedUsers = await db
      .select({
        segment: playerSegments,
        user: users,
      })
      .from(playerSegments)
      .innerJoin(users, eq(playerSegments.userId, users.id))
      .where(eq(playerSegments.segmentType, segmentType))
      .orderBy(desc(playerSegments.confidenceScore))
      .limit(100);

    res.json(segmentedUsers);
  } catch (error) {
    console.error('Error fetching segmented users:', error);
    res.status(500).json({ error: 'Failed to fetch segmented users' });
  }
});

// Fraud Detection
adminRouter.get('/fraud/alerts', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { status = 'NEW' } = req.query;

    let query = db.select().from(fraudAlerts);

    if (status !== 'ALL') {
      query = query.where(eq(fraudAlerts.status, status as string));
    }

    const alerts = await query
      .orderBy(desc(fraudAlerts.detectedAt))
      .limit(100);

    const stats = await db
      .select({
        total: sql<number>`COUNT(*)`,
        new: sql<number>`COUNT(CASE WHEN ${fraudAlerts.status} = 'NEW' THEN 1 END)`,
        investigating: sql<number>`COUNT(CASE WHEN ${fraudAlerts.status} = 'INVESTIGATING' THEN 1 END)`,
        confirmed: sql<number>`COUNT(CASE WHEN ${fraudAlerts.status} = 'CONFIRMED' THEN 1 END)`,
        critical: sql<number>`COUNT(CASE WHEN ${fraudAlerts.severity} = 'CRITICAL' THEN 1 END)`,
      })
      .from(fraudAlerts);

    res.json({ alerts, stats: stats[0] });
  } catch (error) {
    console.error('Error fetching fraud alerts:', error);
    res.status(500).json({ error: 'Failed to fetch fraud alerts' });
  }
});

adminRouter.post('/fraud/create-alert', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId, alertType, severity, description, evidenceData } = req.body;

    const [alert] = await db
      .insert(fraudAlerts)
      .values({
        userId,
        alertType,
        severity,
        description,
        evidenceData,
        assignedTo: req.admin!.id,
      })
      .returning();

    await logAdminAction(
      req.admin!.id,
      'CREATE_FRAUD_ALERT',
      userId,
      { alertType, severity },
      req.ip,
      req.headers['user-agent']
    );

    res.json(alert);
  } catch (error) {
    console.error('Error creating fraud alert:', error);
    res.status(500).json({ error: 'Failed to create fraud alert' });
  }
});

adminRouter.patch('/fraud/alerts/:alertId', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { alertId } = req.params;
    const { status, investigationNotes, resolution, actionsTaken } = req.body;

    const updateData: any = {
      status,
      investigationNotes,
      actionsTaken,
      updatedAt: new Date(),
    };

    if (status === 'RESOLVED') {
      updateData.resolution = resolution;
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = req.admin!.id;
    }

    const [updated] = await db
      .update(fraudAlerts)
      .set(updateData)
      .where(eq(fraudAlerts.id, alertId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Fraud alert not found' });
    }

    await logAdminAction(
      req.admin!.id,
      'UPDATE_FRAUD_ALERT',
      alertId,
      { status },
      req.ip,
      req.headers['user-agent']
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating fraud alert:', error);
    res.status(500).json({ error: 'Failed to update fraud alert' });
  }
});

adminRouter.get('/fraud/alerts/:alertId', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { alertId } = req.params;

    const [alert] = await db
      .select()
      .from(fraudAlerts)
      .where(eq(fraudAlerts.id, alertId));

    if (!alert) {
      return res.status(404).json({ error: 'Fraud alert not found' });
    }

    res.json(alert);
  } catch (error) {
    console.error('Error fetching fraud alert details:', error);
    res.status(500).json({ error: 'Failed to fetch alert details' });
  }
});

// ============= PHASE 4A: PAYMENT & TRANSACTION MANAGEMENT =============

// Withdrawal Queue Routes
adminRouter.get('/withdrawals/queue', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { status, currency, limit = '50' } = req.query;
    
    let query = db
      .select({
        withdrawal: withdrawalQueue,
        user: {
          id: users.id,
          username: users.username,
          vipLevel: users.vipLevel
        }
      })
      .from(withdrawalQueue)
      .leftJoin(users, eq(withdrawalQueue.userId, users.id))
      .orderBy(desc(withdrawalQueue.priority), desc(withdrawalQueue.createdAt))
      .limit(parseInt(limit as string));

    if (status) {
      query = query.where(eq(withdrawalQueue.status, status as string)) as any;
    }
    if (currency) {
      query = query.where(eq(withdrawalQueue.currency, currency as string)) as any;
    }

    const results = await query;
    res.json(results);
  } catch (error) {
    console.error('Error fetching withdrawal queue:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawal queue' });
  }
});

adminRouter.patch('/withdrawals/:withdrawalId/approve', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { withdrawalId } = req.params;

    const [updated] = await db
      .update(withdrawalQueue)
      .set({
        status: 'APPROVED',
        approvedBy: req.admin!.id,
        reviewedBy: req.admin!.id,
        reviewNotes: req.body.notes || 'Approved',
        updatedAt: new Date()
      })
      .where(eq(withdrawalQueue.id, withdrawalId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    await logAdminAction(
      req.admin!.id,
      'APPROVE_WITHDRAWAL',
      withdrawalId,
      { amount: updated.amount, currency: updated.currency },
      req.ip,
      req.headers['user-agent']
    );

    res.json(updated);
  } catch (error) {
    console.error('Error approving withdrawal:', error);
    res.status(500).json({ error: 'Failed to approve withdrawal' });
  }
});

adminRouter.patch('/withdrawals/:withdrawalId/reject', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { withdrawalId } = req.params;
    const { reason } = req.body;

    const [updated] = await db
      .update(withdrawalQueue)
      .set({
        status: 'REJECTED',
        reviewedBy: req.admin!.id,
        rejectionReason: reason,
        updatedAt: new Date()
      })
      .where(eq(withdrawalQueue.id, withdrawalId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    await logAdminAction(
      req.admin!.id,
      'REJECT_WITHDRAWAL',
      withdrawalId,
      { reason },
      req.ip,
      req.headers['user-agent']
    );

    res.json(updated);
  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    res.status(500).json({ error: 'Failed to reject withdrawal' });
  }
});

// Payment Provider Status Routes
adminRouter.get('/payment-providers', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const providers = await db
      .select()
      .from(paymentProviderStatus)
      .orderBy(paymentProviderStatus.providerName);

    res.json(providers);
  } catch (error) {
    console.error('Error fetching payment providers:', error);
    res.status(500).json({ error: 'Failed to fetch payment providers' });
  }
});

adminRouter.post('/payment-providers', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { providerName, providerType, apiEndpoint } = req.body;

    const [provider] = await db
      .insert(paymentProviderStatus)
      .values({
        providerName,
        providerType,
        apiEndpoint,
        status: 'ONLINE',
        isActive: true
      })
      .returning();

    await logAdminAction(
      req.admin!.id,
      'CREATE_PAYMENT_PROVIDER',
      provider.id,
      { providerName, providerType },
      req.ip,
      req.headers['user-agent']
    );

    res.json(provider);
  } catch (error) {
    console.error('Error creating payment provider:', error);
    res.status(500).json({ error: 'Failed to create payment provider' });
  }
});

adminRouter.patch('/payment-providers/:providerId', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { providerId } = req.params;
    const { status, isActive } = req.body;

    const [updated] = await db
      .update(paymentProviderStatus)
      .set({
        status,
        isActive,
        updatedAt: new Date()
      })
      .where(eq(paymentProviderStatus.id, providerId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Payment provider not found' });
    }

    await logAdminAction(
      req.admin!.id,
      'UPDATE_PAYMENT_PROVIDER',
      providerId,
      { status, isActive },
      req.ip,
      req.headers['user-agent']
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating payment provider:', error);
    res.status(500).json({ error: 'Failed to update payment provider' });
  }
});

// Transaction Disputes Routes
adminRouter.get('/disputes', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { status, disputeType } = req.query;
    
    let query = db
      .select({
        dispute: transactionDisputes,
        user: {
          id: users.id,
          username: users.username
        }
      })
      .from(transactionDisputes)
      .leftJoin(users, eq(transactionDisputes.userId, users.id))
      .orderBy(desc(transactionDisputes.createdAt));

    if (status) {
      query = query.where(eq(transactionDisputes.status, status as string)) as any;
    }
    if (disputeType) {
      query = query.where(eq(transactionDisputes.disputeType, disputeType as string)) as any;
    }

    const results = await query;
    res.json(results);
  } catch (error) {
    console.error('Error fetching disputes:', error);
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
});

adminRouter.post('/disputes', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { transactionId, userId, disputeType, amount, currency, description } = req.body;

    const [dispute] = await db
      .insert(transactionDisputes)
      .values({
        transactionId,
        userId,
        disputeType,
        amount,
        currency,
        description,
        assignedTo: req.admin!.id
      })
      .returning();

    await logAdminAction(
      req.admin!.id,
      'CREATE_DISPUTE',
      dispute.id,
      { disputeType, amount },
      req.ip,
      req.headers['user-agent']
    );

    res.json(dispute);
  } catch (error) {
    console.error('Error creating dispute:', error);
    res.status(500).json({ error: 'Failed to create dispute' });
  }
});

adminRouter.patch('/disputes/:disputeId/resolve', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { disputeId } = req.params;
    const { status, resolution, resolutionAmount } = req.body;

    const [updated] = await db
      .update(transactionDisputes)
      .set({
        status,
        resolution,
        resolutionAmount,
        resolvedBy: req.admin!.id,
        resolvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(transactionDisputes.id, disputeId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    await logAdminAction(
      req.admin!.id,
      'RESOLVE_DISPUTE',
      disputeId,
      { status, resolution },
      req.ip,
      req.headers['user-agent']
    );

    res.json(updated);
  } catch (error) {
    console.error('Error resolving dispute:', error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

// Crypto Wallet Monitoring Routes
adminRouter.get('/crypto-wallets', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { currency, walletType, isActive } = req.query;
    
    let query = db
      .select()
      .from(cryptoWalletMonitoring)
      .orderBy(cryptoWalletMonitoring.currency, cryptoWalletMonitoring.walletType);

    if (currency) {
      query = query.where(eq(cryptoWalletMonitoring.currency, currency as string)) as any;
    }
    if (walletType) {
      query = query.where(eq(cryptoWalletMonitoring.walletType, walletType as string)) as any;
    }
    if (isActive !== undefined) {
      query = query.where(eq(cryptoWalletMonitoring.isActive, isActive === 'true')) as any;
    }

    const wallets = await query;
    res.json(wallets);
  } catch (error) {
    console.error('Error fetching crypto wallets:', error);
    res.status(500).json({ error: 'Failed to fetch crypto wallets' });
  }
});

adminRouter.post('/crypto-wallets', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { walletType, currency, address, lowBalanceThreshold, highBalanceThreshold } = req.body;

    const [wallet] = await db
      .insert(cryptoWalletMonitoring)
      .values({
        walletType,
        currency,
        address,
        lowBalanceThreshold,
        highBalanceThreshold,
        isActive: true
      })
      .returning();

    await logAdminAction(
      req.admin!.id,
      'CREATE_CRYPTO_WALLET',
      wallet.id,
      { walletType, currency, address },
      req.ip,
      req.headers['user-agent']
    );

    res.json(wallet);
  } catch (error) {
    console.error('Error creating crypto wallet:', error);
    res.status(500).json({ error: 'Failed to create crypto wallet' });
  }
});

adminRouter.patch('/crypto-wallets/:walletId', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { walletId } = req.params;
    const { currentBalance, isActive, securityNotes } = req.body;

    const updateData: any = { updatedAt: new Date() };
    if (currentBalance !== undefined) updateData.currentBalance = currentBalance;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (securityNotes !== undefined) updateData.securityNotes = securityNotes;

    const [updated] = await db
      .update(cryptoWalletMonitoring)
      .set(updateData)
      .where(eq(cryptoWalletMonitoring.id, walletId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Crypto wallet not found' });
    }

    await logAdminAction(
      req.admin!.id,
      'UPDATE_CRYPTO_WALLET',
      walletId,
      updateData,
      req.ip,
      req.headers['user-agent']
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating crypto wallet:', error);
    res.status(500).json({ error: 'Failed to update crypto wallet' });
  }
});

// ============= PHASE 4B: MARKETING & GROWTH =============
// NOTE: Affiliate and Tournament routes exist earlier in this file

// Promotional Calendar Routes
adminRouter.get('/promotional-campaigns', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { status } = req.query;
    
    let query = db
      .select()
      .from(promotionalCalendar)
      .orderBy(desc(promotionalCalendar.startDate));

    if (status) {
      query = query.where(eq(promotionalCalendar.status, status as string)) as any;
    }

    const campaigns = await query;
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching promotional campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

adminRouter.post('/promotional-campaigns', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const campaignData = req.body;

    const [campaign] = await db
      .insert(promotionalCalendar)
      .values({
        ...campaignData,
        createdBy: req.admin!.id
      })
      .returning();

    await logAdminAction(
      req.admin!.id,
      'CREATE_PROMOTIONAL_CAMPAIGN',
      campaign.id,
      { campaignName: campaign.campaignName },
      req.ip,
      req.headers['user-agent']
    );

    res.json(campaign);
  } catch (error) {
    console.error('Error creating promotional campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

adminRouter.patch('/promotional-campaigns/:campaignId', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { campaignId } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };

    const [updated] = await db
      .update(promotionalCalendar)
      .set(updateData)
      .where(eq(promotionalCalendar.id, campaignId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    await logAdminAction(
      req.admin!.id,
      'UPDATE_PROMOTIONAL_CAMPAIGN',
      campaignId,
      updateData,
      req.ip,
      req.headers['user-agent']
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating promotional campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// Retention Campaigns Routes
adminRouter.get('/retention-campaigns', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { status, campaignType } = req.query;
    
    let query = db
      .select()
      .from(retentionCampaigns)
      .orderBy(desc(retentionCampaigns.createdAt));

    if (status) {
      query = query.where(eq(retentionCampaigns.status, status as string)) as any;
    }
    if (campaignType) {
      query = query.where(eq(retentionCampaigns.campaignType, campaignType as string)) as any;
    }

    const campaigns = await query;
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching retention campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch retention campaigns' });
  }
});

adminRouter.post('/retention-campaigns', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const campaignData = req.body;

    const [campaign] = await db
      .insert(retentionCampaigns)
      .values({
        ...campaignData,
        createdBy: req.admin!.id
      })
      .returning();

    await logAdminAction(
      req.admin!.id,
      'CREATE_RETENTION_CAMPAIGN',
      campaign.id,
      { campaignName: campaign.campaignName },
      req.ip,
      req.headers['user-agent']
    );

    res.json(campaign);
  } catch (error) {
    console.error('Error creating retention campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

adminRouter.patch('/retention-campaigns/:campaignId', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { campaignId } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };

    const [updated] = await db
      .update(retentionCampaigns)
      .set(updateData)
      .where(eq(retentionCampaigns.id, campaignId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    await logAdminAction(
      req.admin!.id,
      'UPDATE_RETENTION_CAMPAIGN',
      campaignId,
      updateData,
      req.ip,
      req.headers['user-agent']
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating retention campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// ============= PHASE 4C: ADVANCED VIP & PERSONALIZATION =============

// VIP Tier Configuration Routes
adminRouter.get('/vip-tiers', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const tiers = await db
      .select()
      .from(vipTierConfiguration)
      .orderBy(vipTierConfiguration.displayOrder);

    res.json(tiers);
  } catch (error) {
    console.error('Error fetching VIP tiers:', error);
    res.status(500).json({ error: 'Failed to fetch VIP tiers' });
  }
});

adminRouter.patch('/vip-tiers/:tierId', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { tierId } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };

    const [updated] = await db
      .update(vipTierConfiguration)
      .set(updateData)
      .where(eq(vipTierConfiguration.id, tierId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'VIP tier not found' });
    }

    await logAdminAction(
      req.admin!.id,
      'UPDATE_VIP_TIER',
      tierId,
      { tierLevel: updated.tierLevel },
      req.ip,
      req.headers['user-agent']
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating VIP tier:', error);
    res.status(500).json({ error: 'Failed to update VIP tier' });
  }
});

// Personalized Offers Routes
adminRouter.get('/personalized-offers', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId, status } = req.query;
    
    let query = db
      .select({
        offer: personalizedOffers,
        user: {
          id: users.id,
          username: users.username,
          vipLevel: users.vipLevel
        }
      })
      .from(personalizedOffers)
      .leftJoin(users, eq(personalizedOffers.userId, users.id))
      .orderBy(desc(personalizedOffers.createdAt));

    if (userId) {
      query = query.where(eq(personalizedOffers.userId, userId as string)) as any;
    }
    if (status) {
      query = query.where(eq(personalizedOffers.status, status as string)) as any;
    }

    const results = await query;
    res.json(results);
  } catch (error) {
    console.error('Error fetching personalized offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

adminRouter.post('/personalized-offers', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const offerData = req.body;

    const [offer] = await db
      .insert(personalizedOffers)
      .values({
        ...offerData,
        createdBy: req.admin!.id
      })
      .returning();

    await logAdminAction(
      req.admin!.id,
      'CREATE_PERSONALIZED_OFFER',
      offer.id,
      { userId: offer.userId, offerType: offer.offerType },
      req.ip,
      req.headers['user-agent']
    );

    res.json(offer);
  } catch (error) {
    console.error('Error creating personalized offer:', error);
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

// High Roller Profiles Routes
adminRouter.get('/high-rollers', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { classification } = req.query;
    
    let query = db
      .select({
        profile: highRollerProfiles,
        user: {
          id: users.id,
          username: users.username,
          vipLevel: users.vipLevel
        }
      })
      .from(highRollerProfiles)
      .leftJoin(users, eq(highRollerProfiles.userId, users.id))
      .orderBy(desc(highRollerProfiles.lifetimeWagered));

    if (classification) {
      query = query.where(eq(highRollerProfiles.classification, classification as string)) as any;
    }

    const results = await query;
    res.json(results);
  } catch (error) {
    console.error('Error fetching high rollers:', error);
    res.status(500).json({ error: 'Failed to fetch high rollers' });
  }
});

adminRouter.patch('/high-rollers/:profileId', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { profileId } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };

    const [updated] = await db
      .update(highRollerProfiles)
      .set(updateData)
      .where(eq(highRollerProfiles.id, profileId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'High roller profile not found' });
    }

    await logAdminAction(
      req.admin!.id,
      'UPDATE_HIGH_ROLLER',
      profileId,
      updateData,
      req.ip,
      req.headers['user-agent']
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating high roller:', error);
    res.status(500).json({ error: 'Failed to update high roller' });
  }
});

// Loyalty Reward Catalog Routes
adminRouter.get('/loyalty-rewards', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { category, isActive } = req.query;
    
    let query = db
      .select()
      .from(loyaltyRewardCatalog)
      .orderBy(loyaltyRewardCatalog.displayOrder);

    if (category) {
      query = query.where(eq(loyaltyRewardCatalog.category, category as string)) as any;
    }
    if (isActive !== undefined) {
      query = query.where(eq(loyaltyRewardCatalog.isActive, isActive === 'true')) as any;
    }

    const rewards = await query;
    res.json(rewards);
  } catch (error) {
    console.error('Error fetching loyalty rewards:', error);
    res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});

adminRouter.post('/loyalty-rewards', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const rewardData = req.body;

    const [reward] = await db
      .insert(loyaltyRewardCatalog)
      .values(rewardData)
      .returning();

    await logAdminAction(
      req.admin!.id,
      'CREATE_LOYALTY_REWARD',
      reward.id,
      { rewardName: reward.rewardName },
      req.ip,
      req.headers['user-agent']
    );

    res.json(reward);
  } catch (error) {
    console.error('Error creating loyalty reward:', error);
    res.status(500).json({ error: 'Failed to create reward' });
  }
});

adminRouter.patch('/loyalty-rewards/:rewardId', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { rewardId } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };

    const [updated] = await db
      .update(loyaltyRewardCatalog)
      .set(updateData)
      .where(eq(loyaltyRewardCatalog.id, rewardId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    await logAdminAction(
      req.admin!.id,
      'UPDATE_LOYALTY_REWARD',
      rewardId,
      updateData,
      req.ip,
      req.headers['user-agent']
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating loyalty reward:', error);
    res.status(500).json({ error: 'Failed to update reward' });
  }
});

// ============= PHASE 4D: COMPLIANCE & SECURITY =============
// NOTE: KYC Documents routes exist earlier in this file

// Regulatory Reports Routes
adminRouter.get('/regulatory-reports', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { reportType, status, jurisdiction } = req.query;
    
    let query = db
      .select()
      .from(regulatoryReports)
      .orderBy(desc(regulatoryReports.createdAt));

    if (reportType) {
      query = query.where(eq(regulatoryReports.reportType, reportType as string)) as any;
    }
    if (status) {
      query = query.where(eq(regulatoryReports.status, status as string)) as any;
    }
    if (jurisdiction) {
      query = query.where(eq(regulatoryReports.jurisdiction, jurisdiction as string)) as any;
    }

    const reports = await query;
    res.json(reports);
  } catch (error) {
    console.error('Error fetching regulatory reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

adminRouter.post('/regulatory-reports', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const reportData = req.body;

    const [report] = await db
      .insert(regulatoryReports)
      .values({
        ...reportData,
        generatedBy: req.admin!.id
      })
      .returning();

    await logAdminAction(
      req.admin!.id,
      'CREATE_REGULATORY_REPORT',
      report.id,
      { reportType: report.reportType },
      req.ip,
      req.headers['user-agent']
    );

    res.json(report);
  } catch (error) {
    console.error('Error creating regulatory report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

adminRouter.patch('/regulatory-reports/:reportId/submit', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { reportId } = req.params;

    const [updated] = await db
      .update(regulatoryReports)
      .set({
        status: 'SUBMITTED',
        submittedBy: req.admin!.id,
        submittedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(regulatoryReports.id, reportId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await logAdminAction(
      req.admin!.id,
      'SUBMIT_REGULATORY_REPORT',
      reportId,
      { reportType: updated.reportType },
      req.ip,
      req.headers['user-agent']
    );

    res.json(updated);
  } catch (error) {
    console.error('Error submitting regulatory report:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// Audit Trail Routes
adminRouter.get('/audit-trail', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { actorId, resourceType, category, severity, limit = '100' } = req.query;
    
    let query = db
      .select()
      .from(auditTrail)
      .orderBy(desc(auditTrail.createdAt))
      .limit(parseInt(limit as string));

    if (actorId) {
      query = query.where(eq(auditTrail.actorId, actorId as string)) as any;
    }
    if (resourceType) {
      query = query.where(eq(auditTrail.resourceType, resourceType as string)) as any;
    }
    if (category) {
      query = query.where(eq(auditTrail.category, category as string)) as any;
    }
    if (severity) {
      query = query.where(eq(auditTrail.severity, severity as string)) as any;
    }

    const logs = await query;
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

adminRouter.post('/audit-trail', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const auditData = req.body;

    const [audit] = await db
      .insert(auditTrail)
      .values(auditData)
      .returning();

    res.json(audit);
  } catch (error) {
    console.error('Error creating audit entry:', error);
    res.status(500).json({ error: 'Failed to create audit entry' });
  }
});

// Admin MFA Settings Routes
adminRouter.get('/mfa-settings/:adminId', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { adminId } = req.params;

    const [settings] = await db
      .select()
      .from(adminMfaSettings)
      .where(eq(adminMfaSettings.adminId, adminId));

    if (!settings) {
      return res.status(404).json({ error: 'MFA settings not found' });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching MFA settings:', error);
    res.status(500).json({ error: 'Failed to fetch MFA settings' });
  }
});

adminRouter.patch('/mfa-settings/:adminId', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { adminId } = req.params;
    const { mfaEnabled, mfaMethod, requireMfaForSensitiveActions } = req.body;

    const updateData: any = { updatedAt: new Date() };
    if (mfaEnabled !== undefined) updateData.mfaEnabled = mfaEnabled;
    if (mfaMethod !== undefined) updateData.mfaMethod = mfaMethod;
    if (requireMfaForSensitiveActions !== undefined) updateData.requireMfaForSensitiveActions = requireMfaForSensitiveActions;

    const [updated] = await db
      .update(adminMfaSettings)
      .set(updateData)
      .where(eq(adminMfaSettings.adminId, adminId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'MFA settings not found' });
    }

    await logAdminAction(
      req.admin!.id,
      'UPDATE_MFA_SETTINGS',
      adminId,
      updateData,
      req.ip,
      req.headers['user-agent']
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating MFA settings:', error);
    res.status(500).json({ error: 'Failed to update MFA settings' });
  }
});


// =============================================
// PHASE 5: ADVANCED CASINO OPERATIONS ROUTES
// =============================================

// Import Phase 5 tables
import {
  gameProviders, gameCategories, contentSchedule, gameMetrics,
  helpDeskTickets, customerSurveys, npsResponses,
  performanceSnapshots, predictiveModels, cohortData, revenueForecasts,
  staffMembers, shiftSchedules, taskAssignments, systemHealthLogs
} from '@shared/schema';

// ========== PHASE 5A: GAME MANAGEMENT & CONTENT ==========

// Game Providers
adminRouter.get('/game-providers', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const providers = await db.select().from(gameProviders).orderBy(desc(gameProviders.createdAt));
    res.json(providers);
  } catch (error) {
    console.error('Error fetching game providers:', error);
    res.status(500).json({ error: 'Failed to fetch game providers' });
  }
});

adminRouter.post('/game-providers', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [provider] = await db.insert(gameProviders).values(req.body).returning();
    await logAdminAction(req.admin!.id, 'CREATE_GAME_PROVIDER', null, { providerId: provider.id }, req.ip, req.headers['user-agent']);
    res.json(provider);
  } catch (error) {
    console.error('Error creating game provider:', error);
    res.status(500).json({ error: 'Failed to create game provider' });
  }
});

// Game Categories
adminRouter.get('/game-categories', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const categories = await db.select().from(gameCategories).orderBy(asc(gameCategories.sortOrder));
    res.json(categories);
  } catch (error) {
    console.error('Error fetching game categories:', error);
    res.status(500).json({ error: 'Failed to fetch game categories' });
  }
});

adminRouter.post('/game-categories', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [category] = await db.insert(gameCategories).values(req.body).returning();
    res.json(category);
  } catch (error) {
    console.error('Error creating game category:', error);
    res.status(500).json({ error: 'Failed to create game category' });
  }
});

// Content Schedule
adminRouter.get('/content-schedule', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const schedules = await db.select().from(contentSchedule).orderBy(desc(contentSchedule.scheduledFor));
    res.json(schedules);
  } catch (error) {
    console.error('Error fetching content schedule:', error);
    res.status(500).json({ error: 'Failed to fetch content schedule' });
  }
});

adminRouter.post('/content-schedule', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const scheduleData = { ...req.body, createdBy: req.admin!.id };
    const [schedule] = await db.insert(contentSchedule).values(scheduleData).returning();
    res.json(schedule);
  } catch (error) {
    console.error('Error creating content schedule:', error);
    res.status(500).json({ error: 'Failed to create content schedule' });
  }
});

// Game Performance Metrics
adminRouter.get('/game-metrics', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { gameName, periodType } = req.query;
    let query = db.select().from(gameMetrics).orderBy(desc(gameMetrics.periodStart)).limit(100);
    
    if (gameName) {
      query = query.where(eq(gameMetrics.gameName, gameName as string)) as any;
    }
    if (periodType) {
      query = query.where(eq(gameMetrics.periodType, periodType as string)) as any;
    }
    
    const metrics = await query;
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching game metrics:', error);
    res.status(500).json({ error: 'Failed to fetch game metrics' });
  }
});

// ========== PHASE 5B: CUSTOMER EXPERIENCE & SUPPORT ==========

// Live Chat Dashboard (already exists from Phase 4, just add summary endpoint)
adminRouter.get('/live-chat/summary', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [stats] = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'QUEUED') as queued,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') as active,
        COUNT(*) FILTER (WHERE status = 'RESOLVED') as resolved_today,
        AVG(satisfaction_rating) FILTER (WHERE satisfaction_rating IS NOT NULL) as avg_satisfaction
      FROM live_chat_sessions
      WHERE created_at >= CURRENT_DATE
    `);
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching live chat summary:', error);
    res.status(500).json({ error: 'Failed to fetch live chat summary' });
  }
});

// Help Desk Tickets
adminRouter.get('/help-desk-tickets', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { status, priority } = req.query;
    let query = db.select().from(helpDeskTickets).orderBy(desc(helpDeskTickets.createdAt)).limit(100);
    
    if (status) {
      query = query.where(eq(helpDeskTickets.status, status as string)) as any;
    }
    if (priority) {
      query = query.where(eq(helpDeskTickets.priority, priority as string)) as any;
    }
    
    const tickets = await query;
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching help desk tickets:', error);
    res.status(500).json({ error: 'Failed to fetch help desk tickets' });
  }
});

adminRouter.post('/help-desk-tickets', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const ticketData = { ...req.body, ticketNumber: `TKT-${Date.now()}` };
    const [ticket] = await db.insert(helpDeskTickets).values(ticketData).returning();
    res.json(ticket);
  } catch (error) {
    console.error('Error creating help desk ticket:', error);
    res.status(500).json({ error: 'Failed to create help desk ticket' });
  }
});

adminRouter.patch('/help-desk-tickets/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const [ticket] = await db.update(helpDeskTickets).set(req.body).where(eq(helpDeskTickets.id, id)).returning();
    res.json(ticket);
  } catch (error) {
    console.error('Error updating help desk ticket:', error);
    res.status(500).json({ error: 'Failed to update help desk ticket' });
  }
});

// Customer Surveys
adminRouter.get('/customer-surveys', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const surveys = await db.select().from(customerSurveys).orderBy(desc(customerSurveys.createdAt));
    res.json(surveys);
  } catch (error) {
    console.error('Error fetching customer surveys:', error);
    res.status(500).json({ error: 'Failed to fetch customer surveys' });
  }
});

adminRouter.post('/customer-surveys', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const surveyData = { ...req.body, createdBy: req.admin!.id };
    const [survey] = await db.insert(customerSurveys).values(surveyData).returning();
    res.json(survey);
  } catch (error) {
    console.error('Error creating customer survey:', error);
    res.status(500).json({ error: 'Failed to create customer survey' });
  }
});

// NPS Responses & Tracking
adminRouter.get('/nps-responses', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { surveyId } = req.query;
    let query = db.select().from(npsResponses).orderBy(desc(npsResponses.createdAt));
    
    if (surveyId) {
      query = query.where(eq(npsResponses.surveyId, surveyId as string)) as any;
    }
    
    const responses = await query;
    res.json(responses);
  } catch (error) {
    console.error('Error fetching NPS responses:', error);
    res.status(500).json({ error: 'Failed to fetch NPS responses' });
  }
});

adminRouter.get('/nps-summary', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [stats] = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE category = 'PROMOTER') as promoters,
        COUNT(*) FILTER (WHERE category = 'PASSIVE') as passives,
        COUNT(*) FILTER (WHERE category = 'DETRACTOR') as detractors,
        AVG(score) as avg_score,
        ((COUNT(*) FILTER (WHERE category = 'PROMOTER')::float / COUNT(*)) - 
         (COUNT(*) FILTER (WHERE category = 'DETRACTOR')::float / COUNT(*))) * 100 as nps_score
      FROM nps_responses
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `);
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching NPS summary:', error);
    res.status(500).json({ error: 'Failed to fetch NPS summary' });
  }
});

// ========== PHASE 5C: ADVANCED ANALYTICS & BI ==========

// Real-time Performance Dashboard
adminRouter.get('/performance/real-time', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [snapshot] = await db.select().from(performanceSnapshots)
      .where(eq(performanceSnapshots.snapshotType, 'REAL_TIME'))
      .orderBy(desc(performanceSnapshots.createdAt))
      .limit(1);
    res.json(snapshot || {});
  } catch (error) {
    console.error('Error fetching real-time performance:', error);
    res.status(500).json({ error: 'Failed to fetch real-time performance' });
  }
});

adminRouter.get('/performance-snapshots', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { type } = req.query;
    let query = db.select().from(performanceSnapshots).orderBy(desc(performanceSnapshots.createdAt)).limit(100);
    
    if (type) {
      query = query.where(eq(performanceSnapshots.snapshotType, type as string)) as any;
    }
    
    const snapshots = await query;
    res.json(snapshots);
  } catch (error) {
    console.error('Error fetching performance snapshots:', error);
    res.status(500).json({ error: 'Failed to fetch performance snapshots' });
  }
});

// Predictive Analytics
adminRouter.get('/predictive-models', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const models = await db.select().from(predictiveModels).orderBy(desc(predictiveModels.createdAt));
    res.json(models);
  } catch (error) {
    console.error('Error fetching predictive models:', error);
    res.status(500).json({ error: 'Failed to fetch predictive models' });
  }
});

adminRouter.post('/predictive-models', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const modelData = { ...req.body, createdBy: req.admin!.id };
    const [model] = await db.insert(predictiveModels).values(modelData).returning();
    res.json(model);
  } catch (error) {
    console.error('Error creating predictive model:', error);
    res.status(500).json({ error: 'Failed to create predictive model' });
  }
});

// Cohort Analysis
adminRouter.get('/cohort-analysis', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { cohortType } = req.query;
    let query = db.select().from(cohortData).orderBy(desc(cohortData.periodStart)).limit(50);
    
    if (cohortType) {
      query = query.where(eq(cohortData.cohortType, cohortType as string)) as any;
    }
    
    const cohorts = await query;
    res.json(cohorts);
  } catch (error) {
    console.error('Error fetching cohort analysis:', error);
    res.status(500).json({ error: 'Failed to fetch cohort analysis' });
  }
});

// Revenue Forecasting
adminRouter.get('/revenue-forecasts', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { forecastType } = req.query;
    let query = db.select().from(revenueForecasts).orderBy(desc(revenueForecasts.forecastPeriod)).limit(100);
    
    if (forecastType) {
      query = query.where(eq(revenueForecasts.forecastType, forecastType as string)) as any;
    }
    
    const forecasts = await query;
    res.json(forecasts);
  } catch (error) {
    console.error('Error fetching revenue forecasts:', error);
    res.status(500).json({ error: 'Failed to fetch revenue forecasts' });
  }
});

adminRouter.post('/revenue-forecasts', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const forecastData = { ...req.body, generatedBy: req.admin!.id };
    const [forecast] = await db.insert(revenueForecasts).values(forecastData).returning();
    res.json(forecast);
  } catch (error) {
    console.error('Error creating revenue forecast:', error);
    res.status(500).json({ error: 'Failed to create revenue forecast' });
  }
});

// ========== PHASE 5D: OPERATIONAL EXCELLENCE ==========

// Staff Management
adminRouter.get('/staff-members', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { department, status } = req.query;
    let query = db.select().from(staffMembers).orderBy(asc(staffMembers.lastName));
    
    if (department) {
      query = query.where(eq(staffMembers.department, department as string)) as any;
    }
    if (status) {
      query = query.where(eq(staffMembers.status, status as string)) as any;
    }
    
    const staff = await query;
    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff members:', error);
    res.status(500).json({ error: 'Failed to fetch staff members' });
  }
});

adminRouter.post('/staff-members', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const staffData = { ...req.body, createdBy: req.admin!.id };
    const [staff] = await db.insert(staffMembers).values(staffData).returning();
    await logAdminAction(req.admin!.id, 'CREATE_STAFF_MEMBER', null, { staffId: staff.id }, req.ip, req.headers['user-agent']);
    res.json(staff);
  } catch (error) {
    console.error('Error creating staff member:', error);
    res.status(500).json({ error: 'Failed to create staff member' });
  }
});

// Shift Scheduling
adminRouter.get('/shift-schedules', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { staffId, shiftDate, status } = req.query;
    let query = db.select().from(shiftSchedules).orderBy(desc(shiftSchedules.shiftDate)).limit(200);
    
    if (staffId) {
      query = query.where(eq(shiftSchedules.staffId, staffId as string)) as any;
    }
    if (status) {
      query = query.where(eq(shiftSchedules.status, status as string)) as any;
    }
    
    const shifts = await query;
    res.json(shifts);
  } catch (error) {
    console.error('Error fetching shift schedules:', error);
    res.status(500).json({ error: 'Failed to fetch shift schedules' });
  }
});

adminRouter.post('/shift-schedules', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const shiftData = { ...req.body, createdBy: req.admin!.id };
    const [shift] = await db.insert(shiftSchedules).values(shiftData).returning();
    res.json(shift);
  } catch (error) {
    console.error('Error creating shift schedule:', error);
    res.status(500).json({ error: 'Failed to create shift schedule' });
  }
});

// Task Management
adminRouter.get('/task-assignments', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { assignedTo, status, priority } = req.query;
    let query = db.select().from(taskAssignments).orderBy(desc(taskAssignments.createdAt)).limit(200);
    
    if (assignedTo) {
      query = query.where(eq(taskAssignments.assignedTo, assignedTo as string)) as any;
    }
    if (status) {
      query = query.where(eq(taskAssignments.status, status as string)) as any;
    }
    if (priority) {
      query = query.where(eq(taskAssignments.priority, priority as string)) as any;
    }
    
    const tasks = await query;
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching task assignments:', error);
    res.status(500).json({ error: 'Failed to fetch task assignments' });
  }
});

adminRouter.post('/task-assignments', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const taskData = { ...req.body, assignedBy: req.admin!.id };
    const [task] = await db.insert(taskAssignments).values(taskData).returning();
    res.json(task);
  } catch (error) {
    console.error('Error creating task assignment:', error);
    res.status(500).json({ error: 'Failed to create task assignment' });
  }
});

adminRouter.patch('/task-assignments/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const [task] = await db.update(taskAssignments).set(req.body).where(eq(taskAssignments.id, id)).returning();
    res.json(task);
  } catch (error) {
    console.error('Error updating task assignment:', error);
    res.status(500).json({ error: 'Failed to update task assignment' });
  }
});

// System Health Monitoring
adminRouter.get('/system-health', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { service, status } = req.query;
    let query = db.select().from(systemHealthLogs).orderBy(desc(systemHealthLogs.loggedAt)).limit(500);
    
    if (service) {
      query = query.where(eq(systemHealthLogs.service, service as string)) as any;
    }
    if (status) {
      query = query.where(eq(systemHealthLogs.status, status as string)) as any;
    }
    
    const logs = await query;
    res.json(logs);
  } catch (error) {
    console.error('Error fetching system health logs:', error);
    res.status(500).json({ error: 'Failed to fetch system health logs' });
  }
});

adminRouter.get('/system-health/summary', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [stats] = await db.execute(sql`
      SELECT 
        service,
        status,
        AVG(response_time) as avg_response_time,
        AVG(cpu_usage) as avg_cpu_usage,
        AVG(memory_usage) as avg_memory_usage,
        SUM(error_count) as total_errors
      FROM system_health_logs
      WHERE logged_at >= NOW() - INTERVAL '1 hour'
      GROUP BY service, status
      ORDER BY service, status
    `);
    res.json(stats.rows);
  } catch (error) {
    console.error('Error fetching system health summary:', error);
    res.status(500).json({ error: 'Failed to fetch system health summary' });
  }
});

adminRouter.post('/system-health', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [log] = await db.insert(systemHealthLogs).values(req.body).returning();
    res.json(log);
  } catch (error) {
    console.error('Error creating system health log:', error);
    res.status(500).json({ error: 'Failed to create system health log' });
  }
});


// =============================================
// PHASE 6: ADVANCED CASINO INTELLIGENCE & ENGAGEMENT ROUTES
// =============================================

// Import Phase 6 tables
import {
  leaderboards, achievements, playerAchievements, socialFeed, communityEvents,
  mobileAppConfig, pushNotificationCampaigns, apiManagement, platformAnalytics,
  bankingIntegration, taxReporting, financialForecasting, accountingIntegration,
  playerLtv, churnPrevention, winLossManagement, playerHealthScoring
} from '@shared/schema';

// ========== PHASE 6A: SOCIAL & COMMUNITY ==========

// Leaderboards Management
adminRouter.get('/leaderboards', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { status, timeframe } = req.query;
    let query = db.select().from(leaderboards).orderBy(desc(leaderboards.startDate)).limit(100);
    
    if (status) {
      query = query.where(eq(leaderboards.status, status as string)) as any;
    }
    if (timeframe) {
      query = query.where(eq(leaderboards.timeframe, timeframe as string)) as any;
    }
    
    const boards = await query;
    res.json(boards);
  } catch (error) {
    console.error('Error fetching leaderboards:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboards' });
  }
});

adminRouter.post('/leaderboards', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const leaderboardData = { ...req.body, createdBy: req.admin!.id };
    const [leaderboard] = await db.insert(leaderboards).values(leaderboardData).returning();
    await logAdminAction(req.admin!.id, 'CREATE_LEADERBOARD', null, { leaderboardId: leaderboard.id }, req.ip, req.headers['user-agent']);
    res.json(leaderboard);
  } catch (error) {
    console.error('Error creating leaderboard:', error);
    res.status(500).json({ error: 'Failed to create leaderboard' });
  }
});

adminRouter.patch('/leaderboards/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const [leaderboard] = await db.update(leaderboards).set(req.body).where(eq(leaderboards.id, id)).returning();
    res.json(leaderboard);
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    res.status(500).json({ error: 'Failed to update leaderboard' });
  }
});

// Achievements System
adminRouter.get('/achievements', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { type, category, isActive } = req.query;
    let query = db.select().from(achievements).orderBy(asc(achievements.displayOrder));
    
    if (type) {
      query = query.where(eq(achievements.achievementType, type as string)) as any;
    }
    if (category) {
      query = query.where(eq(achievements.category, category as string)) as any;
    }
    if (isActive !== undefined) {
      query = query.where(eq(achievements.isActive, isActive === 'true')) as any;
    }
    
    const achvmnts = await query;
    res.json(achvmnts);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

adminRouter.post('/achievements', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const achievementData = { ...req.body, createdBy: req.admin!.id };
    const [achievement] = await db.insert(achievements).values(achievementData).returning();
    res.json(achievement);
  } catch (error) {
    console.error('Error creating achievement:', error);
    res.status(500).json({ error: 'Failed to create achievement' });
  }
});

adminRouter.get('/player-achievements', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId } = req.query;
    let query = db.select().from(playerAchievements).orderBy(desc(playerAchievements.unlockedAt)).limit(200);
    
    if (userId) {
      query = query.where(eq(playerAchievements.userId, userId as string)) as any;
    }
    
    const playerAchs = await query;
    res.json(playerAchs);
  } catch (error) {
    console.error('Error fetching player achievements:', error);
    res.status(500).json({ error: 'Failed to fetch player achievements' });
  }
});

// Social Feed
adminRouter.get('/social-feed', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { feedType, isApproved } = req.query;
    let query = db.select().from(socialFeed).orderBy(desc(socialFeed.createdAt)).limit(100);
    
    if (feedType) {
      query = query.where(eq(socialFeed.feedType, feedType as string)) as any;
    }
    if (isApproved !== undefined) {
      query = query.where(eq(socialFeed.isApproved, isApproved === 'true')) as any;
    }
    
    const feeds = await query;
    res.json(feeds);
  } catch (error) {
    console.error('Error fetching social feed:', error);
    res.status(500).json({ error: 'Failed to fetch social feed' });
  }
});

adminRouter.patch('/social-feed/:id/approve', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const [feed] = await db.update(socialFeed)
      .set({ isApproved: true, approvedBy: req.admin!.id })
      .where(eq(socialFeed.id, id))
      .returning();
    res.json(feed);
  } catch (error) {
    console.error('Error approving social feed:', error);
    res.status(500).json({ error: 'Failed to approve social feed' });
  }
});

// Community Events
adminRouter.get('/community-events', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { eventType, status } = req.query;
    let query = db.select().from(communityEvents).orderBy(desc(communityEvents.startTime)).limit(100);
    
    if (eventType) {
      query = query.where(eq(communityEvents.eventType, eventType as string)) as any;
    }
    if (status) {
      query = query.where(eq(communityEvents.status, status as string)) as any;
    }
    
    const events = await query;
    res.json(events);
  } catch (error) {
    console.error('Error fetching community events:', error);
    res.status(500).json({ error: 'Failed to fetch community events' });
  }
});

adminRouter.post('/community-events', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const eventData = { ...req.body, createdBy: req.admin!.id };
    const [event] = await db.insert(communityEvents).values(eventData).returning();
    res.json(event);
  } catch (error) {
    console.error('Error creating community event:', error);
    res.status(500).json({ error: 'Failed to create community event' });
  }
});

adminRouter.patch('/community-events/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const [event] = await db.update(communityEvents).set(req.body).where(eq(communityEvents.id, id)).returning();
    res.json(event);
  } catch (error) {
    console.error('Error updating community event:', error);
    res.status(500).json({ error: 'Failed to update community event' });
  }
});

// ========== PHASE 6B: MOBILE & PLATFORM ==========

// Mobile App Configuration
adminRouter.get('/mobile-app-config', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { platform } = req.query;
    let query = db.select().from(mobileAppConfig).orderBy(desc(mobileAppConfig.updatedAt));
    
    if (platform) {
      query = query.where(eq(mobileAppConfig.platform, platform as string)) as any;
    }
    
    const configs = await query;
    res.json(configs);
  } catch (error) {
    console.error('Error fetching mobile app config:', error);
    res.status(500).json({ error: 'Failed to fetch mobile app config' });
  }
});

adminRouter.post('/mobile-app-config', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const configData = { ...req.body, updatedBy: req.admin!.id };
    const [config] = await db.insert(mobileAppConfig).values(configData).returning();
    res.json(config);
  } catch (error) {
    console.error('Error creating mobile app config:', error);
    res.status(500).json({ error: 'Failed to create mobile app config' });
  }
});

adminRouter.patch('/mobile-app-config/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedBy: req.admin!.id };
    const [config] = await db.update(mobileAppConfig).set(updateData).where(eq(mobileAppConfig.id, id)).returning();
    res.json(config);
  } catch (error) {
    console.error('Error updating mobile app config:', error);
    res.status(500).json({ error: 'Failed to update mobile app config' });
  }
});

// Push Notification Campaigns
adminRouter.get('/push-notification-campaigns', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { status, targetAudience } = req.query;
    let query = db.select().from(pushNotificationCampaigns).orderBy(desc(pushNotificationCampaigns.createdAt)).limit(100);
    
    if (status) {
      query = query.where(eq(pushNotificationCampaigns.status, status as string)) as any;
    }
    if (targetAudience) {
      query = query.where(eq(pushNotificationCampaigns.targetAudience, targetAudience as string)) as any;
    }
    
    const campaigns = await query;
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching push notification campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch push notification campaigns' });
  }
});

adminRouter.post('/push-notification-campaigns', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const campaignData = { ...req.body, createdBy: req.admin!.id };
    const [campaign] = await db.insert(pushNotificationCampaigns).values(campaignData).returning();
    res.json(campaign);
  } catch (error) {
    console.error('Error creating push notification campaign:', error);
    res.status(500).json({ error: 'Failed to create push notification campaign' });
  }
});

adminRouter.patch('/push-notification-campaigns/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const [campaign] = await db.update(pushNotificationCampaigns).set(req.body).where(eq(pushNotificationCampaigns.id, id)).returning();
    res.json(campaign);
  } catch (error) {
    console.error('Error updating push notification campaign:', error);
    res.status(500).json({ error: 'Failed to update push notification campaign' });
  }
});

// API Management
adminRouter.get('/api-management', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { apiType, isActive } = req.query;
    let query = db.select().from(apiManagement).orderBy(desc(apiManagement.createdAt));
    
    if (apiType) {
      query = query.where(eq(apiManagement.apiType, apiType as string)) as any;
    }
    if (isActive !== undefined) {
      query = query.where(eq(apiManagement.isActive, isActive === 'true')) as any;
    }
    
    const apis = await query;
    res.json(apis);
  } catch (error) {
    console.error('Error fetching API management:', error);
    res.status(500).json({ error: 'Failed to fetch API management' });
  }
});

adminRouter.post('/api-management', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const apiData = { ...req.body, createdBy: req.admin!.id };
    const [api] = await db.insert(apiManagement).values(apiData).returning();
    await logAdminAction(req.admin!.id, 'CREATE_API_KEY', null, { apiId: api.id }, req.ip, req.headers['user-agent']);
    res.json(api);
  } catch (error) {
    console.error('Error creating API management:', error);
    res.status(500).json({ error: 'Failed to create API management' });
  }
});

// Platform Analytics
adminRouter.get('/platform-analytics', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { platform, metricType } = req.query;
    let query = db.select().from(platformAnalytics).orderBy(desc(platformAnalytics.recordedAt)).limit(500);
    
    if (platform) {
      query = query.where(eq(platformAnalytics.platform, platform as string)) as any;
    }
    if (metricType) {
      query = query.where(eq(platformAnalytics.metricType, metricType as string)) as any;
    }
    
    const analytics = await query;
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching platform analytics:', error);
    res.status(500).json({ error: 'Failed to fetch platform analytics' });
  }
});

adminRouter.get('/platform-analytics/summary', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [stats] = await db.execute(sql`
      SELECT 
        platform,
        SUM(active_users) as total_active_users,
        SUM(new_users) as total_new_users,
        SUM(session_count) as total_sessions,
        AVG(avg_session_duration) as avg_duration,
        AVG(bounce_rate) as avg_bounce_rate
      FROM platform_analytics
      WHERE recorded_at >= NOW() - INTERVAL '24 hours'
      GROUP BY platform
      ORDER BY total_active_users DESC
    `);
    res.json(stats.rows);
  } catch (error) {
    console.error('Error fetching platform analytics summary:', error);
    res.status(500).json({ error: 'Failed to fetch platform analytics summary' });
  }
});

// ========== PHASE 6C: FINANCIAL INTELLIGENCE ==========

// Banking Integration
adminRouter.get('/banking-integration', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId, verificationStatus } = req.query;
    let query = db.select().from(bankingIntegration).orderBy(desc(bankingIntegration.createdAt)).limit(200);
    
    if (userId) {
      query = query.where(eq(bankingIntegration.userId, userId as string)) as any;
    }
    if (verificationStatus) {
      query = query.where(eq(bankingIntegration.verificationStatus, verificationStatus as string)) as any;
    }
    
    const banks = await query;
    res.json(banks);
  } catch (error) {
    console.error('Error fetching banking integration:', error);
    res.status(500).json({ error: 'Failed to fetch banking integration' });
  }
});

adminRouter.patch('/banking-integration/:id/verify', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const [bank] = await db.update(bankingIntegration)
      .set({ 
        verificationStatus: 'VERIFIED', 
        lastVerifiedAt: new Date(),
        verifiedBy: req.admin!.id 
      })
      .where(eq(bankingIntegration.id, id))
      .returning();
    res.json(bank);
  } catch (error) {
    console.error('Error verifying banking integration:', error);
    res.status(500).json({ error: 'Failed to verify banking integration' });
  }
});

// Tax Reporting
adminRouter.get('/tax-reporting', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { taxYear, formType, filingStatus } = req.query;
    let query = db.select().from(taxReporting).orderBy(desc(taxReporting.createdAt)).limit(200);
    
    if (taxYear) {
      query = query.where(eq(taxReporting.taxYear, parseInt(taxYear as string))) as any;
    }
    if (formType) {
      query = query.where(eq(taxReporting.formType, formType as string)) as any;
    }
    if (filingStatus) {
      query = query.where(eq(taxReporting.filingStatus, filingStatus as string)) as any;
    }
    
    const reports = await query;
    res.json(reports);
  } catch (error) {
    console.error('Error fetching tax reporting:', error);
    res.status(500).json({ error: 'Failed to fetch tax reporting' });
  }
});

adminRouter.post('/tax-reporting', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const reportData = { ...req.body, generatedBy: req.admin!.id };
    const [report] = await db.insert(taxReporting).values(reportData).returning();
    res.json(report);
  } catch (error) {
    console.error('Error creating tax report:', error);
    res.status(500).json({ error: 'Failed to create tax report' });
  }
});

adminRouter.patch('/tax-reporting/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const [report] = await db.update(taxReporting).set(req.body).where(eq(taxReporting.id, id)).returning();
    res.json(report);
  } catch (error) {
    console.error('Error updating tax report:', error);
    res.status(500).json({ error: 'Failed to update tax report' });
  }
});

// Financial Forecasting
adminRouter.get('/financial-forecasting', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { forecastType, timeframe } = req.query;
    let query = db.select().from(financialForecasting).orderBy(desc(financialForecasting.forecastPeriod)).limit(100);
    
    if (forecastType) {
      query = query.where(eq(financialForecasting.forecastType, forecastType as string)) as any;
    }
    if (timeframe) {
      query = query.where(eq(financialForecasting.timeframe, timeframe as string)) as any;
    }
    
    const forecasts = await query;
    res.json(forecasts);
  } catch (error) {
    console.error('Error fetching financial forecasting:', error);
    res.status(500).json({ error: 'Failed to fetch financial forecasting' });
  }
});

adminRouter.post('/financial-forecasting', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const forecastData = { ...req.body, generatedBy: req.admin!.id };
    const [forecast] = await db.insert(financialForecasting).values(forecastData).returning();
    res.json(forecast);
  } catch (error) {
    console.error('Error creating financial forecast:', error);
    res.status(500).json({ error: 'Failed to create financial forecast' });
  }
});

// Accounting Integration
adminRouter.get('/accounting-integration', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { provider, status } = req.query;
    let query = db.select().from(accountingIntegration).orderBy(desc(accountingIntegration.createdAt));
    
    if (provider) {
      query = query.where(eq(accountingIntegration.provider, provider as string)) as any;
    }
    if (status) {
      query = query.where(eq(accountingIntegration.status, status as string)) as any;
    }
    
    const integrations = await query;
    res.json(integrations);
  } catch (error) {
    console.error('Error fetching accounting integration:', error);
    res.status(500).json({ error: 'Failed to fetch accounting integration' });
  }
});

adminRouter.post('/accounting-integration', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const integrationData = { ...req.body, configuredBy: req.admin!.id };
    const [integration] = await db.insert(accountingIntegration).values(integrationData).returning();
    res.json(integration);
  } catch (error) {
    console.error('Error creating accounting integration:', error);
    res.status(500).json({ error: 'Failed to create accounting integration' });
  }
});

// ========== PHASE 6D: PLAYER LIFECYCLE ==========

// Player Lifetime Value (LTV)
adminRouter.get('/player-ltv', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { ltvTier, userId } = req.query;
    let query = db.select().from(playerLtv).orderBy(desc(playerLtv.currentLtv)).limit(200);
    
    if (ltvTier) {
      query = query.where(eq(playerLtv.ltvTier, ltvTier as string)) as any;
    }
    if (userId) {
      query = query.where(eq(playerLtv.userId, userId as string)) as any;
    }
    
    const ltvs = await query;
    res.json(ltvs);
  } catch (error) {
    console.error('Error fetching player LTV:', error);
    res.status(500).json({ error: 'Failed to fetch player LTV' });
  }
});

adminRouter.get('/player-ltv/summary', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [stats] = await db.execute(sql`
      SELECT 
        ltv_tier,
        COUNT(*) as player_count,
        AVG(current_ltv) as avg_ltv,
        SUM(current_ltv) as total_ltv,
        AVG(churn_risk) as avg_churn_risk
      FROM player_ltv
      WHERE ltv_tier IS NOT NULL
      GROUP BY ltv_tier
      ORDER BY 
        CASE ltv_tier
          WHEN 'WHALE' THEN 1
          WHEN 'VIP' THEN 2
          WHEN 'HIGH' THEN 3
          WHEN 'MEDIUM' THEN 4
          WHEN 'LOW' THEN 5
        END
    `);
    res.json(stats.rows);
  } catch (error) {
    console.error('Error fetching player LTV summary:', error);
    res.status(500).json({ error: 'Failed to fetch player LTV summary' });
  }
});

// Churn Prevention
adminRouter.get('/churn-prevention', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { riskLevel, interventionStatus } = req.query;
    let query = db.select().from(churnPrevention).orderBy(desc(churnPrevention.riskScore)).limit(200);
    
    if (riskLevel) {
      query = query.where(eq(churnPrevention.riskLevel, riskLevel as string)) as any;
    }
    if (interventionStatus) {
      query = query.where(eq(churnPrevention.interventionStatus, interventionStatus as string)) as any;
    }
    
    const churnData = await query;
    res.json(churnData);
  } catch (error) {
    console.error('Error fetching churn prevention:', error);
    res.status(500).json({ error: 'Failed to fetch churn prevention' });
  }
});

adminRouter.post('/churn-prevention', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const churnData = { ...req.body, assignedTo: req.admin!.id };
    const [churn] = await db.insert(churnPrevention).values(churnData).returning();
    res.json(churn);
  } catch (error) {
    console.error('Error creating churn prevention record:', error);
    res.status(500).json({ error: 'Failed to create churn prevention record' });
  }
});

adminRouter.patch('/churn-prevention/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const [churn] = await db.update(churnPrevention).set(req.body).where(eq(churnPrevention.id, id)).returning();
    res.json(churn);
  } catch (error) {
    console.error('Error updating churn prevention:', error);
    res.status(500).json({ error: 'Failed to update churn prevention' });
  }
});

// Win/Loss Management
adminRouter.get('/win-loss-management', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId, periodType } = req.query;
    let query = db.select().from(winLossManagement).orderBy(desc(winLossManagement.periodStart)).limit(200);
    
    if (userId) {
      query = query.where(eq(winLossManagement.userId, userId as string)) as any;
    }
    if (periodType) {
      query = query.where(eq(winLossManagement.periodType, periodType as string)) as any;
    }
    
    const winLoss = await query;
    res.json(winLoss);
  } catch (error) {
    console.error('Error fetching win/loss management:', error);
    res.status(500).json({ error: 'Failed to fetch win/loss management' });
  }
});

adminRouter.get('/win-loss-management/summary', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [stats] = await db.execute(sql`
      SELECT 
        period_type,
        COUNT(*) as record_count,
        SUM(total_wagered) as total_wagered,
        SUM(net_win_loss) as total_net_win_loss,
        AVG(win_rate) as avg_win_rate,
        COUNT(*) FILTER (WHERE limit_reached = true) as limits_reached
      FROM win_loss_management
      WHERE period_start >= NOW() - INTERVAL '30 days'
      GROUP BY period_type
      ORDER BY period_type
    `);
    res.json(stats.rows);
  } catch (error) {
    console.error('Error fetching win/loss summary:', error);
    res.status(500).json({ error: 'Failed to fetch win/loss summary' });
  }
});

// Player Health Scoring
adminRouter.get('/player-health-scoring', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { healthStatus, trendDirection } = req.query;
    let query = db.select().from(playerHealthScoring).orderBy(desc(playerHealthScoring.overallScore)).limit(200);
    
    if (healthStatus) {
      query = query.where(eq(playerHealthScoring.healthStatus, healthStatus as string)) as any;
    }
    if (trendDirection) {
      query = query.where(eq(playerHealthScoring.trendDirection, trendDirection as string)) as any;
    }
    
    const healthScores = await query;
    res.json(healthScores);
  } catch (error) {
    console.error('Error fetching player health scoring:', error);
    res.status(500).json({ error: 'Failed to fetch player health scoring' });
  }
});

adminRouter.get('/player-health-scoring/summary', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [stats] = await db.execute(sql`
      SELECT 
        health_status,
        COUNT(*) as player_count,
        AVG(overall_score) as avg_score,
        AVG(engagement_score) as avg_engagement,
        AVG(financial_health_score) as avg_financial_health,
        AVG(responsible_gaming_score) as avg_responsible_gaming
      FROM player_health_scoring
      GROUP BY health_status
      ORDER BY 
        CASE health_status
          WHEN 'EXCELLENT' THEN 1
          WHEN 'GOOD' THEN 2
          WHEN 'FAIR' THEN 3
          WHEN 'POOR' THEN 4
          WHEN 'CRITICAL' THEN 5
        END
    `);
    res.json(stats.rows);
  } catch (error) {
    console.error('Error fetching player health summary:', error);
    res.status(500).json({ error: 'Failed to fetch player health summary' });
  }
});

adminRouter.patch('/player-health-scoring/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, lastReviewedBy: req.admin!.id };
    const [health] = await db.update(playerHealthScoring).set(updateData).where(eq(playerHealthScoring.id, id)).returning();
    res.json(health);
  } catch (error) {
    console.error('Error updating player health scoring:', error);
    res.status(500).json({ error: 'Failed to update player health scoring' });
  }
});


// =============================================
// PHASE 7: ADVANCED GAME OPERATIONS, COMMUNICATION, BI & DEVOPS ROUTES
// =============================================

// Import Phase 7 tables
import {
  gameTesting, rngVerification, gameSessionLogs, gameConfiguration,
  inAppMessages, notificationPreferences, playerFeedback, communicationLogs,
  executiveDashboard, customKpiTracking, exportManagement, dataWarehouseSync,
  serverMonitoring, deploymentManagement, featureFlags, errorTracking
} from '@shared/schema';

// ========== PHASE 7A: ADVANCED GAME OPERATIONS & RNG ==========

// Game Testing & QA
adminRouter.get('/game-testing', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { gameName, testType, status } = req.query;
    let query = db.select().from(gameTesting).orderBy(desc(gameTesting.createdAt)).limit(200);
    
    if (gameName) {
      query = query.where(eq(gameTesting.gameName, gameName as string)) as any;
    }
    if (testType) {
      query = query.where(eq(gameTesting.testType, testType as string)) as any;
    }
    if (status) {
      query = query.where(eq(gameTesting.status, status as string)) as any;
    }
    
    const tests = await query;
    res.json(tests);
  } catch (error) {
    console.error('Error fetching game testing:', error);
    res.status(500).json({ error: 'Failed to fetch game testing' });
  }
});

adminRouter.post('/game-testing', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const testData = { ...req.body, assignedTo: req.admin!.id };
    const [test] = await db.insert(gameTesting).values(testData).returning();
    res.json(test);
  } catch (error) {
    console.error('Error creating game test:', error);
    res.status(500).json({ error: 'Failed to create game test' });
  }
});

adminRouter.patch('/game-testing/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, completedBy: req.admin!.id };
    const [test] = await db.update(gameTesting).set(updateData).where(eq(gameTesting.id, id)).returning();
    res.json(test);
  } catch (error) {
    console.error('Error updating game test:', error);
    res.status(500).json({ error: 'Failed to update game test' });
  }
});

// RNG Verification
adminRouter.get('/rng-verification', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { gameName, passed } = req.query;
    let query = db.select().from(rngVerification).orderBy(desc(rngVerification.testDate)).limit(200);
    
    if (gameName) {
      query = query.where(eq(rngVerification.gameName, gameName as string)) as any;
    }
    if (passed !== undefined) {
      query = query.where(eq(rngVerification.passed, passed === 'true')) as any;
    }
    
    const verifications = await query;
    res.json(verifications);
  } catch (error) {
    console.error('Error fetching RNG verification:', error);
    res.status(500).json({ error: 'Failed to fetch RNG verification' });
  }
});

adminRouter.post('/rng-verification', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const verificationData = { ...req.body, verifiedBy: req.admin!.id };
    const [verification] = await db.insert(rngVerification).values(verificationData).returning();
    await logAdminAction(req.admin!.id, 'RNG_VERIFICATION', null, { verificationId: verification.id }, req.ip, req.headers['user-agent']);
    res.json(verification);
  } catch (error) {
    console.error('Error creating RNG verification:', error);
    res.status(500).json({ error: 'Failed to create RNG verification' });
  }
});

// Game Session Logs
adminRouter.get('/game-session-logs', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId, gameName } = req.query;
    let query = db.select().from(gameSessionLogs).orderBy(desc(gameSessionLogs.startTime)).limit(500);
    
    if (userId) {
      query = query.where(eq(gameSessionLogs.userId, userId as string)) as any;
    }
    if (gameName) {
      query = query.where(eq(gameSessionLogs.gameName, gameName as string)) as any;
    }
    
    const logs = await query;
    res.json(logs);
  } catch (error) {
    console.error('Error fetching game session logs:', error);
    res.status(500).json({ error: 'Failed to fetch game session logs' });
  }
});

adminRouter.get('/game-session-logs/analytics', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [stats] = await db.execute(sql`
      SELECT 
        game_name,
        COUNT(*) as session_count,
        SUM(total_bets) as total_bets,
        SUM(total_wagered) as total_wagered,
        SUM(net_result) as net_result,
        AVG(duration) as avg_duration
      FROM game_session_logs
      WHERE start_time >= NOW() - INTERVAL '24 hours'
      GROUP BY game_name
      ORDER BY total_wagered DESC
      LIMIT 20
    `);
    res.json(stats.rows);
  } catch (error) {
    console.error('Error fetching game session analytics:', error);
    res.status(500).json({ error: 'Failed to fetch game session analytics' });
  }
});

// Game Configuration Management
adminRouter.get('/game-configuration', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { gameName, isActive } = req.query;
    let query = db.select().from(gameConfiguration).orderBy(desc(gameConfiguration.updatedAt));
    
    if (gameName) {
      query = query.where(eq(gameConfiguration.gameName, gameName as string)) as any;
    }
    if (isActive !== undefined) {
      query = query.where(eq(gameConfiguration.isActive, isActive === 'true')) as any;
    }
    
    const configs = await query;
    res.json(configs);
  } catch (error) {
    console.error('Error fetching game configuration:', error);
    res.status(500).json({ error: 'Failed to fetch game configuration' });
  }
});

adminRouter.post('/game-configuration', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const configData = { ...req.body, configuredBy: req.admin!.id };
    const [config] = await db.insert(gameConfiguration).values(configData).returning();
    res.json(config);
  } catch (error) {
    console.error('Error creating game configuration:', error);
    res.status(500).json({ error: 'Failed to create game configuration' });
  }
});

adminRouter.patch('/game-configuration/:id/activate', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const [config] = await db.update(gameConfiguration)
      .set({ isActive: true, activatedBy: req.admin!.id, activatedAt: new Date() })
      .where(eq(gameConfiguration.id, id))
      .returning();
    res.json(config);
  } catch (error) {
    console.error('Error activating game configuration:', error);
    res.status(500).json({ error: 'Failed to activate game configuration' });
  }
});

// ========== PHASE 7B: PLAYER COMMUNICATION & ENGAGEMENT ==========

// In-App Messaging
adminRouter.get('/in-app-messages', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { recipientId, messageType } = req.query;
    let query = db.select().from(inAppMessages).orderBy(desc(inAppMessages.createdAt)).limit(200);
    
    if (recipientId) {
      query = query.where(eq(inAppMessages.recipientId, recipientId as string)) as any;
    }
    if (messageType) {
      query = query.where(eq(inAppMessages.messageType, messageType as string)) as any;
    }
    
    const messages = await query;
    res.json(messages);
  } catch (error) {
    console.error('Error fetching in-app messages:', error);
    res.status(500).json({ error: 'Failed to fetch in-app messages' });
  }
});

adminRouter.post('/in-app-messages', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const messageData = { ...req.body, senderId: req.admin!.id };
    const [message] = await db.insert(inAppMessages).values(messageData).returning();
    res.json(message);
  } catch (error) {
    console.error('Error sending in-app message:', error);
    res.status(500).json({ error: 'Failed to send in-app message' });
  }
});

// Notification Preferences
adminRouter.get('/notification-preferences', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId } = req.query;
    let query = db.select().from(notificationPreferences);
    
    if (userId) {
      query = query.where(eq(notificationPreferences.userId, userId as string)) as any;
    }
    
    const prefs = await query;
    res.json(prefs);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

adminRouter.get('/notification-preferences/summary', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [stats] = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE email_enabled = true) as email_enabled_count,
        COUNT(*) FILTER (WHERE sms_enabled = true) as sms_enabled_count,
        COUNT(*) FILTER (WHERE push_enabled = true) as push_enabled_count,
        COUNT(*) FILTER (WHERE promotional_emails = true) as promotional_count,
        COUNT(*) as total_users
      FROM notification_preferences
    `);
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching notification summary:', error);
    res.status(500).json({ error: 'Failed to fetch notification summary' });
  }
});

// Player Feedback
adminRouter.get('/player-feedback', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { feedbackType, status, category } = req.query;
    let query = db.select().from(playerFeedback).orderBy(desc(playerFeedback.createdAt)).limit(200);
    
    if (feedbackType) {
      query = query.where(eq(playerFeedback.feedbackType, feedbackType as string)) as any;
    }
    if (status) {
      query = query.where(eq(playerFeedback.status, status as string)) as any;
    }
    if (category) {
      query = query.where(eq(playerFeedback.category, category as string)) as any;
    }
    
    const feedback = await query;
    res.json(feedback);
  } catch (error) {
    console.error('Error fetching player feedback:', error);
    res.status(500).json({ error: 'Failed to fetch player feedback' });
  }
});

adminRouter.patch('/player-feedback/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = { 
      ...req.body, 
      respondedBy: req.admin!.id,
      respondedAt: new Date()
    };
    const [feedback] = await db.update(playerFeedback).set(updateData).where(eq(playerFeedback.id, id)).returning();
    res.json(feedback);
  } catch (error) {
    console.error('Error updating player feedback:', error);
    res.status(500).json({ error: 'Failed to update player feedback' });
  }
});

// Communication Logs
adminRouter.get('/communication-logs', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId, communicationType } = req.query;
    let query = db.select().from(communicationLogs).orderBy(desc(communicationLogs.createdAt)).limit(500);
    
    if (userId) {
      query = query.where(eq(communicationLogs.userId, userId as string)) as any;
    }
    if (communicationType) {
      query = query.where(eq(communicationLogs.communicationType, communicationType as string)) as any;
    }
    
    const logs = await query;
    res.json(logs);
  } catch (error) {
    console.error('Error fetching communication logs:', error);
    res.status(500).json({ error: 'Failed to fetch communication logs' });
  }
});

adminRouter.get('/communication-logs/analytics', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [stats] = await db.execute(sql`
      SELECT 
        communication_type,
        status,
        COUNT(*) as count,
        DATE(created_at) as date
      FROM communication_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY communication_type, status, DATE(created_at)
      ORDER BY date DESC, communication_type
    `);
    res.json(stats.rows);
  } catch (error) {
    console.error('Error fetching communication analytics:', error);
    res.status(500).json({ error: 'Failed to fetch communication analytics' });
  }
});

// ========== PHASE 7C: BUSINESS INTELLIGENCE & REPORTING ==========

// Executive Dashboard
adminRouter.get('/executive-dashboard', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { periodType } = req.query;
    let query = db.select().from(executiveDashboard).orderBy(desc(executiveDashboard.recordedAt)).limit(100);
    
    if (periodType) {
      query = query.where(eq(executiveDashboard.periodType, periodType as string)) as any;
    }
    
    const dashboards = await query;
    res.json(dashboards);
  } catch (error) {
    console.error('Error fetching executive dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch executive dashboard' });
  }
});

adminRouter.get('/executive-dashboard/latest', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [latest] = await db.select()
      .from(executiveDashboard)
      .orderBy(desc(executiveDashboard.recordedAt))
      .limit(1);
    res.json(latest || {});
  } catch (error) {
    console.error('Error fetching latest executive dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch latest executive dashboard' });
  }
});

// Custom KPI Tracking
adminRouter.get('/custom-kpi-tracking', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { kpiCategory, status, isActive } = req.query;
    let query = db.select().from(customKpiTracking).orderBy(desc(customKpiTracking.recordedAt)).limit(200);
    
    if (kpiCategory) {
      query = query.where(eq(customKpiTracking.kpiCategory, kpiCategory as string)) as any;
    }
    if (status) {
      query = query.where(eq(customKpiTracking.status, status as string)) as any;
    }
    if (isActive !== undefined) {
      query = query.where(eq(customKpiTracking.isActive, isActive === 'true')) as any;
    }
    
    const kpis = await query;
    res.json(kpis);
  } catch (error) {
    console.error('Error fetching custom KPI tracking:', error);
    res.status(500).json({ error: 'Failed to fetch custom KPI tracking' });
  }
});

adminRouter.post('/custom-kpi-tracking', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const kpiData = { ...req.body, createdBy: req.admin!.id };
    const [kpi] = await db.insert(customKpiTracking).values(kpiData).returning();
    res.json(kpi);
  } catch (error) {
    console.error('Error creating custom KPI:', error);
    res.status(500).json({ error: 'Failed to create custom KPI' });
  }
});

// Export Management
adminRouter.get('/export-management', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { exportType, status } = req.query;
    let query = db.select().from(exportManagement).orderBy(desc(exportManagement.createdAt)).limit(100);
    
    if (exportType) {
      query = query.where(eq(exportManagement.exportType, exportType as string)) as any;
    }
    if (status) {
      query = query.where(eq(exportManagement.status, status as string)) as any;
    }
    
    const exports = await query;
    res.json(exports);
  } catch (error) {
    console.error('Error fetching export management:', error);
    res.status(500).json({ error: 'Failed to fetch export management' });
  }
});

adminRouter.post('/export-management', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const exportData = { ...req.body, createdBy: req.admin!.id };
    const [exportJob] = await db.insert(exportManagement).values(exportData).returning();
    res.json(exportJob);
  } catch (error) {
    console.error('Error creating export job:', error);
    res.status(500).json({ error: 'Failed to create export job' });
  }
});

// Data Warehouse Sync
adminRouter.get('/data-warehouse-sync', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { warehouseProvider, status } = req.query;
    let query = db.select().from(dataWarehouseSync).orderBy(desc(dataWarehouseSync.createdAt)).limit(100);
    
    if (warehouseProvider) {
      query = query.where(eq(dataWarehouseSync.warehouseProvider, warehouseProvider as string)) as any;
    }
    if (status) {
      query = query.where(eq(dataWarehouseSync.status, status as string)) as any;
    }
    
    const syncs = await query;
    res.json(syncs);
  } catch (error) {
    console.error('Error fetching data warehouse sync:', error);
    res.status(500).json({ error: 'Failed to fetch data warehouse sync' });
  }
});

adminRouter.post('/data-warehouse-sync', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const syncData = { ...req.body, configuredBy: req.admin!.id };
    const [sync] = await db.insert(dataWarehouseSync).values(syncData).returning();
    res.json(sync);
  } catch (error) {
    console.error('Error creating data warehouse sync:', error);
    res.status(500).json({ error: 'Failed to create data warehouse sync' });
  }
});

// ========== PHASE 7D: SYSTEM ADMINISTRATION & DEVOPS ==========

// Server Monitoring
adminRouter.get('/server-monitoring', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { serverType, status } = req.query;
    let query = db.select().from(serverMonitoring).orderBy(desc(serverMonitoring.recordedAt)).limit(500);
    
    if (serverType) {
      query = query.where(eq(serverMonitoring.serverType, serverType as string)) as any;
    }
    if (status) {
      query = query.where(eq(serverMonitoring.status, status as string)) as any;
    }
    
    const monitoring = await query;
    res.json(monitoring);
  } catch (error) {
    console.error('Error fetching server monitoring:', error);
    res.status(500).json({ error: 'Failed to fetch server monitoring' });
  }
});

adminRouter.get('/server-monitoring/summary', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [stats] = await db.execute(sql`
      SELECT 
        server_type,
        status,
        AVG(cpu_usage) as avg_cpu,
        AVG(memory_usage) as avg_memory,
        AVG(disk_usage) as avg_disk,
        COUNT(*) as record_count
      FROM server_monitoring
      WHERE recorded_at >= NOW() - INTERVAL '1 hour'
      GROUP BY server_type, status
      ORDER BY server_type
    `);
    res.json(stats.rows);
  } catch (error) {
    console.error('Error fetching server monitoring summary:', error);
    res.status(500).json({ error: 'Failed to fetch server monitoring summary' });
  }
});

// Deployment Management
adminRouter.get('/deployment-management', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { environment, status } = req.query;
    let query = db.select().from(deploymentManagement).orderBy(desc(deploymentManagement.createdAt)).limit(100);
    
    if (environment) {
      query = query.where(eq(deploymentManagement.environment, environment as string)) as any;
    }
    if (status) {
      query = query.where(eq(deploymentManagement.status, status as string)) as any;
    }
    
    const deployments = await query;
    res.json(deployments);
  } catch (error) {
    console.error('Error fetching deployment management:', error);
    res.status(500).json({ error: 'Failed to fetch deployment management' });
  }
});

adminRouter.post('/deployment-management', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const deploymentData = { ...req.body, deployedBy: req.admin!.id };
    const [deployment] = await db.insert(deploymentManagement).values(deploymentData).returning();
    await logAdminAction(req.admin!.id, 'CREATE_DEPLOYMENT', null, { deploymentId: deployment.id }, req.ip, req.headers['user-agent']);
    res.json(deployment);
  } catch (error) {
    console.error('Error creating deployment:', error);
    res.status(500).json({ error: 'Failed to create deployment' });
  }
});

adminRouter.patch('/deployment-management/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const [deployment] = await db.update(deploymentManagement).set(req.body).where(eq(deploymentManagement.id, id)).returning();
    res.json(deployment);
  } catch (error) {
    console.error('Error updating deployment:', error);
    res.status(500).json({ error: 'Failed to update deployment' });
  }
});

// Feature Flags
adminRouter.get('/feature-flags', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { environment, isEnabled } = req.query;
    let query = db.select().from(featureFlags).orderBy(asc(featureFlags.flagName));
    
    if (environment) {
      query = query.where(eq(featureFlags.environment, environment as string)) as any;
    }
    if (isEnabled !== undefined) {
      query = query.where(eq(featureFlags.isEnabled, isEnabled === 'true')) as any;
    }
    
    const flags = await query;
    res.json(flags);
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
});

adminRouter.post('/feature-flags', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const flagData = { ...req.body, createdBy: req.admin!.id, lastModifiedBy: req.admin!.id };
    const [flag] = await db.insert(featureFlags).values(flagData).returning();
    await logAdminAction(req.admin!.id, 'CREATE_FEATURE_FLAG', null, { flagKey: flag.flagKey }, req.ip, req.headers['user-agent']);
    res.json(flag);
  } catch (error) {
    console.error('Error creating feature flag:', error);
    res.status(500).json({ error: 'Failed to create feature flag' });
  }
});

adminRouter.patch('/feature-flags/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, lastModifiedBy: req.admin!.id };
    const [flag] = await db.update(featureFlags).set(updateData).where(eq(featureFlags.id, id)).returning();
    res.json(flag);
  } catch (error) {
    console.error('Error updating feature flag:', error);
    res.status(500).json({ error: 'Failed to update feature flag' });
  }
});

// Error Tracking
adminRouter.get('/error-tracking', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { errorType, severity, status, environment } = req.query;
    let query = db.select().from(errorTracking).orderBy(desc(errorTracking.lastOccurrence)).limit(200);
    
    if (errorType) {
      query = query.where(eq(errorTracking.errorType, errorType as string)) as any;
    }
    if (severity) {
      query = query.where(eq(errorTracking.severity, severity as string)) as any;
    }
    if (status) {
      query = query.where(eq(errorTracking.status, status as string)) as any;
    }
    if (environment) {
      query = query.where(eq(errorTracking.environment, environment as string)) as any;
    }
    
    const errors = await query;
    res.json(errors);
  } catch (error) {
    console.error('Error fetching error tracking:', error);
    res.status(500).json({ error: 'Failed to fetch error tracking' });
  }
});

adminRouter.get('/error-tracking/summary', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [stats] = await db.execute(sql`
      SELECT 
        severity,
        status,
        environment,
        COUNT(*) as error_count,
        SUM(occurrence_count) as total_occurrences
      FROM error_tracking
      WHERE first_occurrence >= NOW() - INTERVAL '24 hours'
      GROUP BY severity, status, environment
      ORDER BY total_occurrences DESC
    `);
    res.json(stats.rows);
  } catch (error) {
    console.error('Error fetching error tracking summary:', error);
    res.status(500).json({ error: 'Failed to fetch error tracking summary' });
  }
});

adminRouter.patch('/error-tracking/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, assignedTo: req.admin!.id };
    const [error] = await db.update(errorTracking).set(updateData).where(eq(errorTracking.id, id)).returning();
    res.json(error);
  } catch (error) {
    console.error('Error updating error tracking:', error);
    res.status(500).json({ error: 'Failed to update error tracking' });
  }
});

// =============================================
// PHASE 8: AI-POWERED INTELLIGENCE & PLATFORM OPTIMIZATION ROUTES
// =============================================

// Import Phase 8 tables
import {
  aiPlayerInsights, predictiveBehaviorModeling, automatedRiskScoring, smartRecommendations,
  multiLayerAuth, advancedFraudPrevention, complianceAutomation, securityIncidents,
  dynamicContent, brandAssetLibrary, multiLanguageContent, promotionalContentScheduler,
  performanceAnalytics, databaseOptimization, cdnCachingManagement, loadBalancerConfig
} from '@shared/schema';

// ========== PHASE 8A: AI & MACHINE LEARNING ==========

// AI Player Insights
adminRouter.get('/ai-player-insights', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId, insightType, insightCategory, severity } = req.query;
    let query = db.select().from(aiPlayerInsights).orderBy(desc(aiPlayerInsights.createdAt)).limit(200);
    
    if (userId) {
      query = query.where(eq(aiPlayerInsights.userId, userId as string)) as any;
    }
    if (insightType) {
      query = query.where(eq(aiPlayerInsights.insightType, insightType as string)) as any;
    }
    if (insightCategory) {
      query = query.where(eq(aiPlayerInsights.insightCategory, insightCategory as string)) as any;
    }
    if (severity) {
      query = query.where(eq(aiPlayerInsights.severity, severity as string)) as any;
    }
    
    const insights = await query;
    res.json(insights);
  } catch (error) {
    console.error('Error fetching AI player insights:', error);
    res.status(500).json({ error: 'Failed to fetch AI player insights' });
  }
});

adminRouter.post('/ai-player-insights', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [insight] = await db.insert(aiPlayerInsights).values(req.body).returning();
    await logAdminAction(req.admin!.id, 'CREATE_AI_INSIGHT', null, { insightId: insight.id }, req.ip, req.headers['user-agent']);
    res.json(insight);
  } catch (error) {
    console.error('Error creating AI player insight:', error);
    res.status(500).json({ error: 'Failed to create AI player insight' });
  }
});

adminRouter.patch('/ai-player-insights/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, actionedBy: req.admin!.id };
    const [insight] = await db.update(aiPlayerInsights).set(updateData).where(eq(aiPlayerInsights.id, id)).returning();
    res.json(insight);
  } catch (error) {
    console.error('Error updating AI player insight:', error);
    res.status(500).json({ error: 'Failed to update AI player insight' });
  }
});

// Predictive Behavior Modeling
adminRouter.get('/predictive-behavior-modeling', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId, modelType, predictionTimeframe } = req.query;
    let query = db.select().from(predictiveBehaviorModeling).orderBy(desc(predictiveBehaviorModeling.createdAt)).limit(200);
    
    if (userId) {
      query = query.where(eq(predictiveBehaviorModeling.userId, userId as string)) as any;
    }
    if (modelType) {
      query = query.where(eq(predictiveBehaviorModeling.modelType, modelType as string)) as any;
    }
    if (predictionTimeframe) {
      query = query.where(eq(predictiveBehaviorModeling.predictionTimeframe, predictionTimeframe as string)) as any;
    }
    
    const models = await query;
    res.json(models);
  } catch (error) {
    console.error('Error fetching predictive models:', error);
    res.status(500).json({ error: 'Failed to fetch predictive models' });
  }
});

adminRouter.post('/predictive-behavior-modeling', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [model] = await db.insert(predictiveBehaviorModeling).values(req.body).returning();
    res.json(model);
  } catch (error) {
    console.error('Error creating predictive model:', error);
    res.status(500).json({ error: 'Failed to create predictive model' });
  }
});

// Automated Risk Scoring
adminRouter.get('/automated-risk-scoring', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId, riskLevel, riskCategory, status } = req.query;
    let query = db.select().from(automatedRiskScoring).orderBy(desc(automatedRiskScoring.createdAt)).limit(200);
    
    if (userId) {
      query = query.where(eq(automatedRiskScoring.userId, userId as string)) as any;
    }
    if (riskLevel) {
      query = query.where(eq(automatedRiskScoring.riskLevel, riskLevel as string)) as any;
    }
    if (riskCategory) {
      query = query.where(eq(automatedRiskScoring.riskCategory, riskCategory as string)) as any;
    }
    if (status) {
      query = query.where(eq(automatedRiskScoring.status, status as string)) as any;
    }
    
    const scores = await query;
    res.json(scores);
  } catch (error) {
    console.error('Error fetching risk scores:', error);
    res.status(500).json({ error: 'Failed to fetch risk scores' });
  }
});

adminRouter.post('/automated-risk-scoring', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [score] = await db.insert(automatedRiskScoring).values(req.body).returning();
    res.json(score);
  } catch (error) {
    console.error('Error creating risk score:', error);
    res.status(500).json({ error: 'Failed to create risk score' });
  }
});

adminRouter.patch('/automated-risk-scoring/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, reviewedBy: req.admin!.id };
    const [score] = await db.update(automatedRiskScoring).set(updateData).where(eq(automatedRiskScoring.id, id)).returning();
    res.json(score);
  } catch (error) {
    console.error('Error updating risk score:', error);
    res.status(500).json({ error: 'Failed to update risk score' });
  }
});

// Smart Recommendations Engine
adminRouter.get('/smart-recommendations', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId, recommendationType, algorithmUsed } = req.query;
    let query = db.select().from(smartRecommendations).orderBy(desc(smartRecommendations.createdAt)).limit(200);
    
    if (userId) {
      query = query.where(eq(smartRecommendations.userId, userId as string)) as any;
    }
    if (recommendationType) {
      query = query.where(eq(smartRecommendations.recommendationType, recommendationType as string)) as any;
    }
    if (algorithmUsed) {
      query = query.where(eq(smartRecommendations.algorithmUsed, algorithmUsed as string)) as any;
    }
    
    const recommendations = await query;
    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

adminRouter.post('/smart-recommendations', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [recommendation] = await db.insert(smartRecommendations).values(req.body).returning();
    res.json(recommendation);
  } catch (error) {
    console.error('Error creating recommendation:', error);
    res.status(500).json({ error: 'Failed to create recommendation' });
  }
});

// ========== PHASE 8B: ADVANCED SECURITY & COMPLIANCE ==========

// Multi-Layer Authentication
adminRouter.get('/multi-layer-auth', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId, authMethod, isEnabled } = req.query;
    let query = db.select().from(multiLayerAuth).orderBy(desc(multiLayerAuth.createdAt)).limit(200);
    
    if (userId) {
      query = query.where(eq(multiLayerAuth.userId, userId as string)) as any;
    }
    if (authMethod) {
      query = query.where(eq(multiLayerAuth.authMethod, authMethod as string)) as any;
    }
    if (isEnabled !== undefined) {
      query = query.where(eq(multiLayerAuth.isEnabled, isEnabled === 'true')) as any;
    }
    
    const authMethods = await query;
    res.json(authMethods);
  } catch (error) {
    console.error('Error fetching multi-layer auth:', error);
    res.status(500).json({ error: 'Failed to fetch multi-layer auth' });
  }
});

adminRouter.post('/multi-layer-auth', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [auth] = await db.insert(multiLayerAuth).values(req.body).returning();
    await logAdminAction(req.admin!.id, 'CREATE_MULTI_LAYER_AUTH', null, { authId: auth.id }, req.ip, req.headers['user-agent']);
    res.json(auth);
  } catch (error) {
    console.error('Error creating multi-layer auth:', error);
    res.status(500).json({ error: 'Failed to create multi-layer auth' });
  }
});

adminRouter.patch('/multi-layer-auth/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const [auth] = await db.update(multiLayerAuth).set(req.body).where(eq(multiLayerAuth.id, id)).returning();
    res.json(auth);
  } catch (error) {
    console.error('Error updating multi-layer auth:', error);
    res.status(500).json({ error: 'Failed to update multi-layer auth' });
  }
});

// Advanced Fraud Prevention
adminRouter.get('/advanced-fraud-prevention', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId, fraudType, detectionMethod, caseStatus } = req.query;
    let query = db.select().from(advancedFraudPrevention).orderBy(desc(advancedFraudPrevention.createdAt)).limit(200);
    
    if (userId) {
      query = query.where(eq(advancedFraudPrevention.userId, userId as string)) as any;
    }
    if (fraudType) {
      query = query.where(eq(advancedFraudPrevention.fraudType, fraudType as string)) as any;
    }
    if (detectionMethod) {
      query = query.where(eq(advancedFraudPrevention.detectionMethod, detectionMethod as string)) as any;
    }
    if (caseStatus) {
      query = query.where(eq(advancedFraudPrevention.caseStatus, caseStatus as string)) as any;
    }
    
    const cases = await query;
    res.json(cases);
  } catch (error) {
    console.error('Error fetching fraud prevention cases:', error);
    res.status(500).json({ error: 'Failed to fetch fraud prevention cases' });
  }
});

adminRouter.post('/advanced-fraud-prevention', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const caseData = { ...req.body, investigator: req.admin!.id };
    const [fraudCase] = await db.insert(advancedFraudPrevention).values(caseData).returning();
    await logAdminAction(req.admin!.id, 'CREATE_FRAUD_CASE', null, { caseId: fraudCase.id }, req.ip, req.headers['user-agent']);
    res.json(fraudCase);
  } catch (error) {
    console.error('Error creating fraud prevention case:', error);
    res.status(500).json({ error: 'Failed to create fraud prevention case' });
  }
});

adminRouter.patch('/advanced-fraud-prevention/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const [fraudCase] = await db.update(advancedFraudPrevention).set(req.body).where(eq(advancedFraudPrevention.id, id)).returning();
    res.json(fraudCase);
  } catch (error) {
    console.error('Error updating fraud prevention case:', error);
    res.status(500).json({ error: 'Failed to update fraud prevention case' });
  }
});

// Compliance Automation
adminRouter.get('/compliance-automation', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { complianceType, jurisdiction, checkFrequency, checkStatus } = req.query;
    let query = db.select().from(complianceAutomation).orderBy(desc(complianceAutomation.createdAt)).limit(200);
    
    if (complianceType) {
      query = query.where(eq(complianceAutomation.complianceType, complianceType as string)) as any;
    }
    if (jurisdiction) {
      query = query.where(eq(complianceAutomation.jurisdiction, jurisdiction as string)) as any;
    }
    if (checkFrequency) {
      query = query.where(eq(complianceAutomation.checkFrequency, checkFrequency as string)) as any;
    }
    if (checkStatus) {
      query = query.where(eq(complianceAutomation.checkStatus, checkStatus as string)) as any;
    }
    
    const rules = await query;
    res.json(rules);
  } catch (error) {
    console.error('Error fetching compliance automation:', error);
    res.status(500).json({ error: 'Failed to fetch compliance automation' });
  }
});

adminRouter.post('/compliance-automation', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const ruleData = { ...req.body, reviewedBy: req.admin!.id };
    const [rule] = await db.insert(complianceAutomation).values(ruleData).returning();
    await logAdminAction(req.admin!.id, 'CREATE_COMPLIANCE_RULE', null, { ruleId: rule.id }, req.ip, req.headers['user-agent']);
    res.json(rule);
  } catch (error) {
    console.error('Error creating compliance rule:', error);
    res.status(500).json({ error: 'Failed to create compliance rule' });
  }
});

adminRouter.patch('/compliance-automation/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, approvedBy: req.admin!.id };
    const [rule] = await db.update(complianceAutomation).set(updateData).where(eq(complianceAutomation.id, id)).returning();
    res.json(rule);
  } catch (error) {
    console.error('Error updating compliance rule:', error);
    res.status(500).json({ error: 'Failed to update compliance rule' });
  }
});

// Security Incident Response
adminRouter.get('/security-incidents', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { incidentType, severity, status } = req.query;
    let query = db.select().from(securityIncidents).orderBy(desc(securityIncidents.detectedAt)).limit(200);
    
    if (incidentType) {
      query = query.where(eq(securityIncidents.incidentType, incidentType as string)) as any;
    }
    if (severity) {
      query = query.where(eq(securityIncidents.severity, severity as string)) as any;
    }
    if (status) {
      query = query.where(eq(securityIncidents.status, status as string)) as any;
    }
    
    const incidents = await query;
    res.json(incidents);
  } catch (error) {
    console.error('Error fetching security incidents:', error);
    res.status(500).json({ error: 'Failed to fetch security incidents' });
  }
});

adminRouter.post('/security-incidents', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const incidentData = { ...req.body, incidentCommander: req.admin!.id };
    const [incident] = await db.insert(securityIncidents).values(incidentData).returning();
    await logAdminAction(req.admin!.id, 'CREATE_SECURITY_INCIDENT', null, { incidentId: incident.id }, req.ip, req.headers['user-agent']);
    res.json(incident);
  } catch (error) {
    console.error('Error creating security incident:', error);
    res.status(500).json({ error: 'Failed to create security incident' });
  }
});

adminRouter.patch('/security-incidents/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const [incident] = await db.update(securityIncidents).set(req.body).where(eq(securityIncidents.id, id)).returning();
    res.json(incident);
  } catch (error) {
    console.error('Error updating security incident:', error);
    res.status(500).json({ error: 'Failed to update security incident' });
  }
});

// ========== PHASE 8C: CONTENT & BRAND MANAGEMENT ==========

// Dynamic Content Management
adminRouter.get('/dynamic-content', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { contentType, isActive, contentKey } = req.query;
    let query = db.select().from(dynamicContent).orderBy(desc(dynamicContent.createdAt)).limit(200);
    
    if (contentType) {
      query = query.where(eq(dynamicContent.contentType, contentType as string)) as any;
    }
    if (isActive !== undefined) {
      query = query.where(eq(dynamicContent.isActive, isActive === 'true')) as any;
    }
    if (contentKey) {
      query = query.where(eq(dynamicContent.contentKey, contentKey as string)) as any;
    }
    
    const content = await query;
    res.json(content);
  } catch (error) {
    console.error('Error fetching dynamic content:', error);
    res.status(500).json({ error: 'Failed to fetch dynamic content' });
  }
});

adminRouter.post('/dynamic-content', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const contentData = { ...req.body, createdBy: req.admin!.id, lastModifiedBy: req.admin!.id };
    const [content] = await db.insert(dynamicContent).values(contentData).returning();
    await logAdminAction(req.admin!.id, 'CREATE_DYNAMIC_CONTENT', null, { contentId: content.id }, req.ip, req.headers['user-agent']);
    res.json(content);
  } catch (error) {
    console.error('Error creating dynamic content:', error);
    res.status(500).json({ error: 'Failed to create dynamic content' });
  }
});

adminRouter.patch('/dynamic-content/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, lastModifiedBy: req.admin!.id };
    const [content] = await db.update(dynamicContent).set(updateData).where(eq(dynamicContent.id, id)).returning();
    res.json(content);
  } catch (error) {
    console.error('Error updating dynamic content:', error);
    res.status(500).json({ error: 'Failed to update dynamic content' });
  }
});

// Brand Asset Library
adminRouter.get('/brand-asset-library', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { assetType, assetCategory, isApproved } = req.query;
    let query = db.select().from(brandAssetLibrary).orderBy(desc(brandAssetLibrary.createdAt)).limit(200);
    
    if (assetType) {
      query = query.where(eq(brandAssetLibrary.assetType, assetType as string)) as any;
    }
    if (assetCategory) {
      query = query.where(eq(brandAssetLibrary.assetCategory, assetCategory as string)) as any;
    }
    if (isApproved !== undefined) {
      query = query.where(eq(brandAssetLibrary.isApproved, isApproved === 'true')) as any;
    }
    
    const assets = await query;
    res.json(assets);
  } catch (error) {
    console.error('Error fetching brand assets:', error);
    res.status(500).json({ error: 'Failed to fetch brand assets' });
  }
});

adminRouter.post('/brand-asset-library', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const assetData = { ...req.body, uploadedBy: req.admin!.id };
    const [asset] = await db.insert(brandAssetLibrary).values(assetData).returning();
    await logAdminAction(req.admin!.id, 'CREATE_BRAND_ASSET', null, { assetId: asset.id }, req.ip, req.headers['user-agent']);
    res.json(asset);
  } catch (error) {
    console.error('Error creating brand asset:', error);
    res.status(500).json({ error: 'Failed to create brand asset' });
  }
});

adminRouter.patch('/brand-asset-library/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, approvedBy: req.admin!.id };
    const [asset] = await db.update(brandAssetLibrary).set(updateData).where(eq(brandAssetLibrary.id, id)).returning();
    res.json(asset);
  } catch (error) {
    console.error('Error updating brand asset:', error);
    res.status(500).json({ error: 'Failed to update brand asset' });
  }
});

// Multi-Language Management
adminRouter.get('/multi-language-content', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { contentKey, languageCode, translationStatus, contentType } = req.query;
    let query = db.select().from(multiLanguageContent).orderBy(desc(multiLanguageContent.createdAt)).limit(200);
    
    if (contentKey) {
      query = query.where(eq(multiLanguageContent.contentKey, contentKey as string)) as any;
    }
    if (languageCode) {
      query = query.where(eq(multiLanguageContent.languageCode, languageCode as string)) as any;
    }
    if (translationStatus) {
      query = query.where(eq(multiLanguageContent.translationStatus, translationStatus as string)) as any;
    }
    if (contentType) {
      query = query.where(eq(multiLanguageContent.contentType, contentType as string)) as any;
    }
    
    const translations = await query;
    res.json(translations);
  } catch (error) {
    console.error('Error fetching multi-language content:', error);
    res.status(500).json({ error: 'Failed to fetch multi-language content' });
  }
});

adminRouter.post('/multi-language-content', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const translationData = { ...req.body, translatorId: req.admin!.id };
    const [translation] = await db.insert(multiLanguageContent).values(translationData).returning();
    await logAdminAction(req.admin!.id, 'CREATE_TRANSLATION', null, { translationId: translation.id }, req.ip, req.headers['user-agent']);
    res.json(translation);
  } catch (error) {
    console.error('Error creating translation:', error);
    res.status(500).json({ error: 'Failed to create translation' });
  }
});

adminRouter.patch('/multi-language-content/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, reviewerId: req.admin!.id };
    const [translation] = await db.update(multiLanguageContent).set(updateData).where(eq(multiLanguageContent.id, id)).returning();
    res.json(translation);
  } catch (error) {
    console.error('Error updating translation:', error);
    res.status(500).json({ error: 'Failed to update translation' });
  }
});

// Promotional Content Scheduler
adminRouter.get('/promotional-content-scheduler', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { campaignType, status, campaignName } = req.query;
    let query = db.select().from(promotionalContentScheduler).orderBy(desc(promotionalContentScheduler.createdAt)).limit(200);
    
    if (campaignType) {
      query = query.where(eq(promotionalContentScheduler.campaignType, campaignType as string)) as any;
    }
    if (status) {
      query = query.where(eq(promotionalContentScheduler.status, status as string)) as any;
    }
    if (campaignName) {
      query = query.where(eq(promotionalContentScheduler.campaignName, campaignName as string)) as any;
    }
    
    const campaigns = await query;
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching promotional campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch promotional campaigns' });
  }
});

adminRouter.post('/promotional-content-scheduler', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const campaignData = { ...req.body, createdBy: req.admin!.id, lastModifiedBy: req.admin!.id };
    const [campaign] = await db.insert(promotionalContentScheduler).values(campaignData).returning();
    await logAdminAction(req.admin!.id, 'CREATE_CAMPAIGN', null, { campaignId: campaign.id }, req.ip, req.headers['user-agent']);
    res.json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

adminRouter.patch('/promotional-content-scheduler/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, lastModifiedBy: req.admin!.id };
    const [campaign] = await db.update(promotionalContentScheduler).set(updateData).where(eq(promotionalContentScheduler.id, id)).returning();
    res.json(campaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// ========== PHASE 8D: PLATFORM OPTIMIZATION & PERFORMANCE ==========

// Performance Analytics
adminRouter.get('/performance-analytics', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { metricType, endpoint, region, dayBucket } = req.query;
    let query = db.select().from(performanceAnalytics).orderBy(desc(performanceAnalytics.timestamp)).limit(200);
    
    if (metricType) {
      query = query.where(eq(performanceAnalytics.metricType, metricType as string)) as any;
    }
    if (endpoint) {
      query = query.where(eq(performanceAnalytics.endpoint, endpoint as string)) as any;
    }
    if (region) {
      query = query.where(eq(performanceAnalytics.region, region as string)) as any;
    }
    if (dayBucket) {
      query = query.where(eq(performanceAnalytics.dayBucket, dayBucket as string)) as any;
    }
    
    const metrics = await query;
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching performance analytics:', error);
    res.status(500).json({ error: 'Failed to fetch performance analytics' });
  }
});

adminRouter.post('/performance-analytics', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [metric] = await db.insert(performanceAnalytics).values(req.body).returning();
    res.json(metric);
  } catch (error) {
    console.error('Error creating performance metric:', error);
    res.status(500).json({ error: 'Failed to create performance metric' });
  }
});

// Database Optimization
adminRouter.get('/database-optimization', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { optimizationType, tableName, optimizationPriority, isImplemented } = req.query;
    let query = db.select().from(databaseOptimization).orderBy(desc(databaseOptimization.createdAt)).limit(200);
    
    if (optimizationType) {
      query = query.where(eq(databaseOptimization.optimizationType, optimizationType as string)) as any;
    }
    if (tableName) {
      query = query.where(eq(databaseOptimization.tableName, tableName as string)) as any;
    }
    if (optimizationPriority) {
      query = query.where(eq(databaseOptimization.optimizationPriority, optimizationPriority as string)) as any;
    }
    if (isImplemented !== undefined) {
      query = query.where(eq(databaseOptimization.isImplemented, isImplemented === 'true')) as any;
    }
    
    const optimizations = await query;
    res.json(optimizations);
  } catch (error) {
    console.error('Error fetching database optimizations:', error);
    res.status(500).json({ error: 'Failed to fetch database optimizations' });
  }
});

adminRouter.post('/database-optimization', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [optimization] = await db.insert(databaseOptimization).values(req.body).returning();
    await logAdminAction(req.admin!.id, 'CREATE_DB_OPTIMIZATION', null, { optimizationId: optimization.id }, req.ip, req.headers['user-agent']);
    res.json(optimization);
  } catch (error) {
    console.error('Error creating database optimization:', error);
    res.status(500).json({ error: 'Failed to create database optimization' });
  }
});

adminRouter.patch('/database-optimization/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, implementedBy: req.admin!.id };
    const [optimization] = await db.update(databaseOptimization).set(updateData).where(eq(databaseOptimization.id, id)).returning();
    res.json(optimization);
  } catch (error) {
    console.error('Error updating database optimization:', error);
    res.status(500).json({ error: 'Failed to update database optimization' });
  }
});

// CDN & Caching Management
adminRouter.get('/cdn-caching-management', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { resourceType, cdnProvider, cacheStrategy, region } = req.query;
    let query = db.select().from(cdnCachingManagement).orderBy(desc(cdnCachingManagement.createdAt)).limit(200);
    
    if (resourceType) {
      query = query.where(eq(cdnCachingManagement.resourceType, resourceType as string)) as any;
    }
    if (cdnProvider) {
      query = query.where(eq(cdnCachingManagement.cdnProvider, cdnProvider as string)) as any;
    }
    if (cacheStrategy) {
      query = query.where(eq(cdnCachingManagement.cacheStrategy, cacheStrategy as string)) as any;
    }
    if (region) {
      query = query.where(eq(cdnCachingManagement.region, region as string)) as any;
    }
    
    const cacheConfigs = await query;
    res.json(cacheConfigs);
  } catch (error) {
    console.error('Error fetching CDN caching configs:', error);
    res.status(500).json({ error: 'Failed to fetch CDN caching configs' });
  }
});

adminRouter.post('/cdn-caching-management', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const [cacheConfig] = await db.insert(cdnCachingManagement).values(req.body).returning();
    await logAdminAction(req.admin!.id, 'CREATE_CDN_CONFIG', null, { configId: cacheConfig.id }, req.ip, req.headers['user-agent']);
    res.json(cacheConfig);
  } catch (error) {
    console.error('Error creating CDN caching config:', error);
    res.status(500).json({ error: 'Failed to create CDN caching config' });
  }
});

adminRouter.patch('/cdn-caching-management/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const [cacheConfig] = await db.update(cdnCachingManagement).set(req.body).where(eq(cdnCachingManagement.id, id)).returning();
    res.json(cacheConfig);
  } catch (error) {
    console.error('Error updating CDN caching config:', error);
    res.status(500).json({ error: 'Failed to update CDN caching config' });
  }
});

// Load Balancer Configuration
adminRouter.get('/load-balancer-config', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { configName, balancerType, algorithm, isActive } = req.query;
    let query = db.select().from(loadBalancerConfig).orderBy(desc(loadBalancerConfig.createdAt)).limit(200);
    
    if (configName) {
      query = query.where(eq(loadBalancerConfig.configName, configName as string)) as any;
    }
    if (balancerType) {
      query = query.where(eq(loadBalancerConfig.balancerType, balancerType as string)) as any;
    }
    if (algorithm) {
      query = query.where(eq(loadBalancerConfig.algorithm, algorithm as string)) as any;
    }
    if (isActive !== undefined) {
      query = query.where(eq(loadBalancerConfig.isActive, isActive === 'true')) as any;
    }
    
    const configs = await query;
    res.json(configs);
  } catch (error) {
    console.error('Error fetching load balancer configs:', error);
    res.status(500).json({ error: 'Failed to fetch load balancer configs' });
  }
});

adminRouter.post('/load-balancer-config', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const configData = { ...req.body, createdBy: req.admin!.id, lastModifiedBy: req.admin!.id };
    const [config] = await db.insert(loadBalancerConfig).values(configData).returning();
    await logAdminAction(req.admin!.id, 'CREATE_LB_CONFIG', null, { configId: config.id }, req.ip, req.headers['user-agent']);
    res.json(config);
  } catch (error) {
    console.error('Error creating load balancer config:', error);
    res.status(500).json({ error: 'Failed to create load balancer config' });
  }
});

adminRouter.patch('/load-balancer-config/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, lastModifiedBy: req.admin!.id };
    const [config] = await db.update(loadBalancerConfig).set(updateData).where(eq(loadBalancerConfig.id, id)).returning();
    res.json(config);
  } catch (error) {
    console.error('Error updating load balancer config:', error);
    res.status(500).json({ error: 'Failed to update load balancer config' });
  }
});


// Instant Withdrawal Settings Management
adminRouter.get('/instant-withdrawal/settings', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const settings = await db.select()
      .from(instantWithdrawalSettings)
      .orderBy(desc(instantWithdrawalSettings.updatedAt))
      .limit(1);
    
    if (settings.length === 0) {
      // Return default settings if none exist
      return res.json({
        enabled: true,
        minVipLevel: 'GOLD',
        requireKyc: true,
        maxAmountPerWithdrawal: '500.00',
        maxAmountPer24h: '2000.00',
        maxRiskScore: 30,
        minAccountAgeDays: 7,
        minTotalWagered: '1000.00'
      });
    }
    
    res.json(settings[0]);
  } catch (error) {
    console.error('Error fetching instant withdrawal settings:', error);
    res.status(500).json({ error: 'Failed to fetch instant withdrawal settings' });
  }
});

adminRouter.put('/instant-withdrawal/settings', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const settingsData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    // Check if settings exist
    const existing = await db.select()
      .from(instantWithdrawalSettings)
      .limit(1);
    
    let settings;
    if (existing.length === 0) {
      // Create new settings
      [settings] = await db.insert(instantWithdrawalSettings)
        .values(settingsData)
        .returning();
    } else {
      // Update existing settings
      [settings] = await db.update(instantWithdrawalSettings)
        .set(settingsData)
        .where(eq(instantWithdrawalSettings.id, existing[0].id))
        .returning();
    }
    
    await logAdminAction(
      req.admin!.id, 
      'UPDATE_INSTANT_WITHDRAWAL_SETTINGS', 
      null, 
      { settings: settingsData }, 
      req.ip, 
      req.headers['user-agent']
    );
    
    res.json(settings);
  } catch (error) {
    console.error('Error updating instant withdrawal settings:', error);
    res.status(500).json({ error: 'Failed to update instant withdrawal settings' });
  }
});

// Get user withdrawal statistics
adminRouter.get('/instant-withdrawal/user-stats/:userId', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId } = req.params;
    
    const stats = await db.select()
      .from(userWithdrawalStats)
      .where(eq(userWithdrawalStats.userId, userId))
      .limit(1);
    
    if (stats.length === 0) {
      return res.json(null);
    }
    
    res.json(stats[0]);
  } catch (error) {
    console.error('Error fetching user withdrawal stats:', error);
    res.status(500).json({ error: 'Failed to fetch user withdrawal stats' });
  }
});

// Get all users eligible for instant withdrawals
adminRouter.get('/instant-withdrawal/eligible-users', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const eligibleUsers = await db.select({
      userId: userWithdrawalStats.userId,
      username: users.username,
      vipLevel: users.vipLevel,
      kycVerified: users.kycVerified,
      riskScore: userWithdrawalStats.riskScore,
      isEligible: userWithdrawalStats.isEligibleForInstant,
      totalWithdrawals: userWithdrawalStats.totalWithdrawals,
      successfulWithdrawals: userWithdrawalStats.successfulWithdrawals,
      totalWithdrawnAmount: userWithdrawalStats.totalWithdrawnAmount,
      lastWithdrawalAt: userWithdrawalStats.lastWithdrawalAt
    })
    .from(userWithdrawalStats)
    .leftJoin(users, eq(userWithdrawalStats.userId, users.id))
    .where(eq(userWithdrawalStats.isEligibleForInstant, true))
    .orderBy(desc(userWithdrawalStats.lastWithdrawalAt))
    .limit(100);
    
    res.json(eligibleUsers);
  } catch (error) {
    console.error('Error fetching eligible users:', error);
    res.status(500).json({ error: 'Failed to fetch eligible users' });
  }
});

// Get instant withdrawal analytics
adminRouter.get('/instant-withdrawal/analytics', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get instant vs regular withdrawal stats
    const totalWithdrawals = await db.select({
      total: sql<number>`count(*)`,
      instantCount: sql<number>`count(CASE WHEN ${cryptoWithdrawals.isInstant} = true THEN 1 END)`,
      regularCount: sql<number>`count(CASE WHEN ${cryptoWithdrawals.isInstant} = false THEN 1 END)`,
      totalAmount: sql<number>`COALESCE(sum(${cryptoWithdrawals.creditsAmount}), 0)`,
      instantAmount: sql<number>`COALESCE(sum(CASE WHEN ${cryptoWithdrawals.isInstant} = true THEN ${cryptoWithdrawals.creditsAmount} ELSE 0 END), 0)`,
      regularAmount: sql<number>`COALESCE(sum(CASE WHEN ${cryptoWithdrawals.isInstant} = false THEN ${cryptoWithdrawals.creditsAmount} ELSE 0 END), 0)`
    })
    .from(cryptoWithdrawals);
    
    // Get average risk scores
    const avgRiskScores = await db.select({
      avgInstantRiskScore: sql<number>`COALESCE(avg(CASE WHEN ${cryptoWithdrawals.isInstant} = true THEN ${cryptoWithdrawals.riskScore} END), 0)`,
      avgRegularRiskScore: sql<number>`COALESCE(avg(CASE WHEN ${cryptoWithdrawals.isInstant} = false THEN ${cryptoWithdrawals.riskScore} END), 0)`
    })
    .from(cryptoWithdrawals)
    .where(sql`${cryptoWithdrawals.riskScore} IS NOT NULL`);
    
    res.json({
      totalWithdrawals: totalWithdrawals[0],
      riskScores: avgRiskScores[0],
      instantWithdrawalPercentage: totalWithdrawals[0].total > 0 
        ? (totalWithdrawals[0].instantCount / totalWithdrawals[0].total * 100).toFixed(2)
        : '0.00'
    });
  } catch (error) {
    console.error('Error fetching instant withdrawal analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});
