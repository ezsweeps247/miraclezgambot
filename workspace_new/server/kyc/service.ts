import { storage } from '../storage';
import { ObjectStorageService } from '../objectStorage';
import type { 
  KycVerification, 
  InsertKycVerification, 
  KycDocument, 
  InsertKycDocument,
  AmlCheck,
  InsertAmlCheck,
  ComplianceReport,
  InsertComplianceReport
} from '@shared/schema';

// KYC risk levels
export enum KycRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM', 
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Document verification status
export enum DocumentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED', 
  REJECTED = 'REJECTED'
}

// AML check types
export enum AmlCheckType {
  TRANSACTION_MONITORING = 'TRANSACTION_MONITORING',
  SANCTIONS_CHECK = 'SANCTIONS_CHECK',
  PEP_CHECK = 'PEP_CHECK',
  ADVERSE_MEDIA = 'ADVERSE_MEDIA'
}

// AML check results
export enum AmlResult {
  PASS = 'PASS',
  FAIL = 'FAIL', 
  WARNING = 'WARNING',
  MANUAL_REVIEW = 'MANUAL_REVIEW'
}

// Required documents by jurisdiction
const JURISDICTION_DOCUMENT_REQUIREMENTS = {
  'US': ['PASSPORT', 'DRIVERS_LICENSE', 'PROOF_OF_ADDRESS'],
  'UK': ['PASSPORT', 'DRIVERS_LICENSE', 'PROOF_OF_ADDRESS'],
  'EU': ['PASSPORT', 'NATIONAL_ID', 'PROOF_OF_ADDRESS'],
  'CA': ['PASSPORT', 'DRIVERS_LICENSE', 'PROOF_OF_ADDRESS'],
  'AU': ['PASSPORT', 'DRIVERS_LICENSE', 'PROOF_OF_ADDRESS'],
  'DEFAULT': ['PASSPORT', 'PROOF_OF_ADDRESS']
};

// Transaction monitoring thresholds
const TRANSACTION_THRESHOLDS = {
  DAILY_LIMIT: 10000, // USD equivalent
  SINGLE_TRANSACTION: 5000, // USD equivalent
  CUMULATIVE_WEEKLY: 25000, // USD equivalent
  CUMULATIVE_MONTHLY: 100000 // USD equivalent
};

export class KycService {
  private objectStorage: ObjectStorageService;

  constructor() {
    this.objectStorage = new ObjectStorageService();
  }

  // Initialize KYC verification for a user
  async initiateKycVerification(userId: string, jurisdiction?: string): Promise<KycVerification> {
    const requiredDocs = this.getRequiredDocuments(jurisdiction || 'DEFAULT');
    
    const verification = await storage.createKycVerification({
      userId,
      status: 'PENDING',
      riskLevel: 'LOW',
      jurisdiction: jurisdiction || 'UNKNOWN',
      requiredDocuments: requiredDocs,
      submittedDocuments: [],
      reviewNotes: 'KYC verification initiated'
    });

    return verification;
  }

  // Get KYC status for a user
  async getKycStatus(userId: string): Promise<KycVerification | null> {
    return await storage.getUserKycVerification(userId);
  }

  // Upload KYC document
  async uploadDocument(
    userId: string, 
    documentType: string, 
    documentPath: string,
    metadata: any
  ): Promise<KycDocument> {
    // Get or create KYC verification
    let verification = await this.getKycStatus(userId);
    if (!verification) {
      verification = await this.initiateKycVerification(userId);
    }

    // Create document record
    const document = await storage.createKycDocument({
      verificationId: verification.id,
      documentType,
      documentPath,
      status: 'PENDING',
      metadata,
    });

    // Update verification with submitted document
    const submittedDocs = [...(verification.submittedDocuments || [])];
    if (!submittedDocs.includes(documentType)) {
      submittedDocs.push(documentType);
      await storage.updateKycVerification(verification.id, {
        submittedDocuments: submittedDocs,
        status: this.calculateVerificationStatus(verification.requiredDocuments || [], submittedDocs) as any
      });
    }

    return document;
  }

  // Review KYC documents
  async reviewDocument(
    documentId: string, 
    status: DocumentStatus, 
    reviewNotes?: string,
    reviewedBy?: string
  ): Promise<void> {
    await storage.updateKycDocument(documentId, {
      status,
      reviewNotes,
    });

    // Check if all documents are reviewed and update verification status
    const document = await storage.getKycDocument(documentId);
    if (document) {
      await this.updateVerificationStatus(document.verificationId);
    }
  }

  // Update overall verification status based on document reviews
  private async updateVerificationStatus(verificationId: string): Promise<void> {
    const verification = await storage.getKycVerificationById(verificationId);
    const documents = await storage.getKycDocumentsByVerification(verificationId);
    
    if (!verification || !documents.length) return;

    const allReviewed = documents.every(doc => doc.status !== 'PENDING');
    const allApproved = documents.every(doc => doc.status === 'APPROVED');
    const anyRejected = documents.some(doc => doc.status === 'REJECTED');

    let newStatus = verification.status;
    let riskLevel = verification.riskLevel;

    if (allReviewed) {
      if (allApproved) {
        newStatus = 'APPROVED';
        riskLevel = 'LOW';
      } else if (anyRejected) {
        newStatus = 'REJECTED';
        riskLevel = 'HIGH';
      }
    } else {
      newStatus = 'UNDER_REVIEW';
    }

    await storage.updateKycVerification(verificationId, {
      status: newStatus as any,
      riskLevel: riskLevel as any,
      reviewNotes: `Document review completed: ${allApproved ? 'All approved' : anyRejected ? 'Some rejected' : 'Under review'}`
    });
  }

  // Calculate verification status based on submitted documents
  private calculateVerificationStatus(required: string[], submitted: string[]): string {
    const hasAllRequired = required.every(doc => submitted.includes(doc));
    if (hasAllRequired) {
      return 'UNDER_REVIEW';
    }
    return 'PENDING';
  }

  // Get required documents for jurisdiction
  private getRequiredDocuments(jurisdiction: string): string[] {
    return JURISDICTION_DOCUMENT_REQUIREMENTS[jurisdiction as keyof typeof JURISDICTION_DOCUMENT_REQUIREMENTS] 
      || JURISDICTION_DOCUMENT_REQUIREMENTS.DEFAULT;
  }

  // AML transaction monitoring
  async monitorTransaction(
    userId: string, 
    transactionId: string, 
    amount: number, 
    type: string
  ): Promise<AmlCheck | null> {
    const riskScore = await this.calculateTransactionRisk(userId, amount, type);
    
    if (riskScore >= 50) { // Risk threshold
      const amlCheck = await storage.createAmlCheck({
        userId,
        checkType: 'TRANSACTION_MONITORING',
        result: riskScore >= 80 ? 'FAIL' : riskScore >= 60 ? 'WARNING' : 'MANUAL_REVIEW',
        riskScore,
        details: {
          transactionId,
          amount,
          type,
          reason: riskScore >= 80 ? 'High-risk transaction detected' : 'Transaction requires manual review'
        },
        triggeredBy: `Transaction ${transactionId}`
      });

      // Create compliance report if high risk
      if (riskScore >= 80) {
        await this.createComplianceReport(
          'SUSPICIOUS_ACTIVITY',
          userId,
          transactionId,
          {
            riskScore,
            amount,
            type,
            reason: 'High-risk transaction pattern detected'
          }
        );
      }

      return amlCheck;
    }

    return null;
  }

  // Calculate transaction risk score
  private async calculateTransactionRisk(userId: string, amount: number, type: string): Promise<number> {
    let riskScore = 0;

    // Amount-based risk
    if (amount > TRANSACTION_THRESHOLDS.SINGLE_TRANSACTION) {
      riskScore += 30;
    }
    if (amount > TRANSACTION_THRESHOLDS.DAILY_LIMIT) {
      riskScore += 50;
    }

    // User pattern analysis
    const recentTransactions = await storage.getRecentTransactions(userId, 7); // Last 7 days
    const totalWeekly = recentTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    
    if (totalWeekly > TRANSACTION_THRESHOLDS.CUMULATIVE_WEEKLY) {
      riskScore += 25;
    }

    // Frequency-based risk
    if (recentTransactions.length > 20) { // High frequency
      riskScore += 20;
    }

    // KYC status impact
    const kycStatus = await this.getKycStatus(userId);
    if (!kycStatus || kycStatus.status !== 'APPROVED') {
      riskScore += 40;
    }

    return Math.min(riskScore, 100);
  }

  // Sanctions and PEP screening
  async performSanctionsCheck(userId: string, personalInfo: any): Promise<AmlCheck> {
    // In a real implementation, this would integrate with external sanctions databases
    // For now, we'll simulate the check
    const riskScore = this.simulateSanctionsCheck(personalInfo);
    
    const result = riskScore >= 90 ? 'FAIL' : riskScore >= 50 ? 'WARNING' : 'PASS';
    
    return await storage.createAmlCheck({
      userId,
      checkType: 'SANCTIONS_CHECK',
      result,
      riskScore,
      details: {
        checkType: 'SANCTIONS_AND_PEP',
        personalInfo: {
          name: `${personalInfo.firstName} ${personalInfo.lastName}`,
          nationality: personalInfo.nationality,
          dateOfBirth: personalInfo.dateOfBirth
        },
        databases: ['OFAC', 'EU_SANCTIONS', 'UN_SANCTIONS', 'PEP_LIST']
      },
      triggeredBy: 'KYC verification process'
    });
  }

  // Simulate sanctions check (replace with real API integration)
  private simulateSanctionsCheck(personalInfo: any): number {
    // Simulate various risk factors
    const suspiciousNames = ['TEST_BLOCKED', 'SANCTIONS_TEST'];
    const highRiskCountries = ['KP', 'IR', 'SY']; // Example high-risk countries
    
    let riskScore = 0;
    
    const fullName = `${personalInfo.firstName} ${personalInfo.lastName}`.toUpperCase();
    if (suspiciousNames.some(name => fullName.includes(name))) {
      riskScore = 95; // High risk for test names
    }
    
    if (highRiskCountries.includes(personalInfo.nationality)) {
      riskScore += 30;
    }
    
    return Math.min(riskScore, 100);
  }

  // Create compliance report
  async createComplianceReport(
    reportType: 'SUSPICIOUS_ACTIVITY' | 'LARGE_TRANSACTION' | 'REGULATORY_FILING',
    userId?: string,
    transactionId?: string,
    details?: any
  ): Promise<ComplianceReport> {
    return await storage.createComplianceReport({
      reportType,
      userId,
      transactionId,
      details,
      status: 'DRAFT'
    });
  }

  // Get compliance dashboard data
  async getComplianceDashboard(): Promise<any> {
    const pendingVerifications = await storage.getPendingKycVerifications();
    const recentAmlChecks = await storage.getRecentAmlChecks(30); // Last 30 days
    const openReports = await storage.getOpenComplianceReports();
    
    return {
      stats: {
        pendingKyc: pendingVerifications.length,
        highRiskUsers: recentAmlChecks.filter(check => check.riskScore && check.riskScore >= 80).length,
        openReports: openReports.length,
        monthlyChecks: recentAmlChecks.length
      },
      pendingVerifications: pendingVerifications.slice(0, 10), // Latest 10
      highRiskAlerts: recentAmlChecks
        .filter(check => check.result === 'FAIL' || check.result === 'WARNING')
        .slice(0, 10),
      recentReports: openReports.slice(0, 10)
    };
  }

  // Export compliance data for regulatory reporting
  async exportComplianceData(startDate: Date, endDate: Date): Promise<any> {
    const verifications = await storage.getKycVerificationsByDateRange(startDate, endDate);
    const amlChecks = await storage.getAmlChecksByDateRange(startDate, endDate);
    const reports = await storage.getComplianceReportsByDateRange(startDate, endDate);
    
    return {
      period: { startDate, endDate },
      summary: {
        totalVerifications: verifications.length,
        approvedVerifications: verifications.filter(v => v.status === 'APPROVED').length,
        rejectedVerifications: verifications.filter(v => v.status === 'REJECTED').length,
        totalAmlChecks: amlChecks.length,
        failedAmlChecks: amlChecks.filter(c => c.result === 'FAIL').length,
        complianceReports: reports.length
      },
      data: {
        verifications,
        amlChecks,
        reports
      }
    };
  }
}

export const kycService = new KycService();