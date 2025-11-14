import crypto from 'crypto';

// Mock exchange rates - in production, these would come from real APIs
const EXCHANGE_RATES = {
  BTC: 65000,    // 1 BTC = 65000 credits
  ETH: 3500,     // 1 ETH = 3500 credits  
  USDT: 1,       // 1 USDT = 1 credit
  LTC: 150,      // 1 LTC = 150 credits
  DOGE: 0.1      // 1 DOGE = 0.1 credits
};

export interface ExchangeRate {
  currency: string;
  rate: number;
  lastUpdated: Date;
}

export interface ExchangeEstimate {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  validUntil: Date;
}

export interface WalletKeys {
  address: string;
  privateKey: string;
}

// Get all supported exchange rates
export async function getAllExchangeRates(): Promise<Record<string, ExchangeRate>> {
  const rates: Record<string, ExchangeRate> = {};
  
  for (const [currency, rate] of Object.entries(EXCHANGE_RATES)) {
    rates[currency] = {
      currency,
      rate,
      lastUpdated: new Date()
    };
  }
  
  return rates;
}

// Get exchange rate for a specific currency  
export async function getExchangeRate(currency: string): Promise<number | null> {
  const rate = EXCHANGE_RATES[currency as keyof typeof EXCHANGE_RATES];
  return rate || null;
}

// Get exchange estimate between two currencies
export async function getExchangeEstimate(
  fromCurrency: string, 
  toCurrency: string, 
  amount: number
): Promise<ExchangeEstimate> {
  const fromRate = EXCHANGE_RATES[fromCurrency as keyof typeof EXCHANGE_RATES] || 1;
  const toRate = EXCHANGE_RATES[toCurrency as keyof typeof EXCHANGE_RATES] || 1;
  
  const exchangeRate = fromRate / toRate;
  const toAmount = amount * exchangeRate;
  
  return {
    fromCurrency,
    toCurrency,
    fromAmount: amount,
    toAmount,
    rate: exchangeRate,
    validUntil: new Date(Date.now() + 5 * 60 * 1000) // Valid for 5 minutes
  };
}

// Generate wallet address for currency (mock implementation)
export async function generateWalletForCurrency(currency: string): Promise<WalletKeys> {
  // Generate a mock wallet address and private key
  const privateKey = crypto.randomBytes(32).toString('hex');
  let address: string;
  
  switch (currency.toUpperCase()) {
    case 'BTC':
      // Mock Bitcoin address (testnet format)
      address = '2N' + crypto.randomBytes(16).toString('hex').substring(0, 32);
      break;
    case 'ETH':
      // Mock Ethereum address
      address = '0x' + crypto.randomBytes(20).toString('hex');
      break;
    case 'USDT':
      // Mock USDT address (Ethereum-based)
      address = '0x' + crypto.randomBytes(20).toString('hex');
      break;
    case 'LTC':
      // Mock Litecoin address
      address = 'L' + crypto.randomBytes(16).toString('hex').substring(0, 32);
      break;
    case 'DOGE':
      // Mock Dogecoin address
      address = 'D' + crypto.randomBytes(16).toString('hex').substring(0, 32);
      break;
    default:
      throw new Error(`Unsupported currency: ${currency}`);
  }
  
  return { address, privateKey };
}

// Encrypt private key for storage
export async function encryptPrivateKey(privateKey: string): Promise<string> {
  const encryptionKey = process.env.WALLET_ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('WALLET_ENCRYPTION_KEY must be set in production');
    }
    console.warn('⚠️  WALLET_ENCRYPTION_KEY not set - using insecure fallback');
  }
  
  const effectiveKey = encryptionKey || 'dev-insecure-wallet-key-change-in-production';
  const cipher = crypto.createCipher('aes-256-cbc', effectiveKey);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// Decrypt private key for use
export async function decryptPrivateKey(encryptedPrivateKey: string): Promise<string> {
  const encryptionKey = process.env.WALLET_ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('WALLET_ENCRYPTION_KEY must be set in production');
    }
  }
  
  const effectiveKey = encryptionKey || 'dev-insecure-wallet-key-change-in-production';
  const decipher = crypto.createDecipher('aes-256-cbc', effectiveKey);
  let decrypted = decipher.update(encryptedPrivateKey, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Validate cryptocurrency address format
export function validateCryptoAddress(address: string, currency: string): boolean {
  switch (currency.toUpperCase()) {
    case 'BTC':
      return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$|^[2][a-km-zA-HJ-NP-Z1-9]{33}$/.test(address);
    case 'ETH':
    case 'USDT':
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    case 'LTC':
      return /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$|^ltc1[a-z0-9]{39,59}$/.test(address);
    case 'DOGE':
      return /^D{1}[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}$/.test(address);
    default:
      return false;
  }
}

// Calculate network fee for transaction
export async function calculateNetworkFee(currency: string, amount: number): Promise<number> {
  // Mock network fees (in the same currency)
  const baseFees = {
    BTC: 0.0001,   // 0.0001 BTC
    ETH: 0.002,    // 0.002 ETH
    USDT: 5,       // 5 USDT
    LTC: 0.001,    // 0.001 LTC
    DOGE: 1        // 1 DOGE
  };
  
  return baseFees[currency as keyof typeof baseFees] || 0;
}