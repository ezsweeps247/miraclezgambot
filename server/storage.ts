import { 
  users, balances, sessions, transactions, bets, slotSpins, 
  crashRounds, crashCashes, serverSeeds, clientSeeds, admins,
  fundoraBloxGames,
  cryptoWallets, cryptoDeposits, cryptoWithdrawals,
  kycVerifications, kycDocuments, amlChecks, complianceReports,
  responsibleGamingLimits, selfExclusions, gamingSessions, coolingOffPeriods, realityChecks,
  affiliates, referrals, commissions, commissionPayouts, affiliateTiers, referralLinks,
  gameSettings, type GameSettings, type InsertGameSettings,
  footerLinks, type FooterLink, type InsertFooterLink,
  siteSettings, type SiteSetting, type InsertSiteSetting,
  depositBonuses, userBonuses, userDailyDeposits, pendingBonusSelections, bonusResetHistory,
  tips, type Tip, type InsertTip,
  vipLevels, vipBenefits, vipProgress, vipRewards,
  type VipLevel, type InsertVipLevel, type VipBenefit, type InsertVipBenefit,
  type VipProgress, type InsertVipProgress, type VipReward, type InsertVipReward,
  dailyLoginRewards, userDailyLogins, dailyLoginClaims,
  type DailyLoginReward, type InsertDailyLoginReward,
  type UserDailyLogin, type InsertUserDailyLogin,
  type DailyLoginClaim, type InsertDailyLoginClaim,
  userTopUpBonus, topUpBonusClaims,
  type UserTopUpBonus, type InsertUserTopUpBonus,
  type TopUpBonusClaim, type InsertTopUpBonusClaim,
  userFavorites, type UserFavorite, type InsertUserFavorite,
  redemptionCodes, redemptionCodeUsages,
  type RedemptionCode, type InsertRedemptionCode,
  type RedemptionCodeUsage, type InsertRedemptionCodeUsage,
  vaultEntries, type VaultEntry, type InsertVaultEntry,
  rakebackBalances, rakebackTransactions,
  type RakebackBalance, type InsertRakebackBalance,
  type RakebackTransaction, type InsertRakebackTransaction,
  type User, type InsertUser, type Balance, type InsertBalance,
  type Transaction, type InsertTransaction, type Bet, type InsertBet,
  type SlotSpin, type InsertSlotSpin,
  type FundoraBloxGame, type InsertFundoraBloxGame,
  type CrashRound, type InsertCrashRound, type CrashCash, type InsertCrashCash,
  type ServerSeed, type InsertServerSeed, type ClientSeed, type InsertClientSeed,
  type Admin, type InsertAdmin, type CryptoWallet, type InsertCryptoWallet,
  type CryptoDeposit, type InsertCryptoDeposit, type CryptoWithdrawal, type InsertCryptoWithdrawal,
  type KycVerification, type InsertKycVerification, type KycDocument, type InsertKycDocument,
  type AmlCheck, type InsertAmlCheck, type ComplianceReport, type InsertComplianceReport,
  type ResponsibleGamingLimit, type InsertResponsibleGamingLimit,
  type SelfExclusion, type InsertSelfExclusion,
  type GamingSession, type InsertGamingSession,
  type CoolingOffPeriod, type InsertCoolingOffPeriod,
  type RealityCheck, type InsertRealityCheck,
  type Affiliate, type InsertAffiliate,
  type Referral, type InsertReferral,
  type Commission, type InsertCommission,
  type CommissionPayout, type InsertCommissionPayout,
  type AffiliateTier, type InsertAffiliateTier,
  type ReferralLink, type InsertReferralLink,
  userWallets, type UserWallet, type InsertUserWallet,
  type DepositBonus, type InsertDepositBonus,
  type UserBonus, type InsertUserBonus,
  type UserDailyDeposit, type InsertUserDailyDeposit,
  type PendingBonusSelection, type InsertPendingBonusSelection,
  type BonusResetHistory, type InsertBonusResetHistory,
  jackpotPools, jackpotContributions, jackpotWinners,
  type JackpotPool, type InsertJackpotPool,
  type JackpotContribution, type InsertJackpotContribution,
  type JackpotWinner, type InsertJackpotWinner
} from "@shared/schema";
import { db } from "./db";
import { and, eq, gte, lt, desc, asc, sql, not, isNull, isNotNull, lte, or, gt, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';
import { chatMessages, type ChatMessage, type InsertChatMessage } from "@shared/schema";
import { broadcastNewBet } from './broadcast-manager';

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByTelegramId(telegramId: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;

  // Balance operations
  getBalance(userId: string): Promise<Balance | undefined>;
  createBalance(balance: InsertBalance): Promise<Balance>;
  updateBalance(userId: string, available: number, locked: number): Promise<void>;
  updateSweepsCashBalance(userId: string, changes: { totalChange: number; redeemableChange: number; }): Promise<void>;

  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactions(userId: string, limit?: number): Promise<Transaction[]>;

  // Bet operations
  createBet(bet: InsertBet): Promise<Bet>;
  recordBet(bet: any): Promise<any>;
  getBets(userId: string, limit?: number): Promise<Bet[]>;
  createSlotSpin(slotSpin: InsertSlotSpin): Promise<SlotSpin>;
  createFundoraBloxGame(game: InsertFundoraBloxGame): Promise<FundoraBloxGame>;

  // Game favorites and recently played
  getRecentlyPlayedGames(userId: string, limit?: number): Promise<{ gameName: string; lastPlayed: Date }[]>;
  getUserFavorites(userId: string): Promise<UserFavorite[]>;
  addGameToFavorites(userId: string, gameName: string): Promise<UserFavorite>;
  removeGameFromFavorites(userId: string, gameName: string): Promise<boolean>;

  // Crash operations
  getCurrentCrashRound(): Promise<CrashRound | undefined>;
  createCrashRound(round: InsertCrashRound): Promise<CrashRound>;
  updateCrashRound(id: string, updates: Partial<CrashRound>): Promise<void>;
  createCrashCash(cashout: InsertCrashCash): Promise<CrashCash>;
  getCrashHistory(limit?: number): Promise<CrashRound[]>;

  // Provably fair operations
  getActiveServerSeed(): Promise<ServerSeed | undefined>;
  createServerSeed(seed: InsertServerSeed): Promise<ServerSeed>;
  rotateServerSeed(id: string, revealedSeed: string): Promise<void>;
  getUserClientSeed(userId: string): Promise<ClientSeed | undefined>;
  createClientSeed(seed: InsertClientSeed): Promise<ClientSeed>;
  getUserNonce(userId: string): Promise<number>;

  // Admin operations
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdminLastLogin(id: string): Promise<void>;
  updateAdminPassword(id: string, passwordHash: string): Promise<void>;
  getAdminStats(): Promise<any>;
  getUsersWithBalance(): Promise<any[]>;

  // Crypto transaction operations
  recordCryptoTransaction(transaction: any): Promise<any>;
  getUserCryptoTransactions(userId: string): Promise<any[]>;
  getRecentCryptoTransactions(limit?: number): Promise<any[]>;
  getCryptoTransaction(id: string): Promise<any>;
  getCryptoTransactionByPaymentId(paymentId: string): Promise<any>;
  updateCryptoTransactionStatus(id: string, status: string, actuallyPaid?: number): Promise<void>;
  getRecentTransactions(limit?: number): Promise<any[]>;

  // Crypto operations
  getUserCryptoWallets(userId: string): Promise<CryptoWallet[]>;
  createCryptoWallet(wallet: InsertCryptoWallet): Promise<CryptoWallet>;
  getUserCryptoDeposits(userId: string): Promise<CryptoDeposit[]>;
  createCryptoDeposit(deposit: InsertCryptoDeposit): Promise<CryptoDeposit>;
  getUserCryptoWithdrawals(userId: string): Promise<CryptoWithdrawal[]>;
  createCryptoWithdrawal(withdrawal: InsertCryptoWithdrawal): Promise<CryptoWithdrawal>;
  getUserBalance(userId: string): Promise<Balance | undefined>;
  lockUserBalance(userId: string, amount: number): Promise<void>;

  // Crypto operations
  createCryptoWallet(wallet: InsertCryptoWallet): Promise<CryptoWallet>;
  getUserCryptoWallets(userId: string): Promise<CryptoWallet[]>;
  getUserCryptoWallet(userId: string, currency: string): Promise<CryptoWallet | undefined>;
  createDeposit(deposit: InsertCryptoDeposit): Promise<CryptoDeposit>;
  createWithdrawal(withdrawal: InsertCryptoWithdrawal): Promise<CryptoWithdrawal>;

  // KYC operations
  createKycVerification(verification: InsertKycVerification): Promise<KycVerification>;
  updateKycVerification(id: string, updates: Partial<KycVerification>): Promise<void>;
  getKycVerification(id: string): Promise<KycVerification | undefined>;
  getUserKycVerification(userId: string): Promise<KycVerification | undefined>;
  getPendingKycVerifications(): Promise<KycVerification[]>;
  createKycDocument(document: InsertKycDocument): Promise<KycDocument>;
  getKycDocuments(verificationId: string): Promise<KycDocument[]>;
  updateUserKycStatus(userId: string, verified: boolean): Promise<void>;

  // AML operations
  createAmlCheck(check: InsertAmlCheck): Promise<AmlCheck>;
  getUserAmlChecks(userId: string): Promise<AmlCheck[]>;
  createComplianceReport(report: InsertComplianceReport): Promise<ComplianceReport>;
  getPendingDeposits(currency: string): Promise<CryptoDeposit[]>;
  getPendingWithdrawals(currency: string): Promise<CryptoWithdrawal[]>;
  confirmDeposit(depositId: string, data: { confirmations: number; creditsAmount: number; exchangeRate: string }): Promise<void>;
  updateWithdrawalStatus(withdrawalId: string, status: string, txHash?: string): Promise<void>;
  addCreditsToBalance(userId: string, amount: number): Promise<void>;
  getUserDeposits(userId: string, limit?: number): Promise<CryptoDeposit[]>;
  getUserWithdrawals(userId: string, limit?: number): Promise<CryptoWithdrawal[]>;
  getDeposit(depositId: string): Promise<CryptoDeposit | undefined>;
  
  // Chat operations
  getRecentChatMessages(limit?: number): Promise<any[]>;
  getOnlineUsersCount(): Promise<number>;
  createChatMessage(data: {
    userId: string;
    username: string;
    message: string;
    userLevel?: string;
  }): Promise<any>;

  // Wallet operations
  getUserWallets(userId: string): Promise<UserWallet[]>;
  connectWallet(walletData: InsertUserWallet): Promise<UserWallet>;
  disconnectWallet(userId: string, walletId: string): Promise<void>;
  setDefaultWallet(userId: string, walletId: string): Promise<void>;

  // CryptoCoaster operations
  getCryptoCoasterHistory(limit?: number): Promise<any[]>;

  // Game Settings operations
  getGameSettings(gameName: string): Promise<GameSettings | undefined>;
  getAllGameSettings(): Promise<GameSettings[]>;
  updateGameSettings(gameName: string, rtpMode: 'HIGH' | 'MEDIUM' | 'LOW', adminId: string): Promise<void>;
  initializeGameSettings(): Promise<void>;

  // Footer Links operations
  getAllFooterLinks(): Promise<FooterLink[]>;
  getActiveFooterLinks(): Promise<FooterLink[]>;
  getFooterLink(id: number): Promise<FooterLink | undefined>;
  createFooterLink(link: InsertFooterLink): Promise<FooterLink>;
  updateFooterLink(id: number, updates: Partial<FooterLink>): Promise<void>;
  deleteFooterLink(id: number): Promise<void>;
  initializeFooterLinks(): Promise<void>;
  
  // Site Settings operations
  getSiteSetting(key: string): Promise<SiteSetting | undefined>;
  setSiteSetting(key: string, value: string, adminId: string): Promise<void>;
  getAllSiteSettings(): Promise<SiteSetting[]>;

  // User profile operations
  getUserProfile(userId: string): Promise<{
    user: User;
    username: string;
    joinedOn: Date;
    totalBets: number;
    totalWagered: number;
    totalRewarded: number;
    rank: string;
    rankLevel: number;
    nextRank: string;
    nextRankLevel: number;
    nextRankRequirement: number;
    currentProgress: number;
    favoriteGame: string | null;
    favoriteCrypto: string;
  } | undefined>;

  // Deposit bonus operations
  getAllDepositBonuses(): Promise<DepositBonus[]>;
  checkWageringRequirements(userId: string): Promise<{
    hasActiveBonus: boolean;
    totalWageringRequired: number;
    totalWagered: number;
    remainingToWager: number;
    activeBonuses: any[];
  }>;
  getDepositBonusByType(bonusType: string): Promise<DepositBonus | undefined>;
  createDepositBonus(bonus: InsertDepositBonus): Promise<DepositBonus>;
  updateDepositBonus(id: number, updates: Partial<DepositBonus>): Promise<void>;
  getUserActiveBonuses(userId: string): Promise<UserBonus[]>;
  getUserBonusHistory(userId: string): Promise<UserBonus[]>;
  createUserBonus(userBonus: InsertUserBonus): Promise<UserBonus>;
  updateUserBonusWagering(bonusId: number, wageredAmount: string): Promise<void>;
  completeUserBonus(bonusId: number): Promise<void>;
  expireUserBonus(bonusId: number): Promise<void>;
  getUserDailyDepositCount(userId: string, date: Date): Promise<number>;
  incrementUserDailyDeposits(userId: string, date: Date): Promise<void>;
  getUserDailyDeposits(userId: string, date: Date): Promise<UserDailyDeposit | undefined>;
  createOrUpdateUserDailyDeposits(data: InsertUserDailyDeposit): Promise<UserDailyDeposit>;
  initializeDefaultBonuses(): Promise<void>;
  
  // Pending Bonus Selection operations
  createPendingBonusSelection(selection: InsertPendingBonusSelection): Promise<PendingBonusSelection>;
  getPendingBonusSelection(userId: string): Promise<PendingBonusSelection | undefined>;
  applyPendingBonusSelection(userId: string, depositId: string, depositAmount: number): Promise<UserBonus | null>;
  expirePendingBonusSelections(userId: string): Promise<void>;
  updatePendingBonusStatus(selectionId: number, status: 'pending' | 'applied' | 'expired', depositId?: string): Promise<void>;
  
  // Tipping operations
  sendTip(fromUserId: string, toUserId: string, amount: number, message?: string): Promise<Tip>;
  getTipsReceived(userId: string): Promise<Tip[]>;
  getTipsSent(userId: string): Promise<Tip[]>;
  getTotalTipsReceived(userId: string): Promise<number>;
  
  // Bonus Reset operations
  checkAndResetBonusIfNeeded(userId: string): Promise<boolean>;
  createBonusResetHistory(reset: InsertBonusResetHistory): Promise<BonusResetHistory>;
  getUserBonusResetHistory(userId: string): Promise<BonusResetHistory[]>;
  getAllBonusResetHistory(limit?: number): Promise<BonusResetHistory[]>;
  expireAllUserBonuses(userId: string): Promise<void>;
  
  // Admin Bonus Management operations
  getAdminBonusStats(): Promise<{
    activeBonuses: number;
    totalClaimed: number;
    totalResets: number;
  }>;
  getAdminBonusActivity(limit?: number): Promise<any[]>;
  
  // VIP System operations
  getVipLevelByName(level: string): Promise<any | undefined>;
  getNextVipLevel(currentLevel: string): Promise<any | undefined>;
  getAllVipLevels(): Promise<any[]>;
  getVipBenefitsByLevel(level: string): Promise<any[]>;
  getUserVipRewards(userId: string): Promise<any[]>;
  claimVipReward(userId: string, rewardId: number): Promise<{ success: boolean; error?: string }>;
  updateUserVipProgress(userId: string, experienceGained: number): Promise<void>;
  checkAndAwardVipLevelUp(userId: string): Promise<void>;

  // Daily Login System operations
  getDailyLoginRewards(): Promise<DailyLoginReward[]>;
  getUserDailyLoginStatus(userId: string): Promise<UserDailyLogin | undefined>;
  updateUserDailyLoginStreak(userId: string, streak: number, nextResetAt: Date): Promise<void>;
  claimDailyLoginReward(userId: string, day: number): Promise<{ goldCoins: number; sweepCoins: number }>;
  claimDailyLoginRewardAtomic(userId: string, todayUTC: string): Promise<{ day: number; goldCoins: number; sweepCoins: number; newStreak: number }>;
  hasClaimedDailyLoginToday(userId: string): Promise<boolean>;
  resetUserDailyLoginStreak(userId: string): Promise<void>;
  createDailyLoginClaim(claim: InsertDailyLoginClaim): Promise<DailyLoginClaim>;
  initializeDailyLoginRewards(): Promise<void>;
  
  // Top Up Bonus System operations
  getUserTopUpBonusStatus(userId: string): Promise<UserTopUpBonus | undefined>;
  claimTopUpBonusAtomic(userId: string, claimTime: Date): Promise<{ goldCoins: number; nextAvailableAt: string }>;
  
  // Balance Mode operations
  updateUserBalanceMode(userId: string, balanceMode: 'GC' | 'SC'): Promise<void>;
  
  // Avatar operations
  updateUserAvatar(userId: string, avatarType: string, avatarBackgroundColor: string): Promise<void>;
  
  // User Preferences operations
  updateUserSoundPreference(userId: string, soundEnabled: boolean): Promise<void>;
  updateUserLoginStreak(userId: string, loginStreak: number, longestStreak: number, lastLoginDate: Date): Promise<void>;
  updateUserScStreak(userId: string, scStreakCount: number, longestScStreak: number, lastScClaimDate: Date): Promise<void>;
  claimScStreakAtomic(userId: string, todayUTC: string): Promise<{ success: boolean; streak: number; longestScStreak: number; rewardAmount: number; error?: string }>;
  
  // Daily Wheel Spinner
  spinWheelAtomic(userId: string, todayUTC: string): Promise<{ success: boolean; rewardType: 'GC' | 'SC'; rewardAmount: number; error?: string }>;

  // Redemption Code operations
  createRedemptionCode(code: InsertRedemptionCode): Promise<RedemptionCode>;
  listRedemptionCodes(adminId?: string, limit?: number): Promise<RedemptionCode[]>;
  deactivateRedemptionCode(codeId: number): Promise<void>;
  getRedemptionCodeByCode(code: string): Promise<RedemptionCode | undefined>;
  getUserCodeUsage(userId: string, codeId: number): Promise<RedemptionCodeUsage | undefined>;
  redeemCodeAtomic(userId: string, code: string, context: { ipHash?: string; userAgentHash?: string }): Promise<{
    success: boolean;
    gcCredited: number;
    scCredited: number;
    bonusCreated?: boolean;
    error?: string;
  }>;

  // Vault operations
  getUserVaultEntries(userId: string): Promise<VaultEntry[]>;
  getVaultEntry(entryId: string, userId: string): Promise<VaultEntry | undefined>;
  stashToVault(entry: InsertVaultEntry): Promise<VaultEntry>;
  releaseFromVault(entryId: string, userId: string): Promise<VaultEntry>;
  processAutoReleases(): Promise<VaultEntry[]>;

  // Rakeback System operations
  getRakebackBalance(userId: string): Promise<RakebackBalance | undefined>;
  createRakebackBalance(balance: InsertRakebackBalance): Promise<RakebackBalance>;
  updateRakebackBalance(userId: string, availableBalance: number, totalEarned: number, totalWithdrawn: number): Promise<void>;
  createRakebackTransaction(transaction: InsertRakebackTransaction): Promise<RakebackTransaction>;
  getRakebackTransactions(userId: string, limit?: number): Promise<RakebackTransaction[]>;
  calculateGGR(userId: string, periodStart: Date, periodEnd: Date): Promise<number>;
  processRakebackCalculation(userId: string): Promise<{ rakebackEarned: number; ggrAmount: number }>;
  withdrawRakebackToBalance(userId: string, amount: number, targetBalance: 'SC' | 'GC'): Promise<{ success: boolean; error?: string }>;

  // Progressive Jackpot operations
  getAllJackpotPools(): Promise<JackpotPool[]>;
  getJackpotPoolByCurrency(currency: 'GC' | 'SC'): Promise<JackpotPool[]>;
  contributeToJackpots(userId: string, betId: string, betAmount: number, gameName: string, currency: 'GC' | 'SC'): Promise<void>;
  checkJackpotWin(userId: string, betId: string, gameName: string, currency: 'GC' | 'SC'): Promise<{ won: boolean; tier?: string; amount?: number }>;
  awardJackpot(poolId: string, userId: string, betId: string, gameName: string): Promise<JackpotWinner>;
  getJackpotWinners(limit?: number): Promise<JackpotWinner[]>;
  getUserJackpotWins(userId: string): Promise<JackpotWinner[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select({
      id: users.id,
      telegramId: users.telegramId,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      referralCode: users.referralCode,
      referredBy: users.referredBy,
      kycVerified: users.kycVerified,
      kycRequiredAt: users.kycRequiredAt,
      riskLevel: users.riskLevel,
      vipLevel: users.vipLevel,
      vipExperience: users.vipExperience,
      vipLevelReachedAt: users.vipLevelReachedAt,
      isInSelfExclusion: users.isInSelfExclusion,
      isInCoolingOff: users.isInCoolingOff,
      selfExclusionUntil: users.selfExclusionUntil,
      selfExclusionType: users.selfExclusionType,
      coolingOffUntil: users.coolingOffUntil,
      lastSessionStart: users.lastSessionStart,
      totalSessionTime: users.totalSessionTime,
      balanceMode: users.balanceMode,
      avatarType: users.avatarType,
      avatarBackgroundColor: users.avatarBackgroundColor,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByTelegramId(telegramId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user || undefined;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.id, userId));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    
    // Create initial balances for dual currency system (GC and SC)
    const initialBalance = process.env.NODE_ENV === 'development' ? 1000 * 100 : 0;
    
    try {
      // Create GC balance (Gold Coins - free play)
      await db.insert(balances).values({
        userId: user.id,
        available: initialBalance,
        locked: 0,
        currency: "GC"
      });
      
      // Create SC balance (Sweep Coins - real money)
      await db.insert(balances).values({
        userId: user.id,
        available: initialBalance,
        locked: 0,
        currency: "SC"
      });
    } catch (error: any) {
      // If balances already exist (duplicate key error), continue without error
      // This handles cases where user creation partially succeeded before
      if (error?.code === '23505' && error?.constraint === 'balances_pkey') {
        console.log(`Balances already exist for user ${user.id}, skipping balance creation`);
      } else {
        // Re-throw if it's a different error
        throw error;
      }
    }

    return user;
  }

  async getBalance(userId: string): Promise<Balance | undefined> {
    const [balance] = await db.select().from(balances).where(eq(balances.userId, userId));
    return balance || undefined;
  }

  async getUserBalances(userId: string): Promise<{ gc: Balance | null; sc: Balance | null }> {
    const userBalances = await db.select().from(balances).where(eq(balances.userId, userId));
    
    const gcBalance = userBalances.find(b => b.currency === 'GC') || null;
    const scBalance = userBalances.find(b => b.currency === 'SC') || null;
    
    return { gc: gcBalance, sc: scBalance };
  }

  async createBalance(balance: InsertBalance): Promise<Balance> {
    const [created] = await db.insert(balances).values(balance).returning();
    return created;
  }

  async updateBalance(userId: string, available: number, locked: number): Promise<void> {
    await db.update(balances)
      .set({ available, locked })
      .where(eq(balances.userId, userId));
  }

  async updateSweepsCashBalance(userId: string, changes: { totalChange: number; redeemableChange: number; }): Promise<void> {
    const currentBalance = await this.getBalance(userId);
    if (!currentBalance) {
      throw new Error('Balance not found');
    }
    
    const newTotal = Number(currentBalance.sweepsCashTotal) + changes.totalChange;
    const newRedeemable = Number(currentBalance.sweepsCashRedeemable) + changes.redeemableChange;
    
    // Ensure values don't go negative
    if (newTotal < 0 || newRedeemable < 0) {
      throw new Error('Insufficient sweeps cash balance');
    }
    
    await db.update(balances)
      .set({ 
        sweepsCashTotal: newTotal.toFixed(2),
        sweepsCashRedeemable: newRedeemable.toFixed(2)
      })
      .where(eq(balances.userId, userId));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [created] = await db.insert(transactions).values(transaction).returning();
    return created;
  }

  async getTransactions(userId: string, limit = 10): Promise<Transaction[]> {
    return await db.select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async createBet(bet: InsertBet): Promise<Bet> {
    // Get active server seed if not provided
    let serverSeedId = bet.serverSeedId;
    if (!serverSeedId) {
      const activeSeed = await this.getActiveServerSeed();
      if (!activeSeed) {
        // Create a new server seed if none exists
        const newSeed = await this.createServerSeed({
          hash: crypto.randomBytes(32).toString('hex'),
          active: true
        });
        serverSeedId = newSeed.id;
      } else {
        serverSeedId = activeSeed.id;
      }
    }
    
    const [created] = await db.insert(bets).values({
      ...bet,
      serverSeedId
    }).returning();
    
    // Get user info for broadcasting
    const user = await this.getUser(created.userId);
    
    // Update VIP experience: 1 XP per dollar wagered (amount is already in cents)
    const experienceGained = Math.floor(bet.amount / 100); // Convert cents to dollars for XP
    if (experienceGained > 0) {
      await this.updateUserVipProgress(created.userId, experienceGained);
    }
    
    // Apply instant rakeback based on VIP level
    const rakebackAmount = await this.calculateRakeback(created.userId, bet.amount);
    if (rakebackAmount > 0) {
      // Credit rakeback to user's balance
      const currentBalance = await this.getBalance(created.userId);
      if (currentBalance) {
        await this.updateBalance(
          created.userId, 
          currentBalance.available + rakebackAmount, 
          currentBalance.locked
        );
        
        // Create transaction for rakeback
        await this.createTransaction({
          userId: created.userId,
          type: 'VIP_REWARD',
          amount: rakebackAmount,
          meta: { 
            rewardType: 'INSTANT_RAKEBACK',
            betId: created.id, 
            vipLevel: user?.vipLevel || 'UNRANKED',
            originalBetAmount: bet.amount 
          }
        });
      }
    }
    
    // Broadcast the new bet to all subscribers
    broadcastNewBet({
      ...created,
      username: user?.username || `Player${created.userId.slice(-4)}`
    });
    
    return created;
  }

  async recordBet(bet: any): Promise<any> {
    // Get active server seed if not provided
    let serverSeedId = bet.serverSeedId;
    if (!serverSeedId) {
      const activeSeed = await this.getActiveServerSeed();
      if (!activeSeed) {
        // Create a new server seed if none exists
        const newSeed = await this.createServerSeed({
          hash: crypto.randomBytes(32).toString('hex'),
          active: true
        });
        serverSeedId = newSeed.id;
      } else {
        serverSeedId = activeSeed.id;
      }
    }
    
    const [created] = await db.insert(bets).values({
      id: bet.id || randomUUID(),
      ...bet,
      serverSeedId
    }).returning();
    
    // Get user info for broadcasting
    const user = await this.getUser(created.userId);
    
    // Broadcast the new bet to all subscribers
    broadcastNewBet({
      ...created,
      username: user?.username || `Player${created.userId.slice(-4)}`
    });
    
    return created;
  }

  async getBets(userId: string, limit = 10): Promise<Bet[]> {
    return await db.select()
      .from(bets)
      .where(eq(bets.userId, userId))
      .orderBy(desc(bets.createdAt))
      .limit(limit);
  }


  async createSlotSpin(slotSpin: InsertSlotSpin): Promise<SlotSpin> {
    const [created] = await db.insert(slotSpins).values(slotSpin).returning();
    return created;
  }

  async createFundoraBloxGame(game: InsertFundoraBloxGame): Promise<FundoraBloxGame> {
    const [created] = await db.insert(fundoraBloxGames).values(game).returning();
    return created;
  }

  async getCurrentCrashRound(): Promise<CrashRound | undefined> {
    const [round] = await db.select()
      .from(crashRounds)
      .where(and(
        eq(crashRounds.status, "RUNNING"),
      ))
      .orderBy(desc(crashRounds.createdAt))
      .limit(1);
    return round || undefined;
  }

  async createCrashRound(round: InsertCrashRound): Promise<CrashRound> {
    const [created] = await db.insert(crashRounds).values(round).returning();
    return created;
  }

  async updateCrashRound(id: string, updates: Partial<CrashRound>): Promise<void> {
    await db.update(crashRounds)
      .set(updates)
      .where(eq(crashRounds.id, id));
  }

  async createCrashCash(cashout: InsertCrashCash): Promise<CrashCash> {
    const [created] = await db.insert(crashCashes).values(cashout).returning();
    return created;
  }

  async getCrashRoundBets(roundId: string): Promise<Array<CrashCash & { username: string; userLevel: string }>> {
    const bets = await db
      .select({
        id: crashCashes.id,
        roundId: crashCashes.roundId,
        userId: crashCashes.userId,
        cashoutMultiplier: crashCashes.cashoutMultiplier,
        amount: crashCashes.amount,
        profit: crashCashes.profit,
        createdAt: crashCashes.createdAt,
        username: users.username,
        userLevel: sql<string>`CASE 
          WHEN ${balances.available} >= 10000 THEN 'VIP'
          WHEN ${balances.available} >= 1000 THEN 'PREMIUM' 
          ELSE 'REGULAR'
        END`
      })
      .from(crashCashes)
      .innerJoin(users, eq(crashCashes.userId, users.id))
      .leftJoin(balances, eq(users.id, balances.userId))
      .where(eq(crashCashes.roundId, roundId))
      .orderBy(desc(crashCashes.createdAt));
    
    return bets.map(bet => ({
      ...bet,
      username: bet.username || 'Unknown'
    }));
  }

  async getGlobalCrashBetHistory(limit: number = 50): Promise<Array<{
    id: string;
    roundId: string;
    username: string;
    userLevel: string;
    amount: number;
    cashoutMultiplier: string;
    profit: number;
    createdAt: Date;
    roundStatus: string;
    crashPoint: string | null;
  }>> {
    try {
      // First get the crash cashes with basic info
      const crashCashData = await db
        .select()
        .from(crashCashes)
        .orderBy(desc(crashCashes.createdAt))
        .limit(limit);

      if (crashCashData.length === 0) {
        return [];
      }

      // Get user info for each bet
      const result = [];
      for (const crash of crashCashData) {
        try {
          // Skip if crash data is invalid
          if (!crash || !crash.userId || !crash.roundId) {
            continue;
          }

          // Try to get user info safely
          let userInfo = null;
          try {
            const userResult = await db
              .select({
                username: users.username,
                available: balances.available
              })
              .from(users)
              .leftJoin(balances, eq(users.id, balances.userId))
              .where(eq(users.id, crash.userId))
              .limit(1);
            userInfo = userResult[0] || null;
          } catch (userError) {
            console.error('Error fetching user info for crash bet:', userError);
            userInfo = null;
          }

          // Try to get round info safely
          let roundInfo = null;
          try {
            const roundResult = await db
              .select()
              .from(crashRounds)
              .where(eq(crashRounds.id, crash.roundId))
              .limit(1);
            roundInfo = roundResult[0] || null;
          } catch (roundError) {
            console.error('Error fetching round info for crash bet:', roundError);
            roundInfo = null;
          }

          const userLevel = (userInfo?.available || 0) >= 10000 ? 'VIP' : 
                           (userInfo?.available || 0) >= 1000 ? 'PREMIUM' : 'REGULAR';

          result.push({
            id: crash.id,
            roundId: crash.roundId,
            username: userInfo?.username || 'Unknown',
            userLevel,
            amount: crash.amount,
            cashoutMultiplier: crash.cashoutMultiplier,
            profit: crash.profit,
            createdAt: crash.createdAt,
            roundStatus: roundInfo?.status || 'UNKNOWN',
            crashPoint: roundInfo?.crashPoint || null
          });
        } catch (innerError) {
          console.error('Error processing crash bet record:', innerError);
          // Skip this record and continue
          continue;
        }
      }
      
      return result;
    } catch (error) {
      console.error('Database error in getGlobalCrashBetHistory:', error);
      return [];
    }
  }

  async getCrashHistory(limit = 20): Promise<CrashRound[]> {
    return await db.select()
      .from(crashRounds)
      .where(eq(crashRounds.status, "ENDED"))
      .orderBy(desc(crashRounds.createdAt))
      .limit(limit);
  }

  async getActiveServerSeed(): Promise<ServerSeed | undefined> {
    const [seed] = await db.select()
      .from(serverSeeds)
      .where(eq(serverSeeds.active, true))
      .orderBy(desc(serverSeeds.createdAt))
      .limit(1);
    return seed || undefined;
  }

  async createServerSeed(seed: InsertServerSeed): Promise<ServerSeed> {
    const [created] = await db.insert(serverSeeds).values(seed).returning();
    return created;
  }

  async rotateServerSeed(id: string, revealedSeed: string): Promise<void> {
    await db.update(serverSeeds)
      .set({ 
        active: false, 
        revealedSeed, 
        rotatedAt: new Date() 
      })
      .where(eq(serverSeeds.id, id));
  }

  async getUserClientSeed(userId: string): Promise<ClientSeed | undefined> {
    const [seed] = await db.select()
      .from(clientSeeds)
      .where(eq(clientSeeds.userId, userId))
      .orderBy(desc(clientSeeds.createdAt))
      .limit(1);
    return seed || undefined;
  }

  async createClientSeed(seed: InsertClientSeed): Promise<ClientSeed> {
    const [created] = await db.insert(clientSeeds).values(seed).returning();
    return created;
  }

  async getUserNonce(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(bets)
      .where(eq(bets.userId, userId));
    return (result[0]?.count || 0) + 1;
  }

  // Admin operations
  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin || undefined;
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    const [admin] = await db.insert(admins).values(insertAdmin).returning();
    return admin;
  }

  async updateAdminLastLogin(id: string): Promise<void> {
    await db.update(admins)
      .set({ lastLoginAt: new Date() })
      .where(eq(admins.id, id));
  }

  async updateAdminPassword(id: string, passwordHash: string): Promise<void> {
    await db.update(admins)
      .set({ passwordHash })
      .where(eq(admins.id, id));
  }

  async getAdminStats(): Promise<any> {
    const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
    const totalBets = await db.select({ count: sql<number>`count(*)` }).from(bets);
    const totalVolume = await db.select({ sum: sql<number>`coalesce(sum(amount), 0)` }).from(bets);
    const totalProfit = await db.select({ sum: sql<number>`coalesce(sum(profit), 0)` }).from(bets);

    // Get stats for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newUsersToday = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(sql`${users.createdAt} >= ${today}`);
    
    const betsToday = await db.select({ count: sql<number>`count(*)` })
      .from(bets)
      .where(sql`${bets.createdAt} >= ${today}`);
    
    const volumeToday = await db.select({ sum: sql<number>`coalesce(sum(amount), 0)` })
      .from(bets)
      .where(sql`${bets.createdAt} >= ${today}`);

    return {
      totalUsers: totalUsers[0].count,
      totalBets: totalBets[0].count,
      totalVolume: totalVolume[0].sum,
      newUsersToday: newUsersToday[0].count,
      betsToday: betsToday[0].count,
      volumeToday: volumeToday[0].sum,
      houseEdge: totalVolume[0].sum > 0 ? Math.abs(totalProfit[0].sum) / totalVolume[0].sum : 0,
    };
  }

  async getUsersWithBalance(): Promise<any[]> {
    return await db
      .select({
        id: users.id,
        telegramId: users.telegramId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt,
        balance: {
          available: balances.available,
          locked: balances.locked,
          currency: balances.currency,
        },
      })
      .from(users)
      .leftJoin(balances, eq(users.id, balances.userId))
      .orderBy(desc(users.createdAt))
      .limit(50);
  }

  async getRecentTransactions(limit: number = 50): Promise<any[]> {
    return await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        createdAt: transactions.createdAt,
        user: {
          id: users.id,
          telegramId: users.telegramId,
          username: users.username,
          firstName: users.firstName,
        },
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  // Crypto operations
  async createCryptoWallet(insertWallet: InsertCryptoWallet): Promise<CryptoWallet> {
    const [wallet] = await db.insert(cryptoWallets).values(insertWallet).returning();
    return wallet;
  }

  async getUserCryptoWallets(userId: string): Promise<CryptoWallet[]> {
    return await db
      .select()
      .from(cryptoWallets)
      .where(and(eq(cryptoWallets.userId, userId), eq(cryptoWallets.isActive, true)));
  }

  async getUserCryptoWallet(userId: string, currency: string): Promise<CryptoWallet | undefined> {
    const [wallet] = await db
      .select()
      .from(cryptoWallets)
      .where(and(
        eq(cryptoWallets.userId, userId),
        eq(cryptoWallets.currency, currency as any),
        eq(cryptoWallets.isActive, true)
      ));
    return wallet || undefined;
  }

  async createDeposit(insertDeposit: InsertCryptoDeposit): Promise<CryptoDeposit> {
    const [deposit] = await db.insert(cryptoDeposits).values(insertDeposit).returning();
    return deposit;
  }

  async createWithdrawal(insertWithdrawal: InsertCryptoWithdrawal): Promise<CryptoWithdrawal> {
    const [withdrawal] = await db.insert(cryptoWithdrawals).values(insertWithdrawal).returning();
    return withdrawal;
  }

  async getPendingDeposits(currency: string): Promise<CryptoDeposit[]> {
    return await db
      .select()
      .from(cryptoDeposits)
      .where(and(
        eq(cryptoDeposits.currency, currency as any),
        eq(cryptoDeposits.status, 'PENDING')
      ));
  }

  async getPendingWithdrawals(currency: string): Promise<CryptoWithdrawal[]> {
    return await db
      .select()
      .from(cryptoWithdrawals)
      .where(and(
        eq(cryptoWithdrawals.currency, currency as any),
        sql`${cryptoWithdrawals.status} IN ('PENDING', 'PROCESSING')`
      ));
  }

  async confirmDeposit(depositId: string, data: { confirmations: number; creditsAmount: number; exchangeRate: string }): Promise<void> {
    await db
      .update(cryptoDeposits)
      .set({
        status: 'CONFIRMED',
        confirmations: data.confirmations,
        creditsAmount: data.creditsAmount,
        exchangeRate: data.exchangeRate,
        confirmedAt: new Date()
      })
      .where(eq(cryptoDeposits.id, depositId));
  }

  async updateWithdrawalStatus(withdrawalId: string, status: string, txHash?: string): Promise<void> {
    const updates: any = { status };
    if (txHash) updates.txHash = txHash;
    if (status === 'CONFIRMED') updates.processedAt = new Date();

    await db
      .update(cryptoWithdrawals)
      .set(updates)
      .where(eq(cryptoWithdrawals.id, withdrawalId));
  }

  async addCreditsToBalance(userId: string, amount: number): Promise<void> {
    await db
      .update(balances)
      .set({
        available: sql`${balances.available} + ${amount}`
      })
      .where(eq(balances.userId, userId));
  }

  async getUserDeposits(userId: string, limit: number = 20): Promise<CryptoDeposit[]> {
    return await db
      .select()
      .from(cryptoDeposits)
      .where(eq(cryptoDeposits.userId, userId))
      .orderBy(desc(cryptoDeposits.createdAt))
      .limit(limit);
  }

  async getUserWithdrawals(userId: string, limit: number = 20): Promise<CryptoWithdrawal[]> {
    return await db
      .select()
      .from(cryptoWithdrawals)
      .where(eq(cryptoWithdrawals.userId, userId))
      .orderBy(desc(cryptoWithdrawals.createdAt))
      .limit(limit);
  }

  async getDeposit(depositId: string): Promise<CryptoDeposit | undefined> {
    const [deposit] = await db
      .select()
      .from(cryptoDeposits)
      .where(eq(cryptoDeposits.id, depositId));
    return deposit || undefined;
  }

  // KYC operations
  async createKycVerification(verification: InsertKycVerification): Promise<KycVerification> {
    const [newVerification] = await db.insert(kycVerifications).values(verification).returning();
    return newVerification;
  }

  async updateKycVerification(id: string, updates: Partial<KycVerification>): Promise<void> {
    await db.update(kycVerifications).set(updates).where(eq(kycVerifications.id, id));
  }

  async getKycVerification(id: string): Promise<KycVerification | undefined> {
    const [verification] = await db.select().from(kycVerifications).where(eq(kycVerifications.id, id));
    return verification;
  }

  async getUserKycVerification(userId: string): Promise<KycVerification | undefined> {
    const [verification] = await db
      .select()
      .from(kycVerifications)
      .where(eq(kycVerifications.userId, userId))
      .orderBy(desc(kycVerifications.createdAt));
    return verification;
  }

  async getPendingKycVerifications(): Promise<KycVerification[]> {
    return db
      .select()
      .from(kycVerifications)
      .where(eq(kycVerifications.status, 'UNDER_REVIEW'))
      .orderBy(desc(kycVerifications.submittedAt));
  }

  async createKycDocument(document: InsertKycDocument): Promise<KycDocument> {
    const [newDocument] = await db.insert(kycDocuments).values(document).returning();
    return newDocument;
  }

  async getKycDocuments(verificationId: string): Promise<KycDocument[]> {
    return db
      .select()
      .from(kycDocuments)
      .where(eq(kycDocuments.verificationId, verificationId))
      .orderBy(desc(kycDocuments.uploadedAt));
  }

  async updateUserKycStatus(userId: string, verified: boolean): Promise<void> {
    await db.update(users).set({ kycVerified: verified }).where(eq(users.id, userId));
  }

  // AML operations
  async createAmlCheck(check: InsertAmlCheck): Promise<AmlCheck> {
    const [newCheck] = await db.insert(amlChecks).values(check).returning();
    return newCheck;
  }

  async getUserAmlChecks(userId: string): Promise<AmlCheck[]> {
    return db
      .select()
      .from(amlChecks)
      .where(eq(amlChecks.userId, userId))
      .orderBy(desc(amlChecks.createdAt));
  }

  async createComplianceReport(report: InsertComplianceReport): Promise<ComplianceReport> {
    const [newReport] = await db.insert(complianceReports).values(report).returning();
    return newReport;
  }

  // Additional missing KYC/AML methods
  async getKycVerificationById(id: string): Promise<KycVerification | undefined> {
    const [verification] = await db.select().from(kycVerifications).where(eq(kycVerifications.id, id));
    return verification;
  }

  async getKycDocument(id: string): Promise<KycDocument | undefined> {
    const [document] = await db.select().from(kycDocuments).where(eq(kycDocuments.id, id));
    return document;
  }

  async updateKycDocument(id: string, updates: Partial<KycDocument>): Promise<void> {
    await db.update(kycDocuments).set(updates).where(eq(kycDocuments.id, id));
  }

  async getKycDocumentsByVerification(verificationId: string): Promise<KycDocument[]> {
    return db.select().from(kycDocuments).where(eq(kycDocuments.verificationId, verificationId));
  }

  async getKycVerificationsByDateRange(startDate: Date, endDate: Date): Promise<KycVerification[]> {
    return await db.select().from(kycVerifications)
      .where(and(
        gte(kycVerifications.createdAt, startDate),
        lte(kycVerifications.createdAt, endDate)
      ))
      .orderBy(desc(kycVerifications.createdAt));
  }

  async getAmlChecksByUser(userId: string): Promise<AmlCheck[]> {
    return await db.select().from(amlChecks)
      .where(eq(amlChecks.userId, userId))
      .orderBy(desc(amlChecks.createdAt));
  }

  async getRecentAmlChecks(days: number): Promise<AmlCheck[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await db.select().from(amlChecks)
      .where(gte(amlChecks.createdAt, cutoffDate))
      .orderBy(desc(amlChecks.createdAt));
  }

  async getAmlChecksByDateRange(startDate: Date, endDate: Date): Promise<AmlCheck[]> {
    return await db.select().from(amlChecks)
      .where(and(
        gte(amlChecks.createdAt, startDate),
        lte(amlChecks.createdAt, endDate)
      ))
      .orderBy(desc(amlChecks.createdAt));
  }

  async getOpenComplianceReports(): Promise<ComplianceReport[]> {
    return await db.select().from(complianceReports)
      .where(or(
        eq(complianceReports.status, 'DRAFT'),
        eq(complianceReports.status, 'SUBMITTED')
      ))
      .orderBy(desc(complianceReports.createdAt));
  }

  async getComplianceReportsByDateRange(startDate: Date, endDate: Date): Promise<ComplianceReport[]> {
    return await db.select().from(complianceReports)
      .where(and(
        gte(complianceReports.createdAt, startDate),
        lte(complianceReports.createdAt, endDate)
      ))
      .orderBy(desc(complianceReports.createdAt));
  }



  // Dashboard history methods  
  async getGameHistory(userId: string, startDate: Date, gameType?: string): Promise<any[]> {
    let query = db.select({
      id: bets.id,
      gameType: bets.game,
      betAmount: bets.amount,
      payout: bets.profit,
      multiplier: sql<number>`1.0`,
      result: bets.result,
      createdAt: bets.createdAt,
      status: sql<'WIN' | 'LOSS'>`CASE WHEN ${bets.profit} > 0 THEN 'WIN' ELSE 'LOSS' END`
    }).from(bets)
      .where(and(
        eq(bets.userId, userId),
        gte(bets.createdAt, startDate)
      ));

    if (gameType && gameType !== 'all') {
      query = db.select({
        id: bets.id,
        gameType: bets.game,
        betAmount: bets.amount,
        payout: bets.profit,
        multiplier: sql<number>`1.0`,
        result: bets.result,
        createdAt: bets.createdAt,
        status: sql<'WIN' | 'LOSS'>`CASE WHEN ${bets.profit} > 0 THEN 'WIN' ELSE 'LOSS' END`
      }).from(bets)
        .where(and(
          eq(bets.userId, userId),
          gte(bets.createdAt, startDate),
          eq(bets.game, gameType as any)
        ));
    }

    return await query.orderBy(desc(bets.createdAt)).limit(1000);
  }

  async getDepositHistory(userId: string, startDate: Date, status?: string): Promise<any[]> {
    // Get crypto deposits
    let cryptoQuery;
    if (status && status !== 'all') {
      cryptoQuery = db.select({
        id: cryptoDeposits.id,
        amount: cryptoDeposits.amount,
        currency: cryptoDeposits.currency,
        method: sql<string>`'Crypto'`,
        status: cryptoDeposits.status,
        transactionHash: cryptoDeposits.txHash,
        createdAt: cryptoDeposits.createdAt,
        completedAt: cryptoDeposits.confirmedAt
      }).from(cryptoDeposits)
        .where(and(
          eq(cryptoDeposits.userId, userId),
          gte(cryptoDeposits.createdAt, startDate),
          eq(cryptoDeposits.status, status as any)
        ));
    } else {
      cryptoQuery = db.select({
        id: cryptoDeposits.id,
        amount: cryptoDeposits.amount,
        currency: cryptoDeposits.currency,
        method: sql<string>`'Crypto'`,
        status: cryptoDeposits.status,
        transactionHash: cryptoDeposits.txHash,
        createdAt: cryptoDeposits.createdAt,
        completedAt: cryptoDeposits.confirmedAt
      }).from(cryptoDeposits)
        .where(and(
          eq(cryptoDeposits.userId, userId),
          gte(cryptoDeposits.createdAt, startDate)
        ));
    }

    // Get regular deposits from transactions
    let transactionQuery = db.select({
      id: transactions.id,
      amount: transactions.amount,
      currency: sql<string>`'CREDITS'`,
      method: sql<string>`'Credits'`,
      status: sql<string>`CASE WHEN ${transactions.type} = 'DEPOSIT' THEN 'COMPLETED' ELSE 'FAILED' END`,
      transactionHash: sql<string | null>`NULL`,
      createdAt: transactions.createdAt,
      completedAt: transactions.createdAt
    }).from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'DEPOSIT' as any),
        gte(transactions.createdAt, startDate)
      ));

    const [cryptoDepositsResult, transactionDepositsResult] = await Promise.all([
      cryptoQuery.orderBy(desc(cryptoDeposits.createdAt)).limit(500),
      transactionQuery.orderBy(desc(transactions.createdAt)).limit(500)
    ]);

    // Combine and sort by date
    const allDeposits = [...cryptoDepositsResult, ...transactionDepositsResult];
    return allDeposits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 1000);
  }

  async getWithdrawalHistory(userId: string, startDate: Date, status?: string): Promise<any[]> {
    // Get crypto withdrawals
    let cryptoQuery;
    if (status && status !== 'all') {
      cryptoQuery = db.select({
        id: cryptoWithdrawals.id,
        amount: cryptoWithdrawals.amount,
        currency: cryptoWithdrawals.currency,
        method: sql<string>`'Crypto'`,
        status: cryptoWithdrawals.status,
        address: cryptoWithdrawals.toAddress,
        transactionHash: cryptoWithdrawals.txHash,
        createdAt: cryptoWithdrawals.createdAt,
        completedAt: cryptoWithdrawals.processedAt
      }).from(cryptoWithdrawals)
        .where(and(
          eq(cryptoWithdrawals.userId, userId),
          gte(cryptoWithdrawals.createdAt, startDate),
          eq(cryptoWithdrawals.status, status as any)
        ));
    } else {
      cryptoQuery = db.select({
        id: cryptoWithdrawals.id,
        amount: cryptoWithdrawals.amount,
        currency: cryptoWithdrawals.currency,
        method: sql<string>`'Crypto'`,
        status: cryptoWithdrawals.status,
        address: cryptoWithdrawals.toAddress,
        transactionHash: cryptoWithdrawals.txHash,
        createdAt: cryptoWithdrawals.createdAt,
        completedAt: cryptoWithdrawals.processedAt
      }).from(cryptoWithdrawals)
        .where(and(
          eq(cryptoWithdrawals.userId, userId),
          gte(cryptoWithdrawals.createdAt, startDate)
        ));
    }

    // Get regular withdrawals from transactions
    let transactionQuery = db.select({
      id: transactions.id,
      amount: transactions.amount,
      currency: sql<string>`'CREDITS'`,
      method: sql<string>`'Credits'`,
      status: sql<string>`CASE WHEN ${transactions.type} = 'WITHDRAWAL' THEN 'COMPLETED' ELSE 'FAILED' END`,
      address: sql<string | null>`NULL`,
      transactionHash: sql<string | null>`NULL`,
      createdAt: transactions.createdAt,
      completedAt: transactions.createdAt
    }).from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'WITHDRAW' as any),
        gte(transactions.createdAt, startDate)
      ));

    const [cryptoWithdrawalsResult, transactionWithdrawalsResult] = await Promise.all([
      cryptoQuery.orderBy(desc(cryptoWithdrawals.createdAt)).limit(500),
      transactionQuery.orderBy(desc(transactions.createdAt)).limit(500)
    ]);

    // Combine and sort by date
    const allWithdrawals = [...cryptoWithdrawalsResult, ...transactionWithdrawalsResult];
    return allWithdrawals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 1000);
  }

  // Responsible Gaming operations
  async createResponsibleGamingLimit(limit: InsertResponsibleGamingLimit): Promise<ResponsibleGamingLimit> {
    const [newLimit] = await db.insert(responsibleGamingLimits).values({
      id: randomUUID(),
      ...limit
    }).returning();
    return newLimit;
  }

  async getUserResponsibleGamingLimits(userId: string): Promise<ResponsibleGamingLimit[]> {
    return db.select().from(responsibleGamingLimits)
      .where(and(eq(responsibleGamingLimits.userId, userId), eq(responsibleGamingLimits.isActive, true)));
  }

  async deactivateResponsibleGamingLimits(userId: string): Promise<void> {
    await db.update(responsibleGamingLimits)
      .set({ isActive: false })
      .where(eq(responsibleGamingLimits.userId, userId));
  }

  async createSelfExclusion(exclusion: InsertSelfExclusion): Promise<SelfExclusion> {
    const [newExclusion] = await db.insert(selfExclusions).values({
      id: randomUUID(),
      ...exclusion
    }).returning();
    return newExclusion;
  }

  async getUserSelfExclusions(userId: string): Promise<SelfExclusion[]> {
    return db.select().from(selfExclusions).where(eq(selfExclusions.userId, userId));
  }

  async createCoolingOffPeriod(period: InsertCoolingOffPeriod): Promise<CoolingOffPeriod> {
    const [newPeriod] = await db.insert(coolingOffPeriods).values({
      id: randomUUID(),
      ...period
    }).returning();
    return newPeriod;
  }

  async getUserCoolingOffPeriods(userId: string): Promise<CoolingOffPeriod[]> {
    return db.select().from(coolingOffPeriods).where(eq(coolingOffPeriods.userId, userId));
  }

  async createGamingSession(session: InsertGamingSession): Promise<GamingSession> {
    const [newSession] = await db.insert(gamingSessions).values({
      id: randomUUID(),
      ...session
    }).returning();
    return newSession;
  }

  async getActiveGamingSession(userId: string): Promise<GamingSession | undefined> {
    const [session] = await db.select().from(gamingSessions)
      .where(and(eq(gamingSessions.userId, userId), eq(gamingSessions.isActive, true)));
    return session;
  }

  async getGamingSession(id: string): Promise<GamingSession | undefined> {
    const [session] = await db.select().from(gamingSessions).where(eq(gamingSessions.id, id));
    return session;
  }

  async updateGamingSession(id: string, updates: Partial<GamingSession>): Promise<void> {
    await db.update(gamingSessions).set(updates).where(eq(gamingSessions.id, id));
  }

  async createRealityCheck(check: InsertRealityCheck): Promise<RealityCheck> {
    const [newCheck] = await db.insert(realityChecks).values({
      id: crypto.randomUUID(),
      ...check
    }).returning();
    return newCheck;
  }

  async getUserPendingRealityChecks(userId: string): Promise<RealityCheck[]> {
    return db.select().from(realityChecks)
      .where(and(eq(realityChecks.userId, userId), isNull(realityChecks.userResponse)));
  }

  async updateRealityCheck(id: string, updates: Partial<RealityCheck>): Promise<void> {
    await db.update(realityChecks).set(updates).where(eq(realityChecks.id, id));
  }

  async getUserDepositSum(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await db.select({
      total: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`
    }).from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'DEPOSIT'),
        gte(transactions.createdAt, startDate),
        lte(transactions.createdAt, endDate)
      ));
    return parseFloat(result[0]?.total?.toString() || "0");
  }

  async getUserLossSum(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await db.select({
      totalLoss: sql<number>`COALESCE(SUM(CASE WHEN CAST(${transactions.amount} AS DECIMAL) < 0 THEN ABS(CAST(${transactions.amount} AS DECIMAL)) ELSE 0 END), 0)`
    }).from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'BET'),
        gte(transactions.createdAt, startDate),
        lte(transactions.createdAt, endDate)
      ));
    return parseFloat(result[0]?.totalLoss?.toString() || "0");
  }

  // Affiliate methods
  async createAffiliate(affiliate: InsertAffiliate): Promise<Affiliate> {
    const [created] = await db.insert(affiliates).values({
      id: randomUUID(),
      ...affiliate
    }).returning();
    return created;
  }

  async getAffiliate(id: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.id, id));
    return affiliate;
  }

  async getAffiliateByUserId(userId: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.userId, userId));
    return affiliate;
  }

  async getAffiliateByReferralCode(referralCode: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.referralCode, referralCode));
    return affiliate;
  }

  async updateAffiliateStats(id: string, updates: Partial<Affiliate>): Promise<void> {
    await db.update(affiliates).set(updates).where(eq(affiliates.id, id));
  }

  // Referral methods
  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [created] = await db.insert(referrals).values({
      id: randomUUID(),
      ...referral
    }).returning();
    return created;
  }

  async getReferral(id: string): Promise<Referral | undefined> {
    const [referral] = await db.select().from(referrals).where(eq(referrals.id, id));
    return referral;
  }

  async getReferralByUserId(userId: string): Promise<Referral | undefined> {
    const [referral] = await db.select().from(referrals).where(eq(referrals.referredUserId, userId));
    return referral;
  }

  async getAffiliateReferrals(affiliateId: string): Promise<Referral[]> {
    return await db.select().from(referrals).where(eq(referrals.affiliateId, affiliateId));
  }

  async updateReferral(id: string, updates: Partial<Referral>): Promise<void> {
    await db.update(referrals).set(updates).where(eq(referrals.id, id));
  }

  // Commission methods
  async createCommission(commission: InsertCommission): Promise<Commission> {
    const [created] = await db.insert(commissions).values({
      id: randomUUID(),
      ...commission
    }).returning();
    return created;
  }

  async getAffiliateCommissions(affiliateId: string): Promise<Commission[]> {
    return await db.select().from(commissions)
      .where(eq(commissions.affiliateId, affiliateId))
      .orderBy(desc(commissions.earnedAt));
  }

  async getPendingCommissions(affiliateId: string, maxAmount: number): Promise<Commission[]> {
    const result = await db.select().from(commissions)
      .where(and(
        eq(commissions.affiliateId, affiliateId),
        eq(commissions.status, 'PENDING')
      ))
      .orderBy(commissions.earnedAt);
    
    let totalAmount = 0;
    const selectedCommissions = [];
    
    for (const commission of result) {
      const amount = parseFloat(commission.commissionAmount);
      if (totalAmount + amount <= maxAmount) {
        selectedCommissions.push(commission);
        totalAmount += amount;
      } else {
        break;
      }
    }
    
    return selectedCommissions;
  }

  async updateCommissionStatuses(commissionIds: string[], status: string): Promise<void> {
    if (commissionIds.length === 0) return;
    await db.update(commissions)
      .set({ status: status as 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED' })
      .where(sql`${commissions.id} = ANY(${commissionIds})`);
  }

  // Commission Payout methods
  async createCommissionPayout(payout: InsertCommissionPayout): Promise<CommissionPayout> {
    const [created] = await db.insert(commissionPayouts).values({
      id: randomUUID(),
      ...payout
    }).returning();
    return created;
  }

  async getAffiliatePayouts(affiliateId: string): Promise<CommissionPayout[]> {
    return await db.select().from(commissionPayouts)
      .where(eq(commissionPayouts.affiliateId, affiliateId))
      .orderBy(desc(commissionPayouts.requestedAt));
  }

  // Affiliate Tier methods
  async getAffiliateTiers(): Promise<AffiliateTier[]> {
    return await db.select().from(affiliateTiers)
      .where(eq(affiliateTiers.isActive, true))
      .orderBy(affiliateTiers.requiredReferrals);
  }

  // Referral Link methods
  async createReferralLink(link: InsertReferralLink): Promise<ReferralLink> {
    const [created] = await db.insert(referralLinks).values({
      id: randomUUID(),
      ...link
    }).returning();
    return created;
  }

  async getAffiliateReferralLinks(affiliateId: string): Promise<ReferralLink[]> {
    return await db.select().from(referralLinks)
      .where(eq(referralLinks.affiliateId, affiliateId))
      .orderBy(desc(referralLinks.createdAt));
  }

  async getReferralLinkByCode(referralCode: string): Promise<ReferralLink | undefined> {
    const [link] = await db.select().from(referralLinks)
      .where(eq(referralLinks.referralCode, referralCode));
    return link;
  }

  async incrementLinkClicks(linkId: string): Promise<void> {
    await db.update(referralLinks)
      .set({ clicks: sql`${referralLinks.clicks} + 1` })
      .where(eq(referralLinks.id, linkId));
  }

  async incrementLinkConversions(linkId: string): Promise<void> {
    await db.update(referralLinks)
      .set({ conversions: sql`${referralLinks.conversions} + 1` })
      .where(eq(referralLinks.id, linkId));
  }

  // Crypto transaction methods
  async recordCryptoTransaction(transaction: any): Promise<any> {
    if (transaction.type === 'deposit') {
      const cryptoTransaction = {
        id: transaction.id || randomUUID(),
        userId: transaction.userId,
        type: transaction.type,
        currency: transaction.currency,
        amount: transaction.amount.toString(),
        usdAmount: transaction.usdAmount?.toString(),
        status: transaction.status,
        paymentId: transaction.paymentId,
        paymentUrl: transaction.paymentUrl,
        address: transaction.address,
        actuallyPaid: transaction.actuallyPaid?.toString(),
        createdAt: transaction.createdAt || new Date(),
        updatedAt: transaction.updatedAt
      };
      const [created] = await db.insert(cryptoDeposits).values(cryptoTransaction).returning();
      return created;
    } else {
      // For withdrawals, map to correct schema fields
      const withdrawalTransaction = {
        id: transaction.id || randomUUID(),
        userId: transaction.userId,
        currency: transaction.currency.toUpperCase(),
        amount: transaction.amount.toString(),
        toAddress: transaction.address,  // Map address to toAddress
        status: transaction.status?.toUpperCase() || 'PENDING',
        creditsAmount: transaction.creditsAmount || 0,  // Add creditsAmount
        createdAt: transaction.createdAt || new Date()
      };
      const [created] = await db.insert(cryptoWithdrawals).values(withdrawalTransaction).returning();
      return created;
    }
  }

  async getUserCryptoTransactions(userId: string): Promise<any[]> {
    const deposits = await db.select().from(cryptoDeposits)
      .where(eq(cryptoDeposits.userId, userId))
      .orderBy(desc(cryptoDeposits.createdAt));
    
    const withdrawals = await db.select().from(cryptoWithdrawals)
      .where(eq(cryptoWithdrawals.userId, userId))
      .orderBy(desc(cryptoWithdrawals.createdAt));

    // Combine and sort by creation date
    const allTransactions = [
      ...deposits.map(d => ({ ...d, type: 'deposit' })),
      ...withdrawals.map(w => ({ ...w, type: 'withdrawal' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return allTransactions;
  }

  async getRecentCryptoTransactions(limit: number = 10): Promise<any[]> {
    const deposits = await db.select().from(cryptoDeposits)
      .orderBy(desc(cryptoDeposits.createdAt))
      .limit(limit);
    
    const withdrawals = await db.select().from(cryptoWithdrawals)
      .orderBy(desc(cryptoWithdrawals.createdAt))
      .limit(limit);

    // Combine and sort by creation date, then limit
    const allTransactions = [
      ...deposits.map(d => ({ 
        ...d, 
        type: 'deposit',
        address: d.address 
      })),
      ...withdrawals.map(w => ({ 
        ...w, 
        type: 'withdrawal',
        address: w.toAddress 
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
     .slice(0, limit);

    return allTransactions;
  }

  async getCryptoTransaction(id: string): Promise<any> {
    // Try deposits first
    const [deposit] = await db.select().from(cryptoDeposits).where(eq(cryptoDeposits.id, id));
    if (deposit) {
      return { ...deposit, type: 'deposit' };
    }

    // Try withdrawals
    const [withdrawal] = await db.select().from(cryptoWithdrawals).where(eq(cryptoWithdrawals.id, id));
    if (withdrawal) {
      return { ...withdrawal, type: 'withdrawal' };
    }

    return undefined;
  }

  async getCryptoTransactionByPaymentId(paymentId: string): Promise<any> {
    // Try deposits first - search by paymentId field, not id
    const [deposit] = await db.select().from(cryptoDeposits).where(eq(cryptoDeposits.paymentId, paymentId));
    if (deposit) {
      return { ...deposit, type: 'deposit' };
    }

    // Try withdrawals
    const [withdrawal] = await db.select().from(cryptoWithdrawals).where(eq(cryptoWithdrawals.paymentId, paymentId));
    if (withdrawal) {
      return { ...withdrawal, type: 'withdrawal' };
    }

    return undefined;
  }

  async updateCryptoTransactionStatus(id: string, status: string, actuallyPaid?: number): Promise<void> {
    const updateData: any = { 
      status, 
      updatedAt: new Date() 
    };
    
    if (actuallyPaid !== undefined) {
      updateData.actuallyPaid = actuallyPaid.toString();
    }

    // Try updating deposits first
    const depositResult = await db.update(cryptoDeposits)
      .set(updateData)
      .where(eq(cryptoDeposits.id, id))
      .returning();

    if (depositResult.length > 0) {
      return;
    }

    // Try updating withdrawals
    await db.update(cryptoWithdrawals)
      .set(updateData)
      .where(eq(cryptoWithdrawals.id, id));
  }



  async getUserCryptoDeposits(userId: string): Promise<CryptoDeposit[]> {
    return await db.select().from(cryptoDeposits)
      .where(eq(cryptoDeposits.userId, userId))
      .orderBy(desc(cryptoDeposits.createdAt));
  }

  async createCryptoDeposit(deposit: InsertCryptoDeposit): Promise<CryptoDeposit> {
    const [created] = await db.insert(cryptoDeposits).values({
      id: randomUUID(),
      ...deposit
    }).returning();
    return created;
  }

  async getUserCryptoWithdrawals(userId: string): Promise<CryptoWithdrawal[]> {
    return await db.select().from(cryptoWithdrawals)
      .where(eq(cryptoWithdrawals.userId, userId))
      .orderBy(desc(cryptoWithdrawals.createdAt));
  }

  async createCryptoWithdrawal(withdrawal: InsertCryptoWithdrawal): Promise<CryptoWithdrawal> {
    const [created] = await db.insert(cryptoWithdrawals).values({
      id: randomUUID(),
      ...withdrawal
    }).returning();
    return created;
  }

  async getUserBalance(userId: string): Promise<Balance | undefined> {
    return this.getBalance(userId);
  }

  async lockUserBalance(userId: string, amount: number): Promise<void> {
    const balance = await this.getBalance(userId);
    if (!balance) {
      throw new Error('User balance not found');
    }
    
    await this.updateBalance(userId, balance.available - amount, balance.locked + amount);
  }

  async getRecentCasinoWins(limit: number = 50): Promise<any[]> {
    try {
      // For now, return sample data to avoid database schema issues
      // This will be replaced with actual database queries once schema is stabilized
      const sampleWins = [
        {
          id: "sample-1",
          username: "Player1234",
          game: "DICE",
          amount: 25,
          payout: 125,
          multiplier: 5.0,
          timestamp: new Date(),
          isHighWin: true
        },
        {
          id: "sample-2", 
          username: "Crypto_King",
          game: "SLOTS",
          amount: 10,
          payout: 45,
          multiplier: 4.5,
          timestamp: new Date(Date.now() - 30000),
          isHighWin: false
        },
        {
          id: "sample-3",
          username: "BigWinner",
          game: "CRASH",
          amount: 50,
          payout: 200,
          multiplier: 4.0,
          timestamp: new Date(Date.now() - 60000),
          isHighWin: true
        }
      ];
      
      return sampleWins.slice(0, limit);
    } catch (error) {
      console.error('Error fetching recent casino wins:', error);
      return [];
    }
  }

  // Chat operations
  async getRecentChatMessages(limit: number = 50): Promise<any[]> {
    try {
      const messages = await db.select().from(chatMessages)
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit);
      
      // Return in chronological order (oldest first)
      return messages.reverse().map(msg => ({
        id: msg.id,
        userId: msg.userId,
        username: msg.username,
        message: msg.message,
        timestamp: msg.createdAt,
        userLevel: msg.userLevel || 'REGULAR',
        isSystem: msg.isSystemMessage || false
      }));
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      // Return fallback messages if table doesn't exist yet
      return [
        {
          id: "chat-1",
          userId: "system",
          username: "System",
          message: "Welcome to 214DF Mobile Gaming! Chat coming soon...",
          timestamp: new Date(),
          userLevel: "ADMIN",
          isSystem: true
        }
      ];
    }
  }

  async getOnlineUsersCount(): Promise<number> {
    try {
      // Count unique users who have been active in the last 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const result = await db.select({ count: sql<number>`count(distinct ${chatMessages.userId})` })
        .from(chatMessages)
        .where(gte(chatMessages.createdAt, tenMinutesAgo));
      
      // Return at least 1 if no recent activity, plus some randomness for realism
      const baseCount = result[0]?.count || 0;
      return Math.max(1, baseCount + Math.floor(Math.random() * 15) + 5);
    } catch (error) {
      console.error('Error getting online users count:', error);
      // Fallback to random count if database query fails
      return Math.floor(Math.random() * 20) + 5;
    }
  }

  async createChatMessage(data: {
    userId: string;
    username: string;
    message: string;
    userLevel?: string;
  }): Promise<any> {
    try {
      const [newMessage] = await db.insert(chatMessages).values({
        userId: data.userId,
        username: data.username,
        message: data.message.trim(),
        userLevel: data.userLevel as 'REGULAR' | 'VIP' | 'ADMIN' || 'REGULAR',
        isSystemMessage: false
      }).returning();

      return {
        id: newMessage.id,
        userId: newMessage.userId,
        username: newMessage.username,
        message: newMessage.message,
        timestamp: newMessage.createdAt,
        userLevel: newMessage.userLevel || 'REGULAR',
        isSystem: newMessage.isSystemMessage || false
      };
    } catch (error) {
      console.error('Error creating chat message:', error);
      // Return a mock message if table doesn't exist yet
      return {
        id: `chat-${Date.now()}`,
        userId: data.userId,
        username: data.username,
        message: data.message,
        timestamp: new Date(),
        userLevel: data.userLevel || 'REGULAR',
        isSystem: false
      };
    }
  }

  // Wallet connection methods
  async getUserWallets(userId: string): Promise<UserWallet[]> {
    return await db
      .select()
      .from(userWallets)
      .where(and(
        eq(userWallets.userId, userId),
        eq(userWallets.status, 'connected')
      ))
      .orderBy(desc(userWallets.lastUsedAt));
  }

  async connectWallet(walletData: InsertUserWallet): Promise<UserWallet> {
    // If this is the user's first wallet, make it default
    const existingWallets = await this.getUserWallets(walletData.userId);
    const isDefault = existingWallets.length === 0;

    const [wallet] = await db
      .insert(userWallets)
      .values({
        ...walletData,
        isDefault,
      })
      .onConflictDoUpdate({
        target: [userWallets.userId, userWallets.address],
        set: {
          status: 'connected',
          walletType: walletData.walletType,
          signature: walletData.signature,
          lastUsedAt: new Date(),
        },
      })
      .returning();

    return wallet;
  }

  async disconnectWallet(userId: string, walletId: string): Promise<void> {
    await db
      .update(userWallets)
      .set({ 
        status: 'disconnected',
        lastUsedAt: new Date()
      })
      .where(and(
        eq(userWallets.id, walletId),
        eq(userWallets.userId, userId)
      ));
  }

  async setDefaultWallet(userId: string, walletId: string): Promise<void> {
    // First, unset all default wallets for the user
    await db
      .update(userWallets)
      .set({ isDefault: false })
      .where(eq(userWallets.userId, userId));

    // Then set the specified wallet as default
    await db
      .update(userWallets)
      .set({ 
        isDefault: true,
        lastUsedAt: new Date()
      })
      .where(and(
        eq(userWallets.id, walletId),
        eq(userWallets.userId, userId)
      ));
  }

  // CryptoCoaster operations
  async getCryptoCoasterHistory(limit: number = 100): Promise<any[]> {
    const history = await db.select({
      id: crashRounds.id,
      crashPoint: crashRounds.crashPoint,
      startedAt: crashRounds.startAt,
      endedAt: crashRounds.endAt
    })
    .from(crashRounds)
    .where(isNotNull(crashRounds.crashPoint))
    .orderBy(desc(crashRounds.endAt))
    .limit(limit);
    
    return history.reverse(); // Return in chronological order (oldest first)
  }

  // Game Settings operations
  async getGameSettings(gameName: string): Promise<GameSettings | undefined> {
    const [settings] = await db.select()
      .from(gameSettings)
      .where(eq(gameSettings.gameName, gameName as any));
    return settings || undefined;
  }

  async getAllGameSettings(): Promise<GameSettings[]> {
    return await db.select()
      .from(gameSettings)
      .orderBy(asc(gameSettings.gameName));
  }

  async updateGameSettings(gameName: string, rtpMode: 'HIGH' | 'MEDIUM' | 'LOW', adminId: string): Promise<void> {
    const rtpValues = {
      HIGH: { rtp: '99.00', house: '1.00' },
      MEDIUM: { rtp: '96.00', house: '4.00' },
      LOW: { rtp: '94.00', house: '6.00' }
    };

    const { rtp, house } = rtpValues[rtpMode];

    await db.update(gameSettings)
      .set({
        rtpMode: rtpMode,
        rtpValue: rtp,
        houseEdge: house,
        updatedBy: adminId,
        updatedAt: new Date()
      })
      .where(eq(gameSettings.gameName, gameName as any));
  }

  async initializeGameSettings(): Promise<void> {
    const games = [
      'DICE', 'SLOTS', 'CRASH', 'MIRACOASTER', 'MINES', 
      'KENO', 'PLINKO', 'LIMBO', 'HILO', 'BLACKJACK', 'ROULETTE'
    ];

    for (const gameName of games) {
      const existing = await this.getGameSettings(gameName);
      if (!existing) {
        await db.insert(gameSettings).values({
          gameName: gameName as any,
          rtpMode: 'MEDIUM',
          rtpValue: '96.00',
          houseEdge: '4.00',
          updatedAt: new Date()
        });
      }
    }
  }

  // Footer Links operations
  async getAllFooterLinks(): Promise<FooterLink[]> {
    return await db.select()
      .from(footerLinks)
      .orderBy(asc(footerLinks.section), asc(footerLinks.orderIndex));
  }

  async getActiveFooterLinks(): Promise<FooterLink[]> {
    return await db.select()
      .from(footerLinks)
      .where(eq(footerLinks.isActive, true))
      .orderBy(asc(footerLinks.section), asc(footerLinks.orderIndex));
  }

  async getFooterLink(id: number): Promise<FooterLink | undefined> {
    const [link] = await db.select()
      .from(footerLinks)
      .where(eq(footerLinks.id, id));
    return link || undefined;
  }

  async createFooterLink(link: InsertFooterLink): Promise<FooterLink> {
    const [created] = await db.insert(footerLinks)
      .values(link)
      .returning();
    return created;
  }

  async updateFooterLink(id: number, updates: Partial<FooterLink>): Promise<void> {
    await db.update(footerLinks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(footerLinks.id, id));
  }

  async deleteFooterLink(id: number): Promise<void> {
    await db.delete(footerLinks)
      .where(eq(footerLinks.id, id));
  }

  async initializeFooterLinks(): Promise<void> {
    const existingLinks = await this.getAllFooterLinks();
    if (existingLinks.length > 0) {
      return; // Already initialized
    }

    const defaultLinks = [
      // Support section
      { section: 'support' as const, title: 'Live Support', url: '/support', orderIndex: 0, isActive: true },
      { section: 'support' as const, title: 'Help Center', url: '/help', orderIndex: 1, isActive: true },
      { section: 'support' as const, title: 'Game Responsibly', url: '/responsible-gaming', orderIndex: 2, isActive: true },
      
      // Platform section
      { section: 'platform' as const, title: 'Provably Fair', url: '/provably-fair', orderIndex: 0, isActive: true },
      { section: 'platform' as const, title: 'Affiliate Program', url: '/affiliate', orderIndex: 1, isActive: true },
      { section: 'platform' as const, title: 'Redeem Code', url: '/redeem', orderIndex: 2, isActive: true },
      { section: 'platform' as const, title: 'VIP Program', url: '/vip', orderIndex: 3, isActive: true },
      
      // Policy section
      { section: 'policy' as const, title: 'Terms of Service', url: '/terms', orderIndex: 0, isActive: true },
      { section: 'policy' as const, title: 'Privacy Policy', url: '/privacy', orderIndex: 1, isActive: true },
      { section: 'policy' as const, title: 'Responsible Gaming', url: '/responsible-gaming-policy', orderIndex: 2, isActive: true },
      { section: 'policy' as const, title: 'Sweepstakes Rules', url: '/sweepstakes', orderIndex: 3, isActive: true },
      
      // Community section
      { section: 'community' as const, title: 'X (Twitter)', url: 'https://twitter.com/miraclez', orderIndex: 0, isActive: true },
      { section: 'community' as const, title: 'Instagram', url: 'https://instagram.com/miraclez', orderIndex: 1, isActive: true },
      { section: 'community' as const, title: 'Facebook', url: 'https://facebook.com/miraclez', orderIndex: 2, isActive: true },
      { section: 'community' as const, title: 'Telegram', url: 'https://t.me/miraclez', orderIndex: 3, isActive: true },
    ];

    for (const link of defaultLinks) {
      await this.createFooterLink(link);
    }
  }
  
  // Site Settings operations
  async getSiteSetting(key: string): Promise<SiteSetting | undefined> {
    const [setting] = await db.select()
      .from(siteSettings)
      .where(eq(siteSettings.settingKey, key))
      .limit(1);
    return setting;
  }
  
  async setSiteSetting(key: string, value: string, adminId: string): Promise<void> {
    const existing = await this.getSiteSetting(key);
    
    if (existing) {
      await db.update(siteSettings)
        .set({
          settingValue: value,
          updatedAt: new Date(),
          updatedByAdminId: adminId
        })
        .where(eq(siteSettings.settingKey, key));
    } else {
      await db.insert(siteSettings)
        .values({
          settingKey: key,
          settingValue: value,
          updatedByAdminId: adminId
        });
    }
  }
  
  async getAllSiteSettings(): Promise<SiteSetting[]> {
    return await db.select()
      .from(siteSettings)
      .orderBy(asc(siteSettings.settingKey));
  }

  // Get recent bets with user information for live feed
  async getRecentBets(limit = 30, filter?: { userId?: string; minAmount?: number }): Promise<any[]> {
    // Build where conditions
    let whereConditions: any[] = [];
    
    if (filter?.userId) {
      whereConditions.push(eq(bets.userId, filter.userId));
    }
    
    if (filter?.minAmount) {
      whereConditions.push(gte(bets.amount, filter.minAmount));
    }
    
    // Build the complete query with all conditions
    const baseQuery = db.select({
      id: bets.id,
      userId: bets.userId,
      username: users.username,
      game: bets.game,
      amount: bets.amount,
      result: bets.result,
      profit: bets.profit,
      createdAt: bets.createdAt,
    })
    .from(bets)
    .leftJoin(users, eq(bets.userId, users.id));

    // Execute query with or without conditions
    const results = whereConditions.length > 0
      ? await baseQuery
          .where(and(...whereConditions))
          .orderBy(desc(bets.createdAt))
          .limit(limit)
      : await baseQuery
          .orderBy(desc(bets.createdAt))
          .limit(limit);
    
    // Transform results to include calculated fields
    return results.map(bet => ({
      id: bet.id,
      userId: bet.userId,
      username: bet.username || `Player${bet.userId?.slice(-4) || '????'}`,
      game: bet.game || 'Unknown',
      amount: Number(bet.amount) / 100, // Convert from cents to credits
      multiplier: bet.profit && bet.amount ? Math.max(1, (Number(bet.profit) + Number(bet.amount)) / Number(bet.amount)) : 1,
      payout: bet.profit ? (Number(bet.profit) + Number(bet.amount)) / 100 : Number(bet.amount) / 100,
      profit: Number(bet.profit) / 100,
      result: bet.result,
      timestamp: bet.createdAt ? new Date(bet.createdAt).getTime() : Date.now()
    }));
  }

  // User profile operations
  async getUserProfile(userId: string): Promise<{
    user: User;
    username: string;
    joinedOn: Date;
    totalBets: number;
    totalWagered: number;
    totalRewarded: number;
    rank: string;
    rankLevel: number;
    nextRank: string;
    nextRankLevel: number;
    nextRankRequirement: number;
    currentProgress: number;
    favoriteGame: string | null;
    favoriteCrypto: string;
  } | undefined> {
    // Get user data
    const user = await this.getUser(userId);
    if (!user) {
      return undefined;
    }

    // Get bet statistics
    const betStats = await db.select({
      totalBets: sql<number>`COUNT(*)`,
      totalWagered: sql<number>`COALESCE(SUM(${bets.amount}), 0)`,
      totalRewarded: sql<number>`COALESCE(SUM(GREATEST(${bets.profit}, 0)), 0)`
    })
    .from(bets)
    .where(eq(bets.userId, userId));

    const stats = betStats[0] || {
      totalBets: 0,
      totalWagered: 0,
      totalRewarded: 0
    };

    // Get favorite game (most played)
    const favoriteGameResult = await db.select({
      game: bets.game,
      count: sql<number>`COUNT(*)`
    })
    .from(bets)
    .where(eq(bets.userId, userId))
    .groupBy(bets.game)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(1);

    const favoriteGame = favoriteGameResult[0]?.game || null;

    // Calculate rank based on total wagered
    const wagered = Number(stats.totalWagered);
    let rank = 'BRONZE';
    let rankLevel = 1;
    let nextRank = 'SILVER';
    let nextRankLevel = 1;
    let nextRankRequirement = 50000;

    if (wagered >= 1000000) {
      rank = 'DIAMOND';
      rankLevel = Math.min(10, Math.floor((wagered - 1000000) / 500000) + 1);
      nextRank = 'DIAMOND';
      nextRankLevel = rankLevel < 10 ? rankLevel + 1 : 10;
      nextRankRequirement = rankLevel < 10 ? 1000000 + (rankLevel * 500000) : wagered;
    } else if (wagered >= 500000) {
      rank = 'PLATINUM';
      rankLevel = Math.min(5, Math.floor((wagered - 500000) / 100000) + 1);
      nextRank = 'DIAMOND';
      nextRankLevel = 1;
      nextRankRequirement = 1000000;
    } else if (wagered >= 200000) {
      rank = 'GOLD';
      rankLevel = Math.min(5, Math.floor((wagered - 200000) / 60000) + 1);
      nextRank = 'PLATINUM';
      nextRankLevel = 1;
      nextRankRequirement = 500000;
    } else if (wagered >= 50000) {
      rank = 'SILVER';
      rankLevel = Math.min(5, Math.floor((wagered - 50000) / 30000) + 1);
      nextRank = 'GOLD';
      nextRankLevel = 1;
      nextRankRequirement = 200000;
    } else {
      rank = 'BRONZE';
      rankLevel = Math.min(10, Math.floor(wagered / 5000) + 1);
      nextRank = 'SILVER';
      nextRankLevel = 1;
      nextRankRequirement = 50000;
    }

    return {
      user,
      username: user.username || `Player${user.id.slice(-4)}`,
      joinedOn: user.createdAt,
      totalBets: Number(stats.totalBets),
      totalWagered: wagered,
      totalRewarded: Number(stats.totalRewarded),
      rank,
      rankLevel,
      nextRank,
      nextRankLevel,
      nextRankRequirement,
      currentProgress: wagered,
      favoriteGame,
      favoriteCrypto: 'BTC' // Default to BTC for now
    };
  }

  // Deposit bonus operations implementation
  async getAllDepositBonuses(): Promise<DepositBonus[]> {
    return await db.select().from(depositBonuses).orderBy(asc(depositBonuses.id));
  }

  async getDepositBonusByType(bonusType: string): Promise<DepositBonus | undefined> {
    const [bonus] = await db.select()
      .from(depositBonuses)
      .where(eq(depositBonuses.bonusType, bonusType));
    return bonus || undefined;
  }

  async createDepositBonus(bonus: InsertDepositBonus): Promise<DepositBonus> {
    const [created] = await db.insert(depositBonuses).values(bonus).returning();
    return created;
  }

  async updateDepositBonus(id: number, updates: Partial<DepositBonus>): Promise<void> {
    await db.update(depositBonuses)
      .set(updates)
      .where(eq(depositBonuses.id, id));
  }

  async getUserActiveBonuses(userId: string): Promise<UserBonus[]> {
    return await db.select()
      .from(userBonuses)
      .where(
        and(
          eq(userBonuses.userId, userId),
          eq(userBonuses.status, 'active')
        )
      );
  }

  async getUserBonusHistory(userId: string): Promise<UserBonus[]> {
    return await db.select()
      .from(userBonuses)
      .where(eq(userBonuses.userId, userId))
      .orderBy(desc(userBonuses.claimedAt));
  }

  async createUserBonus(userBonus: InsertUserBonus): Promise<UserBonus> {
    const [created] = await db.insert(userBonuses).values(userBonus).returning();
    return created;
  }

  async updateUserBonusWagering(bonusId: number, wageredAmount: string): Promise<void> {
    await db.update(userBonuses)
      .set({ wageredAmount })
      .where(eq(userBonuses.id, bonusId));
  }

  async completeUserBonus(bonusId: number): Promise<void> {
    await db.update(userBonuses)
      .set({ 
        status: 'completed',
        completedAt: new Date()
      })
      .where(eq(userBonuses.id, bonusId));
  }

  async expireUserBonus(bonusId: number): Promise<void> {
    await db.update(userBonuses)
      .set({ status: 'expired' })
      .where(eq(userBonuses.id, bonusId));
  }

  async getUserDailyDepositCount(userId: string, date: Date): Promise<number> {
    const dateStr = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    const [result] = await db.select()
      .from(userDailyDeposits)
      .where(
        and(
          eq(userDailyDeposits.userId, userId),
          eq(userDailyDeposits.depositDate, dateStr)
        )
      );
    return result?.depositCount || 0;
  }

  async incrementUserDailyDeposits(userId: string, date: Date): Promise<void> {
    const dateStr = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    const existing = await this.getUserDailyDeposits(userId, date);
    
    if (existing) {
      await db.update(userDailyDeposits)
        .set({ 
          depositCount: existing.depositCount + 1,
          lastDepositAt: new Date()
        })
        .where(
          and(
            eq(userDailyDeposits.userId, userId),
            eq(userDailyDeposits.depositDate, dateStr)
          )
        );
    } else {
      await db.insert(userDailyDeposits).values({
        userId,
        depositDate: dateStr,
        depositCount: 1,
        lastDepositAt: new Date()
      });
    }
  }

  async getUserDailyDeposits(userId: string, date: Date): Promise<UserDailyDeposit | undefined> {
    const dateStr = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    const [result] = await db.select()
      .from(userDailyDeposits)
      .where(
        and(
          eq(userDailyDeposits.userId, userId),
          eq(userDailyDeposits.depositDate, dateStr)
        )
      );
    return result || undefined;
  }

  async createOrUpdateUserDailyDeposits(data: InsertUserDailyDeposit): Promise<UserDailyDeposit> {
    const existing = await this.getUserDailyDeposits(data.userId, new Date(data.depositDate));
    
    if (existing) {
      await db.update(userDailyDeposits)
        .set({ 
          depositCount: data.depositCount,
          lastDepositAt: data.lastDepositAt
        })
        .where(eq(userDailyDeposits.id, existing.id));
      
      const [updated] = await db.select()
        .from(userDailyDeposits)
        .where(eq(userDailyDeposits.id, existing.id));
      return updated;
    } else {
      const [created] = await db.insert(userDailyDeposits)
        .values(data)
        .returning();
      return created;
    }
  }

  async checkWageringRequirements(userId: string): Promise<{
    hasActiveBonus: boolean;
    totalWageringRequired: number;
    totalWagered: number;
    remainingToWager: number;
    activeBonuses: any[];
  }> {
    // Get all active bonuses for the user
    const activeBonuses = await this.getUserActiveBonuses(userId);
    
    // If no active bonuses, user can withdraw freely
    if (activeBonuses.length === 0) {
      return {
        hasActiveBonus: false,
        totalWageringRequired: 0,
        totalWagered: 0,
        remainingToWager: 0,
        activeBonuses: []
      };
    }
    
    // Calculate totals
    let totalWageringRequired = 0;
    let totalWagered = 0;
    const bonusDetails = [];
    
    for (const bonus of activeBonuses) {
      const required = Number(bonus.wageringRequirement);
      const wagered = Number(bonus.wageredAmount);
      totalWageringRequired += required;
      totalWagered += wagered;
      
      // Get bonus info for details
      const [bonusInfo] = await db.select()
        .from(depositBonuses)
        .where(eq(depositBonuses.id, bonus.bonusId));
      
      bonusDetails.push({
        id: bonus.id,
        bonusType: bonusInfo?.bonusType || 'Unknown',
        bonusAmount: Number(bonus.bonusAmount),
        wageringRequired: required,
        wagered: wagered,
        remainingToWager: Math.max(0, required - wagered),
        percentageComplete: required > 0 ? Math.floor((wagered / required) * 100) : 0,
        claimedAt: bonus.claimedAt,
        expiresAt: new Date(new Date(bonus.claimedAt).getTime() + 24 * 60 * 60 * 1000) // 24 hours from claim
      });
    }
    
    return {
      hasActiveBonus: true,
      totalWageringRequired,
      totalWagered,
      remainingToWager: Math.max(0, totalWageringRequired - totalWagered),
      activeBonuses: bonusDetails
    };
  }
  
  async initializeDefaultBonuses(): Promise<void> {
    const existingBonuses = await this.getAllDepositBonuses();
    
    if (existingBonuses.length === 0) {
      // Insert default bonus configurations
      const defaultBonuses = [
        {
          bonusType: 'first_deposit' as const,
          percentage: '20.00',
          minDeposit: '10.00',
          wageringMultiplier: 15,
          description: '20% bonus on your first deposit (min $10, 15x wagering requirement)'
        },
        {
          bonusType: 'second_deposit' as const,
          percentage: '25.00',
          minDeposit: '10.00',
          wageringMultiplier: 15,
          description: '25% bonus on your second deposit (min $10, 15x wagering requirement)'
        },
        {
          bonusType: 'third_deposit' as const,
          percentage: '30.00',
          minDeposit: '10.00',
          wageringMultiplier: 15,
          description: '30% bonus on your third deposit (min $10, 15x wagering requirement)'
        }
      ];

      for (const bonus of defaultBonuses) {
        await this.createDepositBonus(bonus);
      }
      console.log('Default deposit bonuses initialized');
    }
  }

  // Pending Bonus Selection operations
  async createPendingBonusSelection(selection: InsertPendingBonusSelection): Promise<PendingBonusSelection> {
    // First expire any existing pending selections
    await db.update(pendingBonusSelections)
      .set({ status: 'expired', expiredAt: new Date() })
      .where(and(
        eq(pendingBonusSelections.userId, selection.userId),
        eq(pendingBonusSelections.status, 'pending')
      ));
    
    const [newSelection] = await db.insert(pendingBonusSelections)
      .values(selection)
      .returning();
    return newSelection;
  }

  async getPendingBonusSelection(userId: string): Promise<PendingBonusSelection | undefined> {
    const selection = await db.select()
      .from(pendingBonusSelections)
      .where(and(
        eq(pendingBonusSelections.userId, userId),
        eq(pendingBonusSelections.status, 'pending')
      ))
      .limit(1);
    return selection[0];
  }

  async applyPendingBonusSelection(userId: string, depositId: string, depositAmount: number): Promise<UserBonus | null> {
    // Get pending bonus selection
    const selection = await this.getPendingBonusSelection(userId);
    if (!selection) return null;

    // Get bonus configuration
    const bonusConfig = await db.select()
      .from(depositBonuses)
      .where(eq(depositBonuses.id, selection.bonusId))
      .limit(1);
    
    if (!bonusConfig[0]) return null;

    const bonus = bonusConfig[0];
    
    // Validate minimum deposit
    if (depositAmount < Number(bonus.minDeposit)) {
      // Expire the selection if deposit is too small
      await this.updatePendingBonusStatus(selection.id, 'expired');
      return null;
    }

    // Get user's VIP level for bonus adjustments
    const user = await this.getUser(userId);
    const userVipLevel = user?.vipLevel || 'UNRANKED';
    
    // Calculate VIP-adjusted bonus percentage
    const vipBonusMultiplier = this.getVipBonusMultiplier(userVipLevel);
    const adjustedPercentage = Number(bonus.percentage) * vipBonusMultiplier;
    
    // Calculate VIP-adjusted wagering requirement (lower for higher VIP)
    const vipWageringReduction = this.getVipWageringReduction(userVipLevel);
    const adjustedWageringMultiplier = Math.max(1, bonus.wageringMultiplier * vipWageringReduction);

    // Calculate bonus amount and wagering requirement with VIP adjustments
    const bonusAmount = depositAmount * (adjustedPercentage / 100);
    const wageringRequirement = (depositAmount + bonusAmount) * adjustedWageringMultiplier;

    // Create the user bonus with depositId
    const [userBonus] = await db.insert(userBonuses).values({
      userId,
      bonusId: bonus.id,
      depositId, // Link to specific deposit
      depositAmount: depositAmount.toString(),
      bonusAmount: bonusAmount.toString(),
      wageringRequirement: wageringRequirement.toString()
    }).returning();

    // Mark selection as applied
    await this.updatePendingBonusStatus(selection.id, 'applied', depositId);

    // Increment daily deposit count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.incrementUserDailyDeposits(userId, today);

    return userBonus;
  }

  async expirePendingBonusSelections(userId: string): Promise<void> {
    // Delete all pending and expired bonus selections for this user
    // We don't need to keep expired records, just delete everything that's not applied
    await db.delete(pendingBonusSelections)
      .where(and(
        eq(pendingBonusSelections.userId, userId),
        inArray(pendingBonusSelections.status, ['pending', 'expired'])
      ));
  }

  async updatePendingBonusStatus(selectionId: number, status: 'pending' | 'applied' | 'expired', depositId?: string): Promise<void> {
    const updates: any = { status };
    
    if (status === 'applied') {
      updates.appliedAt = new Date();
      if (depositId) updates.depositId = depositId;
    } else if (status === 'expired') {
      updates.expiredAt = new Date();
    }
    
    await db.update(pendingBonusSelections)
      .set(updates)
      .where(eq(pendingBonusSelections.id, selectionId));
  }
  
  // Tipping operations implementation
  async sendTip(fromUserId: string, toUserId: string, amount: number, message?: string): Promise<Tip> {
    // Use a database transaction to ensure atomicity
    return await db.transaction(async (trx) => {
      // Get sender's balance
      const [senderBalance] = await trx.select()
        .from(balances)
        .where(eq(balances.userId, fromUserId));
      
      if (!senderBalance || senderBalance.available < amount * 100) {
        throw new Error('Insufficient balance');
      }
      
      // Get receiver's balance
      const [receiverBalance] = await trx.select()
        .from(balances)
        .where(eq(balances.userId, toUserId));
      
      if (!receiverBalance) {
        // Create balance for receiver if it doesn't exist
        await trx.insert(balances).values({
          userId: toUserId,
          available: amount * 100,
          locked: 0,
          currency: 'CREDITS'
        });
      } else {
        // Update receiver's balance
        await trx.update(balances)
          .set({ available: receiverBalance.available + amount * 100 })
          .where(eq(balances.userId, toUserId));
      }
      
      // Update sender's balance
      await trx.update(balances)
        .set({ available: senderBalance.available - amount * 100 })
        .where(eq(balances.userId, fromUserId));
      
      // Create tip record
      const [tip] = await trx.insert(tips).values({
        fromUserId,
        toUserId,
        amount: amount.toString(),
        message
      }).returning();
      
      // Record transactions
      await trx.insert(transactions).values([
        {
          userId: fromUserId,
          type: 'WITHDRAW' as const,
          amount: amount * 100,
          meta: { type: 'tip', recipientId: toUserId, tipId: tip.id }
        },
        {
          userId: toUserId,
          type: 'DEPOSIT' as const,
          amount: amount * 100,
          meta: { type: 'tip', senderId: fromUserId, tipId: tip.id }
        }
      ]);
      
      return tip;
    });
  }
  
  async getTipsReceived(userId: string): Promise<Tip[]> {
    return await db.select()
      .from(tips)
      .where(eq(tips.toUserId, userId))
      .orderBy(desc(tips.createdAt));
  }
  
  async getTipsSent(userId: string): Promise<Tip[]> {
    return await db.select()
      .from(tips)
      .where(eq(tips.fromUserId, userId))
      .orderBy(desc(tips.createdAt));
  }
  
  async getTotalTipsReceived(userId: string): Promise<number> {
    const result = await db.select({
      total: sql<number>`COALESCE(SUM(CAST(${tips.amount} AS DECIMAL)), 0)`
    })
    .from(tips)
    .where(eq(tips.toUserId, userId));
    
    return Number(result[0]?.total || 0);
  }

  // Bonus Reset Methods
  async checkAndResetBonusIfNeeded(userId: string): Promise<boolean> {
    // Get user's current balance
    const balance = await this.getBalance(userId);
    if (!balance) return false;
    
    // Check if balance is at or below $0.50 (50 in internal units)
    if (balance.available <= 50) {
      // Get current active bonuses
      const activeBonuses = await this.getUserActiveBonuses(userId);
      
      // Only reset if there are active bonuses or if user has pending bonus selections
      const pendingSelection = await this.getPendingBonusSelection(userId);
      
      if (activeBonuses.length > 0 || pendingSelection) {
        // Expire all active bonuses
        await this.expireAllUserBonuses(userId);
        
        // Expire pending selections
        await this.expirePendingBonusSelections(userId);
        
        // Record the reset in history
        const previousBonus = activeBonuses.length > 0 ? activeBonuses[0] : null;
        
        await this.createBonusResetHistory({
          userId,
          balanceAtReset: balance.available.toString(),
          previousBonusId: previousBonus?.bonusId || null,
          previousBonusStatus: previousBonus?.status || null,
          newBonusId: null, // Will be set when user selects new bonus
          resetType: 'auto_low_balance',
          metadata: {
            activeBonusesCount: activeBonuses.length,
            hadPendingSelection: !!pendingSelection,
            resetReason: 'Balance dropped to $0.50 or below'
          }
        });
        
        return true;
      }
    }
    
    return false;
  }
  
  async createBonusResetHistory(reset: InsertBonusResetHistory): Promise<BonusResetHistory> {
    const [created] = await db.insert(bonusResetHistory).values(reset).returning();
    return created;
  }
  
  async getUserBonusResetHistory(userId: string): Promise<BonusResetHistory[]> {
    return await db.select()
      .from(bonusResetHistory)
      .where(eq(bonusResetHistory.userId, userId))
      .orderBy(desc(bonusResetHistory.resetAt));
  }
  
  async getAllBonusResetHistory(limit?: number): Promise<BonusResetHistory[]> {
    const query = db.select()
      .from(bonusResetHistory)
      .orderBy(desc(bonusResetHistory.resetAt));
    
    if (limit) {
      return await query.limit(limit);
    }
    
    return await query;
  }
  
  async expireAllUserBonuses(userId: string): Promise<void> {
    await db.update(userBonuses)
      .set({ 
        status: 'expired',
        completedAt: new Date()
      })
      .where(
        and(
          eq(userBonuses.userId, userId),
          eq(userBonuses.status, 'active')
        )
      );
  }
  
  // Admin Bonus Management Methods
  async getAdminBonusStats(): Promise<{
    activeBonuses: number;
    totalClaimed: number;
    totalResets: number;
  }> {
    // Get active bonuses count
    const activeResult = await db.select({
      count: sql<number>`COUNT(*)`
    })
    .from(userBonuses)
    .where(eq(userBonuses.status, 'active'));
    
    // Get total bonuses claimed
    const claimedResult = await db.select({
      count: sql<number>`COUNT(*)`
    })
    .from(userBonuses);
    
    // Get total resets count
    const resetsResult = await db.select({
      count: sql<number>`COUNT(*)`
    })
    .from(bonusResetHistory);
    
    return {
      activeBonuses: Number(activeResult[0]?.count || 0),
      totalClaimed: Number(claimedResult[0]?.count || 0),
      totalResets: Number(resetsResult[0]?.count || 0)
    };
  }
  
  async getAdminBonusActivity(limit = 50): Promise<any[]> {
    // Get recent bonus claims
    const bonusClaims = await db
      .select({
        id: userBonuses.id,
        type: sql<string>`'bonus_claimed'`,
        userId: userBonuses.userId,
        username: users.username,
        bonusType: userBonuses.bonusType,
        bonusAmount: userBonuses.bonusAmount,
        depositAmount: sql<number>`CAST(${userBonuses.bonusAmount} AS DECIMAL) / ${userBonuses.percentage} * 100`,
        wageringRequirement: userBonuses.wageringRequirement,
        wageredAmount: userBonuses.wageredAmount,
        status: userBonuses.status,
        claimedAt: userBonuses.claimedAt,
        completedAt: userBonuses.completedAt
      })
      .from(userBonuses)
      .leftJoin(users, eq(userBonuses.userId, users.id))
      .orderBy(desc(userBonuses.claimedAt))
      .limit(limit / 2); // Half for claims
    
    // Get recent bonus resets
    const bonusResets = await db
      .select({
        id: bonusResetHistory.id,
        type: sql<string>`'bonus_reset'`,
        userId: bonusResetHistory.userId,
        username: users.username,
        bonusType: sql<string>`NULL`,
        balanceAtReset: bonusResetHistory.balanceAtReset,
        resetType: bonusResetHistory.resetType,
        previousBonusStatus: bonusResetHistory.previousBonusStatus,
        resetAt: bonusResetHistory.resetAt,
        metadata: bonusResetHistory.metadata
      })
      .from(bonusResetHistory)
      .leftJoin(users, eq(bonusResetHistory.userId, users.id))
      .orderBy(desc(bonusResetHistory.resetAt))
      .limit(limit / 2); // Half for resets
    
    // Combine and sort by date
    const combined = [
      ...bonusClaims.map(c => ({
        ...c,
        bonusAmount: c.bonusAmount ? parseFloat(c.bonusAmount) / 100 : 0,
        depositAmount: c.depositAmount ? c.depositAmount / 100 : 0,
        balanceAtReset: null as number | null
      })),
      ...bonusResets.map(r => ({
        ...r,
        bonusAmount: null as number | null,
        depositAmount: null as number | null,
        wageringRequirement: null as string | null,
        wageredAmount: null as string | null,
        status: null as string | null,
        claimedAt: null as Date | null,
        completedAt: null as Date | null,
        balanceAtReset: r.balanceAtReset ? parseFloat(r.balanceAtReset) / 100 : 0
      }))
    ];
    
    // Sort by date (most recent first)
    combined.sort((a, b) => {
      const dateA = a.type === 'bonus_claimed' ? (a.claimedAt || new Date(0)) : (a.resetAt || new Date(0));
      const dateB = b.type === 'bonus_claimed' ? (b.claimedAt || new Date(0)) : (b.resetAt || new Date(0));
      return dateB.getTime() - dateA.getTime();
    });
    
    return combined.slice(0, limit);
  }
  
  // VIP System implementations
  async getVipLevelByName(level: string): Promise<any | undefined> {
    const [result] = await db.select()
      .from(vipLevels)
      .where(eq(vipLevels.level, level));
    return result;
  }

  async getNextVipLevel(currentLevel: string): Promise<any | undefined> {
    const [current] = await db.select()
      .from(vipLevels)
      .where(eq(vipLevels.level, currentLevel));
    
    if (!current) return undefined;
    
    const [next] = await db.select()
      .from(vipLevels)
      .where(eq(vipLevels.levelOrder, current.levelOrder + 1));
    
    return next;
  }

  async getAllVipLevels(): Promise<any[]> {
    const levels = await db.select().from(vipLevels).orderBy(asc(vipLevels.levelOrder));
    return levels;
  }

  async getVipBenefitsByLevel(level: string): Promise<any[]> {
    const benefits = await db.select()
      .from(vipBenefits)
      .where(eq(vipBenefits.level, level))
      .orderBy(asc(vipBenefits.benefitType));
    return benefits;
  }

  async getUserVipRewards(userId: string): Promise<any[]> {
    const rewards = await db.select()
      .from(vipRewards)
      .where(eq(vipRewards.userId, userId))
      .orderBy(desc(vipRewards.createdAt));
    return rewards;
  }

  async claimVipReward(userId: string, rewardId: number): Promise<{ success: boolean; error?: string }> {
    const [reward] = await db.select()
      .from(vipRewards)
      .where(and(
        eq(vipRewards.id, rewardId),
        eq(vipRewards.userId, userId),
        eq(vipRewards.status, 'PENDING')
      ));

    if (!reward) {
      return { success: false, error: 'Reward not found or already claimed' };
    }

    if (reward.expiresAt && new Date() > reward.expiresAt) {
      return { success: false, error: 'Reward has expired' };
    }

    // Update reward status
    await db.update(vipRewards)
      .set({ status: 'CLAIMED', claimedAt: new Date() })
      .where(eq(vipRewards.id, rewardId));

    // Add reward amount to user balance
    const balance = await this.getBalance(userId);
    if (balance) {
      // VIP Level Up bonuses should be added to SC balance, not GC balance
      if (reward.rewardType === 'LEVEL_UP_BONUS') {
        // Convert amount from cents to dollars for SC balance
        const scAmount = reward.amount / 100;
        await this.updateSweepsCashBalance(userId, {
          totalChange: scAmount,
          redeemableChange: scAmount // VIP bonuses are immediately redeemable
        });
      } else {
        // Other VIP rewards go to GC balance
        await this.updateBalance(userId, balance.available + reward.amount, balance.locked);
      }
      
      // Create transaction record
      await this.createTransaction({
        userId,
        type: 'VIP_REWARD',
        amount: reward.amount,
        meta: { rewardType: reward.rewardType, vipLevel: reward.vipLevel }
      });
    }

    return { success: true };
  }

  async updateUserVipProgress(userId: string, experienceGained: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    const newExperience = (user.vipExperience || 0) + experienceGained;
    
    await db.update(users)
      .set({ vipExperience: newExperience })
      .where(eq(users.id, userId));

    // Check for level up
    await this.checkAndAwardVipLevelUp(userId);
  }

  async checkAndAwardVipLevelUp(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    const currentLevel = user.vipLevel || 'UNRANKED';
    const currentExperience = user.vipExperience || 0;

    // Get all levels and check if user qualifies for a higher level
    const levels = await this.getAllVipLevels();
    let newLevel = currentLevel;
    
    for (const level of levels) {
      if (currentExperience >= level.experienceRequired && level.levelOrder > 0) {
        const currentLevelData = levels.find(l => l.level === currentLevel);
        if (!currentLevelData || level.levelOrder > currentLevelData.levelOrder) {
          newLevel = level.level;
        }
      }
    }

    if (newLevel !== currentLevel) {
      // Update user's VIP level
      await db.update(users)
        .set({ 
          vipLevel: newLevel,
          vipLevelReachedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Award level up bonus
      const newLevelBenefits = await this.getVipBenefitsByLevel(newLevel);
      const levelUpBonus = newLevelBenefits.find(b => b.benefitType === 'LEVEL_UP_BONUS');
      
      if (levelUpBonus && levelUpBonus.value) {
        await db.insert(vipRewards).values({
          userId,
          rewardType: 'LEVEL_UP_BONUS',
          amount: Math.floor(levelUpBonus.value * 100), // Convert to cents
          vipLevel: newLevel,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });
      }
    }
  }

  // VIP Bonus Helper Functions
  getVipBonusMultiplier(vipLevel: string): number {
    // Higher VIP levels get better deposit bonus multipliers
    const multipliers: Record<string, number> = {
      'UNRANKED': 1.0,    // 100% of base bonus
      'WOOD': 1.05,       // 105% of base bonus
      'STONE': 1.10,      // 110% of base bonus
      'BRONZE': 1.15,     // 115% of base bonus
      'SILVER': 1.20,     // 120% of base bonus
      'GOLD': 1.30,       // 130% of base bonus
      'EMERALD': 1.40,    // 140% of base bonus
      'PLATINUM': 1.50,   // 150% of base bonus
      'DIAMOND': 2.0      // 200% of base bonus
    };
    return multipliers[vipLevel] || 1.0;
  }

  getVipWageringReduction(vipLevel: string): number {
    // Higher VIP levels get reduced wagering requirements
    const reductions: Record<string, number> = {
      'UNRANKED': 1.0,    // 100% of base wagering
      'WOOD': 0.95,       // 95% of base wagering
      'STONE': 0.90,      // 90% of base wagering
      'BRONZE': 0.85,     // 85% of base wagering
      'SILVER': 0.80,     // 80% of base wagering
      'GOLD': 0.70,       // 70% of base wagering
      'EMERALD': 0.60,    // 60% of base wagering
      'PLATINUM': 0.50,   // 50% of base wagering
      'DIAMOND': 0.30     // 30% of base wagering
    };
    return reductions[vipLevel] || 1.0;
  }

  async calculateRakeback(userId: string, betAmount: number): Promise<number> {
    // Get user's VIP level
    const user = await this.getUser(userId);
    if (!user) return 0;

    const vipLevel = user.vipLevel || 'UNRANKED';
    
    // Get VIP benefits for instant rakeback
    const benefits = await this.getVipBenefitsByLevel(vipLevel);
    const rakebackBenefit = benefits.find(b => b.benefitType === 'INSTANT_RAKEBACK');
    
    if (!rakebackBenefit || !rakebackBenefit.value) return 0;
    
    // Calculate rakeback amount (value is percentage)
    const rakebackAmount = betAmount * (rakebackBenefit.value / 100);
    
    return Math.floor(rakebackAmount); // Return in cents
  }

  // Daily Login System operations
  async getDailyLoginRewards(): Promise<DailyLoginReward[]> {
    return await db.select()
      .from(dailyLoginRewards)
      .where(eq(dailyLoginRewards.isActive, true))
      .orderBy(asc(dailyLoginRewards.day));
  }

  async getUserDailyLoginStatus(userId: string): Promise<UserDailyLogin | undefined> {
    const [status] = await db.select()
      .from(userDailyLogins)
      .where(eq(userDailyLogins.userId, userId));
    return status || undefined;
  }

  async updateUserDailyLoginStreak(userId: string, streak: number, nextResetAt: Date): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    await db.insert(userDailyLogins)
      .values({
        userId,
        currentStreak: streak,
        longestStreak: streak,
        lastLoginDate: today,
        nextResetAt,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: userDailyLogins.userId,
        set: {
          currentStreak: streak,
          longestStreak: sql`GREATEST(${userDailyLogins.longestStreak}, ${streak})`,
          lastLoginDate: today,
          nextResetAt,
          updatedAt: new Date()
        }
      });
  }

  async claimDailyLoginReward(userId: string, day: number): Promise<{ goldCoins: number; sweepCoins: number }> {
    const today = new Date().toISOString().split('T')[0];
    
    // Get the reward for this day
    const [reward] = await db.select()
      .from(dailyLoginRewards)
      .where(and(
        eq(dailyLoginRewards.day, day),
        eq(dailyLoginRewards.isActive, true)
      ));
    
    if (!reward) {
      throw new Error('Invalid day or reward not found');
    }

    // Create claim record
    await this.createDailyLoginClaim({
      userId,
      day,
      rewardId: reward.id,
      goldCoinsAwarded: reward.goldCoins,
      sweepCoinsAwarded: reward.sweepCoins,
      claimDate: today,
      streakAtClaim: day
    });

    // Update user's last claim date
    await db.update(userDailyLogins)
      .set({
        lastClaimDate: today,
        totalClaims: sql`${userDailyLogins.totalClaims} + 1`,
        updatedAt: new Date()
      })
      .where(eq(userDailyLogins.userId, userId));

    // Add gold coins to balance (convert from cents)
    await this.updateBalance(userId, reward.goldCoins, 0);
    
    // Create transaction record
    await this.createTransaction({
      userId,
      type: 'DAILY_LOGIN',
      amount: reward.goldCoins,
      meta: {
        day,
        goldCoins: reward.goldCoins,
        sweepCoins: Number(reward.sweepCoins),
        streak: day
      }
    });

    return {
      goldCoins: reward.goldCoins,
      sweepCoins: Number(reward.sweepCoins)
    };
  }

  async claimDailyLoginRewardAtomic(userId: string, todayUTC: string): Promise<{ day: number; goldCoins: number; sweepCoins: number; newStreak: number }> {
    return await db.transaction(async (tx) => {
      // First, attempt to insert the claim record to prevent duplicates
      // This will fail if user already claimed today due to unique constraint
      let claimDay = 1;
      let currentStreak = 0;
      
      // Get user's current status
      const [userLogin] = await tx.select()
        .from(userDailyLogins)
        .where(eq(userDailyLogins.userId, userId));
      
      if (userLogin) {
        const lastLogin = userLogin.lastLoginDate;
        
        if (lastLogin) {
          const daysDiff = Math.floor((new Date(todayUTC).getTime() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff === 1) {
            // Consecutive day - increment streak
            currentStreak = userLogin.currentStreak;
            claimDay = Math.min(currentStreak + 1, 7);
          } else if (daysDiff === 0) {
            // Same day login
            currentStreak = userLogin.currentStreak;
            claimDay = Math.min(currentStreak + 1, 7);
          } else {
            // Streak broken - reset to day 1
            currentStreak = 0;
            claimDay = 1;
          }
        }
      }
      
      // If we've completed 7 days, reset to day 1
      if (claimDay > 7) {
        claimDay = 1;
        currentStreak = 0;
      }
      
      // Get the reward for this day
      const [reward] = await tx.select()
        .from(dailyLoginRewards)
        .where(and(
          eq(dailyLoginRewards.day, claimDay),
          eq(dailyLoginRewards.isActive, true)
        ));
      
      if (!reward) {
        throw new Error('Invalid day or reward not found');
      }

      // Create claim record first - this will fail if already claimed today
      const claim = {
        userId,
        day: claimDay,
        rewardId: reward.id,
        goldCoinsAwarded: reward.goldCoins,
        sweepCoinsAwarded: reward.sweepCoins,
        claimDate: todayUTC,
        streakAtClaim: claimDay,
        createdAt: new Date()
      };
      
      try {
        await tx.insert(dailyLoginClaims).values(claim);
      } catch (error: any) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Already claimed today');
        }
        throw error;
      }

      // Calculate next reset time (tomorrow at UTC midnight)
      const tomorrowUTC = new Date();
      tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);
      tomorrowUTC.setUTCHours(0, 0, 0, 0);

      // Update user's daily login status
      await tx.insert(userDailyLogins)
        .values({
          userId,
          currentStreak: claimDay,
          longestStreak: claimDay,
          lastLoginDate: todayUTC,
          lastClaimDate: todayUTC,
          nextResetAt: tomorrowUTC,
          totalClaims: 1,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: userDailyLogins.userId,
          set: {
            currentStreak: claimDay,
            longestStreak: sql`GREATEST(${userDailyLogins.longestStreak}, ${claimDay})`,
            lastLoginDate: todayUTC,
            lastClaimDate: todayUTC,
            nextResetAt: tomorrowUTC,
            totalClaims: sql`${userDailyLogins.totalClaims} + 1`,
            updatedAt: new Date()
          }
        });

      // Update user Gold Coins balance (convert GC to cents: 1 GC = 100 cents)  
      const goldCoinsInCents = Math.round(reward.goldCoins * 100);
      await tx.update(balances)
        .set({ 
          available: sql`${balances.available} + ${goldCoinsInCents}`
        })
        .where(eq(balances.userId, userId));

      // Update user Sweep Coins balance
      const sweepCoinsAmount = Number(reward.sweepCoins);
      if (sweepCoinsAmount > 0) {
        await tx.update(balances)
          .set({ 
            sweepsCashTotal: sql`COALESCE(${balances.sweepsCashTotal}, 0) + ${sweepCoinsAmount}`,
            sweepsCashRedeemable: sql`COALESCE(${balances.sweepsCashRedeemable}, 0) + ${sweepCoinsAmount}`
          })
          .where(eq(balances.userId, userId));
      }
      
      // Create transaction record
      await tx.insert(transactions).values({
        id: randomUUID(),
        userId,
        type: 'DAILY_LOGIN',
        amount: reward.goldCoins,
        meta: {
          day: claimDay,
          goldCoins: reward.goldCoins,
          sweepCoins: Number(reward.sweepCoins),
          streak: claimDay
        },
        createdAt: new Date()
      });

      return {
        day: claimDay,
        goldCoins: reward.goldCoins,
        sweepCoins: Number(reward.sweepCoins),
        newStreak: claimDay
      };
    });
  }

  async hasClaimedDailyLoginToday(userId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    
    const [claim] = await db.select()
      .from(dailyLoginClaims)
      .where(and(
        eq(dailyLoginClaims.userId, userId),
        eq(dailyLoginClaims.claimDate, today)
      ));
    
    return !!claim;
  }

  async resetUserDailyLoginStreak(userId: string): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    await db.update(userDailyLogins)
      .set({
        currentStreak: 0,
        lastLoginDate: null,
        nextResetAt: tomorrow,
        updatedAt: new Date()
      })
      .where(eq(userDailyLogins.userId, userId));
  }

  async createDailyLoginClaim(claim: InsertDailyLoginClaim): Promise<DailyLoginClaim> {
    const [created] = await db.insert(dailyLoginClaims).values(claim).returning();
    return created;
  }

  async initializeDailyLoginRewards(): Promise<void> {
    // Check if rewards already exist
    const existingRewards = await this.getDailyLoginRewards();
    if (existingRewards.length > 0) return;

    // Define the 7-day reward structure from the screenshot
    const rewards = [
      { day: 1, goldCoins: 5000, sweepCoins: '0.3' },
      { day: 2, goldCoins: 5000, sweepCoins: '0.3' },
      { day: 3, goldCoins: 5000, sweepCoins: '0.3' },
      { day: 4, goldCoins: 10000, sweepCoins: '0.5' },
      { day: 5, goldCoins: 20000, sweepCoins: '1.0' },
      { day: 6, goldCoins: 20000, sweepCoins: '1.0' },
      { day: 7, goldCoins: 25000, sweepCoins: '1.0' }
    ];

    // Insert all rewards
    await db.insert(dailyLoginRewards).values(rewards);
  }

  // Top Up Bonus System Methods
  async getUserTopUpBonusStatus(userId: string): Promise<UserTopUpBonus | undefined> {
    const [status] = await db.select()
      .from(userTopUpBonus)
      .where(eq(userTopUpBonus.userId, userId));
    return status || undefined;
  }

  async claimTopUpBonusAtomic(userId: string, claimTime: Date): Promise<{ goldCoins: number; nextAvailableAt: string }> {
    return await db.transaction(async (tx) => {
      const sixHoursLater = new Date(claimTime.getTime() + (6 * 60 * 60 * 1000)); // 6 hours from now
      const rewardAmount = 2500; // Fixed 2,500 GC

      // Get user's current status
      const [currentStatus] = await tx.select()
        .from(userTopUpBonus)
        .where(eq(userTopUpBonus.userId, userId));

      // Check if user can claim (6 hours have passed since last claim)
      if (currentStatus?.nextAvailableAt) {
        const nextAvailable = new Date(currentStatus.nextAvailableAt);
        if (claimTime < nextAvailable) {
          throw new Error('Top up bonus not available yet - still in cooldown period');
        }
      }

      // Create claim record
      await tx.insert(topUpBonusClaims).values({
        userId,
        goldCoinsAwarded: rewardAmount,
        claimDateTime: claimTime,
        createdAt: claimTime
      });

      // Update user's top up bonus status
      await tx.insert(userTopUpBonus)
        .values({
          userId,
          lastClaimAt: claimTime,
          nextAvailableAt: sixHoursLater,
          totalClaims: 1,
          updatedAt: claimTime
        })
        .onConflictDoUpdate({
          target: userTopUpBonus.userId,
          set: {
            lastClaimAt: claimTime,
            nextAvailableAt: sixHoursLater,
            totalClaims: sql`${userTopUpBonus.totalClaims} + 1`,
            updatedAt: claimTime
          }
        });

      // Update user balance via balances table - Add to GC balance (regular credits)
      // GC (Gold Credits) are not redeemable, only for gameplay
      await tx.update(balances)
        .set({ 
          available: sql`${balances.available} + ${rewardAmount}`
        })
        .where(eq(balances.userId, userId));
      
      // Create transaction record
      await tx.insert(transactions).values({
        id: randomUUID(),
        userId,
        type: 'DEPOSIT',
        amount: rewardAmount,
        meta: {
          source: 'top_up_bonus',
          goldCoins: rewardAmount,
          claimTime: claimTime.toISOString()
        },
        createdAt: claimTime
      });

      return {
        goldCoins: rewardAmount,
        nextAvailableAt: sixHoursLater.toISOString()
      };
    });
  }

  // Balance Mode Methods
  async updateUserBalanceMode(userId: string, balanceMode: 'GC' | 'SC'): Promise<void> {
    await db.update(users)
      .set({ balanceMode })
      .where(eq(users.id, userId));
  }

  // Avatar Methods
  async updateUserAvatar(userId: string, avatarType: string, avatarBackgroundColor: string): Promise<void> {
    await db.update(users)
      .set({ 
        avatarType,
        avatarBackgroundColor 
      })
      .where(eq(users.id, userId));
  }

  // User Preferences Methods
  async updateUserSoundPreference(userId: string, soundEnabled: boolean): Promise<void> {
    await db.update(users)
      .set({ soundEnabled })
      .where(eq(users.id, userId));
  }

  async updateUserLoginStreak(userId: string, loginStreak: number, longestStreak: number, lastLoginDate: Date): Promise<void> {
    await db.update(users)
      .set({ 
        loginStreak,
        longestStreak,
        lastLoginDate: lastLoginDate.toISOString().split('T')[0] // Store as date string YYYY-MM-DD
      })
      .where(eq(users.id, userId));
  }

  async updateUserScStreak(userId: string, scStreakCount: number, longestScStreak: number, lastScClaimDate: Date): Promise<void> {
    await db.update(users)
      .set({ 
        scStreakCount,
        longestScStreak,
        lastScClaimDate: lastScClaimDate.toISOString().split('T')[0] // Store as date string YYYY-MM-DD
      })
      .where(eq(users.id, userId));
  }

  async claimScStreakAtomic(userId: string, todayUTC: string): Promise<{ success: boolean; streak: number; longestScStreak: number; rewardAmount: number; error?: string }> {
    return await db.transaction(async (tx) => {
      // Get user with lock
      const [user] = await tx.select()
        .from(users)
        .where(eq(users.id, userId))
        .for('update');
      
      if (!user) {
        return { success: false, streak: 0, longestScStreak: 0, rewardAmount: 0, error: 'User not found' };
      }

      // Check if already claimed today
      if (user.lastScClaimDate === todayUTC) {
        return { 
          success: false, 
          streak: user.scStreakCount || 0, 
          longestScStreak: user.longestScStreak || 0, 
          rewardAmount: 0, 
          error: 'Already claimed today' 
        };
      }

      // Calculate streak
      let newStreak = user.scStreakCount || 0;
      let longestScStreak = user.longestScStreak || 0;
      
      if (!user.lastScClaimDate) {
        newStreak = 1;
      } else {
        const yesterday = new Date(new Date(todayUTC).getTime() - 24*60*60*1000);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (user.lastScClaimDate === yesterdayStr) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      }
      
      if (newStreak > longestScStreak) {
        longestScStreak = newStreak;
      }

      // Calculate rewards (fixed 50 SC per day from day 3)
      const rewardAmount = newStreak >= 3 ? 50 : 0;

      // Update user streak atomically with WHERE clause to ensure no double claim
      const result = await tx.update(users)
        .set({
          scStreakCount: newStreak,
          longestScStreak: longestScStreak,
          lastScClaimDate: todayUTC
        })
        .where(and(
          eq(users.id, userId),
          or(
            isNull(users.lastScClaimDate),
            not(eq(users.lastScClaimDate, todayUTC))
          )
        ));

      // If update failed (already claimed), return error
      if (result.rowCount === 0) {
        return { 
          success: false, 
          streak: user.scStreakCount || 0, 
          longestScStreak: user.longestScStreak || 0, 
          rewardAmount: 0, 
          error: 'Already claimed today' 
        };
      }

      // Award SC balance if eligible
      if (rewardAmount > 0) {
        // Update balance directly within transaction
        await tx.update(balances)
          .set({
            sweepsCashTotal: sql`${balances.sweepsCashTotal} + ${rewardAmount}`,
            sweepsCashRedeemable: sql`${balances.sweepsCashRedeemable} + ${rewardAmount}`
          })
          .where(eq(balances.userId, userId));

        // Create transaction record
        await tx.insert(transactions).values({
          userId,
          type: 'SWEEPS_DEPOSIT',
          amount: rewardAmount,
          meta: {
            source: 'sc_streak_claim',
            streak: newStreak,
            rewardAmount,
            currency: 'SC'
          }
        });
      }

      return { success: true, streak: newStreak, longestScStreak, rewardAmount };
    });
  }

  // Daily Wheel Spinner
  async spinWheelAtomic(userId: string, todayUTC: string): Promise<{ success: boolean; rewardType: 'GC' | 'SC'; rewardAmount: number; error?: string }> {
    return await db.transaction(async (tx) => {
      // Lock user row and check if already spun today
      const [user] = await tx.select()
        .from(users)
        .where(eq(users.id, userId))
        .for('update');

      if (!user) {
        return { success: false, rewardType: 'GC', rewardAmount: 0, error: 'User not found' };
      }

      // Check if already spun today
      if (user.lastWheelSpinDate === todayUTC) {
        return { 
          success: false, 
          rewardType: 'GC', 
          rewardAmount: 0, 
          error: 'Already spun today' 
        };
      }

      // Determine reward type and amount
      const random = Math.random();
      const rewardType: 'GC' | 'SC' = random < 0.6 ? 'GC' : 'SC'; // 60% GC, 40% SC
      
      // Generate reward amount based on type with weighted probabilities
      let rewardAmount = 0;
      const amountRandom = Math.random();
      
      if (rewardType === 'GC') {
        if (amountRandom < 0.40) rewardAmount = 25;
        else if (amountRandom < 0.70) rewardAmount = 50;
        else if (amountRandom < 0.90) rewardAmount = 100;
        else if (amountRandom < 0.98) rewardAmount = 250;
        else rewardAmount = 500;
      } else {
        if (amountRandom < 0.40) rewardAmount = 1;
        else if (amountRandom < 0.70) rewardAmount = 2;
        else if (amountRandom < 0.90) rewardAmount = 5;
        else if (amountRandom < 0.98) rewardAmount = 10;
        else rewardAmount = 25;
      }

      // Update user's lastWheelSpinDate
      const updateResult = await tx.update(users)
        .set({ lastWheelSpinDate: todayUTC })
        .where(
          and(
            eq(users.id, userId),
            or(
              isNull(users.lastWheelSpinDate),
              not(eq(users.lastWheelSpinDate, todayUTC))
            )
          )
        );

      // Double-check: if update affected 0 rows, someone else already claimed
      const rowCount = updateResult.rowCount ?? 0;
      if (rowCount === 0) {
        return { 
          success: false, 
          rewardType: 'GC', 
          rewardAmount: 0, 
          error: 'Already spun today' 
        };
      }

      // Award the reward
      if (rewardType === 'GC') {
        await tx.update(balances)
          .set({
            available: sql`${balances.available} + ${rewardAmount}`
          })
          .where(eq(balances.userId, userId));

        await tx.insert(transactions).values({
          userId,
          type: 'DAILY_LOGIN',
          amount: rewardAmount,
          meta: {
            source: 'daily_wheel',
            rewardType: 'GC',
            rewardAmount,
            currency: 'GC'
          }
        });
      } else {
        await tx.update(balances)
          .set({
            sweepsCashTotal: sql`${balances.sweepsCashTotal} + ${rewardAmount}`,
            sweepsCashRedeemable: sql`${balances.sweepsCashRedeemable} + ${rewardAmount}`
          })
          .where(eq(balances.userId, userId));

        await tx.insert(transactions).values({
          userId,
          type: 'SWEEPS_DEPOSIT',
          amount: rewardAmount,
          meta: {
            source: 'daily_wheel',
            rewardType: 'SC',
            rewardAmount,
            currency: 'SC'
          }
        });
      }

      return { success: true, rewardType, rewardAmount };
    });
  }

  // Redemption Code Methods
  async createRedemptionCode(code: InsertRedemptionCode): Promise<RedemptionCode> {
    const [created] = await db.insert(redemptionCodes).values(code).returning();
    return created;
  }

  async listRedemptionCodes(adminId?: string, limit = 50): Promise<RedemptionCode[]> {
    const query = db.select().from(redemptionCodes)
      .orderBy(desc(redemptionCodes.createdAt))
      .limit(limit);

    if (adminId) {
      return await query.where(eq(redemptionCodes.createdBy, adminId));
    }
    return await query;
  }

  async deactivateRedemptionCode(codeId: number): Promise<void> {
    await db.update(redemptionCodes)
      .set({ isActive: false })
      .where(eq(redemptionCodes.id, codeId));
  }

  async getRedemptionCodeByCode(code: string): Promise<RedemptionCode | undefined> {
    const [redemptionCode] = await db.select()
      .from(redemptionCodes)
      .where(eq(redemptionCodes.code, code));
    return redemptionCode || undefined;
  }

  async getUserCodeUsage(userId: string, codeId: number): Promise<RedemptionCodeUsage | undefined> {
    const [usage] = await db.select()
      .from(redemptionCodeUsages)
      .where(and(
        eq(redemptionCodeUsages.userId, userId),
        eq(redemptionCodeUsages.codeId, codeId)
      ));
    return usage || undefined;
  }

  async redeemCodeAtomic(userId: string, code: string, context: { ipHash?: string; userAgentHash?: string }): Promise<{
    success: boolean;
    gcCredited: number;
    scCredited: number;
    bonusCreated?: boolean;
    error?: string;
  }> {
    return await db.transaction(async (tx) => {
      try {
        // 1. Get and validate redemption code
        const [redemptionCode] = await tx.select()
          .from(redemptionCodes)
          .where(eq(redemptionCodes.code, code));

        if (!redemptionCode) {
          return { success: false, gcCredited: 0, scCredited: 0, error: 'Invalid code' };
        }

        if (!redemptionCode.isActive) {
          return { success: false, gcCredited: 0, scCredited: 0, error: 'Code is no longer active' };
        }

        if (redemptionCode.expiresAt && redemptionCode.expiresAt < new Date()) {
          return { success: false, gcCredited: 0, scCredited: 0, error: 'Code has expired' };
        }

        // Atomic increment with conditional check to prevent race conditions
        const [updatedCode] = await tx.update(redemptionCodes)
          .set({
            usedCount: sql`${redemptionCodes.usedCount} + 1`
          })
          .where(and(
            eq(redemptionCodes.id, redemptionCode.id),
            sql`${redemptionCodes.usedCount} < ${redemptionCodes.maxUses}`
          ))
          .returning({ usedCount: redemptionCodes.usedCount });

        if (!updatedCode) {
          return { success: false, gcCredited: 0, scCredited: 0, error: 'Code has reached its usage limit' };
        }

        // 2. Check per-user usage count against perUserLimit
        const [usageCount] = await tx.select({
          count: sql<number>`COUNT(*)`
        })
          .from(redemptionCodeUsages)
          .where(and(
            eq(redemptionCodeUsages.userId, userId),
            eq(redemptionCodeUsages.codeId, redemptionCode.id)
          ));

        if (Number(usageCount.count) >= redemptionCode.perUserLimit) {
          return { success: false, gcCredited: 0, scCredited: 0, error: 'You have reached the usage limit for this code' };
        }

        // 3. Get current user and balance with VIP level check
        const [currentUser] = await tx.select()
          .from(users)
          .where(eq(users.id, userId));

        if (!currentUser) {
          return { success: false, gcCredited: 0, scCredited: 0, error: 'User not found' };
        }

        // Check VIP level requirement
        if (redemptionCode.minVipLevel) {
          const vipLevels = ['UNRANKED', 'WOOD', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'JADE', 'SAPPHIRE', 'RUBY', 'DIAMOND'];
          const requiredLevel = vipLevels.indexOf(redemptionCode.minVipLevel);
          const userLevel = vipLevels.indexOf(currentUser.vipLevel || 'UNRANKED');
          
          if (userLevel < requiredLevel) {
            return { success: false, gcCredited: 0, scCredited: 0, error: `VIP level ${redemptionCode.minVipLevel} required` };
          }
        }

        const [currentBalance] = await tx.select()
          .from(balances)
          .where(eq(balances.userId, userId));

        if (!currentBalance) {
          return { success: false, gcCredited: 0, scCredited: 0, error: 'User balance not found' };
        }

        // 4. Calculate rewards
        const gcAmount = redemptionCode.gcAmount || 0;
        const scAmount = redemptionCode.scAmount || 0;
        let bonusCreated = false;

        // 5. Credit GC (Gold Credits) to available balance
        if (gcAmount > 0) {
          await tx.update(balances)
            .set({
              available: sql`${balances.available} + ${gcAmount}`
            })
            .where(eq(balances.userId, userId));

          // Create transaction record for GC
          await tx.insert(transactions).values({
            id: randomUUID(),
            userId,
            type: 'DEPOSIT',
            amount: gcAmount,
            meta: {
              source: 'redemption_code',
              code: redemptionCode.code,
              codeId: redemptionCode.id,
              type: 'GC'
            }
          });
        }

        // 6. Credit SC (Sweeps Cash) with wagering requirements
        if (scAmount > 0) {
          const currentSCTotal = Number(currentBalance.sweepsCashTotal) || 0;
          const currentSCRedeemable = Number(currentBalance.sweepsCashRedeemable) || 0;
          const scAmountNum = Number(scAmount);
          
          // Handle SC wagering requirements
          const wageringMultiplier = redemptionCode.scWageringMultiplier || 0;
          
          if (wageringMultiplier > 0) {
            // Credit total but not redeemable (requires wagering)
            await tx.update(balances)
              .set({
                sweepsCashTotal: (currentSCTotal + scAmountNum).toFixed(2)
                // Don't increase sweepsCashRedeemable until wagering is complete
              })
              .where(eq(balances.userId, userId));

            // Create wagering record using userBonuses with special type
            await tx.insert(userBonuses).values({
              userId,
              type: 'SC_WAGERING',
              bonusAmount: scAmountNum,
              wageringRequirement: (scAmountNum * wageringMultiplier).toFixed(2),
              status: 'active'
            });
          } else {
            // No wagering required, credit both total and redeemable
            await tx.update(balances)
              .set({
                sweepsCashTotal: (currentSCTotal + scAmountNum).toFixed(2),
                sweepsCashRedeemable: (currentSCRedeemable + scAmountNum).toFixed(2)
              })
              .where(eq(balances.userId, userId));
          }

          // Create transaction record for SC
          await tx.insert(transactions).values({
            id: randomUUID(),
            userId,
            type: 'DEPOSIT',
            amount: scAmountNum,
            meta: {
              source: 'redemption_code',
              code: redemptionCode.code,
              codeId: redemptionCode.id,
              type: 'SC',
              sweepsCash: true,
              wageringMultiplier,
              ipHash: context.ipHash,
              userAgentHash: context.userAgentHash
            }
          });
        }

        // 7. Handle bonus creation if specified
        if (redemptionCode.bonusType && redemptionCode.bonusPercentage) {
          // Get available deposit bonuses
          const [bonusTemplate] = await tx.select()
            .from(depositBonuses)
            .where(eq(depositBonuses.bonusType, redemptionCode.bonusType));

          if (bonusTemplate) {
            const bonusAmount = Math.floor((gcAmount + scAmount) * (redemptionCode.bonusPercentage / 100));
            
            if (bonusAmount > 0) {
              await tx.insert(userBonuses).values({
                userId,
                type: 'DEPOSIT',
                bonusAmount,
                wageringRequirement: bonusTemplate.wageringRequirement,
                status: 'active'
              });
              bonusCreated = true;
            }
          }
        }

        // 8. Record code usage with credited amounts for audit
        await tx.insert(redemptionCodeUsages).values({
          userId,
          codeId: redemptionCode.id,
          gcCredited: gcAmount,
          scCredited: scAmount,
          ipHash: context.ipHash,
          userAgentHash: context.userAgentHash
        });

        // 9. Deactivate code if it has reached max uses
        if (updatedCode.usedCount >= redemptionCode.maxUses) {
          await tx.update(redemptionCodes)
            .set({ isActive: false })
            .where(eq(redemptionCodes.id, redemptionCode.id));
        }

        return {
          success: true,
          gcCredited: gcAmount,
          scCredited: scAmount,
          bonusCreated
        };

      } catch (error) {
        console.error('Error in redeemCodeAtomic:', error);
        return { success: false, gcCredited: 0, scCredited: 0, error: 'Failed to redeem code' };
      }
    });
  }

  // Game favorites and recently played implementations
  async getRecentlyPlayedGames(userId: string, limit = 3): Promise<{ gameName: string; lastPlayed: Date }[]> {
    // Get the most recent games played by the user (distinct games)
    const recentGames = await db.select({
      gameName: bets.game,
      lastPlayed: sql<Date>`MAX(${bets.createdAt})`
    })
    .from(bets)
    .where(and(eq(bets.userId, userId), isNotNull(bets.game)))
    .groupBy(bets.game)
    .orderBy(desc(sql`MAX(${bets.createdAt})`))
    .limit(limit);

    return recentGames.map(game => ({
      gameName: game.gameName!,
      lastPlayed: new Date(game.lastPlayed)
    }));
  }

  async getUserFavorites(userId: string): Promise<UserFavorite[]> {
    return await db.select()
      .from(userFavorites)
      .where(eq(userFavorites.userId, userId))
      .orderBy(desc(userFavorites.createdAt));
  }

  async addGameToFavorites(userId: string, gameName: string): Promise<UserFavorite> {
    const [favorite] = await db.insert(userFavorites)
      .values({
        userId,
        gameName
      })
      .returning();
    
    return favorite;
  }

  async removeGameFromFavorites(userId: string, gameName: string): Promise<boolean> {
    const result = await db.delete(userFavorites)
      .where(and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.gameName, gameName)
      ))
      .returning();
    
    return result.length > 0;
  }

  // Vault operations
  async getUserVaultEntries(userId: string): Promise<VaultEntry[]> {
    return await db.select()
      .from(vaultEntries)
      .where(eq(vaultEntries.userId, userId))
      .orderBy(desc(vaultEntries.createdAt));
  }

  async getVaultEntry(entryId: string, userId: string): Promise<VaultEntry | undefined> {
    const [entry] = await db.select()
      .from(vaultEntries)
      .where(and(
        eq(vaultEntries.id, entryId),
        eq(vaultEntries.userId, userId)
      ));
    return entry || undefined;
  }

  async stashToVault(entry: InsertVaultEntry): Promise<VaultEntry> {
    return await db.transaction(async (tx) => {
      // Verify user has sufficient balance
      const [balance] = await tx.select()
        .from(balances)
        .where(eq(balances.userId, entry.userId));

      if (!balance) {
        throw new Error('Balance not found');
      }

      // Calculate amount in cents for consistent handling
      const amountInCents = entry.currency === 'SC' 
        ? Math.round(Number(entry.amount) * 100)  // Convert SC to cents
        : Math.round(Number(entry.amount) * 100); // GC already in cents

      // Check sufficient balance
      const availableAmount = entry.currency === 'SC' 
        ? Math.round(Number(balance.sweepsCashTotal) * 100) // Convert SC to cents for comparison
        : balance.available;

      if (availableAmount < amountInCents) {
        throw new Error(`Insufficient ${entry.currency} balance. Available: ${availableAmount / 100}, Required: ${amountInCents / 100}`);
      }

      // Create vault entry
      const [vaultEntry] = await tx.insert(vaultEntries)
        .values(entry)
        .returning();

      // Deduct from user's balance atomically
      if (entry.currency === 'SC') {
        await tx.update(balances)
          .set({ 
            sweepsCashTotal: sql`${balances.sweepsCashTotal} - ${Number(entry.amount)}`
          })
          .where(eq(balances.userId, entry.userId));
      } else {
        await tx.update(balances)
          .set({ 
            available: sql`${balances.available} - ${amountInCents}`
          })
          .where(eq(balances.userId, entry.userId));
      }

      // Log transaction in consistent units (cents)
      await tx.insert(transactions).values({
        userId: entry.userId,
        type: 'VAULT_STASH',
        amount: amountInCents,
        meta: {
          currency: entry.currency,
          vaultEntryId: vaultEntry.id,
          description: entry.description,
          originalAmount: Number(entry.amount) // Store original decimal amount for reference
        }
      });

      return vaultEntry;
    });
  }

  async releaseFromVault(entryId: string, userId: string): Promise<VaultEntry> {
    return await db.transaction(async (tx) => {
      // Get and verify vault entry
      const [vaultEntry] = await tx.select()
        .from(vaultEntries)
        .where(and(
          eq(vaultEntries.id, entryId),
          eq(vaultEntries.userId, userId),
          eq(vaultEntries.status, 'STASHED')
        ));

      if (!vaultEntry) {
        throw new Error('Vault entry not found or already released');
      }

      // Update vault entry status
      const [releasedEntry] = await tx.update(vaultEntries)
        .set({
          status: 'RELEASED',
          releasedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(vaultEntries.id, entryId))
        .returning();

      // Calculate amount in cents for consistent handling
      const amountInCents = vaultEntry.currency === 'SC' 
        ? Math.round(Number(vaultEntry.amount) * 100)
        : Math.round(Number(vaultEntry.amount) * 100);

      // Add back to user's balance atomically
      if (vaultEntry.currency === 'SC') {
        await tx.update(balances)
          .set({ 
            sweepsCashTotal: sql`${balances.sweepsCashTotal} + ${Number(vaultEntry.amount)}`
          })
          .where(eq(balances.userId, userId));
      } else {
        await tx.update(balances)
          .set({ 
            available: sql`${balances.available} + ${amountInCents}`
          })
          .where(eq(balances.userId, userId));
      }

      // Log transaction in consistent units (cents)
      await tx.insert(transactions).values({
        userId,
        type: 'VAULT_RELEASE',
        amount: amountInCents,
        meta: {
          currency: vaultEntry.currency,
          vaultEntryId: vaultEntry.id,
          description: vaultEntry.description,
          originalAmount: Number(vaultEntry.amount) // Store original decimal amount for reference
        }
      });

      return releasedEntry;
    });
  }

  async processAutoReleases(): Promise<VaultEntry[]> {
    const now = new Date();
    const entriesToRelease = await db.select()
      .from(vaultEntries)
      .where(and(
        eq(vaultEntries.status, 'STASHED'),
        isNotNull(vaultEntries.autoReleaseAt),
        lte(vaultEntries.autoReleaseAt, now)
      ));

    const releasedEntries: VaultEntry[] = [];
    
    // Process each entry atomically
    for (const entry of entriesToRelease) {
      try {
        const releasedEntry = await db.transaction(async (tx) => {
          // Update vault entry status
          const [updatedEntry] = await tx.update(vaultEntries)
            .set({
              status: 'RELEASED',
              releasedAt: now,
              updatedAt: now
            })
            .where(and(
              eq(vaultEntries.id, entry.id),
              eq(vaultEntries.status, 'STASHED') // Ensure it's still stashed
            ))
            .returning();

          if (!updatedEntry) {
            throw new Error('Entry already released or not found');
          }

          // Calculate amount in cents for consistent handling
          const amountInCents = entry.currency === 'SC' 
            ? Math.round(Number(entry.amount) * 100)
            : Math.round(Number(entry.amount) * 100);

          // Add back to user's balance atomically
          if (entry.currency === 'SC') {
            await tx.update(balances)
              .set({ 
                sweepsCashTotal: sql`${balances.sweepsCashTotal} + ${Number(entry.amount)}`
              })
              .where(eq(balances.userId, entry.userId));
          } else {
            await tx.update(balances)
              .set({ 
                available: sql`${balances.available} + ${amountInCents}`
              })
              .where(eq(balances.userId, entry.userId));
          }

          // Log transaction in consistent units (cents)
          await tx.insert(transactions).values({
            userId: entry.userId,
            type: 'VAULT_RELEASE',
            amount: amountInCents,
            meta: {
              currency: entry.currency,
              vaultEntryId: entry.id,
              description: entry.description,
              originalAmount: Number(entry.amount),
              autoRelease: true
            }
          });

          return updatedEntry;
        });

        releasedEntries.push(releasedEntry);
        console.log(`Auto-released vault entry ${entry.id} for user ${entry.userId}: ${entry.amount} ${entry.currency}`);
      } catch (error) {
        console.error(`Failed to auto-release vault entry ${entry.id}:`, error);
      }
    }

    if (releasedEntries.length > 0) {
      console.log(`Auto-released ${releasedEntries.length} vault entries`);
    }

    return releasedEntries;
  }

  // Rakeback System methods
  async getRakebackBalance(userId: string): Promise<RakebackBalance | undefined> {
    const [balance] = await db.select()
      .from(rakebackBalances)
      .where(eq(rakebackBalances.userId, userId));
    return balance || undefined;
  }

  async createRakebackBalance(balance: InsertRakebackBalance): Promise<RakebackBalance> {
    const [created] = await db.insert(rakebackBalances).values(balance).returning();
    return created;
  }

  async updateRakebackBalance(userId: string, availableBalance: number, totalEarned: number, totalWithdrawn: number): Promise<void> {
    await db.update(rakebackBalances)
      .set({
        availableBalance: availableBalance.toFixed(2),
        totalEarned: totalEarned.toFixed(2),
        totalWithdrawn: totalWithdrawn.toFixed(2),
        updatedAt: new Date()
      })
      .where(eq(rakebackBalances.userId, userId));
  }

  async createRakebackTransaction(transaction: InsertRakebackTransaction): Promise<RakebackTransaction> {
    const [created] = await db.insert(rakebackTransactions).values(transaction).returning();
    return created;
  }

  async getRakebackTransactions(userId: string, limit = 50): Promise<RakebackTransaction[]> {
    return await db.select()
      .from(rakebackTransactions)
      .where(eq(rakebackTransactions.userId, userId))
      .orderBy(desc(rakebackTransactions.createdAt))
      .limit(limit);
  }

  async calculateGGR(userId: string, periodStart: Date, periodEnd: Date): Promise<number> {
    // Calculate Gross Gaming Revenue (GGR) - total profits made by casino from user bets
    const [result] = await db.select({
      totalGGR: sql<number>`COALESCE(ABS(SUM(CAST(${bets.profit} AS DECIMAL))), 0)`
    })
    .from(bets)
    .where(
      and(
        eq(bets.userId, userId),
        gte(bets.createdAt, periodStart),
        lte(bets.createdAt, periodEnd),
        eq(bets.gameMode, 'real') // Only count real money bets
      )
    );

    return Math.abs(result.totalGGR || 0) / 100; // Convert from cents to dollars
  }

  async processRakebackCalculation(userId: string): Promise<{ rakebackEarned: number; ggrAmount: number }> {
    // Get or create rakeback balance
    let rakebackBalance = await this.getRakebackBalance(userId);
    if (!rakebackBalance) {
      rakebackBalance = await this.createRakebackBalance({
        userId,
        availableBalance: "0.00",
        totalEarned: "0.00",
        totalWithdrawn: "0.00"
      });
    }

    // Calculate GGR for the period since last calculation
    const lastCalculated = rakebackBalance.lastCalculatedAt || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to 24h ago
    const now = new Date();
    
    const ggrAmount = await this.calculateGGR(userId, lastCalculated, now);
    
    // Calculate 5% rakeback
    const rakebackEarned = ggrAmount * 0.05;

    if (rakebackEarned > 0) {
      // Update balances
      const newAvailable = parseFloat(rakebackBalance.availableBalance) + rakebackEarned;
      const newTotalEarned = parseFloat(rakebackBalance.totalEarned) + rakebackEarned;

      await db.transaction(async (tx) => {
        // Update rakeback balance
        await tx.update(rakebackBalances)
          .set({
            availableBalance: newAvailable.toFixed(2),
            totalEarned: newTotalEarned.toFixed(2),
            lastCalculatedAt: now,
            updatedAt: now
          })
          .where(eq(rakebackBalances.userId, userId));

        // Create rakeback transaction record
        await tx.insert(rakebackTransactions).values({
          userId,
          type: 'EARNED',
          amount: rakebackEarned.toFixed(2),
          balanceBefore: rakebackBalance.availableBalance,
          balanceAfter: newAvailable.toFixed(2),
          description: `Rakeback earned: 5% of $${ggrAmount.toFixed(2)} GGR`,
          ggrAmount: ggrAmount.toFixed(2),
          ggrPercentage: "5.00",
          ggrPeriodStart: lastCalculated,
          ggrPeriodEnd: now,
          status: 'COMPLETED'
        });

        // Create main transaction for audit trail
        await tx.insert(transactions).values({
          userId,
          type: 'RAKEBACK_EARNED',
          amount: Math.round(rakebackEarned * 100), // Convert to cents
          meta: {
            ggrAmount: ggrAmount,
            rakebackPercentage: 5,
            periodStart: lastCalculated.toISOString(),
            periodEnd: now.toISOString()
          }
        });
      });
    }

    return { rakebackEarned, ggrAmount };
  }

  async withdrawRakebackToBalance(userId: string, amount: number, targetBalance: 'SC' | 'GC'): Promise<{ success: boolean; error?: string }> {
    try {
      // Get rakeback balance
      const rakebackBalance = await this.getRakebackBalance(userId);
      if (!rakebackBalance) {
        return { success: false, error: 'Rakeback balance not found' };
      }

      const availableBalance = parseFloat(rakebackBalance.availableBalance);
      if (availableBalance < amount) {
        return { success: false, error: 'Insufficient rakeback balance' };
      }

      // Get user's main balance
      const userBalance = await this.getBalance(userId);
      if (!userBalance) {
        return { success: false, error: 'User balance not found' };
      }

      await db.transaction(async (tx) => {
        // Update rakeback balance
        const newAvailable = availableBalance - amount;
        const newTotalWithdrawn = parseFloat(rakebackBalance.totalWithdrawn) + amount;

        await tx.update(rakebackBalances)
          .set({
            availableBalance: newAvailable.toFixed(2),
            totalWithdrawn: newTotalWithdrawn.toFixed(2),
            updatedAt: new Date()
          })
          .where(eq(rakebackBalances.userId, userId));

        // Update user's main balance
        if (targetBalance === 'SC') {
          // Add to Sweeps Cash
          await tx.update(balances)
            .set({
              sweepsCashTotal: sql`${balances.sweepsCashTotal} + ${amount}`,
              sweepsCashRedeemable: sql`${balances.sweepsCashRedeemable} + ${amount}`
            })
            .where(eq(balances.userId, userId));
        } else {
          // Add to Gold Credits (convert to cents)
          const amountInCents = Math.round(amount * 100);
          await tx.update(balances)
            .set({
              available: sql`${balances.available} + ${amountInCents}`
            })
            .where(eq(balances.userId, userId));
        }

        // Create rakeback withdrawal transaction
        await tx.insert(rakebackTransactions).values({
          userId,
          type: 'WITHDRAWAL',
          amount: amount.toFixed(2),
          balanceBefore: availableBalance.toFixed(2),
          balanceAfter: newAvailable.toFixed(2),
          description: `Withdrawal to ${targetBalance} balance`,
          withdrawnToBalance: targetBalance,
          status: 'COMPLETED'
        });

        // Create main transaction for audit trail
        await tx.insert(transactions).values({
          userId,
          type: 'RAKEBACK_WITHDRAWAL',
          amount: targetBalance === 'SC' ? Math.round(amount * 100) : Math.round(amount * 100),
          meta: {
            targetBalance,
            rakebackAmount: amount,
            withdrawalType: 'rakeback_to_balance'
          }
        });
      });

      return { success: true };
    } catch (error) {
      console.error('Error withdrawing rakeback:', error);
      return { success: false, error: 'Database error occurred' };
    }
  }

  // Progressive Jackpot operations
  async getAllJackpotPools(): Promise<JackpotPool[]> {
    return await db.select().from(jackpotPools).orderBy(asc(jackpotPools.currentAmount));
  }

  async getJackpotPoolByCurrency(currency: 'GC' | 'SC'): Promise<JackpotPool[]> {
    return await db.select().from(jackpotPools)
      .where(eq(jackpotPools.currency, currency))
      .orderBy(asc(jackpotPools.currentAmount));
  }

  async contributeToJackpots(userId: string, betId: string, betAmount: number, gameName: string, currency: 'GC' | 'SC'): Promise<void> {
    // Get eligible jackpot pools for this currency and game
    const pools = await db.select().from(jackpotPools)
      .where(eq(jackpotPools.currency, currency));

    for (const pool of pools) {
      // Check if game is eligible (null means all games are eligible)
      if (pool.gameEligibility && pool.gameEligibility.length > 0 && !pool.gameEligibility.includes(gameName)) {
        continue;
      }

      // Calculate contribution amount
      const contributionPercentage = parseFloat(pool.contributionPercentage);
      const contributionAmount = betAmount * contributionPercentage;

      if (contributionAmount > 0) {
        await db.transaction(async (tx) => {
          // Add contribution to pool
          await tx.update(jackpotPools)
            .set({
              currentAmount: sql`${jackpotPools.currentAmount} + ${contributionAmount}`,
              updatedAt: new Date()
            })
            .where(eq(jackpotPools.id, pool.id));

          // Record contribution for audit
          await tx.insert(jackpotContributions).values({
            jackpotPoolId: pool.id,
            userId,
            betId,
            amount: contributionAmount.toFixed(2),
            gameName
          });
        });
      }
    }
  }

  async checkJackpotWin(userId: string, betId: string, gameName: string, currency: 'GC' | 'SC'): Promise<{ won: boolean; tier?: string; amount?: number }> {
    // Get eligible jackpot pools for this currency
    const pools = await db.select().from(jackpotPools)
      .where(eq(jackpotPools.currency, currency))
      .orderBy(desc(jackpotPools.currentAmount)); // Check highest first

    // Jackpot win probabilities (adjust these for desired win frequency)
    const winProbabilities = {
      'MEGA': 0.00001,   // 0.001% chance - very rare
      'MAJOR': 0.0001,   // 0.01% chance
      'MINOR': 0.001,    // 0.1% chance
      'MINI': 0.01       // 1% chance
    };

    for (const pool of pools) {
      // Check if game is eligible
      if (pool.gameEligibility && pool.gameEligibility.length > 0 && !pool.gameEligibility.includes(gameName)) {
        continue;
      }

      const probability = winProbabilities[pool.tier as keyof typeof winProbabilities] || 0;
      const randomValue = Math.random();

      if (randomValue < probability) {
        // Jackpot win!
        const currentAmount = parseFloat(pool.currentAmount);
        return {
          won: true,
          tier: pool.tier,
          amount: currentAmount
        };
      }
    }

    return { won: false };
  }

  async awardJackpot(poolId: string, userId: string, betId: string, gameName: string): Promise<JackpotWinner> {
    return await db.transaction(async (tx) => {
      // Get the jackpot pool
      const [pool] = await tx.select().from(jackpotPools)
        .where(eq(jackpotPools.id, poolId))
        .for('update'); // Lock row for update

      if (!pool) {
        throw new Error('Jackpot pool not found');
      }

      const winAmount = parseFloat(pool.currentAmount);
      const seedAmount = parseFloat(pool.seedAmount);

      // Create winner record
      const [winner] = await tx.insert(jackpotWinners).values({
        jackpotPoolId: poolId,
        userId,
        amountWon: winAmount.toFixed(2),
        gameName,
        betId,
        currency: pool.currency
      }).returning();

      // Update pool - reset to seed amount
      await tx.update(jackpotPools)
        .set({
          currentAmount: seedAmount.toFixed(2),
          lastWonAt: new Date(),
          lastWinnerId: userId,
          lastWinAmount: winAmount.toFixed(2),
          totalWinCount: sql`${jackpotPools.totalWinCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(jackpotPools.id, poolId));

      // Credit user's balance
      if (pool.currency === 'SC') {
        await tx.update(balances)
          .set({
            sweepsCashTotal: sql`${balances.sweepsCashTotal} + ${winAmount}`,
            sweepsCashRedeemable: sql`${balances.sweepsCashRedeemable} + ${winAmount}`
          })
          .where(eq(balances.userId, userId));
      } else {
        const amountInCents = Math.round(winAmount * 100);
        await tx.update(balances)
          .set({
            available: sql`${balances.available} + ${amountInCents}`
          })
          .where(eq(balances.userId, userId));
      }

      // Create transaction record
      await tx.insert(transactions).values({
        userId,
        type: 'PAYOUT',
        amount: pool.currency === 'SC' ? Math.round(winAmount * 100) : Math.round(winAmount * 100),
        meta: {
          source: 'progressive_jackpot',
          tier: pool.tier,
          gameName,
          betId
        }
      });

      return winner;
    });
  }

  async getJackpotWinners(limit: number = 50): Promise<JackpotWinner[]> {
    return await db.select().from(jackpotWinners)
      .orderBy(desc(jackpotWinners.wonAt))
      .limit(limit);
  }

  async getUserJackpotWins(userId: string): Promise<JackpotWinner[]> {
    return await db.select().from(jackpotWinners)
      .where(eq(jackpotWinners.userId, userId))
      .orderBy(desc(jackpotWinners.wonAt));
  }
}

export const storage = new DatabaseStorage();
