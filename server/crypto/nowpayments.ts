import NOWPaymentsApi from '@nowpaymentsio/nowpayments-api-js';
import crypto from 'crypto';

if (!process.env.NOWPAYMENTS_API_KEY) {
  console.warn('NOWPAYMENTS_API_KEY environment variable not set. Crypto payments will be disabled.');
}

const nowPayments = process.env.NOWPAYMENTS_API_KEY 
  ? new NOWPaymentsApi({ apiKey: process.env.NOWPAYMENTS_API_KEY }) 
  : null;

export interface CryptoPayment {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal';
  currency: string;
  amount: number;
  status: 'pending' | 'waiting' | 'confirming' | 'confirmed' | 'sending' | 'partially_paid' | 'finished' | 'failed' | 'refunded' | 'expired';
  paymentId?: string;
  paymentUrl?: string;
  address?: string;
  actuallyPaid?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface SupportedCurrency {
  currency: string;
  name: string;
  logo: string;
  minDeposit: number;
  network?: string;
}

export class NOWPaymentsService {
  private static instance: NOWPaymentsService;

  private constructor() {}

  public static getInstance(): NOWPaymentsService {
    if (!NOWPaymentsService.instance) {
      NOWPaymentsService.instance = new NOWPaymentsService();
    }
    return NOWPaymentsService.instance;
  }

  // Get supported currencies for the casino
  public async getSupportedCurrencies(): Promise<SupportedCurrency[]> {
    try {
      if (!nowPayments) {
        throw new Error('NOWPayments not initialized');
      }
      const response = await nowPayments.getCurrencies();
      
      // Filter to only show major cryptocurrencies suitable for gaming
      const supportedCurrencies = [
        { currency: 'btc', name: 'Bitcoin', logo: '₿', minDeposit: 0.0001, network: 'Bitcoin' },
        { currency: 'eth', name: 'Ethereum', logo: 'Ξ', minDeposit: 0.001, network: 'Ethereum' },
        { currency: 'usdt', name: 'Tether USD', logo: '₮', minDeposit: 1, network: 'TRC20' },
        { currency: 'ltc', name: 'Litecoin', logo: 'Ł', minDeposit: 0.01, network: 'Litecoin' },
        { currency: 'doge', name: 'Dogecoin', logo: 'Ð', minDeposit: 10, network: 'Dogecoin' },
        { currency: 'ada', name: 'Cardano', logo: '₳', minDeposit: 1, network: 'Cardano' },
        { currency: 'matic', name: 'Polygon', logo: '◈', minDeposit: 1, network: 'Polygon' },
        { currency: 'trx', name: 'TRON', logo: 'TRX', minDeposit: 10, network: 'TRON' }
      ];

      // Validate currencies are actually supported by NOWPayments
      const availableCurrencies = Array.isArray(response) ? response : [];
      return supportedCurrencies.filter(curr => 
        availableCurrencies.includes(curr.currency.toUpperCase()) || 
        availableCurrencies.includes(curr.currency.toLowerCase())
      );
    } catch (error) {
      console.error('Error fetching supported currencies:', error);
      // Return default currencies if API call fails
      return [
        { currency: 'btc', name: 'Bitcoin', logo: '₿', minDeposit: 0.0001, network: 'Bitcoin' },
        { currency: 'eth', name: 'Ethereum', logo: 'Ξ', minDeposit: 0.001, network: 'Ethereum' },
        { currency: 'usdt', name: 'Tether USD', logo: '₮', minDeposit: 1, network: 'TRC20' },
        { currency: 'ltc', name: 'Litecoin', logo: 'Ł', minDeposit: 0.01, network: 'Litecoin' },
        { currency: 'doge', name: 'Dogecoin', logo: 'Ð', minDeposit: 10, network: 'Dogecoin' }
      ];
    }
  }

  // Create a deposit payment
  public async createDeposit(userId: string, currency: string, usdAmount: number): Promise<CryptoPayment> {
    try {
      if (!nowPayments) {
        // Development mode - create demo payment
        console.log('Creating demo payment (development mode)');
        return this.createDemoDeposit(userId, currency, usdAmount);
      }
      const paymentData = {
        price_amount: usdAmount,
        price_currency: 'usd',
        pay_currency: currency.toLowerCase(),
        order_id: `deposit_${userId}_${Date.now()}`,
        order_description: `214DF Casino Deposit - ${currency.toUpperCase()}`,
        ipn_callback_url: `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost'}/api/crypto/webhook`,
        success_url: `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost'}/wallet?success=true`,
        cancel_url: `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost'}/wallet?cancelled=true`
      };

      const payment = await nowPayments.createPayment(paymentData);

      if (!payment || typeof payment === 'object' && 'error' in payment) {
        throw new Error('Failed to create payment with NOWPayments');
      }

      // NOWPayments returns different fields based on payment type
      // For hosted checkout: payment_url
      // For invoice: invoice_url
      // For direct payment: pay_address
      const paymentUrl = (payment as any).payment_url || 
                        (payment as any).invoice_url || 
                        (payment as any).pay_address || 
                        `https://nowpayments.io/payment/${(payment as any).payment_id}`;
      
      const paymentAddress = (payment as any).pay_address || 
                            (payment as any).payin_address || 
                            'pending'; // Address will be provided via webhook

      const paymentObject = {
        id: crypto.randomUUID(),
        userId,
        type: 'deposit' as const,
        currency: currency.toLowerCase(),
        amount: parseFloat((payment as any).pay_amount || usdAmount.toString()),
        status: (payment as any).payment_status || 'waiting',
        paymentId: (payment as any).payment_id?.toString() || (payment as any).id?.toString(),
        paymentUrl: paymentUrl,
        address: paymentAddress,
        createdAt: new Date()
      };

      return paymentObject;
    } catch (error) {
      console.error('Error creating deposit:', error);
      throw new Error('Failed to create crypto deposit');
    }
  }

  // Create a demo deposit for development mode
  private createDemoDeposit(userId: string, currency: string, usdAmount: number): CryptoPayment {
    const demoPaymentId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const demoAddress = this.generateDemoAddress(currency);
    
    return {
      id: crypto.randomUUID(),
      userId,
      type: 'deposit' as const,
      currency: currency.toLowerCase(),
      amount: usdAmount, // In demo mode, just use USD amount
      status: 'waiting',
      paymentId: demoPaymentId,
      paymentUrl: `https://demo-payment.miraclez.com/pay/${demoPaymentId}`,
      address: demoAddress,
      createdAt: new Date()
    };
  }

  // Generate a demo wallet address for testing
  private generateDemoAddress(currency: string): string {
    const addressFormats: Record<string, string> = {
      btc: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      eth: '0x742d35Cc6639C0532fEb2161D9e9e3E1234567890',
      usdt: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      ltc: 'LdP8Qox1VAhCzLJNqrr74YovaWYyNBUWvL',
      doge: 'DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L'
    };
    
    return addressFormats[currency.toLowerCase()] || `demo_${currency.toUpperCase()}_address_123456789`;
  }

  // Check if a demo payment should be considered completed (auto-complete after 10 seconds for demo)
  private isDemoPaymentCompleted(paymentId: string): boolean {
    if (!paymentId.startsWith('demo_')) return false;
    
    // Extract timestamp from demo payment ID
    const timestampMatch = paymentId.match(/demo_(\d+)_/);
    if (!timestampMatch) return false;
    
    const createdTime = parseInt(timestampMatch[1]);
    const now = Date.now();
    const tenSecondsLater = createdTime + 10000; // 10 seconds auto-complete for demo
    
    return now >= tenSecondsLater;
  }

  // Get payment status
  public async getPaymentStatus(paymentId: string): Promise<any> {
    try {
      if (!nowPayments) {
        // Development mode - return demo status
        console.log('Getting demo payment status (development mode)');
        
        // Check if this demo payment was manually completed
        const isManuallyCompleted = this.isDemoPaymentCompleted(paymentId);
        
        return {
          payment_id: paymentId,
          payment_status: isManuallyCompleted ? 'finished' : (paymentId.startsWith('demo_') ? 'waiting' : 'pending'),
          pay_address: this.generateDemoAddress('usdt'),
          price_amount: 50,
          price_currency: 'usd',
          pay_amount: 50,
          pay_currency: 'usdt',
          order_id: `order_${paymentId}`,
          order_description: 'Demo Payment'
        };
      }
      return await nowPayments.getPaymentStatus({ payment_id: paymentId });
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw new Error('Failed to get payment status');
    }
  }

  // Get estimated price for conversion
  public async getEstimatedPrice(fromCurrency: string, toCurrency: string, amount: number): Promise<number> {
    try {
      if (!nowPayments) {
        throw new Error('NOWPayments not initialized - API key required');
      }
      const response = await nowPayments.getEstimatePrice({
        amount,
        currency_from: fromCurrency.toLowerCase(),
        currency_to: toCurrency.toLowerCase()
      });
      
      // Check if response is an error
      if (!response || typeof response === 'object' && 'error' in response) {
        console.error('Estimate price error:', response);
        return amount; // Return original amount as fallback
      }
      
      return parseFloat((response as any).estimated_amount || amount.toString());
    } catch (error) {
      console.error('Error getting estimated price:', error);
      throw new Error('Failed to get price estimate');
    }
  }

  // Create a withdrawal (payout)
  public async createWithdrawal(
    userId: string, 
    currency: string, 
    amount: number, 
    address: string
  ): Promise<CryptoPayment> {
    try {
      const payoutData = {
        withdrawals: [{
          address,
          currency: currency.toLowerCase(),
          amount: amount,
          ipn_callback_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost'}/api/crypto/payout-webhook`,
          extra_id: `withdrawal_${userId}_${Date.now()}`
        }]
      };

      // NOWPayments npm package doesn't have createPayout method
      // Mock the response for now - actual implementation would need direct API call
      const withdrawal = {
        id: crypto.randomUUID(),
        status: 'pending'
      };

      return {
        id: withdrawal.id.toString(),
        userId,
        type: 'withdrawal',
        currency: currency.toLowerCase(),
        amount,
        status: withdrawal.status as any,
        address,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error creating withdrawal:', error);
      throw new Error('Failed to create crypto withdrawal');
    }
  }

  // Validate crypto address
  public async validateAddress(currency: string, address: string): Promise<boolean> {
    try {
      // Basic validation patterns for major cryptocurrencies
      const patterns: { [key: string]: RegExp } = {
        btc: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/,
        eth: /^0x[a-fA-F0-9]{40}$/,
        usdt: /^T[A-Za-z1-9]{33}$|^0x[a-fA-F0-9]{40}$/,
        ltc: /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$|^ltc1[a-z0-9]{39,59}$/,
        doge: /^D{1}[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}$/,
        ada: /^addr1[a-z0-9]{98}$/,
        matic: /^0x[a-fA-F0-9]{40}$/,
        trx: /^T[A-Za-z1-9]{33}$/
      };

      const pattern = patterns[currency.toLowerCase()];
      if (!pattern) {
        return false;
      }

      return pattern.test(address);
    } catch (error) {
      console.error('Error validating address:', error);
      return false;
    }
  }

  // Get minimum payout amount
  public async getMinimumPayout(currency: string): Promise<number> {
    try {
      if (!nowPayments) {
        throw new Error('NOWPayments not initialized - API key required');
      }
      const response = await nowPayments.getMinimumPaymentAmount({
        currency_from: currency.toLowerCase(),
        currency_to: 'usd'
      });
      return parseFloat((response as any).min_amount || '10');
    } catch (error) {
      console.error('Error getting minimum payout:', error);
      // Return default minimums
      const defaults: { [key: string]: number } = {
        btc: 0.001,
        eth: 0.01,
        usdt: 10,
        ltc: 0.1,
        doge: 50,
        ada: 10,
        matic: 10,
        trx: 100
      };
      return defaults[currency.toLowerCase()] || 1;
    }
  }
}

export const nowPaymentsService = NOWPaymentsService.getInstance();