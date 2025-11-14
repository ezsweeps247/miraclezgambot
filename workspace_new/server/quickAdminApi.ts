import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { users, balances, transactions } from '@shared/schema';
import { authenticateAdmin } from './admin-auth';

const router = Router();

// Quick admin endpoint to add credits to a user
// Uses JWT authentication for security
router.post('/api/quick-admin/add-credits', authenticateAdmin, async (req, res) => {
  const { userTelegramId, amount, description } = req.body;
  
  if (!userTelegramId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid parameters. Need userTelegramId and positive amount' });
  }
  
  try {
    // Find the user
    const user = await db.select().from(users).where(eq(users.telegramId, Number(userTelegramId))).limit(1);
    
    if (!user || user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = user[0].id;
    
    // Get current balance
    const userBalance = await db.select().from(balances).where(eq(balances.userId, userId)).limit(1);
    
    const currentBalance = userBalance.length > 0 ? userBalance[0].available : 0;
    const newBalance = currentBalance + Number(amount);
    
    // Update or insert balance
    if (userBalance.length > 0) {
      await db.update(balances)
        .set({ 
          available: newBalance
        })
        .where(eq(balances.userId, userId));
    } else {
      await db.insert(balances).values({
        userId,
        available: newBalance,
        locked: 0,
        currency: 'SC'
      });
    }
    
    // Log the transaction
    await db.insert(transactions).values({
      userId,
      type: 'DEPOSIT',
      amount: Number(amount),
      meta: {
        added_by: 'admin',
        method: 'quick-admin-api',
        description: description || `Admin credit adjustment: +${amount} credits`,
        timestamp: new Date().toISOString()
      }
    });
    
    res.json({
      success: true,
      message: `Successfully added ${amount} credits to user ${userTelegramId}`,
      newBalance: newBalance,
      user: {
        telegramId: user[0].telegramId,
        username: user[0].username,
        previousBalance: currentBalance,
        newBalance: newBalance
      }
    });
  } catch (error) {
    console.error('Error adding credits:', error);
    res.status(500).json({ error: 'Failed to add credits' });
  }
});

// Quick admin endpoint to check user balance
router.get('/api/quick-admin/user-balance/:telegramId', authenticateAdmin, async (req, res) => {
  const { telegramId } = req.params;
  
  try {
    const user = await db.select().from(users).where(eq(users.telegramId, Number(telegramId))).limit(1);
    
    if (!user || user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userBalance = await db.select().from(balances).where(eq(balances.userId, user[0].id)).limit(1);
    
    const available = userBalance.length > 0 ? userBalance[0].available : 0;
    const locked = userBalance.length > 0 ? userBalance[0].locked : 0;
    
    res.json({
      telegramId: user[0].telegramId,
      username: user[0].username,
      balance: available,
      lockedBalance: locked,
      createdAt: user[0].createdAt
    });
  } catch (error) {
    console.error('Error fetching user balance:', error);
    res.status(500).json({ error: 'Failed to fetch user balance' });
  }
});

// Quick admin endpoint to list all users and their balances
router.get('/api/quick-admin/users', authenticateAdmin, async (req, res) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      telegramId: users.telegramId,
      username: users.username,
      createdAt: users.createdAt
    }).from(users);
    
    // Get balances for all users
    const allBalances = await db.select().from(balances);
    
    // Map balances to users
    const balanceMap = new Map();
    allBalances.forEach(b => {
      balanceMap.set(b.userId, { available: b.available, locked: b.locked });
    });
    
    const formattedUsers = allUsers.map(u => ({
      telegramId: u.telegramId,
      username: u.username,
      balance: balanceMap.get(u.id)?.available || 0,
      lockedBalance: balanceMap.get(u.id)?.locked || 0,
      createdAt: u.createdAt
    }));
    
    res.json({
      totalUsers: formattedUsers.length,
      users: formattedUsers
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;