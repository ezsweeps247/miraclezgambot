import { Router } from 'express';
import { authenticateJWT, type AuthenticatedRequest } from '../auth';
import { affiliateService } from './service';
import { storage } from '../storage';
import { insertAffiliateSchema, insertReferralLinkSchema } from '../../shared/schema';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateJWT);

// Get affiliate code only
router.get('/code', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const affiliate = await storage.getAffiliateByUserId(userId);
    
    if (!affiliate) {
      // Create affiliate account automatically if not exists
      const newAffiliate = await affiliateService.createAffiliate(userId);
      return res.json({
        code: newAffiliate.referralCode
      });
    }
    
    res.json({
      code: affiliate.referralCode
    });
  } catch (error) {
    console.error('Error fetching affiliate code:', error);
    res.status(500).json({
      code: null,
      message: 'Failed to fetch affiliate code'
    });
  }
});

// Check affiliate status
router.get('/status', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const affiliate = await storage.getAffiliateByUserId(userId);
    
    res.json({
      success: true,
      isAffiliate: !!affiliate,
      affiliate: affiliate || null
    });
  } catch (error) {
    console.error('Error checking affiliate status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check affiliate status'
    });
  }
});

// Create affiliate account
router.post('/join', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { customReferralCode } = req.body;

    const affiliate = await affiliateService.createAffiliate(userId, customReferralCode);
    
    res.json({
      success: true,
      affiliate,
      message: 'Affiliate account created successfully'
    });
  } catch (error) {
    console.error('Error creating affiliate account:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create affiliate account'
    });
  }
});

// Get affiliate dashboard data
router.get('/dashboard', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const affiliate = await storage.getAffiliateByUserId(userId);
    
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate account not found'
      });
    }

    const stats = await affiliateService.getAffiliateStats(affiliate.id);
    const payouts = await storage.getAffiliatePayouts(affiliate.id);
    const referralLinks = await storage.getAffiliateReferralLinks(affiliate.id);
    
    res.json({
      success: true,
      affiliate,
      stats,
      payouts: payouts.slice(0, 10), // Recent payouts
      referralLinks
    });
  } catch (error) {
    console.error('Error fetching affiliate dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch affiliate dashboard'
    });
  }
});

// Get affiliate stats
router.get('/stats', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const affiliate = await storage.getAffiliateByUserId(userId);
    
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate account not found'
      });
    }

    const stats = await affiliateService.getAffiliateStats(affiliate.id);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching affiliate stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch affiliate stats'
    });
  }
});

// Get affiliate analytics for 7d (specific route for modal)
router.get('/analytics/7d', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const affiliate = await storage.getAffiliateByUserId(userId);
    
    if (!affiliate) {
      // Return default analytics data if not an affiliate
      return res.json({
        totalEarnings: 0,
        newReferrals: 0,
        activeUsers: 0,
        commissionRate: 5
      });
    }

    const stats = await affiliateService.getAffiliateStats(affiliate.id);
    
    // Return in the format expected by the frontend modal
    res.json({
      totalEarnings: stats.totalCommissionEarned,
      newReferrals: stats.totalReferrals || 0,
      activeUsers: stats.activeReferrals || 0, 
      commissionRate: stats.commissionRate * 100
    });
  } catch (error) {
    console.error('Error fetching affiliate analytics for 7d:', error);
    res.json({
      totalEarnings: 0,
      newReferrals: 0,
      activeUsers: 0,
      commissionRate: 5
    });
  }
});

// Get affiliate analytics with real-time data
router.get('/analytics', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const timeframe = req.query.timeframe as string || '7d';
    
    const affiliate = await storage.getAffiliateByUserId(userId);
    
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate account not found'
      });
    }

    const analytics = await affiliateService.getAffiliateAnalytics(affiliate.id, timeframe);
    
    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Error fetching affiliate analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch affiliate analytics'
    });
  }
});

// Get referrals list
router.get('/referrals', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const affiliate = await storage.getAffiliateByUserId(userId);
    
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate account not found'
      });
    }

    const referrals = await storage.getAffiliateReferrals(affiliate.id);
    
    // Get user details for each referral
    const referralsWithUsers = await Promise.all(
      referrals.map(async (referral) => {
        const user = await storage.getUser(referral.referredUserId);
        return {
          ...referral,
          user: user ? {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName
          } : null
        };
      })
    );
    
    res.json({
      success: true,
      referrals: referralsWithUsers
    });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referrals'
    });
  }
});

// Get commissions history
router.get('/commissions', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { page = 1, limit = 50 } = req.query;
    const affiliate = await storage.getAffiliateByUserId(userId);
    
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate account not found'
      });
    }

    const commissions = await storage.getAffiliateCommissions(affiliate.id);
    
    // Simple pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedCommissions = commissions.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      commissions: paginatedCommissions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: commissions.length,
        totalPages: Math.ceil(commissions.length / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch commissions'
    });
  }
});

// Create referral link
router.post('/referral-links', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const affiliate = await storage.getAffiliateByUserId(userId);
    
    if (!affiliate) {
      return res.status(400).json({
        success: false,
        message: 'You must be an affiliate to create referral links'
      });
    }

    const linkData = insertReferralLinkSchema.parse({
      ...req.body,
      affiliateId: affiliate.id,
      referralCode: affiliate.referralCode
    });

    const referralLink = await affiliateService.createReferralLink(affiliate.id, linkData);
    
    res.json({
      success: true,
      referralLink,
      message: 'Referral link created successfully'
    });
  } catch (error) {
    console.error('Error creating referral link:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create referral link'
    });
  }
});

// Request commission payout
router.post('/payout', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { amount, method, walletAddress } = req.body;
    const affiliate = await storage.getAffiliateByUserId(userId);
    
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate account not found'
      });
    }

    // Validate payout amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payout amount'
      });
    }

    // Check minimum payout threshold
    const minPayout = 50; // $50 minimum
    if (amount < minPayout) {
      return res.status(400).json({
        success: false,
        message: `Minimum payout amount is $${minPayout}`
      });
    }

    // Validate method
    const validMethods = ['BALANCE_CREDIT', 'CRYPTO', 'BANK_TRANSFER'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payout method'
      });
    }

    // Validate wallet address for crypto payouts
    if (method === 'CRYPTO' && !walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address required for crypto payouts'
      });
    }

    const payout = await affiliateService.requestPayout(affiliate.id, amount, method, walletAddress);
    
    res.json({
      success: true,
      payout,
      message: 'Payout request submitted successfully'
    });
  } catch (error) {
    console.error('Error requesting payout:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to request payout'
    });
  }
});

// Get affiliate tiers information
router.get('/tiers', async (req, res) => {
  try {
    const tiers = await storage.getAffiliateTiers();
    
    res.json({
      success: true,
      tiers
    });
  } catch (error) {
    console.error('Error fetching affiliate tiers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch affiliate tiers'
    });
  }
});

// Check affiliate status (for non-affiliates)
router.get('/status', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const affiliate = await storage.getAffiliateByUserId(userId);
    
    if (!affiliate) {
      return res.json({
        success: true,
        isAffiliate: false,
        message: 'User is not an affiliate'
      });
    }

    const stats = await affiliateService.getAffiliateStats(affiliate.id);
    
    res.json({
      success: true,
      isAffiliate: true,
      affiliate,
      stats: {
        totalReferrals: stats.totalReferrals,
        totalCommissionEarned: stats.totalCommissionEarned,
        availableCommission: stats.availableCommission,
        tier: stats.tier
      }
    });
  } catch (error) {
    console.error('Error checking affiliate status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check affiliate status'
    });
  }
});

export { router as affiliateRoutes };