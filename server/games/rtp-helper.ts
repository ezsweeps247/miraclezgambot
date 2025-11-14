import { storage } from '../storage';

// Cache for RTP values to avoid excessive database queries
const rtpCache: Map<string, { value: number; timestamp: number }> = new Map();
const CACHE_DURATION = 60000; // 1 minute cache

export async function getGameRTP(gameName: string): Promise<number> {
  const cacheKey = gameName.toUpperCase();
  const cached = rtpCache.get(cacheKey);
  
  // Return cached value if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.value;
  }
  
  try {
    const settings = await storage.getGameSettings(cacheKey);
    
    if (!settings) {
      // Initialize if not exists and return default
      await storage.initializeGameSettings();
      return 96.0; // Default medium RTP
    }
    
    const rtpValue = parseFloat(settings.rtpValue);
    
    // Cache the value
    rtpCache.set(cacheKey, {
      value: rtpValue,
      timestamp: Date.now()
    });
    
    return rtpValue;
  } catch (error) {
    console.error(`Error fetching RTP for ${gameName}:`, error);
    return 96.0; // Default to medium RTP on error
  }
}

export async function getHouseEdge(gameName: string): Promise<number> {
  const rtp = await getGameRTP(gameName);
  return 100 - rtp;
}

// Clear cache when settings are updated
export function clearRTPCache(gameName?: string) {
  if (gameName) {
    rtpCache.delete(gameName.toUpperCase());
  } else {
    rtpCache.clear();
  }
}