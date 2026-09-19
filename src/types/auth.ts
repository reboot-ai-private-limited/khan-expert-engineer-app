/**
 * Shapes mirror what the backend actually returns today.
 * See backend/src/controllers/engineerAuthController.ts
 */

/**
 * The states an application moves through. Absent or 'active' means fully
 * onboarded — a profile cached before this field existed is treated as
 * active, matching the backend's own backward-compatible default.
 */
export type EngineerAccountStatus = 'pending_approval' | 'changes_requested' | 'rejected' | 'active';

/**
 * How the engineer is engaged. 'in_house' is the company's own staff and is
 * set by the office only — the app can only ever pick one of the two
 * external types.
 */
export type EngineerType = 'in_house' | 'freelance' | 'service_center';

export const ENGINEER_TYPE_LABELS: Record<EngineerType, string> = {
  in_house: 'Company engineer',
  freelance: 'Freelance',
  service_center: 'Service center',
};

/** The two an applicant may choose during registration. */
export const SELECTABLE_ENGINEER_TYPES: EngineerType[] = ['freelance', 'service_center'];

export interface EngineerAddress {
  line1?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
}

/** The `engineer` object in a successful login response. */
export interface EngineerProfile {
  id: string;
  /** Permanent, human-readable unique id, e.g. `KET-ENG-0007`. Assigned by the server. */
  engineerCode?: string;
  engineerType?: EngineerType;
  name: string;
  email: string;
  phone: string;
  role: 'engineer';
  accountStatus?: EngineerAccountStatus;
  route?: string;
  yearsOfExperience?: number;
  address?: EngineerAddress;
  /** The rejection reason, or what to fix for a changes-requested decision. */
  reviewNote?: string;
}

/**
 * PUT /api/engineer-auth/profile — self-service edit.
 *
 * Name and phone are missing on purpose: the server refuses them. Name is
 * printed on the customer-facing job ID card and is still what un-backfilled
 * tickets match on; phone is the login id. Both go through the office.
 */
export interface UpdateProfileRequest {
  email?: string;
  route?: string;
  yearsOfExperience?: number;
  addressLine1?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  engineerType?: EngineerType;
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  engineer: EngineerProfile;
}

/** PUT /api/engineer-auth/password */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** POST /api/engineer-auth/login */
export interface LoginRequest {
  /** Phone number or email. The backend reads this exact key. */
  loginId: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  engineer: EngineerProfile;
}

/** POST /api/engineer-auth/register */
export interface RegisterRequest {
  name: string;
  phone: string;
  email?: string;
  password: string;
  route?: string;
  yearsOfExperience?: number;
  addressLine1?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  /** Where a bank-transfer payout goes, with the branch code below. */
  bankAccountNumber?: string;
  /** e.g. `SBIN0001234`. Sent uppercase; the server uppercases it again. */
  bankIfscCode?: string;
  skillIds?: string[];
  engineerType?: EngineerType;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  token: string;
  engineer: EngineerProfile;
}

/** GET /api/engineer-auth/registration-status */
export interface RegistrationStatusResponse {
  success: boolean;
  accountStatus: EngineerAccountStatus;
  reviewNote: string;
  reviewedAt?: string;
  appliedAt?: string;
  application: {
    name: string;
    phone: string;
    email?: string;
    engineerCode?: string;
    engineerType?: EngineerType;
    route?: string;
    yearsOfExperience?: number;
    address?: {
      line1?: string;
      city?: string;
      district?: string;
      state?: string;
      pincode?: string;
    };
  };
}

/** PUT /api/engineer-auth/registration — resubmission after changes_requested */
export interface ResubmitRequest {
  name?: string;
  engineerType?: EngineerType;
  email?: string;
  route?: string;
  yearsOfExperience?: number;
  addressLine1?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
}

/** Every endpoint in this backend uses the same envelope. */
export interface ApiEnvelope {
  success: boolean;
  message?: string;
}

export type AuthStatus =
  | 'restoring'
  | 'authenticated'
  | 'unauthenticated';

/** Stable codes the UI branches on, rather than matching message strings. */
export type AuthErrorCode =
  | 'missing_credentials'
  | 'invalid_credentials'
  | 'account_inactive'
  | 'password_not_set'
  | 'network'
  | 'server'
  | 'config'
  | 'unknown';

export class AuthError extends Error {
  code: AuthErrorCode;
  /** True when retrying the same input might succeed. */
  retryable: boolean;

  constructor(code: AuthErrorCode, message: string, retryable = false) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.retryable = retryable;
  }
}
