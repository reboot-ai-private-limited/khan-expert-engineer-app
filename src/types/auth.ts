/**
 * Shapes mirror what the backend actually returns today.
 * See backend/src/controllers/engineerAuthController.ts
 */

/** The `engineer` object in a successful login response. */
export interface EngineerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'engineer';
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
