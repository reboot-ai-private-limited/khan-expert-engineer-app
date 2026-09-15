/** Mirrors backend/src/utils/kycSummary.ts — never the raw Aadhaar number. */
export type KycDocumentStatus = 'not_uploaded' | 'pending' | 'verified' | 'rejected';

export interface AadhaarKycSummary {
  status: KycDocumentStatus;
  maskedNumber: string | null;
  nameOnDocument: string;
  hasFrontImage: boolean;
  hasBackImage: boolean;
  uploadedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
}

export interface PanKycSummary {
  status: KycDocumentStatus;
  number: string;
  nameOnDocument: string;
  hasImage: boolean;
  uploadedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
}

export interface KycSummary {
  aadhaar: AadhaarKycSummary;
  pan: PanKycSummary;
}

export type KycImageField = 'aadhaarFront' | 'aadhaarBack' | 'pan';
