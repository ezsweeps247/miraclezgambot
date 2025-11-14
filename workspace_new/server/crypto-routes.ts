import express, { Express } from "express";
import { nowPaymentsService, type CryptoPayment, type SupportedCurrency } from "./crypto/nowpayments";
import { storage } from "./storage";
import { authenticateJWT, type AuthenticatedRequest } from "./auth";
import { getExchangeRate } from "./crypto/exchange-rates";
import { z } from "zod";
import { webhookLimiter } from './middleware/rate-limit';
import { 
  checkInstantWithdrawalEligibility, 
  updateWithdrawalStats 
} from './instant-withdrawal-service';
import { ethers } from "ethers";
import { biconomyService } from './biconomy-service';

// ⚠️ SECURITY WARNING: Storing private keys in environment variables is NOT production-safe
// For production, use: Hardware Wallets, AWS KMS, Google Cloud KMS, or Multi-sig wallets
// This setup is ONLY for development/testing with test wallets (NEVER use real funds)

// Blockchain configuration
let provider: ethers.JsonRpcProvider | null = null;
let casinoContract: ethers.Contract | null = null;
let operatorWallet: ethers.Wallet | null = null;

// Casino Smart Contract ABI - Replace with your actual contract ABI
const casinoABI = [
  // Example functions - Replace these with your actual smart contract ABI
  "function placeBet(uint256 amount, uint256 gameId) external payable returns (uint256)",
  "function claimWinnings(uint256 betId) external returns (uint256)",
  "function getBalance(address user) external view returns (uint256)",
  "function withdraw(uint256 amount) external",
  "event BetPlaced(address indexed player, uint256 indexed betId, uint256 amount, uint256 gameId)",
  "event WinningsClaimed(address indexed player, uint256 indexed betId, uint256 amount)"
];

// Initialize blockchain connection
function initializeBlockchain() {
  const rpcUrl = process.env.RPC_URL;
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const operatorPrivateKey = process.env.OPERATOR_PRIVATE_KEY;

  if (!rpcUrl || !contractAddress || !operatorPrivateKey) {
    console.warn('⚠️  Blockchain integration disabled: Missing RPC_URL, CONTRACT_ADDRESS, or OPERATOR_PRIVATE_KEY');
    return;
  }

  try {
    // Create provider
    provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Create wallet from private key and connect to provider
    operatorWallet = new ethers.Wallet(operatorPrivateKey, provider);
    
    // Create contract instance with wallet as signer
    casinoContract = new ethers.Contract(
      contractAddress,
      casinoABI,
      operatorWallet
    );
    
    console.log('✅ Blockchain integration initialized');
    console.log(`   Contract: ${contractAddress}`);
    console.log(`   Operator: ${operatorWallet.address}`);
  } catch (error) {
    console.error('❌ Failed to initialize blockchain:', error);
  }
}

// Initialize on module load
initializeBlockchain();

const createDepositSchema = z.object({
  currency: z.string().min(3).max(10),
  usdAmount: z.number().min(1).max(10000),
  goldCoins: z.number().optional(),
  sweepsCash: z.number().optional()
});

const createWithdrawalSchema = z.object({
  currency: z.string().min(3).max(10),
  usdAmount: z.number().min(1).max(10000),
  address: z.string().min(10).max(100)
});

const webhookSchema = z.object({
  payment_id: z.string(),
  payment_status: z.string(),
  pay_address: z.string(),
  actually_paid: z.string().optional(),
  pay_amount: z.string(),
  order_id: z.string(),
  order_description: z.string()
});

export function registerCryptoRoutes(app: Express) {
  // Raw body middleware specifically for webhook routes - mount BEFORE other routes
  // This must capture the raw body before express.json() processes it
  app.use('/api/crypto/webhook', express.raw({ type: '*/*' }));
  app.use('/api/crypto/payout-webhook', express.raw({ type: '*/*' }));
  // Create/Connect wallet (redirects to connect existing wallet)
  app.post('/api/crypto/wallet', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const { currency } = req.body;
      
      // Instead of creating a wallet, guide user to connect their existing wallet
      res.json({
        success: false,
        message: 'Please connect your existing crypto wallet',
        action: 'connect_wallet',
        supportedWallets: ['MetaMask', 'Trust Wallet', 'Coinbase Wallet', 'WalletConnect'],
        currency: currency
      });
    } catch (error) {
      console.error('Error with wallet request:', error);
      res.status(500).json({ error: 'Failed to process wallet request' });
    }
  });

  // Get supported cryptocurrencies
  app.get('/api/crypto/currencies', async (req, res) => {
    try {
      const currencies = await nowPaymentsService.getSupportedCurrencies();
      res.json(currencies);
    } catch (error) {
      console.error('Error fetching supported currencies:', error);
      res.status(500).json({ error: 'Failed to fetch supported currencies' });
    }
  });

  // Get price estimate for crypto conversion
  app.post('/api/crypto/estimate', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const { fromCurrency, toCurrency, amount } = req.body;
      const estimatedPrice = await nowPaymentsService.getEstimatedPrice(
        fromCurrency, 
        toCurrency, 
        parseFloat(amount)
      );
      res.json({ estimatedAmount: estimatedPrice });
    } catch (error) {
      console.error('Error getting price estimate:', error);
      res.status(500).json({ error: 'Failed to get price estimate' });
    }
  });

  // Create a crypto deposit
  app.post('/api/crypto/deposit', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const data = createDepositSchema.parse(req.body);
      const userId = req.user!.userId;

      // Check user's balance mode - crypto deposits require SC mode
      const user = await storage.getUser(userId);
      if (!user || user.balanceMode !== 'SC') {
        return res.status(400).json({ 
          error: 'BALANCE_MODE_RESTRICTION: Real money deposits require Sweeps Cash (SC) mode. Please switch to SC mode to make crypto deposits.',
          balanceMode: user?.balanceMode || 'GC'
        });
      }

      const payment = await nowPaymentsService.createDeposit(
        userId, 
        data.currency, 
        data.usdAmount
      );

      // Store payment in database with package info
      await storage.recordCryptoTransaction({
        id: payment.id,
        userId,
        type: 'deposit',
        currency: payment.currency,
        amount: payment.amount,
        usdAmount: data.usdAmount,
        status: payment.status,
        paymentId: payment.paymentId,
        paymentUrl: payment.paymentUrl,
        address: payment.address,
        metadata: {
          goldCoins: data.goldCoins,
          sweepsCash: data.sweepsCash,
          packageInfo: true
        },
        createdAt: new Date()
      });

      // Broadcast new transaction to WebSocket clients
      const transactionData = {
        type: 'crypto_transaction',
        transaction: {
          id: payment.id,
          type: 'deposit',
          currency: payment.currency,
          amount: payment.amount,
          usdValue: data.usdAmount,
          status: 'pending',
          timestamp: Date.now()
        }
      };
      
      if ((global as any).broadcastToAll) {
        (global as any).broadcastToAll(transactionData);
      }

      res.json({
        success: true,
        payment: {
          id: payment.id,
          paymentId: payment.paymentId,
          currency: payment.currency,
          amount: payment.amount,
          address: payment.address,
          paymentUrl: payment.paymentUrl,
          status: payment.status
        }
      });
    } catch (error) {
      console.error('Error creating crypto deposit:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create crypto deposit' });
    }
  });

  // Create a crypto withdrawal
  app.post('/api/crypto/withdraw', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const data = createWithdrawalSchema.parse(req.body);
      const userId = req.user!.userId;

      // Check user's balance mode - crypto withdrawals require SC mode
      const user = await storage.getUser(userId);
      if (!user || user.balanceMode !== 'SC') {
        return res.status(400).json({ 
          error: 'BALANCE_MODE_RESTRICTION: Real money withdrawals require Sweeps Cash (SC) mode. Please switch to SC mode to make crypto withdrawals.',
          balanceMode: user?.balanceMode || 'GC'
        });
      }

      // Check wagering requirements for active bonuses
      const wageringCheck = await storage.checkWageringRequirements(userId);
      if (wageringCheck.hasActiveBonus && wageringCheck.remainingToWager > 0) {
        return res.status(400).json({ 
          error: `You have active bonuses with wagering requirements. Please complete wagering of $${wageringCheck.remainingToWager.toFixed(2)} before withdrawing.`,
          wageringDetails: wageringCheck
        });
      }

      // Check instant withdrawal eligibility
      const eligibilityCheck = await checkInstantWithdrawalEligibility(userId, data.usdAmount);
      const isInstantWithdrawal = eligibilityCheck.isEligible;

      // Validate crypto address
      const isValidAddress = await nowPaymentsService.validateAddress(data.currency, data.address);
      if (!isValidAddress) {
        return res.status(400).json({ error: 'Invalid crypto address' });
      }

      // Frontend now sends USD amount, so data.usdAmount is already in USD
      const usdValue = data.usdAmount;
      
      // Convert USD to crypto amount for the actual withdrawal
      let cryptoAmount;
      try {
        // Get exchange rate for the currency
        const exchangeRate = await getExchangeRate(data.currency);
        cryptoAmount = usdValue / exchangeRate.usdRate;
      } catch (error) {
        console.error('Error getting crypto conversion:', error);
        // Use a rough estimate if conversion fails
        const roughRates: { [key: string]: number } = {
          btc: 65000,
          eth: 3500,
          usdt: 1,
          ltc: 100,
          doge: 0.15
        };
        cryptoAmount = usdValue / (roughRates[data.currency.toLowerCase()] || 100);
      }

      // Check minimum withdrawal amount in crypto
      const minCryptoAmount = await nowPaymentsService.getMinimumPayout(data.currency);
      if (cryptoAmount < minCryptoAmount) {
        return res.status(400).json({ 
          error: `Minimum withdrawal amount is $${(minCryptoAmount * (await getExchangeRate(data.currency)).usdRate).toFixed(2)} USD (${minCryptoAmount} ${data.currency.toUpperCase()})` 
        });
      }

      // Check minimum USD amount
      if (usdValue < 1) {
        return res.status(400).json({ 
          error: 'Minimum withdrawal amount is $1.00 USD' 
        });
      }

      // Convert USD to SC (1 USD = 1 SC) and use exact amount to prevent financial losses
      const withdrawalCredits = usdValue;
      const currentBalance = await storage.getUserBalance(userId);
      
      if (!currentBalance || currentBalance.available < withdrawalCredits) {
        return res.status(400).json({ 
          error: `Insufficient balance for withdrawal. Required: ${withdrawalCredits} credits, Available: ${currentBalance?.available || 0} credits` 
        });
      }

      // Use locked balance for transactional safety - lock funds first, then process
      await storage.updateBalance(userId, currentBalance.available - withdrawalCredits, currentBalance.locked + withdrawalCredits);

      let withdrawal;
      try {
        // Create withdrawal AFTER securing the funds using the calculated crypto amount
        withdrawal = await nowPaymentsService.createWithdrawal(
          userId, 
          data.currency, 
          cryptoAmount, 
          data.address
        );
      } catch (error) {
        // ROLLBACK: If withdrawal creation fails, unlock the funds
        console.error('Withdrawal creation failed, rolling back locked funds:', error);
        await storage.updateBalance(userId, currentBalance.available, currentBalance.locked);
        throw error;
      }

      // Store withdrawal in database with instant withdrawal flags
      await storage.recordCryptoTransaction({
        id: withdrawal.id,
        userId,
        type: 'withdrawal',
        currency: withdrawal.currency,
        amount: withdrawal.amount,
        status: withdrawal.status,
        address: withdrawal.address,
        creditsAmount: withdrawalCredits,  // Add the credits amount
        usdAmount: usdValue, // Store the USD amount that was requested
        isInstant: isInstantWithdrawal,
        riskScore: eligibilityCheck.riskScore,
        createdAt: new Date()
      });

      // Update withdrawal statistics
      await updateWithdrawalStats(userId, withdrawalCredits, true);

      // Broadcast new withdrawal to WebSocket clients
      const withdrawalData = {
        type: 'crypto_transaction',
        transaction: {
          id: withdrawal.id,
          type: 'withdrawal',
          currency: withdrawal.currency,
          amount: withdrawal.amount,
          usdValue: usdValue,
          status: isInstantWithdrawal ? 'instant' : 'pending',
          isInstant: isInstantWithdrawal,
          timestamp: Date.now()
        }
      };
      
      if ((global as any).broadcastToAll) {
        (global as any).broadcastToAll(withdrawalData);
      }

      res.json({
        success: true,
        withdrawal: {
          id: withdrawal.id,
          currency: withdrawal.currency,
          amount: withdrawal.amount,
          address: withdrawal.address,
          status: withdrawal.status,
          isInstant: isInstantWithdrawal,
          eligibilityDetails: isInstantWithdrawal 
            ? { maxInstantAmount: eligibilityCheck.maxInstantAmount }
            : { reasons: eligibilityCheck.reasons }
        }
      });
    } catch (error) {
      console.error('Error creating crypto withdrawal:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create crypto withdrawal' });
    }
  });

  // Get user's crypto wallets
  app.get('/api/crypto/wallets', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const wallets = await storage.getUserCryptoWallets(userId);
      res.json(wallets || []);
    } catch (error) {
      console.error('Error fetching crypto wallets:', error);
      res.json([]); // Return empty array to prevent crashes
    }
  });

  // Get user's crypto transaction history
  app.get('/api/crypto/transactions', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const transactions = await storage.getUserCryptoTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching crypto transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  // Get recent crypto transactions for visualization
  app.get('/api/crypto/recent-transactions', async (req, res) => {
    try {
      // Get recent transactions from all users (for public display)
      const recentTransactions = await storage.getRecentCryptoTransactions(10);
      
      // Format for visualization (hide sensitive data)
      const formattedTransactions = recentTransactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        currency: tx.currency,
        amount: tx.amount,
        usdValue: tx.usdAmount,
        status: tx.status,
        timestamp: new Date(tx.createdAt).getTime(),
        confirmations: tx.confirmations || 0,
        // Hide full addresses for privacy
        address: tx.address ? `${tx.address.slice(0, 6)}...${tx.address.slice(-4)}` : undefined
      }));
      
      res.json(formattedTransactions);
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      res.status(500).json({ error: 'Failed to fetch recent transactions' });
    }
  });

  // Get specific transaction status
  app.get('/api/crypto/transaction/:id', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const transactionId = req.params.id;
      const userId = req.user!.userId;

      const transaction = await storage.getCryptoTransaction(transactionId);
      if (!transaction || transaction.userId !== userId) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      // If it's a NOWPayments transaction, get live status
      if (transaction.paymentId) {
        try {
          const liveStatus = await nowPaymentsService.getPaymentStatus(transaction.paymentId);
          
          // Update transaction if status changed
          if (liveStatus.payment_status !== transaction.status) {
            await storage.updateCryptoTransactionStatus(
              transactionId, 
              liveStatus.payment_status,
              liveStatus.actually_paid ? parseFloat(liveStatus.actually_paid) : undefined
            );
            transaction.status = liveStatus.payment_status;
            transaction.actuallyPaid = liveStatus.actually_paid ? parseFloat(liveStatus.actually_paid) : undefined;
          }
        } catch (error) {
          console.error('Error fetching live payment status:', error);
        }
      }

      res.json(transaction);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      res.status(500).json({ error: 'Failed to fetch transaction' });
    }
  });

  // NOWPayments webhook for deposit confirmations
  app.post('/api/crypto/webhook', webhookLimiter, async (req, res) => {
    try {
      // CRITICAL SECURITY: Verify webhook signature
      const signature = req.headers['x-nowpayments-sig'] as string;
      if (!signature) {
        console.error('Webhook missing signature header');
        return res.status(401).json({ error: 'Unauthorized: Missing signature' });
      }
      
      // Verify HMAC signature (implement proper verification)
      const webhookSecret = process.env.NOWPAYMENTS_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('NOWPAYMENTS_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook not properly configured' });
      }
      
      // Create HMAC verification using raw body buffer
      const crypto = require('crypto');
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
      const expectedSignature = crypto.createHmac('sha512', webhookSecret).update(rawBody).digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Webhook signature verification failed');
        return res.status(401).json({ error: 'Unauthorized: Invalid signature' });
      }
      
      // Parse JSON manually since we captured raw body
      const data = webhookSchema.parse(Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body);
      
      // Find the transaction by payment ID
      const transaction = await storage.getCryptoTransactionByPaymentId(data.payment_id);
      if (!transaction) {
        console.error('Transaction not found for payment ID:', data.payment_id);
        return res.status(404).json({ error: 'Transaction not found' });
      }

      // IDEMPOTENCY: Check if transaction is already in final state to prevent double processing
      if (transaction.status === 'finished' || transaction.status === 'confirmed' || transaction.status === 'completed') {
        console.log(`Webhook ignored - transaction ${transaction.id} already processed with status: ${transaction.status}`);
        return res.json({ success: true, message: 'Already processed' });
      }

      // Update transaction status
      await storage.updateCryptoTransactionStatus(
        transaction.id,
        data.payment_status as any,
        data.actually_paid ? parseFloat(data.actually_paid) : undefined
      );

      // If payment is confirmed, credit user balance with both SC and GC (ONLY if not already credited)
      if (data.payment_status === 'finished' || data.payment_status === 'confirmed') {
        const actualAmount = data.actually_paid ? parseFloat(data.actually_paid) : transaction.amount;
        const usdValueDollars = transaction.usdAmount || (actualAmount / 100); // USD in dollars
        
        // Extract package info from transaction metadata
        const packageInfo = transaction.metadata as { goldCoins?: number; sweepsCash?: number; packageInfo?: boolean };
        const goldCoinsToAdd = packageInfo?.goldCoins || 0;
        const sweepsCashToAdd = packageInfo?.sweepsCash || usdValueDollars; // Fallback to USD amount in dollars
        
        // Create deposit transaction records for SC
        const scDepositTx = await storage.createTransaction({
          userId: transaction.userId,
          type: 'DEPOSIT',
          amount: Math.round(sweepsCashToAdd * 100), // Store as cents
          meta: {
            cryptoAmount: actualAmount,
            currency: transaction.currency,
            paymentId: data.payment_id,
            txHash: transaction.txHash || null,
            scAmount: sweepsCashToAdd,
            description: `Crypto deposit: ${sweepsCashToAdd} SC`
          }
        });
        
        // Credit SC (Sweeps Cash) - the purchased amount
        await storage.updateSweepsCashBalance(transaction.userId, {
          totalChange: sweepsCashToAdd, // all purchased SC is redeemable
          redeemableChange: sweepsCashToAdd
        });
        
        console.log(`Credited ${sweepsCashToAdd} SC to user ${transaction.userId} from crypto deposit`);
        
        // Credit GC (Gold Coins) - the bonus package amount
        if (goldCoinsToAdd > 0) {
          const currentBalance = await storage.getUserBalance(transaction.userId);
          if (!currentBalance) {
            throw new Error('User balance not found');
          }
          
          await storage.updateBalance(
            transaction.userId, 
            currentBalance.available + goldCoinsToAdd, 
            currentBalance.locked
          );
          
          // Create transaction record for GC bonus
          await storage.createTransaction({
            userId: transaction.userId,
            type: 'DEPOSIT',
            amount: goldCoinsToAdd,
            meta: {
              cryptoAmount: actualAmount,
              currency: transaction.currency,
              paymentId: data.payment_id,
              gcAmount: goldCoinsToAdd,
              description: `Package bonus: ${goldCoinsToAdd.toLocaleString()} GC`
            }
          });
          
          console.log(`Credited ${goldCoinsToAdd.toLocaleString()} GC bonus to user ${transaction.userId} from package`);
        }
        
        // Check for pending bonus selection and apply it
        const appliedBonus = await storage.applyPendingBonusSelection(
          transaction.userId,
          scDepositTx.id,
          usdValueDollars // USD in dollars for bonus calculation
        );
        
        if (appliedBonus) {
          // Credit bonus amount to user balance
          const bonusCredits = Math.round(Number(appliedBonus.bonusAmount) * 100);
          const currentBalance = await storage.getBalance(transaction.userId);
          
          if (currentBalance) {
            await storage.updateBalance(
              transaction.userId,
              currentBalance.available + bonusCredits,
              currentBalance.locked
            );
            
            // Create bonus transaction record
            await storage.createTransaction({
              userId: transaction.userId,
              type: 'DEPOSIT', // Mark as DEPOSIT type since it's bonus from deposit
              amount: bonusCredits,
              meta: {
                type: 'deposit_bonus',
                bonusId: appliedBonus.bonusId,
                depositId: scDepositTx.id,
                bonusAmount: Number(appliedBonus.bonusAmount),
                depositAmount: Number(appliedBonus.depositAmount)
              }
            });
            
            console.log(`Applied ${appliedBonus.bonusAmount} bonus to user ${transaction.userId} for deposit ${scDepositTx.id}`);
          }
        }
        
        // Broadcast confirmation update
        const confirmData = {
          type: 'crypto_transaction_update',
          transaction: {
            id: transaction.id,
            status: 'confirmed',
            confirmations: 6,
            requiredConfirmations: 6,
            bonusApplied: appliedBonus ? {
              amount: Number(appliedBonus.bonusAmount),
              depositAmount: Number(appliedBonus.depositAmount),
              wageringRequirement: Number(appliedBonus.wageringRequirement)
            } : null
          }
        };
        
        if ((global as any).broadcastToAll) {
          (global as any).broadcastToAll(confirmData);
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error processing crypto webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Mock payment completion endpoint for demo purposes
  app.post('/api/crypto/complete-mock-payment', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const { usdAmount, currency, paymentId, goldCoins, sweepsCash } = req.body;
      const userId = req.user!.userId;
      
      if (!usdAmount || usdAmount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }
      
      // Use package info if provided, otherwise fallback to USD amount for SC
      const scToAdd = sweepsCash || usdAmount; // 1 USD = 1 SC if no package info
      const gcToAdd = goldCoins || 0; // GC bonus from package
      
      // Get current balance
      const currentBalance = await storage.getUserBalance(userId);
      if (!currentBalance) {
        return res.status(404).json({ error: 'User balance not found' });
      }
      
      // Update SC balance (both total and redeemable)
      await storage.updateSweepsCashBalance(userId, {
        totalChange: scToAdd,
        redeemableChange: scToAdd  // All purchased SC is redeemable
      });
      
      // Log the SC transaction
      await storage.createTransaction({
        userId,
        type: 'DEPOSIT',
        amount: Math.round(scToAdd * 100), // Store in cents
        meta: {
          currency,
          usdAmount,
          scAmount: scToAdd,
          paymentId: paymentId || 'mock_payment',
          mock: true,
          description: `Mock ${currency} deposit - ${scToAdd} SC added`
        }
      });
      
      console.log(`Added ${scToAdd} SC to user ${userId} via mock payment ($${usdAmount})`);
      
      // Credit GC bonus if package includes it
      if (gcToAdd > 0) {
        const updatedBalance = await storage.getUserBalance(userId);
        if (updatedBalance) {
          await storage.updateBalance(
            userId, 
            updatedBalance.available + gcToAdd, 
            updatedBalance.locked
          );
          
          // Log the GC bonus transaction
          await storage.createTransaction({
            userId,
            type: 'DEPOSIT',
            amount: gcToAdd,
            meta: {
              currency,
              usdAmount,
              gcAmount: gcToAdd,
              paymentId: paymentId || 'mock_payment',
              mock: true,
              description: `Package bonus - ${gcToAdd.toLocaleString()} GC added`
            }
          });
          
          console.log(`Added ${gcToAdd.toLocaleString()} GC bonus to user ${userId} via mock payment`);
        }
      }
      
      res.json({ 
        success: true, 
        creditsAdded: Math.round(scToAdd * 100), // For display
        scAdded: scToAdd,
        newSCBalance: Number(currentBalance.sweepsCashTotal) + scToAdd
      });
    } catch (error) {
      console.error('Error processing mock payment:', error);
      res.status(500).json({ error: 'Failed to process mock payment' });
    }
  });
  
  // Get crypto rates (simple mock for now)
  app.get('/api/crypto/rates', async (req, res) => {
    try {
      // Return mock rates for now
      const rates = {
        btc: 65000,
        eth: 3500,
        usdt: 1,
        ltc: 100,
        doge: 0.15,
        matic: 0.80,
        ada: 0.45,
        trx: 0.12
      };
      res.json(rates);
    } catch (error) {
      console.error('Error fetching crypto rates:', error);
      res.status(500).json({ error: 'Failed to fetch rates' });
    }
  });
  
  // Get crypto status
  app.get('/api/crypto/status', async (req, res) => {
    try {
      res.json({
        enabled: true,
        minDeposit: 10,
        minWithdrawal: 20,
        processingTime: '5-30 minutes',
        confirmationsRequired: 3
      });
    } catch (error) {
      console.error('Error fetching crypto status:', error);
      res.status(500).json({ error: 'Failed to fetch status' });
    }
  });
  
  // Get user's crypto wallets
  app.get('/api/crypto/wallets', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      
      // Return empty wallets for now
      const wallets = {
        btc: { address: null, balance: 0 },
        eth: { address: null, balance: 0 },
        usdt: { address: null, balance: 0 },
        ltc: { address: null, balance: 0 },
        doge: { address: null, balance: 0 }
      };
      
      res.json(wallets);
    } catch (error) {
      console.error('Error fetching wallets:', error);
      res.status(500).json({ error: 'Failed to fetch wallets' });
    }
  });
  
  // Get specific wallet
  app.get('/api/crypto/wallet/:currency', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const { currency } = req.params;
      const userId = req.user!.userId;
      
      // Generate a mock wallet address
      const wallet = {
        currency: currency.toUpperCase(),
        address: null,
        balance: 0,
        pendingBalance: 0
      };
      
      res.json(wallet);
    } catch (error) {
      console.error('Error fetching wallet:', error);
      res.status(500).json({ error: 'Failed to fetch wallet' });
    }
  });
  
  // Get user's crypto deposits
  app.get('/api/crypto/deposits', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const allTransactions = await storage.getUserCryptoTransactions(userId);
      const deposits = allTransactions.filter((tx: any) => tx.type === 'deposit');
      res.json(deposits || []);
    } catch (error) {
      console.error('Error fetching deposits:', error);
      res.status(500).json({ error: 'Failed to fetch deposits' });
    }
  });
  
  // Get user's crypto withdrawals  
  app.get('/api/crypto/withdrawals', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const allTransactions = await storage.getUserCryptoTransactions(userId);
      const withdrawals = allTransactions.filter((tx: any) => tx.type === 'withdrawal');
      res.json(withdrawals || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      res.status(500).json({ error: 'Failed to fetch withdrawals' });
    }
  });
  
  // NOWPayments payout webhook for withdrawal updates
  app.post('/api/crypto/payout-webhook', webhookLimiter, async (req, res) => {
    try {
      // CRITICAL SECURITY: Verify webhook signature
      const signature = req.headers['x-nowpayments-sig'] as string;
      if (!signature) {
        console.error('Payout webhook missing signature header');
        return res.status(401).json({ error: 'Unauthorized: Missing signature' });
      }
      
      // Verify HMAC signature
      const webhookSecret = process.env.NOWPAYMENTS_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('NOWPAYMENTS_WEBHOOK_SECRET not configured for payout webhook');
        return res.status(500).json({ error: 'Webhook not properly configured' });
      }
      
      // Create HMAC verification using raw body buffer  
      const crypto = require('crypto');
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
      const expectedSignature = crypto.createHmac('sha512', webhookSecret).update(rawBody).digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Payout webhook signature verification failed');
        return res.status(401).json({ error: 'Unauthorized: Invalid signature' });
      }
      
      // Parse JSON manually since we captured raw body
      const parsedBody = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
      const { id, status } = parsedBody;
      
      // Find the withdrawal transaction
      const transaction = await storage.getCryptoTransaction(id);
      if (!transaction || transaction.type !== 'withdrawal') {
        console.error('Withdrawal transaction not found for ID:', id);
        return res.status(404).json({ error: 'Transaction not found' });
      }

      // Update transaction status
      await storage.updateCryptoTransactionStatus(transaction.id, status);

      // IDEMPOTENCY: Check if this status update was already processed
      if (transaction.status === status) {
        console.log(`Payout webhook ignored - transaction ${transaction.id} already has status: ${status}`);
        return res.json({ success: true, message: 'Already processed' });
      }

      // Handle withdrawal status changes with proper balance management
      if (status === 'failed' || status === 'expired') {
        // Get current balance to calculate new absolute values
        const currentBalance = await storage.getUserBalance(transaction.userId);
        if (!currentBalance) {
          throw new Error('User balance not found for refund');
        }
        
        // Use creditsAmount (not crypto amount) for refund calculation
        const creditsToRefund = transaction.creditsAmount || Math.round(transaction.amount * 100);
        
        // REFUND: Move locked credits back to available
        const newAvailable = currentBalance.available + creditsToRefund;
        const newLocked = Math.max(0, currentBalance.locked - creditsToRefund);
        
        await storage.updateBalance(transaction.userId, newAvailable, newLocked);
        console.log(`Refunded ${creditsToRefund} credits to user ${transaction.userId} for failed withdrawal`);
      } else if (status === 'finished' || status === 'completed') {
        // Get current balance to release locked funds properly
        const currentBalance = await storage.getUserBalance(transaction.userId);
        if (currentBalance) {
          const creditsAmount = transaction.creditsAmount || Math.round(transaction.amount * 100);
          const newLocked = Math.max(0, currentBalance.locked - creditsAmount);
          
          await storage.updateBalance(transaction.userId, currentBalance.available, newLocked);
          console.log(`Released ${creditsAmount} locked credits for completed withdrawal ${transaction.id}`);
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error processing payout webhook:', error);
      res.status(500).json({ error: 'Payout webhook processing failed' });
    }
  });

  // Get payment status and auto-complete demo payments
  app.get('/api/crypto/payment/:paymentId', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const { paymentId } = req.params;
      const userId = req.user!.userId;

      // Get payment status from NOWPayments service (includes demo logic)
      const paymentStatus = await nowPaymentsService.getPaymentStatus(paymentId);
      
      // If payment is finished, complete the transaction and credit user
      if (paymentStatus.payment_status === 'finished') {
        // Find the transaction in database
        const transaction = await storage.getCryptoTransactionByPaymentId(paymentId);
        
        if (transaction && transaction.userId === userId && transaction.status !== 'completed') {
          // Update transaction status to completed
          await storage.updateCryptoTransactionStatus(transaction.id, 'completed');

          // Credit user balance - convert to Gold Coins (10,000 coins per $1 USD)
          const usdAmount = transaction.usdAmount || transaction.amount;
          const goldCoinsAmount = usdAmount * 10000; // $5 = 50,000 coins, $20 = 200,000 coins
          
          // Get current balance and update
          const currentBalance = await storage.getBalance(userId);
          if (currentBalance) {
            await storage.updateBalance(
              userId,
              currentBalance.available + goldCoinsAmount,
              currentBalance.locked
            );
            
            // Create transaction record
            await storage.createTransaction({
              userId,
              type: 'DEPOSIT',
              amount: goldCoinsAmount,
              meta: {
                currency: transaction.currency.toUpperCase(),
                usdAmount,
                description: `Gold Coins from crypto purchase (${transaction.currency.toUpperCase()})`
              }
            });
          }

          // Broadcast balance update
          if ((global as any).broadcastToUser) {
            (global as any).broadcastToUser(userId, {
              type: 'balance_update',
              balance: await storage.getUserBalance(userId)
            });
          }
        }
      }

      res.json({
        success: true,
        status: paymentStatus.payment_status,
        paymentData: paymentStatus
      });
    } catch (error) {
      console.error('Error getting payment status:', error);
      res.status(500).json({ error: 'Failed to get payment status' });
    }
  });

  // Check instant withdrawal eligibility
  app.get('/api/crypto/instant-withdrawal/eligibility', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const amount = parseFloat(req.query.amount as string || '0');
      
      const eligibility = await checkInstantWithdrawalEligibility(userId, amount);
      
      res.json({
        isEligible: eligibility.isEligible,
        riskScore: eligibility.riskScore,
        reasons: eligibility.reasons,
        maxInstantAmount: eligibility.maxInstantAmount
      });
    } catch (error) {
      console.error('Error checking instant withdrawal eligibility:', error);
      res.status(500).json({ error: 'Failed to check eligibility' });
    }
  });

  // ==============================================
  // BICONOMY SMART ACCOUNT ROUTES
  // ==============================================

  // Get Biconomy status
  app.get('/api/biconomy/status', (req, res) => {
    try {
      const status = biconomyService.getStatus();
      res.json(status);
    } catch (error) {
      console.error('Error getting Biconomy status:', error);
      res.status(500).json({ error: 'Failed to get Biconomy status' });
    }
  });

  // Create smart account for current user
  app.post('/api/biconomy/create-smart-account', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Use Telegram ID if available, otherwise use user ID
      const identifierToUse = user.telegramId || userId;
      
      const smartAccount = await biconomyService.createSmartAccountForTelegramUser(String(identifierToUse));
      
      if (!smartAccount) {
        return res.status(500).json({ 
          error: 'Failed to create smart account',
          message: 'Biconomy may not be configured. Check BICONOMY_BUNDLER_URL and BICONOMY_PAYMASTER_URL environment variables.'
        });
      }

      const smartAccountAddress = await smartAccount.getAccountAddress();
      
      res.json({
        success: true,
        smartAccountAddress,
        message: 'Smart account created successfully'
      });
    } catch (error) {
      console.error('Error creating smart account:', error);
      res.status(500).json({ 
        error: 'Failed to create smart account',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get smart account address for current user
  app.get('/api/biconomy/smart-account-address', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const identifierToUse = user.telegramId || userId;
      const address = await biconomyService.getSmartAccountAddress(String(identifierToUse));
      
      if (!address) {
        return res.status(500).json({ error: 'Failed to get smart account address' });
      }

      res.json({
        success: true,
        smartAccountAddress: address
      });
    } catch (error) {
      console.error('Error getting smart account address:', error);
      res.status(500).json({ error: 'Failed to get smart account address' });
    }
  });
}
