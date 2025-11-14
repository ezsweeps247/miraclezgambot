export interface ExchangeRate {
  currency: string;
  usdRate: number;
  creditsRate: number; // 1 SC = 1.0 USD
  lastUpdated: Date;
}

const CREDITS_TO_USD = 1.0; // 1 SC = 1 USD

// Cache for exchange rates
const rateCache = new Map<string, ExchangeRate>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getExchangeRate(currency: string): Promise<ExchangeRate> {
  const cacheKey = currency.toUpperCase();
  const cached = rateCache.get(cacheKey);
  
  if (cached && Date.now() - cached.lastUpdated.getTime() < CACHE_DURATION) {
    return cached;
  }

  try {
    // In production, use a reliable API like CoinGecko, CoinMarketCap, or your preferred provider
    const usdRate = await fetchCryptoPrice(currency);
    const creditsRate = usdRate / CREDITS_TO_USD;
    
    const rate: ExchangeRate = {
      currency: cacheKey,
      usdRate,
      creditsRate,
      lastUpdated: new Date()
    };
    
    rateCache.set(cacheKey, rate);
    return rate;
  } catch (error) {
    console.error(`Failed to fetch exchange rate for ${currency}:`, error);
    
    // Fallback rates (update these with real market prices)
    const fallbackRates: Record<string, number> = {
      'BTC': 45000,
      'ETH': 2800,
      'USDT': 1.00,
      'LTC': 75,
      'DOGE': 0.08
    };
    
    const usdRate = fallbackRates[cacheKey] || 1;
    const creditsRate = usdRate / CREDITS_TO_USD;
    
    return {
      currency: cacheKey,
      usdRate,
      creditsRate,
      lastUpdated: new Date()
    };
  }
}

async function fetchCryptoPrice(currency: string): Promise<number> {
  // This is a simplified implementation
  // In production, integrate with a real crypto price API
  
  const fallbackPrices: Record<string, number> = {
    'BTC': 45000,
    'ETH': 2800,
    'USDT': 1.00,
    'LTC': 75,
    'DOGE': 0.08
  };
  
  return fallbackPrices[currency.toUpperCase()] || 1;
}

export function convertCryptoToCredits(cryptoAmount: number, exchangeRate: ExchangeRate): number {
  return Math.floor(cryptoAmount * exchangeRate.creditsRate); // 1:1 USD to SC conversion
}

export function convertCreditsToCrypto(creditsAmount: number, exchangeRate: ExchangeRate): number {
  const usdAmount = creditsAmount * CREDITS_TO_USD; // 1:1 SC to USD conversion
  return usdAmount / exchangeRate.usdRate;
}

export async function getAllExchangeRates(): Promise<ExchangeRate[]> {
  const currencies = ['BTC', 'ETH', 'USDT', 'LTC', 'DOGE'];
  const rates = await Promise.all(
    currencies.map(currency => getExchangeRate(currency))
  );
  return rates;
}