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

/** The `engineer` object in a successful login response. */
export interface EngineerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'engineer';
  accountStatus?: EngineerAccountStatus;
  /** The rejection reason, or what to fix for a changes-requested decision. */
  reviewNote?: string;
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
  skillIds?: string[];
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
