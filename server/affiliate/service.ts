import { randomUUID } from 'crypto';
import { storage } from '../storage';
import type { 
  Affiliate, InsertAffiliate, 
  Referral, InsertReferral,
  Commission, InsertCommission,
  CommissionPayout, InsertCommissionPayout,
  ReferralLink, InsertReferralLink
} from '../../shared/schema';

export class AffiliateService {
  
  // Generate a unique referral code
  generateReferralCode(username?: string): string {
    const base = username ? username.substring(0, 4).toUpperCase() : 'REF';
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${base}${randomStr}`;
  }

  // Create an affiliate account
  async createAffiliate(userId: string, customCode?: string): Promise<Affiliate> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user already has an affiliate account
    const existing = await storage.getAffiliateByUserId(userId);
    if (existing) {
      throw new Error('User already has an affiliate account');
    }

    let referralCode = customCode;
    if (!referralCode) {
      referralCode = this.generateReferralCode(user.username || user.firstName);
      
      // Ensure uniqueness
      let attempts = 0;
      while (await storage.getAffiliateByReferralCode(referralCode) && attempts < 10) {
        referralCode = this.generateReferralCode(user.username || user.firstName);
        attempts++;
      }
    } else {
      // Check if custom code is available
      const existing = await storage.getAffiliateByReferralCode(referralCode);
      if (existing) {
        throw new Error('Referral code already taken');
      }
    }

    const affiliateData: InsertAffiliate = {
      userId,
      referralCode,
      tier: 'BRONZE',
      commissionRate: '0.0500',
      status: 'ACTIVE'
    };

    return await storage.createAffiliate(affiliateData);
  }

  // Process a referral
  async processReferral(referralCode: string, newUserId: string): Promise<Referral | null> {
    const affiliate = await storage.getAffiliateByReferralCode(referralCode);
    if (!affiliate || affiliate.status !== 'ACTIVE') {
      return null;
    }

    // Don't allow self-referral
    if (affiliate.userId === newUserId) {
      return null;
    }

    // Check if user was already referred
    const existingReferral = await storage.getReferralByUserId(newUserId);
    if (existingReferral) {
      return null;
    }

    const referralData: InsertReferral = {
      affiliateId: affiliate.id,
      referredUserId: newUserId,
      referralCode,
      tier: 1,
      status: 'PENDING'
    };

    const referral = await storage.createReferral(referralData);

    // Update affiliate stats
    await storage.updateAffiliateStats(affiliate.id, {
      totalReferrals: affiliate.totalReferrals + 1
    });

    return referral;
  }

  // Activate referral on first deposit
  async activateReferral(userId: string, depositAmount: number): Promise<void> {
    const referral = await storage.getReferralByUserId(userId);
    if (!referral || referral.status !== 'PENDING') {
      return;
    }

    await storage.updateReferral(referral.id, {
      status: 'ACTIVE',
      firstDepositAmount: depositAmount.toString(),
      firstDepositAt: new Date(),
      totalDeposits: depositAmount.toString()
    });

    // Update affiliate active referrals count
    const affiliate = await storage.getAffiliate(referral.affiliateId);
    if (affiliate) {
      await storage.updateAffiliateStats(affiliate.id, {
        activeReferrals: affiliate.activeReferrals + 1
      });
    }

    // Award CPA commission for first deposit
    await this.awardCommission({
      affiliateId: referral.affiliateId,
      referralId: referral.id,
      type: 'CPA',
      baseAmount: depositAmount,
      description: 'First deposit CPA commission'
    });
  }

  // Award commission for various activities
  async awardCommission(params: {
    affiliateId: string;
    referralId: string;
    type: 'DEPOSIT' | 'WAGERING' | 'LOSS' | 'REVENUE_SHARE' | 'CPA';
    baseAmount: number;
    transactionId?: string;
    betId?: string;
    description?: string;
  }): Promise<Commission> {
    const affiliate = await storage.getAffiliate(params.affiliateId);
    if (!affiliate || affiliate.status !== 'ACTIVE') {
      throw new Error('Affiliate not active');
    }

    const referral = await storage.getReferral(params.referralId);
    if (!referral || referral.status !== 'ACTIVE') {
      throw new Error('Referral not active');
    }

    // Calculate commission rate based on type and tier
    let commissionRate = parseFloat(affiliate.commissionRate);
    
    if (params.type === 'CPA') {
      // Fixed CPA amount based on tier
      commissionRate = this.getCPAAmount(affiliate.tier);
    } else if (params.type === 'REVENUE_SHARE') {
      // Revenue share uses higher rates
      commissionRate = this.getRevenueShareRate(affiliate.tier);
    }

    const commissionAmount = params.type === 'CPA' 
      ? commissionRate 
      : params.baseAmount * commissionRate;

    const commissionData: InsertCommission = {
      affiliateId: params.affiliateId,
      referralId: params.referralId,
      transactionId: params.transactionId,
      betId: params.betId,
      type: params.type,
      baseAmount: params.baseAmount.toString(),
      commissionRate: commissionRate.toString(),
      commissionAmount: commissionAmount.toString(),
      tier: referral.tier,
      status: 'PENDING',
      description: params.description
    };

    const commission = await storage.createCommission(commissionData);

    // Update affiliate earnings
    const newAvailable = parseFloat(affiliate.availableCommission) + commissionAmount;
    const newTotal = parseFloat(affiliate.totalCommissionEarned) + commissionAmount;
    
    await storage.updateAffiliateStats(params.affiliateId, {
      availableCommission: newAvailable.toString(),
      totalCommissionEarned: newTotal.toString(),
      lastActivityAt: new Date()
    });

    return commission;
  }

  // Get CPA amount based on tier
  private getCPAAmount(tier: string): number {
    const cpaAmounts = {
      'BRONZE': 25,
      'SILVER': 35,
      'GOLD': 50,
      'PLATINUM': 75,
      'DIAMOND': 100
    };
    return cpaAmounts[tier as keyof typeof cpaAmounts] || 25;
  }

  // Get revenue share rate based on tier
  private getRevenueShareRate(tier: string): number {
    const rates = {
      'BRONZE': 0.25,    // 25%
      'SILVER': 0.30,    // 30%
      'GOLD': 0.35,      // 35%
      'PLATINUM': 0.40,  // 40%
      'DIAMOND': 0.45    // 45%
    };
    return rates[tier as keyof typeof rates] || 0.25;
  }

  // Update referral activity
  async updateReferralActivity(userId: string, wageredAmount: number, netResult: number): Promise<void> {
    const referral = await storage.getReferralByUserId(userId);
    if (!referral || referral.status !== 'ACTIVE') {
      return;
    }

    const newTotalWagered = parseFloat(referral.totalWagered || '0') + wageredAmount;
    const newLifetimeValue = parseFloat(referral.lifetimeValue || '0') + Math.abs(netResult);
    
    await storage.updateReferral(referral.id, {
      totalWagered: newTotalWagered.toString(),
      lifetimeValue: newLifetimeValue.toString(),
      lastActivityAt: new Date()
    });

    // Award wagering commission (if loss)
    if (netResult < 0) {
      await this.awardCommission({
        affiliateId: referral.affiliateId,
        referralId: referral.id,
        type: 'REVENUE_SHARE',
        baseAmount: Math.abs(netResult),
        description: 'Revenue share from player loss'
      });
    }
  }

  // Create referral link
  async createReferralLink(affiliateId: string, linkData: Omit<InsertReferralLink, 'affiliateId'>): Promise<ReferralLink> {
    const affiliate = await storage.getAffiliate(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    const referralLinkData: InsertReferralLink = {
      ...linkData,
      affiliateId
    };

    return await storage.createReferralLink(referralLinkData);
  }

  // Track link click
  async trackLinkClick(linkId: string): Promise<void> {
    await storage.incrementLinkClicks(linkId);
  }

  // Track conversion
  async trackConversion(referralCode: string): Promise<void> {
    const link = await storage.getReferralLinkByCode(referralCode);
    if (link) {
      await storage.incrementLinkConversions(link.id);
    }
  }

  // Request commission payout
  async requestPayout(affiliateId: string, amount: number, method: 'BALANCE_CREDIT' | 'CRYPTO' | 'BANK_TRANSFER', walletAddress?: string): Promise<CommissionPayout> {
    const affiliate = await storage.getAffiliate(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    const availableAmount = parseFloat(affiliate.availableCommission);
    if (amount > availableAmount) {
      throw new Error('Insufficient commission balance');
    }

    // Get pending commissions to include in payout
    const pendingCommissions = await storage.getPendingCommissions(affiliateId, amount);
    const commissionIds = pendingCommissions.map(c => c.id);

    const payoutData: InsertCommissionPayout = {
      affiliateId,
      amount: amount.toString(),
      commissionIds: JSON.stringify(commissionIds),
      method,
      walletAddress,
      status: 'PENDING'
    };

    const payout = await storage.createCommissionPayout(payoutData);

    // Update affiliate available commission
    await storage.updateAffiliateStats(affiliateId, {
      availableCommission: (availableAmount - amount).toString()
    });

    // Update commission statuses to processing
    await storage.updateCommissionStatuses(commissionIds, 'PROCESSING');

    return payout;
  }

  // Check and upgrade affiliate tier
  async checkTierUpgrade(affiliateId: string): Promise<void> {
    const affiliate = await storage.getAffiliate(affiliateId);
    if (!affiliate) return;

    const stats = await this.getAffiliateStats(affiliateId);
    const tiers = await storage.getAffiliateTiers();
    
    // Find the highest tier the affiliate qualifies for
    let newTier = affiliate.tier;
    let newCommissionRate = affiliate.commissionRate;

    for (const tier of tiers.sort((a, b) => b.requiredReferrals - a.requiredReferrals)) {
      if (stats.totalReferrals >= tier.requiredReferrals && 
          stats.totalVolume >= parseFloat(tier.requiredVolume)) {
        newTier = tier.name;
        newCommissionRate = tier.commissionRate;
        break;
      }
    }

    // Update if tier changed
    if (newTier !== affiliate.tier) {
      await storage.updateAffiliateStats(affiliateId, {
        tier: newTier,
        commissionRate: newCommissionRate
      });
    }
  }

  // Get affiliate statistics
  async getAffiliateStats(affiliateId: string) {
    const affiliate = await storage.getAffiliate(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    const referrals = await storage.getAffiliateReferrals(affiliateId);
    const commissions = await storage.getAffiliateCommissions(affiliateId);
    const totalVolume = referrals.reduce((sum, r) => sum + parseFloat(r.totalWagered || '0'), 0);

    return {
      totalReferrals: affiliate.totalReferrals,
      activeReferrals: affiliate.activeReferrals,
      totalVolume,
      totalCommissionEarned: parseFloat(affiliate.totalCommissionEarned),
      totalCommissionPaid: parseFloat(affiliate.totalCommissionPaid),
      availableCommission: parseFloat(affiliate.availableCommission),
      tier: affiliate.tier,
      commissionRate: parseFloat(affiliate.commissionRate),
      recentCommissions: commissions.slice(0, 10),
      topReferrals: referrals.sort((a, b) => parseFloat(b.lifetimeValue || '0') - parseFloat(a.lifetimeValue || '0')).slice(0, 10)
    };
  }

  // Get affiliate analytics with real-time data
  async getAffiliateAnalytics(affiliateId: string, timeframe: string = '7d') {
    const referralLinks = await storage.getAffiliateReferralLinks(affiliateId);
    const referrals = await storage.getAffiliateReferrals(affiliateId);
    const commissions = await storage.getAffiliateCommissions(affiliateId);
    
    // Generate mock analytics data for demonstration
    // In production, this would query actual analytics data from your tracking system
    const generateDailyStats = (days: number) => {
      const stats = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        stats.push({
          date: date.toISOString().split('T')[0],
          clicks: Math.floor(Math.random() * 100) + 20,
          conversions: Math.floor(Math.random() * 10) + 1,
          commissions: Math.floor(Math.random() * 500) + 50,
          revenue: Math.floor(Math.random() * 2000) + 200
        });
      }
      return stats;
    };

    const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[timeframe as keyof typeof daysMap] || 7;

    const totalClicks = referralLinks.reduce((sum, link) => sum + link.clicks, 0);
    const totalConversions = referralLinks.reduce((sum, link) => sum + link.conversions, 0);
    
    return {
      daily: generateDailyStats(days),
      weekly: generateDailyStats(Math.ceil(days / 7)).map((day, i) => ({
        week: `Week ${i + 1}`,
        clicks: day.clicks * 7,
        conversions: day.conversions * 7,
        commissions: day.commissions * 7,
        revenue: day.revenue * 7
      })),
      monthly: generateDailyStats(Math.ceil(days / 30)).map((day, i) => ({
        month: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        clicks: day.clicks * 30,
        conversions: day.conversions * 30,
        commissions: day.commissions * 30,
        revenue: day.revenue * 30
      })),
      realTime: {
        activeVisitors: Math.floor(Math.random() * 50) + 10,
        todayClicks: Math.floor(Math.random() * 200) + 50,
        todayConversions: Math.floor(Math.random() * 20) + 5,
        todayRevenue: Math.floor(Math.random() * 1000) + 300,
        conversionRate: totalClicks > 0 ? ((totalConversions / totalClicks) * 100) : 0,
        avgSessionDuration: Math.floor(Math.random() * 300) + 120, // seconds
        bounceRate: Math.floor(Math.random() * 40) + 30 // percentage
      },
      performance: {
        topPerformingLinks: referralLinks
          .sort((a, b) => b.conversions - a.conversions)
          .slice(0, 5)
          .map(link => ({
            name: link.name,
            clicks: link.clicks,
            conversions: link.conversions,
            conversionRate: link.clicks > 0 ? ((link.conversions / link.clicks) * 100) : 0,
            revenue: Math.floor(Math.random() * 2000) + 500
          })),
        topCountries: [
          { country: 'United States', clicks: Math.floor(Math.random() * 500) + 100, conversions: Math.floor(Math.random() * 50) + 10, revenue: Math.floor(Math.random() * 2000) + 500 },
          { country: 'United Kingdom', clicks: Math.floor(Math.random() * 300) + 50, conversions: Math.floor(Math.random() * 30) + 5, revenue: Math.floor(Math.random() * 1500) + 300 },
          { country: 'Canada', clicks: Math.floor(Math.random() * 200) + 30, conversions: Math.floor(Math.random() * 20) + 3, revenue: Math.floor(Math.random() * 1000) + 200 },
          { country: 'Australia', clicks: Math.floor(Math.random() * 150) + 20, conversions: Math.floor(Math.random() * 15) + 2, revenue: Math.floor(Math.random() * 800) + 150 },
          { country: 'Germany', clicks: Math.floor(Math.random() * 120) + 15, conversions: Math.floor(Math.random() * 12) + 1, revenue: Math.floor(Math.random() * 600) + 100 }
        ],
        deviceBreakdown: [
          { device: 'Mobile', clicks: Math.floor(totalClicks * 0.65), percentage: 65 },
          { device: 'Desktop', clicks: Math.floor(totalClicks * 0.25), percentage: 25 },
          { device: 'Tablet', clicks: Math.floor(totalClicks * 0.10), percentage: 10 }
        ]
      },
      demographics: {
        ageGroups: [
          { range: '18-24', count: Math.floor(Math.random() * 100) + 20, percentage: 25 },
          { range: '25-34', count: Math.floor(Math.random() * 150) + 40, percentage: 35 },
          { range: '35-44', count: Math.floor(Math.random() * 100) + 25, percentage: 20 },
          { range: '45-54', count: Math.floor(Math.random() * 80) + 15, percentage: 15 },
          { range: '55+', count: Math.floor(Math.random() * 40) + 5, percentage: 5 }
        ],
        genderDistribution: [
          { gender: 'Male', count: Math.floor(Math.random() * 200) + 100, percentage: 60 },
          { gender: 'Female', count: Math.floor(Math.random() * 150) + 75, percentage: 35 },
          { gender: 'Other', count: Math.floor(Math.random() * 20) + 5, percentage: 5 }
        ]
      }
    };
  }
}

export const affiliateService = new AffiliateService();