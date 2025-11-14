import { Request, Response, NextFunction } from 'express';
import { JurisdictionChecker } from '../geofencing/jurisdiction-checker';

export interface GeofencingRequest extends Request {
  jurisdiction?: {
    allowed: boolean;
    location?: any;
    restrictions?: any;
    reason?: string;
  };
}

/**
 * Middleware to check jurisdiction and geofencing restrictions
 * This middleware adds jurisdiction data to the request object
 */
export const geofencingMiddleware = async (req: GeofencingRequest, res: Response, next: NextFunction) => {
  try {
    // Perform jurisdiction check
    const jurisdictionResult = await JurisdictionChecker.performJurisdictionCheck(req);
    
    // Add jurisdiction data to request
    req.jurisdiction = {
      allowed: jurisdictionResult.allowed,
      location: jurisdictionResult.location,
      restrictions: jurisdictionResult.restrictions,
      reason: jurisdictionResult.reason
    };
    
    // Log jurisdiction check for audit purposes
    console.log(`Jurisdiction check: ${req.jurisdiction.location?.country || 'Unknown'} - ${req.jurisdiction.allowed ? 'ALLOWED' : 'BLOCKED'}`);
    
    next();
  } catch (error) {
    console.error('Error in geofencing middleware:', error);
    
    // On error, default to allowing but log the issue
    req.jurisdiction = {
      allowed: true,
      location: { country: 'Unknown', countryCode: 'XX' },
      reason: 'Geofencing check failed - defaulting to allowed'
    };
    
    next();
  }
};

/**
 * Middleware to enforce jurisdiction restrictions for gaming endpoints
 * This middleware blocks access if the jurisdiction is not allowed
 */
export const enforceJurisdiction = (req: GeofencingRequest, res: Response, next: NextFunction) => {
  if (!req.jurisdiction) {
    // If geofencing middleware hasn't run, run it now
    return geofencingMiddleware(req, res, next);
  }
  
  if (!req.jurisdiction.allowed) {
    return res.status(403).json({
      error: 'Access Restricted',
      message: 'Gaming is not available in your jurisdiction',
      reason: req.jurisdiction.reason,
      location: req.jurisdiction.location,
      code: 'JURISDICTION_RESTRICTED'
    });
  }
  
  next();
};

/**
 * Middleware to check betting limits based on jurisdiction
 */
export const checkBettingLimits = (req: GeofencingRequest, res: Response, next: NextFunction) => {
  if (!req.jurisdiction) {
    return next();
  }
  
  const { restrictions } = req.jurisdiction;
  if (!restrictions) {
    return next();
  }
  
  // Check bet amount against jurisdiction limits
  const betAmount = req.body.amount || req.body.bet || req.query.amount;
  if (betAmount && restrictions.maxBet && parseFloat(betAmount) > restrictions.maxBet) {
    return res.status(400).json({
      error: 'Bet Limit Exceeded',
      message: `Maximum bet amount for your jurisdiction is ${restrictions.maxBet}`,
      maxBet: restrictions.maxBet,
      location: req.jurisdiction.location,
      code: 'BET_LIMIT_EXCEEDED'
    });
  }
  
  // Check deposit amount against jurisdiction limits
  const depositAmount = req.body.depositAmount || req.body.deposit;
  if (depositAmount && restrictions.maxDeposit && parseFloat(depositAmount) > restrictions.maxDeposit) {
    return res.status(400).json({
      error: 'Deposit Limit Exceeded',
      message: `Maximum deposit amount for your jurisdiction is ${restrictions.maxDeposit}`,
      maxDeposit: restrictions.maxDeposit,
      location: req.jurisdiction.location,
      code: 'DEPOSIT_LIMIT_EXCEEDED'
    });
  }
  
  next();
};

/**
 * Middleware to check KYC requirements
 */
export const checkKYCRequirement = (req: GeofencingRequest, res: Response, next: NextFunction) => {
  if (!req.jurisdiction) {
    return next();
  }
  
  const { restrictions } = req.jurisdiction;
  if (!restrictions?.requiresKYC) {
    return next();
  }
  
  // Check if user has completed KYC (this would need to be implemented in user data)
  // For now, we'll add a header to indicate KYC is required
  res.setHeader('X-KYC-Required', 'true');
  res.setHeader('X-KYC-Message', 'KYC verification required for your jurisdiction');
  
  next();
};

/**
 * Combined middleware for gaming endpoints that need full jurisdiction checking
 */
export const fullJurisdictionCheck = [
  geofencingMiddleware,
  enforceJurisdiction,
  checkBettingLimits,
  checkKYCRequirement
];

/**
 * Lightweight middleware for basic jurisdiction checking without restrictions
 */
export const basicJurisdictionCheck = [
  geofencingMiddleware
];