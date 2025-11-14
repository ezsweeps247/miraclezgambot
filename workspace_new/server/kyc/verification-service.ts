import { storage } from "../storage";
import type { KycVerification, KycDocument } from "../../shared/schema";
import { ObjectStorageService } from "../objectStorage";

interface DocumentSubmission {
  type: string;
  imageUrl: string;
  metadata: {
    documentNumber?: string;
    expiryDate?: string;
    issuingCountry?: string;
    personalInfo?: any;
  };
}

interface KycStatusResponse {
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REQUIRES_ADDITIONAL_INFO';
  verificationId?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiredDocuments?: string[];
  submittedDocuments?: string[];
  reviewNotes?: string;
  createdAt?: Date;
  submittedAt?: Date;
  completedAt?: Date;
}

interface KycRequirementResponse {
  required: boolean;
  reason?: string;
  deadline?: string;
}

class KycVerificationService {
  private objectStorageService: ObjectStorageService;

  constructor() {
    this.objectStorageService = new ObjectStorageService();
  }

  /**
   * Get KYC status for a user
   */
  async getKycStatus(userId: string): Promise<KycStatusResponse> {
    try {
      const verification = await storage.getUserKycVerification(userId);
      
      if (!verification) {
        return {
          status: 'PENDING',
          requiredDocuments: ['PASSPORT', 'PROOF_OF_ADDRESS'],
          submittedDocuments: []
        };
      }

      const documents = await storage.getKycDocuments(verification.id);
      const submittedDocuments = documents.map(doc => doc.documentType);

      return {
        status: verification.status as any,
        verificationId: verification.id,
        riskLevel: verification.riskLevel as any,
        submittedDocuments,
        reviewNotes: verification.reviewNotes,
        createdAt: verification.createdAt,
        submittedAt: verification.submittedAt,
        completedAt: verification.completedAt
      };
    } catch (error) {
      console.error("Error getting KYC status:", error);
      throw new Error("Failed to get KYC status");
    }
  }

  /**
   * Check if KYC is required for a user
   */
  async checkKycRequirement(userId: string): Promise<KycRequirementResponse> {
    try {
      // Check if user already has approved KYC
      const verification = await storage.getUserKycVerification(userId);
      if (verification?.status === 'APPROVED') {
        return { required: false };
      }

      // For now, KYC is required for all users
      // In a real system, this might depend on jurisdiction, transaction volume, etc.
      return {
        required: true,
        reason: "Identity verification is required for security and compliance purposes",
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      };
    } catch (error) {
      console.error("Error checking KYC requirement:", error);
      throw new Error("Failed to check KYC requirement");
    }
  }

  /**
   * Submit KYC documents for verification
   */
  async submitKycDocuments(userId: string, documents: DocumentSubmission[]): Promise<{ verificationId: string; status: string }> {
    try {
      // Create or update KYC verification record
      let verification = await storage.getUserKycVerification(userId);
      
      if (!verification) {
        // Create new verification
        verification = await storage.createKycVerification({
          id: crypto.randomUUID(),
          userId,
          status: 'UNDER_REVIEW',
          riskLevel: 'MEDIUM',
          submittedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else {
        // Update existing verification
        await storage.updateKycVerification(verification.id, {
          status: 'UNDER_REVIEW',
          submittedAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Store document records
      for (const doc of documents) {
        // Normalize the object storage path
        const normalizedPath = this.objectStorageService.normalizeObjectEntityPath(doc.imageUrl);
        
        await storage.createKycDocument({
          id: crypto.randomUUID(),
          verificationId: verification.id,
          documentType: doc.type,
          documentPath: normalizedPath,
          metadata: doc.metadata,
          uploadedAt: new Date()
        });
      }

      // Perform basic risk assessment
      const riskLevel = await this.assessRisk(userId, verification.id);
      await storage.updateKycVerification(verification.id, { riskLevel });

      // Auto-approve low-risk verifications for demo purposes
      if (riskLevel === 'LOW') {
        await this.approveVerification(verification.id);
        await storage.updateUserKycStatus(userId, true);
      }

      return {
        verificationId: verification.id,
        status: riskLevel === 'LOW' ? 'APPROVED' : 'UNDER_REVIEW'
      };
    } catch (error) {
      console.error("Error submitting KYC documents:", error);
      throw new Error("Failed to submit KYC documents");
    }
  }

  /**
   * Assess risk level for a KYC verification
   */
  private async assessRisk(userId: string, verificationId: string): Promise<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> {
    try {
      // Basic risk assessment logic
      // In a real system, this would be much more sophisticated
      
      const documents = await storage.getKycDocuments(verificationId);
      const hasPassport = documents.some(doc => doc.documentType === 'PASSPORT');
      const hasProofOfAddress = documents.some(doc => doc.documentType === 'PROOF_OF_ADDRESS');
      
      // Check for previous AML flags
      const amlChecks = await storage.getUserAmlChecks(userId);
      const hasAmlFlags = amlChecks.some(check => check.riskLevel === 'HIGH' || check.riskLevel === 'CRITICAL');
      
      if (hasAmlFlags) {
        return 'HIGH';
      }
      
      if (hasPassport && hasProofOfAddress) {
        return 'LOW';
      }
      
      return 'MEDIUM';
    } catch (error) {
      console.error("Error assessing risk:", error);
      return 'MEDIUM'; // Default to medium risk
    }
  }

  /**
   * Approve a KYC verification
   */
  private async approveVerification(verificationId: string): Promise<void> {
    await storage.updateKycVerification(verificationId, {
      status: 'APPROVED',
      completedAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Reject a KYC verification
   */
  async rejectVerification(verificationId: string, reason: string): Promise<void> {
    await storage.updateKycVerification(verificationId, {
      status: 'REJECTED',
      reviewNotes: reason,
      completedAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Request additional information for a KYC verification
   */
  async requestAdditionalInfo(verificationId: string, notes: string): Promise<void> {
    await storage.updateKycVerification(verificationId, {
      status: 'REQUIRES_ADDITIONAL_INFO',
      reviewNotes: notes,
      updatedAt: new Date()
    });
  }

  /**
   * Get all pending verifications for admin review
   */
  async getPendingVerifications(): Promise<KycVerification[]> {
    return await storage.getPendingKycVerifications();
  }

  /**
   * Create an AML check record
   */
  async createAmlCheck(userId: string, checkType: string, result: any): Promise<void> {
    await storage.createAmlCheck({
      id: crypto.randomUUID(),
      userId,
      checkType,
      provider: 'INTERNAL',
      status: 'COMPLETED',
      result,
      riskLevel: result.riskLevel || 'LOW',
      createdAt: new Date()
    });
  }
}

export const kycService = new KycVerificationService();