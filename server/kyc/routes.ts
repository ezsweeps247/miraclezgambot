import { Router } from 'express';
import { z } from 'zod';
import { kycService } from './service';
import { authenticateJWT, type AuthenticatedRequest } from '../auth';
import { storage } from '../storage';
import { ObjectStorageService } from '../objectStorage';

const router = Router();
const objectStorage = new ObjectStorageService();

// Validation schemas
const personalInfoSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().min(1),
  nationality: z.string().min(2),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(2),
  }),
});

const documentUploadSchema = z.object({
  documentType: z.enum(['PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID', 'PROOF_OF_ADDRESS', 'BANK_STATEMENT', 'UTILITY_BILL']),
  documentURL: z.string(),
  metadata: z.object({
    documentNumber: z.string().optional(),
    expiryDate: z.string().optional(),
    issuingCountry: z.string().optional(),
  }).optional(),
});

const documentReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNotes: z.string().optional(),
});

// Get KYC status
router.get('/status', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    let kycStatus = await kycService.getKycStatus(userId);
    
    if (!kycStatus) {
      // Initialize KYC for new users
      kycStatus = await kycService.initiateKycVerification(userId);
    }
    
    const documents = await storage.getKycDocumentsByVerification(kycStatus.id);
    
    res.json({
      success: true,
      status: kycStatus.status,
      riskLevel: kycStatus.riskLevel,
      jurisdiction: kycStatus.jurisdiction,
      requiredDocuments: kycStatus.requiredDocuments || [],
      submittedDocuments: kycStatus.submittedDocuments || [],
      documents: documents.map(doc => ({
        id: doc.id,
        type: doc.documentType,
        status: doc.status,
        uploadedAt: doc.uploadedAt,
        reviewNotes: doc.reviewNotes
      })),
      reviewNotes: kycStatus.reviewNotes
    });
  } catch (error) {
    console.error('Error getting KYC status:', error);
    res.status(500).json({ success: false, message: 'Failed to get KYC status' });
  }
});

// Submit personal information
router.post('/personal-info', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const personalInfo = personalInfoSchema.parse(req.body);
    
    // Get or create KYC verification
    let verification = await kycService.getKycStatus(userId);
    if (!verification) {
      // Determine jurisdiction from address
      const jurisdiction = personalInfo.address.country;
      verification = await kycService.initiateKycVerification(userId, jurisdiction);
    }
    
    // Update verification with personal info
    await storage.updateKycVerification(verification.id, {
      personalInfo,
      jurisdiction: personalInfo.address.country,
      status: 'PENDING'
    });
    
    // Perform sanctions check
    await kycService.performSanctionsCheck(userId, personalInfo);
    
    res.json({
      success: true,
      message: 'Personal information submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting personal info:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Invalid data', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Failed to submit personal information' });
  }
});

// Get upload URL for documents
router.post('/upload-url', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const uploadURL = await objectStorage.getObjectEntityUploadURL();
    res.json({ success: true, uploadURL });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({ success: false, message: 'Failed to generate upload URL' });
  }
});

// Submit document
router.post('/document', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { documentType, documentURL, metadata } = documentUploadSchema.parse(req.body);
    
    // Normalize the document path
    const documentPath = objectStorage.normalizeObjectEntityPath(documentURL);
    
    // Set ACL policy for the document (private, user-owned)
    await objectStorage.trySetObjectEntityAclPolicy(documentURL, {
      owner: userId,
      visibility: 'private',
      aclRules: [{
        group: { type: 'ADMIN' as any, id: 'compliance_team' },
        permission: 'READ' as any
      }]
    });
    
    // Create document record
    const document = await kycService.uploadDocument(
      userId,
      documentType,
      documentPath,
      metadata || {}
    );
    
    res.json({
      success: true,
      documentId: document.id,
      message: 'Document uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Invalid data', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Failed to upload document' });
  }
});

// Get user's documents
router.get('/documents', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const verification = await kycService.getKycStatus(userId);
    
    if (!verification) {
      return res.json({ success: true, documents: [] });
    }
    
    const documents = await storage.getKycDocumentsByVerification(verification.id);
    
    res.json({
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        type: doc.documentType,
        status: doc.status,
        uploadedAt: doc.uploadedAt,
        reviewNotes: doc.reviewNotes,
        // Don't expose the actual document path for security
        hasDocument: !!doc.documentPath
      }))
    });
  } catch (error) {
    console.error('Error getting documents:', error);
    res.status(500).json({ success: false, message: 'Failed to get documents' });
  }
});

// Admin routes for KYC review
router.get('/admin/pending', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    // TODO: Add admin authorization check
    const pendingVerifications = await storage.getPendingKycVerifications();
    
    const verifications = await Promise.all(
      pendingVerifications.map(async (verification) => {
        const user = await storage.getUser(verification.userId);
        const documents = await storage.getKycDocumentsByVerification(verification.id);
        
        return {
          id: verification.id,
          userId: verification.userId,
          user: user ? {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName
          } : null,
          status: verification.status,
          riskLevel: verification.riskLevel,
          jurisdiction: verification.jurisdiction,
          personalInfo: verification.personalInfo,
          documents: documents.map(doc => ({
            id: doc.id,
            type: doc.documentType,
            status: doc.status,
            uploadedAt: doc.uploadedAt
          })),
          createdAt: verification.createdAt
        };
      })
    );
    
    res.json({ success: true, verifications });
  } catch (error) {
    console.error('Error getting pending verifications:', error);
    res.status(500).json({ success: false, message: 'Failed to get pending verifications' });
  }
});

// Admin document review
router.put('/admin/document/:documentId/review', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    // TODO: Add admin authorization check
    const { documentId } = req.params;
    const { status, reviewNotes } = documentReviewSchema.parse(req.body);
    
    await kycService.reviewDocument(documentId, status, reviewNotes, req.user!.userId);
    
    res.json({
      success: true,
      message: `Document ${status.toLowerCase()} successfully`
    });
  } catch (error) {
    console.error('Error reviewing document:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Invalid data', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Failed to review document' });
  }
});

// Get document for admin review
router.get('/admin/document/:documentId', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    // TODO: Add admin authorization check
    const { documentId } = req.params;
    const document = await storage.getKycDocument(documentId);
    
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    
    // Get the document file for viewing
    const objectFile = await objectStorage.getObjectEntityFile(document.documentPath);
    
    // Check admin access
    const canAccess = await objectStorage.canAccessObjectEntity({
      objectFile,
      userId: req.user!.userId,
      requestedPermission: 'READ' as any
    });
    
    if (!canAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Stream the document
    objectStorage.downloadObject(objectFile, res);
  } catch (error) {
    console.error('Error getting document:', error);
    res.status(500).json({ success: false, message: 'Failed to get document' });
  }
});

// Get AML checks for a user
router.get('/aml-checks/:userId', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    // TODO: Add admin authorization check
    const { userId } = req.params;
    const amlChecks = await storage.getAmlChecksByUser(userId);
    
    res.json({ success: true, amlChecks });
  } catch (error) {
    console.error('Error getting AML checks:', error);
    res.status(500).json({ success: false, message: 'Failed to get AML checks' });
  }
});

// Get compliance dashboard
router.get('/admin/dashboard', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    // TODO: Add admin authorization check
    const dashboard = await kycService.getComplianceDashboard();
    res.json({ success: true, ...dashboard });
  } catch (error) {
    console.error('Error getting compliance dashboard:', error);
    res.status(500).json({ success: false, message: 'Failed to get compliance dashboard' });
  }
});

export default router;