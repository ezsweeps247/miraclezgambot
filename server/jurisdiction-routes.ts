import { Router } from 'express';
import { JurisdictionChecker } from './geofencing/jurisdiction-checker';

const router = Router();

// Get jurisdiction status for current IP
router.get('/status', async (req, res) => {
  try {
    const jurisdictionResult = await JurisdictionChecker.performJurisdictionCheck(req);
    
    res.json({
      allowed: jurisdictionResult.allowed,
      location: jurisdictionResult.location,
      restrictions: jurisdictionResult.restrictions,
      reason: jurisdictionResult.reason,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking jurisdiction status:', error);
    res.status(500).json({ 
      error: 'Failed to check jurisdiction status',
      allowed: true // Default to allowed on error
    });
  }
});

// Get list of allowed countries
router.get('/countries/allowed', (req, res) => {
  try {
    const allowedCountries = JurisdictionChecker.getAllowedCountries();
    res.json({
      countries: allowedCountries,
      count: allowedCountries.length
    });
  } catch (error) {
    console.error('Error getting allowed countries:', error);
    res.status(500).json({ error: 'Failed to get allowed countries' });
  }
});

// Get list of restricted countries
router.get('/countries/restricted', (req, res) => {
  try {
    const restrictedCountries = JurisdictionChecker.getRestrictedCountries();
    res.json({
      countries: restrictedCountries,
      count: restrictedCountries.length
    });
  } catch (error) {
    console.error('Error getting restricted countries:', error);
    res.status(500).json({ error: 'Failed to get restricted countries' });
  }
});

// Check specific IP address (admin only)
router.post('/check-ip', async (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    // Create a mock request object with the provided IP
    const mockReq = {
      headers: { 'x-forwarded-for': ip },
      connection: { remoteAddress: ip },
      ip: ip
    };

    const jurisdictionResult = await JurisdictionChecker.performJurisdictionCheck(mockReq);
    
    res.json({
      ip,
      allowed: jurisdictionResult.allowed,
      location: jurisdictionResult.location,
      restrictions: jurisdictionResult.restrictions,
      reason: jurisdictionResult.reason,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking IP jurisdiction:', error);
    res.status(500).json({ error: 'Failed to check IP jurisdiction' });
  }
});

// Get jurisdiction statistics
router.get('/stats', async (req, res) => {
  try {
    const allowedCountries = JurisdictionChecker.getAllowedCountries();
    const restrictedCountries = JurisdictionChecker.getRestrictedCountries();
    
    res.json({
      totalCountries: allowedCountries.length + restrictedCountries.length,
      allowedCount: allowedCountries.length,
      restrictedCount: restrictedCountries.length,
      coverage: {
        allowed: allowedCountries,
        restricted: restrictedCountries.map(c => c.country)
      }
    });
  } catch (error) {
    console.error('Error getting jurisdiction stats:', error);
    res.status(500).json({ error: 'Failed to get jurisdiction statistics' });
  }
});

export default router;