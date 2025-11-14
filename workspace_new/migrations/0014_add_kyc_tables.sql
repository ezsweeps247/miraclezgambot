-- Add KYC fields to users table
ALTER TABLE users ADD COLUMN kyc_verified BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE users ADD COLUMN kyc_required_at TIMESTAMP;
ALTER TABLE users ADD COLUMN risk_level TEXT DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));

-- Create KYC verifications table
CREATE TABLE kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REQUIRES_ADDITIONAL_INFO')),
  risk_level TEXT DEFAULT 'LOW' NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  personal_info JSONB,
  required_documents JSONB,
  submitted_at TIMESTAMP DEFAULT NOW() NOT NULL,
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES admins(id),
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create KYC documents table
CREATE TABLE kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES kyc_verifications(id),
  document_type TEXT NOT NULL CHECK (document_type IN ('PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID', 'PROOF_OF_ADDRESS', 'BANK_STATEMENT', 'UTILITY_BILL')),
  document_path TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  metadata JSONB,
  uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL,
  review_notes TEXT
);

-- Create AML checks table
CREATE TABLE aml_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  check_type TEXT NOT NULL CHECK (check_type IN ('TRANSACTION_MONITORING', 'SANCTIONS_CHECK', 'PEP_CHECK', 'ADVERSE_MEDIA')),
  result TEXT NOT NULL CHECK (result IN ('PASS', 'FAIL', 'WARNING', 'MANUAL_REVIEW')),
  risk_score INTEGER,
  details JSONB,
  triggered_by TEXT,
  reviewed_by UUID REFERENCES admins(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create compliance reports table
CREATE TABLE compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN ('SUSPICIOUS_ACTIVITY', 'LARGE_TRANSACTION', 'REGULATORY_FILING')),
  user_id UUID REFERENCES users(id),
  transaction_id UUID REFERENCES transactions(id),
  details JSONB NOT NULL,
  status TEXT DEFAULT 'DRAFT' NOT NULL CHECK (status IN ('DRAFT', 'SUBMITTED', 'REVIEWED', 'CLOSED')),
  filed_by UUID REFERENCES admins(id),
  filed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_kyc_verifications_user_id ON kyc_verifications(user_id);
CREATE INDEX idx_kyc_verifications_status ON kyc_verifications(status);
CREATE INDEX idx_kyc_verifications_risk_level ON kyc_verifications(risk_level);

CREATE INDEX idx_kyc_documents_verification_id ON kyc_documents(verification_id);
CREATE INDEX idx_kyc_documents_type ON kyc_documents(document_type);
CREATE INDEX idx_kyc_documents_status ON kyc_documents(status);

CREATE INDEX idx_aml_checks_user_id ON aml_checks(user_id);
CREATE INDEX idx_aml_checks_type ON aml_checks(check_type);
CREATE INDEX idx_aml_checks_result ON aml_checks(result);

CREATE INDEX idx_compliance_reports_user_id ON compliance_reports(user_id);
CREATE INDEX idx_compliance_reports_type ON compliance_reports(report_type);
CREATE INDEX idx_compliance_reports_status ON compliance_reports(status);