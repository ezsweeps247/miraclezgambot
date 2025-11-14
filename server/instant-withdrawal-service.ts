import { eq, and, gte, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  userWithdrawalStats,
  instantWithdrawalSettings,
  cryptoWithdrawals,
  bets,
  transactions,
  type UserWithdrawalStats,
  type InstantWithdrawalSettings,
} from "@shared/schema";

export interface RiskFactors {
  accountAgeDays: number;
  totalWagered: number;
  withdrawalHistory: number;
  successRate: number;
  last24hWithdrawals: number;
  depositToWithdrawalRatio: number;
  vipLevel: string;
  kycStatus: boolean;
  suspiciousPatterns: boolean;
}

export interface EligibilityCheck {
  isEligible: boolean;
  riskScore: number;
  reasons: string[];
  maxInstantAmount?: number;
}

/**
 * Calculate comprehensive risk score for instant withdrawal eligibility
 * Score ranges from 0 (lowest risk) to 100 (highest risk)
 */
export async function calculateRiskScore(
  userId: string
): Promise<{ score: number; factors: RiskFactors }> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Get total wagered amount
  const totalWageredResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(${bets.amount}), 0)`,
    })
    .from(bets)
    .where(and(eq(bets.userId, userId), eq(bets.gameMode, "real")));

  const totalWagered = Number(totalWageredResult[0]?.total || 0);

  // Get withdrawal history
  const withdrawalHistory = await db.query.cryptoWithdrawals.findMany({
    where: eq(cryptoWithdrawals.userId, userId),
    orderBy: [desc(cryptoWithdrawals.createdAt)],
  });

  const successfulWithdrawals = withdrawalHistory.filter(
    (w: any) => w.status === "CONFIRMED" || w.status === "SENT"
  ).length;
  const failedWithdrawals = withdrawalHistory.filter(
    (w: any) => w.status === "FAILED"
  ).length;
  const totalWithdrawals = withdrawalHistory.length;
  const successRate =
    totalWithdrawals > 0 ? successfulWithdrawals / totalWithdrawals : 1;

  // Get last 24h withdrawal activity
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const last24hWithdrawals = withdrawalHistory.filter(
    (w: any) => new Date(w.createdAt) > oneDayAgo
  );

  // Calculate account age
  const accountCreatedAt = user.createdAt || new Date();
  const accountAgeDays = Math.floor(
    (Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Get deposit history for ratio calculation
  const depositTransactions = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      eq(transactions.type, "DEPOSIT")
    ),
  });

  const totalDeposited = depositTransactions.reduce(
    (sum: number, t: any) => sum + Number(t.amount),
    0
  );
  const totalWithdrawn = withdrawalHistory
    .filter((w: any) => w.status === "CONFIRMED" || w.status === "SENT")
    .reduce((sum: number, w: any) => sum + Number(w.creditsAmount || 0), 0);

  // CRITICAL: Treat zero deposits as maximum risk
  const depositToWithdrawalRatio =
    totalDeposited > 0 ? totalWithdrawn / totalDeposited : 999;

  // Check for suspicious patterns
  let suspiciousPatterns = false;

  // Pattern 0: No deposits (airdropped/bonus-only accounts)
  if (totalDeposited === 0 && totalWithdrawn > 0) {
    suspiciousPatterns = true;
  }

  // Pattern 1: Multiple failed withdrawals recently
  const recentFailedWithdrawals = withdrawalHistory
    .filter((w: any) => new Date(w.createdAt) > oneDayAgo)
    .filter((w: any) => w.status === "FAILED").length;

  if (recentFailedWithdrawals >= 3) {
    suspiciousPatterns = true;
  }

  // Pattern 2: Withdrawal amount significantly higher than usual
  if (withdrawalHistory.length > 0) {
    const avgWithdrawalAmount =
      withdrawalHistory.reduce((sum: number, w: any) => sum + Number(w.creditsAmount || 0), 0) /
      withdrawalHistory.length;
    const lastWithdrawal = withdrawalHistory[0];
    if (
      lastWithdrawal &&
      Number(lastWithdrawal.creditsAmount || 0) > avgWithdrawalAmount * 3
    ) {
      suspiciousPatterns = true;
    }
  }

  // Pattern 3: Withdrawal immediately after deposit (bonus abuse)
  const recentDeposits = depositTransactions.filter(
    (d: any) => new Date(d.createdAt) > new Date(Date.now() - 60 * 60 * 1000)
  );
  if (recentDeposits.length > 0 && last24hWithdrawals.length > 0) {
    suspiciousPatterns = true;
  }

  const factors: RiskFactors = {
    accountAgeDays,
    totalWagered,
    withdrawalHistory: totalWithdrawals,
    successRate,
    last24hWithdrawals: last24hWithdrawals.length,
    depositToWithdrawalRatio,
    vipLevel: user.vipLevel || "UNRANKED",
    kycStatus: user.kycVerified || false,
    suspiciousPatterns,
  };

  // Calculate weighted risk score (0-100)
  let riskScore = 0;

  // Account age factor (0-20 points)
  if (accountAgeDays < 1) riskScore += 20;
  else if (accountAgeDays < 7) riskScore += 15;
  else if (accountAgeDays < 30) riskScore += 10;
  else if (accountAgeDays < 90) riskScore += 5;

  // Wagering activity factor (0-15 points)
  if (totalWagered < 100) riskScore += 15;
  else if (totalWagered < 1000) riskScore += 10;
  else if (totalWagered < 5000) riskScore += 5;

  // Withdrawal history factor (0-15 points)
  if (totalWithdrawals === 0) riskScore += 5; // New withdrawer, slight risk
  else if (successRate < 0.5) riskScore += 15;
  else if (successRate < 0.8) riskScore += 10;
  else if (successRate < 0.9) riskScore += 5;

  // Recent activity factor (0-15 points)
  if (last24hWithdrawals.length >= 5) riskScore += 15;
  else if (last24hWithdrawals.length >= 3) riskScore += 10;
  else if (last24hWithdrawals.length >= 2) riskScore += 5;

  // Deposit/Withdrawal ratio factor (0-15 points)
  if (depositToWithdrawalRatio > 2) riskScore += 15; // Withdrawing much more than deposited
  else if (depositToWithdrawalRatio > 1.5) riskScore += 10;
  else if (depositToWithdrawalRatio > 1) riskScore += 5;

  // KYC factor (0-10 points)
  if (!user.kycVerified) riskScore += 10;

  // Suspicious patterns factor (0-10 points)
  if (suspiciousPatterns) riskScore += 10;

  return { score: Math.min(riskScore, 100), factors };
}

/**
 * Check if user is eligible for instant withdrawal
 */
export async function checkInstantWithdrawalEligibility(
  userId: string,
  withdrawalAmount: number
): Promise<EligibilityCheck> {
  const settings = await db.query.instantWithdrawalSettings.findFirst({
    orderBy: [desc(instantWithdrawalSettings.updatedAt)],
  });

  if (!settings || !settings.enabled) {
    return {
      isEligible: false,
      riskScore: 0,
      reasons: ["Instant withdrawals are currently disabled"],
    };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return {
      isEligible: false,
      riskScore: 0,
      reasons: ["User not found"],
    };
  }

  const reasons: string[] = [];
  const { score: riskScore, factors } = await calculateRiskScore(userId);

  // Check VIP level
  const vipLevels = [
    "UNRANKED",
    "WOOD",
    "BRONZE",
    "SILVER",
    "GOLD",
    "PLATINUM",
    "JADE",
    "SAPPHIRE",
    "RUBY",
    "DIAMOND",
  ];
  const userVipIndex = vipLevels.indexOf(user.vipLevel || "UNRANKED");
  const minVipIndex = vipLevels.indexOf(settings.minVipLevel);

  if (userVipIndex < minVipIndex) {
    reasons.push(
      `VIP level ${settings.minVipLevel} or higher required (you are ${user.vipLevel || "UNRANKED"})`
    );
  }

  // Check KYC
  if (settings.requireKyc && !user.kycVerified) {
    reasons.push("KYC verification required");
  }

  // Check account age
  const accountAgeDays = Math.floor(
    (Date.now() - (user.createdAt?.getTime() || Date.now())) /
      (1000 * 60 * 60 * 24)
  );
  if (accountAgeDays < settings.minAccountAgeDays) {
    reasons.push(
      `Account must be at least ${settings.minAccountAgeDays} days old (yours is ${accountAgeDays} days)`
    );
  }

  // Check total wagered
  if (factors.totalWagered < Number(settings.minTotalWagered)) {
    reasons.push(
      `Total wagered must be at least ${settings.minTotalWagered} SC (you have wagered ${factors.totalWagered} SC)`
    );
  }

  // CRITICAL: Check minimum deposit history (prevent airdrop/bonus abuse)
  const MIN_LIFETIME_DEPOSITS = 100; // Minimum total deposits in SC
  const depositTransactions = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      eq(transactions.type, "DEPOSIT")
    ),
  });
  
  const totalDeposits = depositTransactions.reduce(
    (sum: number, t: any) => sum + Number(t.amount),
    0
  );

  if (totalDeposits < MIN_LIFETIME_DEPOSITS) {
    reasons.push(
      `Minimum deposit history required: ${MIN_LIFETIME_DEPOSITS} SC (you have deposited ${totalDeposits} SC)`
    );
  }

  // Check withdrawal amount limit
  if (withdrawalAmount > Number(settings.maxAmountPerWithdrawal)) {
    reasons.push(
      `Withdrawal amount exceeds instant limit of ${settings.maxAmountPerWithdrawal} SC`
    );
  }

  // Check 24h limit
  const stats = await db.query.userWithdrawalStats.findFirst({
    where: eq(userWithdrawalStats.userId, userId),
  });

  const last24hAmount = Number(stats?.last24hWithdrawnAmount || 0);
  if (last24hAmount + withdrawalAmount > Number(settings.maxAmountPer24h)) {
    reasons.push(
      `24-hour withdrawal limit exceeded (${last24hAmount + withdrawalAmount} SC / ${settings.maxAmountPer24h} SC)`
    );
  }

  // Check risk score
  if (riskScore > settings.maxRiskScore) {
    reasons.push(
      `Risk score too high (${riskScore} / ${settings.maxRiskScore} max)`
    );
  }

  const isEligible = reasons.length === 0;

  return {
    isEligible,
    riskScore,
    reasons,
    maxInstantAmount: isEligible
      ? Math.min(
          Number(settings.maxAmountPerWithdrawal),
          Number(settings.maxAmountPer24h) - last24hAmount
        )
      : undefined,
  };
}

/**
 * Update user withdrawal statistics
 */
export async function updateWithdrawalStats(
  userId: string,
  withdrawalAmount: number,
  wasSuccessful: boolean
): Promise<void> {
  const now = new Date();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // CRITICAL: Use SQL aggregation to prevent race conditions
  // Calculate 24h totals atomically from withdrawal history
  const last24hStats = await db
    .select({
      count: sql<number>`count(*)`,
      total: sql<number>`COALESCE(sum(${cryptoWithdrawals.creditsAmount}), 0)`,
    })
    .from(cryptoWithdrawals)
    .where(
      and(
        eq(cryptoWithdrawals.userId, userId),
        gte(cryptoWithdrawals.createdAt, oneDayAgo)
      )
    );

  const last24hWithdrawalCount = Number(last24hStats[0]?.count || 0);
  const last24hWithdrawnAmount = Number(last24hStats[0]?.total || 0);

  // Get total withdrawal stats
  const totalStats = await db
    .select({
      total: sql<number>`count(*)`,
      successful: sql<number>`count(CASE WHEN ${cryptoWithdrawals.status} IN ('CONFIRMED', 'SENT') THEN 1 END)`,
      failed: sql<number>`count(CASE WHEN ${cryptoWithdrawals.status} = 'FAILED' THEN 1 END)`,
      totalAmount: sql<number>`COALESCE(sum(CASE WHEN ${cryptoWithdrawals.status} IN ('CONFIRMED', 'SENT') THEN ${cryptoWithdrawals.creditsAmount} ELSE 0 END), 0)`,
    })
    .from(cryptoWithdrawals)
    .where(eq(cryptoWithdrawals.userId, userId));

  const totalWithdrawals = Number(totalStats[0]?.total || 0);
  const successfulWithdrawals = Number(totalStats[0]?.successful || 0);
  const failedWithdrawals = Number(totalStats[0]?.failed || 0);
  const totalWithdrawnAmount = Number(totalStats[0]?.totalAmount || 0);
  const avgWithdrawalAmount = 
    successfulWithdrawals > 0 ? totalWithdrawnAmount / successfulWithdrawals : 0;

  const { score: riskScore } = await calculateRiskScore(userId);

  // Upsert stats atomically
  const existing = await db.query.userWithdrawalStats.findFirst({
    where: eq(userWithdrawalStats.userId, userId),
  });

  if (existing) {
    await db
      .update(userWithdrawalStats)
      .set({
        totalWithdrawals,
        successfulWithdrawals,
        failedWithdrawals,
        totalWithdrawnAmount: totalWithdrawnAmount.toString(),
        last24hWithdrawnAmount: last24hWithdrawnAmount.toString(),
        last24hWithdrawalCount,
        lastWithdrawalAt: now,
        averageWithdrawalAmount: avgWithdrawalAmount.toString(),
        riskScore,
        updatedAt: now,
      })
      .where(eq(userWithdrawalStats.userId, userId));
  } else {
    await db.insert(userWithdrawalStats).values({
      userId,
      totalWithdrawals,
      successfulWithdrawals,
      failedWithdrawals,
      totalWithdrawnAmount: totalWithdrawnAmount.toString(),
      last24hWithdrawnAmount: last24hWithdrawnAmount.toString(),
      last24hWithdrawalCount,
      lastWithdrawalAt: now,
      averageWithdrawalAmount: avgWithdrawalAmount.toString(),
      riskScore,
      updatedAt: now,
    });
  }

  // Update eligibility flag
  const eligibility = await checkInstantWithdrawalEligibility(userId, 0);
  await db
    .update(userWithdrawalStats)
    .set({
      isEligibleForInstant: eligibility.isEligible,
    })
    .where(eq(userWithdrawalStats.userId, userId));
}
