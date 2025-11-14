interface LocationData {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  ip: string;
  timezone: string;
  isVPN?: boolean;
  riskScore?: number;
  org?: string;
  asn?: string;
}

interface JurisdictionRule {
  country: string;
  countryCode: string;
  allowed: boolean;
  reason?: string;
  restrictions?: {
    maxBet?: number;
    maxDeposit?: number;
    allowedGames?: string[];
    requiresKYC?: boolean;
  };
}

// Comprehensive jurisdiction rules based on global gambling laws
const JURISDICTION_RULES: JurisdictionRule[] = [
  // Allowed jurisdictions
  { country: 'United Kingdom', countryCode: 'GB', allowed: true },
  { country: 'Canada', countryCode: 'CA', allowed: true },
  { country: 'Germany', countryCode: 'DE', allowed: true, restrictions: { maxBet: 1000, requiresKYC: true } },
  { country: 'Netherlands', countryCode: 'NL', allowed: true, restrictions: { requiresKYC: true } },
  { country: 'Malta', countryCode: 'MT', allowed: true },
  { country: 'Gibraltar', countryCode: 'GI', allowed: true },
  { country: 'Cyprus', countryCode: 'CY', allowed: true },
  { country: 'Estonia', countryCode: 'EE', allowed: true },
  { country: 'Denmark', countryCode: 'DK', allowed: true, restrictions: { requiresKYC: true } },
  { country: 'Sweden', countryCode: 'SE', allowed: true, restrictions: { requiresKYC: true } },
  { country: 'Finland', countryCode: 'FI', allowed: true, restrictions: { requiresKYC: true } },
  { country: 'Norway', countryCode: 'NO', allowed: true, restrictions: { requiresKYC: true } },
  { country: 'Austria', countryCode: 'AT', allowed: true, restrictions: { requiresKYC: true } },
  { country: 'Switzerland', countryCode: 'CH', allowed: true, restrictions: { requiresKYC: true } },
  { country: 'Portugal', countryCode: 'PT', allowed: true, restrictions: { requiresKYC: true } },
  { country: 'Spain', countryCode: 'ES', allowed: true, restrictions: { requiresKYC: true } },
  { country: 'Italy', countryCode: 'IT', allowed: true, restrictions: { requiresKYC: true } },
  { country: 'Czech Republic', countryCode: 'CZ', allowed: true },
  { country: 'Poland', countryCode: 'PL', allowed: true },
  { country: 'Romania', countryCode: 'RO', allowed: true },
  { country: 'Bulgaria', countryCode: 'BG', allowed: true },
  { country: 'Croatia', countryCode: 'HR', allowed: true },
  { country: 'Slovenia', countryCode: 'SI', allowed: true },
  { country: 'Slovakia', countryCode: 'SK', allowed: true },
  { country: 'Lithuania', countryCode: 'LT', allowed: true },
  { country: 'Latvia', countryCode: 'LV', allowed: true },
  { country: 'Ireland', countryCode: 'IE', allowed: true },
  { country: 'Luxembourg', countryCode: 'LU', allowed: true },
  { country: 'Belgium', countryCode: 'BE', allowed: true, restrictions: { requiresKYC: true } },
  { country: 'Australia', countryCode: 'AU', allowed: true, restrictions: { requiresKYC: true } },
  { country: 'New Zealand', countryCode: 'NZ', allowed: true },
  { country: 'Japan', countryCode: 'JP', allowed: true, restrictions: { maxBet: 500, requiresKYC: true } },
  { country: 'South Korea', countryCode: 'KR', allowed: true, restrictions: { maxBet: 300, requiresKYC: true } },
  { country: 'Brazil', countryCode: 'BR', allowed: true },
  { country: 'Argentina', countryCode: 'AR', allowed: true },
  { country: 'Chile', countryCode: 'CL', allowed: true },
  { country: 'Colombia', countryCode: 'CO', allowed: true },
  { country: 'Peru', countryCode: 'PE', allowed: true },
  { country: 'Mexico', countryCode: 'MX', allowed: true },
  { country: 'South Africa', countryCode: 'ZA', allowed: true },
  { country: 'Kenya', countryCode: 'KE', allowed: true },
  { country: 'Nigeria', countryCode: 'NG', allowed: true },
  { country: 'Ghana', countryCode: 'GH', allowed: true },
  { country: 'Thailand', countryCode: 'TH', allowed: true },
  { country: 'Malaysia', countryCode: 'MY', allowed: true },
  { country: 'Philippines', countryCode: 'PH', allowed: true },
  { country: 'Indonesia', countryCode: 'ID', allowed: true },
  { country: 'Vietnam', countryCode: 'VN', allowed: true },
  { country: 'Hong Kong', countryCode: 'HK', allowed: true },
  { country: 'Taiwan', countryCode: 'TW', allowed: true },
  { country: 'Macau', countryCode: 'MO', allowed: true },
  { country: 'Iceland', countryCode: 'IS', allowed: true },
  { country: 'Liechtenstein', countryCode: 'LI', allowed: true },
  { country: 'Monaco', countryCode: 'MC', allowed: true },
  { country: 'San Marino', countryCode: 'SM', allowed: true },
  { country: 'Andorra', countryCode: 'AD', allowed: true },
  { country: 'Georgia', countryCode: 'GE', allowed: true },
  { country: 'Armenia', countryCode: 'AM', allowed: true },
  { country: 'Moldova', countryCode: 'MD', allowed: true },

  { country: 'Ukraine', countryCode: 'UA', allowed: true },
  { country: 'Serbia', countryCode: 'RS', allowed: true },
  { country: 'Montenegro', countryCode: 'ME', allowed: true },
  { country: 'Bosnia and Herzegovina', countryCode: 'BA', allowed: true },
  { country: 'North Macedonia', countryCode: 'MK', allowed: true },
  { country: 'Albania', countryCode: 'AL', allowed: true },
  { country: 'Kosovo', countryCode: 'XK', allowed: true },

  // United States - Now allowed for development/testing
  { 
    country: 'United States', 
    countryCode: 'US', 
    allowed: true 
  },
  { 
    country: 'France', 
    countryCode: 'FR', 
    allowed: false, 
    reason: 'French gambling laws restrict unlicensed online gambling operators.' 
  },
  { 
    country: 'Turkey', 
    countryCode: 'TR', 
    allowed: false, 
    reason: 'Online gambling is prohibited under Turkish law.' 
  },
  { 
    country: 'Singapore', 
    countryCode: 'SG', 
    allowed: false, 
    reason: 'Singapore has strict gambling regulations that prohibit unlicensed online gambling.' 
  },
  { 
    country: 'China', 
    countryCode: 'CN', 
    allowed: false, 
    reason: 'All forms of online gambling are prohibited in China.' 
  },
  { 
    country: 'Iran', 
    countryCode: 'IR', 
    allowed: false, 
    reason: 'Online gambling is prohibited under Iranian law.' 
  },
  { 
    country: 'Saudi Arabia', 
    countryCode: 'SA', 
    allowed: false, 
    reason: 'All forms of gambling are prohibited under Saudi Arabian law.' 
  },
  { 
    country: 'United Arab Emirates', 
    countryCode: 'AE', 
    allowed: false, 
    reason: 'Online gambling is prohibited under UAE law.' 
  },
  { 
    country: 'Pakistan', 
    countryCode: 'PK', 
    allowed: false, 
    reason: 'Online gambling is prohibited under Pakistani law.' 
  },
  { 
    country: 'Bangladesh', 
    countryCode: 'BD', 
    allowed: false, 
    reason: 'Online gambling is prohibited under Bangladeshi law.' 
  },
  { 
    country: 'Afghanistan', 
    countryCode: 'AF', 
    allowed: false, 
    reason: 'All forms of gambling are prohibited under Afghan law.' 
  },
  { 
    country: 'North Korea', 
    countryCode: 'KP', 
    allowed: false, 
    reason: 'Online gambling is prohibited under North Korean law.' 
  },
  { 
    country: 'Myanmar', 
    countryCode: 'MM', 
    allowed: false, 
    reason: 'Online gambling is prohibited under Myanmar law.' 
  },
  { 
    country: 'Israel', 
    countryCode: 'IL', 
    allowed: false, 
    reason: 'Online gambling is heavily restricted under Israeli law.' 
  },
  { 
    country: 'India', 
    countryCode: 'IN', 
    allowed: false, 
    reason: 'Online gambling laws vary by state in India, with most prohibiting real money gambling.' 
  },
  { 
    country: 'Russia', 
    countryCode: 'RU', 
    allowed: false, 
    reason: 'Online gambling is prohibited under Russian federal law.' 
  },
  { 
    country: 'Belarus', 
    countryCode: 'BY', 
    allowed: false, 
    reason: 'Online gambling is restricted under Belarusian law.' 
  },
  { 
    country: 'Kazakhstan', 
    countryCode: 'KZ', 
    allowed: false, 
    reason: 'Online gambling is prohibited under Kazakhstani law.' 
  },
  { 
    country: 'Uzbekistan', 
    countryCode: 'UZ', 
    allowed: false, 
    reason: 'All forms of gambling are prohibited under Uzbek law.' 
  }
];

export class JurisdictionChecker {
  private static readonly FALLBACK_COUNTRY = 'Unknown';
  private static readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private static locationCache = new Map<string, { data: LocationData; timestamp: number }>();

  // Get location data from IP address with VPN detection
  static async getLocationFromIP(ip: string): Promise<LocationData | null> {
    // Check cache first
    const cached = this.locationCache.get(ip);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Use ipapi.co for geolocation (free tier available)
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      
      if (!response.ok) {
        throw new Error(`Geolocation API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        console.warn(`Geolocation API error for IP ${ip}:`, data.reason);
        return null;
      }

      // Enhanced VPN detection
      const isVPN = this.detectVPN(data);
      const riskScore = this.calculateRiskScore(data, isVPN);

      const locationData: LocationData = {
        country: data.country_name || this.FALLBACK_COUNTRY,
        countryCode: data.country_code?.toUpperCase() || 'XX',
        region: data.region || '',
        city: data.city || '',
        ip: ip,
        timezone: data.timezone || '',
        isVPN,
        riskScore,
        org: data.org || '',
        asn: data.asn || ''
      };

      // Log high-risk access attempts
      if (riskScore > 0.7) {
        console.warn(`High-risk access attempt from ${ip}:`, {
          country: locationData.country,
          isVPN,
          riskScore,
          org: locationData.org
        });
      }

      // Cache the result
      this.locationCache.set(ip, {
        data: locationData,
        timestamp: Date.now()
      });

      return locationData;
    } catch (error) {
      console.error(`Error getting location for IP ${ip}:`, error);
      return null;
    }
  }

  // VPN detection based on various indicators
  static detectVPN(geoData: any): boolean {
    const vpnIndicators = [
      'vpn', 'proxy', 'hosting', 'datacenter', 'cloud', 'server',
      'amazon', 'google', 'microsoft', 'digitalocean', 'linode'
    ];
    
    const org = (geoData.org || '').toLowerCase();
    const asn = (geoData.asn || '').toLowerCase();
    
    return vpnIndicators.some(indicator => 
      org.includes(indicator) || asn.includes(indicator)
    );
  }

  // Calculate risk score based on multiple factors
  static calculateRiskScore(geoData: any, isVPN: boolean): number {
    let score = 0;

    // VPN usage increases risk
    if (isVPN) score += 0.4;

    // Check for hosting/datacenter providers
    const org = (geoData.org || '').toLowerCase();
    const suspiciousProviders = ['amazon', 'google cloud', 'microsoft', 'digitalocean'];
    if (suspiciousProviders.some(provider => org.includes(provider))) {
      score += 0.3;
    }

    // Anonymous proxies
    if (org.includes('anonymous') || org.includes('proxy')) {
      score += 0.5;
    }

    // Tor exit nodes (basic detection)
    if (org.includes('tor') || org.includes('exit')) {
      score += 0.6;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  // Check if a jurisdiction is allowed
  static checkJurisdiction(locationData: LocationData): {
    allowed: boolean;
    rule?: JurisdictionRule;
    restrictions?: JurisdictionRule['restrictions'];
  } {
    // Find matching rule
    const rule = JURISDICTION_RULES.find(r => 
      r.countryCode === locationData.countryCode ||
      r.country.toLowerCase() === locationData.country.toLowerCase()
    );

    if (!rule) {
      // If no specific rule found, allow by default but log for review
      console.log(`No jurisdiction rule found for ${locationData.country} (${locationData.countryCode})`);
      return { allowed: true };
    }

    return {
      allowed: rule.allowed,
      rule,
      restrictions: rule.restrictions
    };
  }



  // Get client IP from request headers
  static getClientIP(req: any): string {
    // Check various headers for real IP
    const forwarded = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];
    const cloudflareIP = req.headers['cf-connecting-ip'];
    
    if (forwarded) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    if (cloudflareIP) {
      return cloudflareIP;
    }
    
    // Fallback to connection remote address
    return req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           req.ip || 
           '127.0.0.1';
  }

  // Development mode bypass for testing
  static isDevelopmentMode(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  // Check if IP is local/private
  static isLocalIP(ip: string): boolean {
    const localPatterns = [
      /^127\./,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^::1$/,
      /^fe80:/,
      /^localhost$/i
    ];
    
    return localPatterns.some(pattern => pattern.test(ip));
  }

  // Main jurisdiction check function (enhanced)
  static async performJurisdictionCheck(req: any): Promise<{
    allowed: boolean;
    location?: LocationData;
    rule?: JurisdictionRule;
    restrictions?: JurisdictionRule['restrictions'];
    reason?: string;
  }> {
    try {
      const clientIP = this.getClientIP(req);
      
      // In development mode or for local IPs, allow access
      if (this.isDevelopmentMode() || this.isLocalIP(clientIP)) {
        return { 
          allowed: true, 
          location: {
            country: 'Development',
            countryCode: 'DEV',
            region: 'Local',
            city: 'Localhost',
            ip: clientIP,
            timezone: 'UTC'
          }
        };
      }

      // Get location data
      const locationData = await this.getLocationFromIP(clientIP);
      
      if (!locationData) {
        // If we can't determine location, allow but log
        console.warn(`Could not determine location for IP ${clientIP}, allowing access`);
        return { allowed: true };
      }

      // Check jurisdiction
      const jurisdictionResult = this.checkJurisdiction(locationData);
      
      return {
        allowed: jurisdictionResult.allowed,
        location: locationData,
        rule: jurisdictionResult.rule,
        restrictions: jurisdictionResult.restrictions,
        reason: jurisdictionResult.rule?.reason
      };
    } catch (error) {
      console.error('Error performing jurisdiction check:', error);
      // On error, allow access but log the issue
      return { allowed: true };
    }
  }

  // Get list of all allowed countries
  static getAllowedCountries(): string[] {
    return JURISDICTION_RULES
      .filter(rule => rule.allowed)
      .map(rule => rule.country)
      .sort();
  }

  // Get list of restricted countries
  static getRestrictedCountries(): Array<{ country: string; reason: string }> {
    return JURISDICTION_RULES
      .filter(rule => !rule.allowed)
      .map(rule => ({ country: rule.country, reason: rule.reason || 'Restricted by law' }))
      .sort((a, b) => a.country.localeCompare(b.country));
  }
}

export { LocationData, JurisdictionRule };