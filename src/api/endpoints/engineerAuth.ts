import axios from 'axios';
import { api, isNetworkError, serverMessage } from '@/api/client';
import { env } from '@/config/env';

/** Result of a cold-start token check — see validateSession below. */
export interface SessionCheck {
  /** False only when the server actively rejected the token. */
  valid: boolean;
  /** A refreshed profile when one came back; null means keep the cached one. */
  profile: EngineerProfile | null;
}
import {
  AuthError,
  type AuthErrorCode,
  type EngineerProfile,
  type LoginRequest,
  type LoginResponse,
  type RegisterRequest,
  type RegisterResponse,
  type RegistrationStatusResponse,
  type ResubmitRequest,
  type ChangePasswordRequest,
  type UpdateProfileRequest,
  type UpdateProfileResponse,
} from '@/types/auth';

/**
 * The backend returns prose, not codes. Map its messages to stable codes
 * once, here, so screens never match on message strings.
 *
 * Source: backend/src/controllers/engineerAuthController.ts
 */
const classify = (status: number | undefined, message?: string): AuthErrorCode => {
  const text = (message ?? '').toLowerCase();

  if (text.includes('password not configured')) return 'password_not_set';
  if (text.includes('inactive') || text.includes('deactivated')) return 'account_inactive';
  if (text.includes('jwt_secret') || text.includes('configuration error')) return 'config';

  if (status === 400) return 'missing_credentials';
  if (status === 401 || status === 403) return 'invalid_credentials';
  if (status && status >= 500) return 'server';

  return 'unknown';
};

/** Engineer-facing copy. The server's own wording is often too technical. */
const friendlyMessage = (code: AuthErrorCode, fallback?: string): string => {
  switch (code) {
    case 'missing_credentials':
      return 'Enter your phone number or email, and your password.';
    case 'invalid_credentials':
      return 'Those details did not match. Check your phone number and password, then try again.';
    case 'account_inactive':
      return 'This account is not active. Contact the office to have it reactivated.';
    case 'password_not_set':
      return 'No password has been set for this account yet. Contact the office to get one.';
    case 'network':
      return 'Could not reach the server. Check your connection and try again.';
    case 'config':
      return 'The server is misconfigured. Contact the office — this is not something you can fix.';
    case 'server':
      return 'The server had a problem. Try again in a moment.';
    default:
      return fallback ?? 'Something went wrong. Try again.';
  }
};

export const engineerAuthApi = {
  /**
   * POST /api/engineer-auth/login
   *
   * The backend reads `loginId` and `password` from the body and matches
   * `loginId` against either email (lowercased) or phone. It only returns
   * engineers whose status is 'active'.
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    if (!env.apiUrl) {
      throw new AuthError('config', 'No server address is configured for this app.');
    }

    try {
      const { data } = await api.post<LoginResponse>('/engineer-auth/login', {
        loginId: credentials.loginId.trim(),
        password: credentials.password,
      });

      if (!data?.success || !data.token || !data.engineer) {
        throw new AuthError('server', 'The server returned an unexpected response.');
      }

      return data;
    } catch (error) {
      if (error instanceof AuthError) throw error;

      if (isNetworkError(error)) {
        throw new AuthError('network', friendlyMessage('network'), true);
      }

      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const message = serverMessage(error);
      const code = classify(status, message);

      throw new AuthError(code, friendlyMessage(code, message), code === 'server');
    }
  },

  /**
   * Confirm a stored token is still good, and hand back the server's own
   * copy of the profile so fields added since the engineer last signed in
   * (their engineer code, account type) appear without a re-login.
   *
   * GET /engineer-auth/profile used to 404 for every engineer —
   * authMiddleware sets `req.user._id` but the controller read
   * `req.user?.id`. That is fixed server-side now, so this is both the
   * cheapest authenticated call and the one that returns the profile.
   *
   * `valid` is false only when the server actively rejected the token —
   * a server-side failure keeps the session. `profile` is the refreshed
   * copy when one came back, and null when the caller should keep the one
   * it already has. Throws only when the server could not be reached, so
   * an engineer opening the app offline keeps their session.
   */
  /** GET /api/engineer-auth/profile — the server's own copy, always fresh. */
  async getProfile(): Promise<EngineerProfile> {
    const { data } = await api.get<{ success: boolean; engineer: EngineerProfile }>('/engineer-auth/profile');
    return data.engineer;
  },

  /**
   * PUT /api/engineer-auth/profile — self-service edit, returns the saved
   * profile so the caller can replace its cached copy rather than guessing
   * what the server kept.
   */
  async updateProfile(payload: UpdateProfileRequest): Promise<EngineerProfile> {
    try {
      const { data } = await api.put<UpdateProfileResponse>('/engineer-auth/profile', payload);
      return data.engineer;
    } catch (error) {
      if (isNetworkError(error)) {
        throw new AuthError('network', friendlyMessage('network'), true);
      }
      throw new AuthError('server', serverMessage(error) ?? 'Could not save your profile. Try again.', true);
    }
  },

  /** PUT /api/engineer-auth/password — current password required, see the controller. */
  async changePassword(payload: ChangePasswordRequest): Promise<void> {
    try {
      await api.put('/engineer-auth/password', payload);
    } catch (error) {
      if (isNetworkError(error)) {
        throw new AuthError('network', friendlyMessage('network'), true);
      }
      throw new AuthError('server', serverMessage(error) ?? 'Could not change your password. Try again.', true);
    }
  },

  async validateSession(): Promise<SessionCheck> {
    try {
      const { data } = await api.get<{ success: boolean; engineer: EngineerProfile }>('/engineer-auth/profile');
      return { valid: true, profile: data?.engineer ?? null };
    } catch (error) {
      if (isNetworkError(error)) {
        throw new AuthError('network', friendlyMessage('network'), true);
      }

      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401 || status === 403) return { valid: false, profile: null };

      // A 500 is the server's problem, not a bad token. Keep the session.
      return { valid: true, profile: null };
    }
  },

  /**
   * POST /api/engineer-auth/register
   *
   * Public — no token needed. On success the server has already signed a
   * token for the new (pending) engineer, so the app logs them straight in
   * to the status screen rather than sending them back to a login form for
   * credentials they just typed.
   */
  async register(payload: RegisterRequest): Promise<RegisterResponse> {
    if (!env.apiUrl) {
      throw new AuthError('config', 'No server address is configured for this app.');
    }

    try {
      const { data } = await api.post<RegisterResponse>('/engineer-auth/register', payload);

      if (!data?.success || !data.token || !data.engineer) {
        throw new AuthError('server', 'The server returned an unexpected response.');
      }

      return data;
    } catch (error) {
      if (error instanceof AuthError) throw error;

      if (isNetworkError(error)) {
        throw new AuthError('network', friendlyMessage('network'), true);
      }

      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const message = serverMessage(error);
      // Register errors are mostly validation prose the server already
      // wrote for a human ("That phone number is already registered.") —
      // shown as-is rather than forced through the login-specific copy.
      const code: AuthErrorCode = status && status >= 500 ? 'server' : 'missing_credentials';

      throw new AuthError(code, message ?? friendlyMessage(code), code === 'server');
    }
  },

  /** GET /api/engineer-auth/registration-status */
  async getRegistrationStatus(): Promise<RegistrationStatusResponse> {
    const { data } = await api.get<RegistrationStatusResponse>('/engineer-auth/registration-status');
    if (!data?.success) {
      throw new AuthError('server', 'Could not load your application status.');
    }
    return data;
  },

  /** PUT /api/engineer-auth/registration — only works while changes_requested. */
  async resubmitRegistration(payload: ResubmitRequest): Promise<void> {
    try {
      const { data } = await api.put<{ success: boolean; message: string }>(
        '/engineer-auth/registration',
        payload
      );
      if (!data?.success) throw new AuthError('server', data?.message || 'Could not resubmit.');
    } catch (error) {
      if (error instanceof AuthError) throw error;
      if (isNetworkError(error)) throw new AuthError('network', friendlyMessage('network'), true);
      throw new AuthError('server', serverMessage(error) ?? 'Could not resubmit.');
    }
  },
};
