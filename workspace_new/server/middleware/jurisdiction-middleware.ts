import { Request, Response, NextFunction } from 'express';
import { JurisdictionChecker } from '../geofencing/jurisdiction-checker';
import { storage } from '../storage';

export interface JurisdictionRequest extends Request {
  jurisdiction?: {
    allowed: boolean;
    location?: any;
    rule?: any;
    restrictions?: any;
    reason?: string;
  };
}

// Middleware to check jurisdiction for all requests
export const jurisdictionMiddleware = async (
  req: JurisdictionRequest, 
  res: Response, 
  next: NextFunction
) => {
  try {
    // Skip jurisdiction check for certain paths
    const skipPaths = [
      '/api/jurisdiction/status',
      '/api/jurisdiction/countries',
      '/api/auth/',
      '/api/me',
      '/health',
      '/api/admin', // Skip all admin routes from geolocation blocking
      '/api/login', // Skip geolocation for admin login
      '/api/verify', // Skip geolocation for admin verification
      '/api/logout', // Skip geolocation for admin logout
      '/api/stats', // Skip geolocation for admin stats
      '/api/users', // Skip geolocation for admin user management
      '/api/transactions', // Skip geolocation for admin transactions
      '/api/activity', // Skip geolocation for admin activity
      '/api/create-admin' // Skip geolocation for admin creation
    ];

    const shouldSkip = skipPaths.some(path => req.path.startsWith(path));
    if (shouldSkip) {
      return next();
    }

    // Perform jurisdiction check
    const jurisdictionResult = await JurisdictionChecker.performJurisdictionCheck(req);
    
    // Attach result to request for later use
    req.jurisdiction = jurisdictionResult;
    
    // If not allowed, return error
    if (!jurisdictionResult.allowed) {
      return res.status(403).json({
        error: 'Access Restricted',
        message: 'Your location is not permitted to access this service',
        reason: jurisdictionResult.reason,
        location: jurisdictionResult.location?.country,
        countryCode: jurisdictionResult.location?.countryCode
      });
    }

    // If allowed but has restrictions, attach them
    if (jurisdictionResult.restrictions) {
      console.log(`User from ${jurisdictionResult.location?.country} has restrictions:`, jurisdictionResult.restrictions);
    }

    next();
  } catch (error) {
    console.error('Jurisdiction middleware error:', error);
    // On error, allow access but log the issue
    next();
  }
};

// Middleware specifically for gambling-related endpoints
export const gamblingJurisdictionCheck = async (
  req: JurisdictionRequest, 
  res: Response, 
  next: NextFunction
) => {
  try {
    // If jurisdiction check hasn't been performed yet, do it now
    if (!req.jurisdiction) {
      req.jurisdiction = await JurisdictionChecker.performJurisdictionCheck(req);
    }

    if (!req.jurisdiction.allowed) {
      return res.status(403).json({
        error: 'Gambling Restricted',
        message: 'Online gambling is not permitted in your jurisdiction',
        reason: req.jurisdiction.reason,
        location: req.jurisdiction.location?.country
      });
    }

    // Check if there are betting restrictions
    if (req.jurisdiction.restrictions?.maxBet) {
      // Attach max bet limit to request for bet validation
      (req as any).maxBetLimit = req.jurisdiction.restrictions.maxBet;
    }

    next();
  } catch (error) {
    console.error('Gambling jurisdiction check error:', error);
    next();
  }
};

// Middleware to check deposit limits based on jurisdiction
export const depositJurisdictionCheck = async (
  req: JurisdictionRequest, 
  res: Response, 
  next: NextFunction
) => {
  try {
    if (!req.jurisdiction) {
      req.jurisdiction = await JurisdictionChecker.performJurisdictionCheck(req);
    }

    if (!req.jurisdiction.allowed) {
      return res.status(403).json({
        error: 'Deposits Restricted',
        message: 'Deposits are not permitted from your jurisdiction',
        reason: req.jurisdiction.reason
      });
    }

    // Check deposit limits
    if (req.jurisdiction.restrictions?.maxDeposit && req.body.amount) {
      const depositAmount = parseFloat(req.body.amount);
      if (depositAmount > req.jurisdiction.restrictions.maxDeposit) {
        return res.status(400).json({
          error: 'Deposit Limit Exceeded',
          message: `Maximum deposit amount for your jurisdiction is $${req.jurisdiction.restrictions.maxDeposit}`,
          maxAmount: req.jurisdiction.restrictions.maxDeposit
        });
      }
    }

    next();
  } catch (error) {
    console.error('Deposit jurisdiction check error:', error);
    next();
  }
};

// Helper function to validate bet amount against jurisdiction limits
export const validateBetAmount = (req: JurisdictionRequest, betAmount: number): boolean => {
  if (req.jurisdiction?.restrictions?.maxBet) {
    return betAmount <= req.jurisdiction.restrictions.maxBet;
  }
  return true;
};

// Helper function to check if KYC is required
export const isKYCRequired = (req: JurisdictionRequest): boolean => {
  return req.jurisdiction?.restrictions?.requiresKYC === true;
};