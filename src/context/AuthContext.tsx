import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { engineerAuthApi } from '@/api/endpoints/engineerAuth';
import { setUnauthorizedHandler } from '@/api/client';
import { sessionStorage } from '@/services/storage/secureStore';
import { unregisterPushNotifications } from '@/services/notifications/pushNotifications';
import {
  AuthError,
  type AuthStatus,
  type EngineerProfile,
  type RegisterRequest,
  type UpdateProfileRequest,
  type ResubmitRequest,
} from '@/types/auth';

interface AuthContextValue {
  status: AuthStatus;
  engineer: EngineerProfile | null;
  /** Set when the session ended on its own, so the login screen can explain why. */
  sessionEndedReason: string | null;
  /** Signs in with the WhatsApp code sent by engineerAuthApi.sendOtp(phone, 'login'). */
  login: (phone: string, otp: string) => Promise<void>;
  /** Submits a new application and signs the engineer straight in, pending review. */
  register: (payload: RegisterRequest) => Promise<void>;
  /** Saves a self-service profile edit and adopts the server's copy of the result. */
  updateProfile: (payload: UpdateProfileRequest) => Promise<void>;
  /** Re-reads accountStatus from the server — used by the status screen to notice a decision. */
  refreshRegistrationStatus: () => Promise<void>;
  /** Only works while accountStatus is 'changes_requested'. */
  resubmitRegistration: (payload: ResubmitRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearSessionEndedReason: () => void;
  lastLoginId: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [engineer, setEngineer] = useState<EngineerProfile | null>(null);
  const [lastLoginId, setLastLoginId] = useState<string | null>(null);
  const [sessionEndedReason, setSessionEndedReason] = useState<string | null>(null);

  /** Guards against a 401 landing after the component unmounts. */
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const endSession = useCallback(async (reason: string | null) => {
    await sessionStorage.clearSession();
    if (!mounted.current) return;
    setEngineer(null);
    setSessionEndedReason(reason);
    setStatus('unauthenticated');
  }, []);

  /**
   * A 401 from any request means the token is no longer good — expired,
   * or the account was deactivated while the engineer was working.
   */
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void endSession('Your session has ended. Please sign in again.');
    });
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  /** Restore a stored session on cold start. */
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const [token, storedProfile, storedLoginId] = await Promise.all([
        sessionStorage.getToken(),
        sessionStorage.getProfile(),
        sessionStorage.getLastLoginId(),
      ]);

      if (cancelled) return;
      setLastLoginId(storedLoginId);

      if (!token || !storedProfile) {
        setStatus('unauthenticated');
        return;
      }

      // Show the engineer as signed in immediately, then verify in the
      // background. A cold start should not wait on the network.
      setEngineer(storedProfile);
      setStatus('authenticated');

      try {
        const { valid, profile } = await engineerAuthApi.validateSession();
        if (cancelled) return;
        if (!valid) {
          await endSession('Your session has expired. Please sign in again.');
        } else if (profile) {
          // Adopt the server's copy so fields the cached login response
          // predates — engineer code, account type — show up without
          // making the engineer sign in again.
          setEngineer(profile);
          void sessionStorage.setProfile(profile);
        }
      } catch {
        // Offline. Keep the cached session — the engineer may be in a
        // basement, and the first real request will 401 if it is truly dead.
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, [endSession]);

  const login = useCallback(async (phone: string, otp: string) => {
    const trimmedId = phone.trim();

    if (!trimmedId || !otp.trim()) {
      throw new AuthError('missing_credentials', 'Enter your phone number and the code sent to your WhatsApp.');
    }

    const response = await engineerAuthApi.login({ phone: trimmedId, otp });

    // Persist before flipping state, so a restart cannot land in a
    // signed-in UI with no stored token.
    const stored = await sessionStorage.setToken(response.token);
    if (!stored) {
      throw new AuthError(
        'unknown',
        'Could not save your sign-in on this device. Restart the app and try again.'
      );
    }
    await sessionStorage.setProfile(response.engineer);
    await sessionStorage.setLastLoginId(trimmedId);

    if (!mounted.current) return;
    setLastLoginId(trimmedId);
    setSessionEndedReason(null);
    setEngineer(response.engineer);
    setStatus('authenticated');
  }, []);

  const register = useCallback(async (payload: RegisterRequest) => {
    const response = await engineerAuthApi.register(payload);

    const stored = await sessionStorage.setToken(response.token);
    if (!stored) {
      throw new AuthError(
        'unknown',
        'Could not save your sign-in on this device. Restart the app and try again.'
      );
    }
    await sessionStorage.setProfile(response.engineer);
    await sessionStorage.setLastLoginId(response.engineer.phone);

    if (!mounted.current) return;
    setLastLoginId(response.engineer.phone);
    setSessionEndedReason(null);
    setEngineer(response.engineer);
    setStatus('authenticated');
  }, []);

  const updateProfile = useCallback(async (payload: UpdateProfileRequest) => {
    const saved = await engineerAuthApi.updateProfile(payload);
    if (!mounted.current) return;

    // Merge rather than replace: the response carries the profile fields, but
    // reviewNote only ever comes from the registration-status endpoint, so a
    // straight overwrite would drop it.
    setEngineer((prev) => {
      const next: EngineerProfile = { ...(prev ?? ({} as EngineerProfile)), ...saved };
      void sessionStorage.setProfile(next);
      return next;
    });
  }, []);

  const refreshRegistrationStatus = useCallback(async () => {
    const result = await engineerAuthApi.getRegistrationStatus();
    if (!mounted.current) return;

    setEngineer((prev) => {
      if (!prev) return prev;
      const next: EngineerProfile = {
        ...prev,
        accountStatus: result.accountStatus,
        reviewNote: result.reviewNote,
      };
      void sessionStorage.setProfile(next);
      return next;
    });
  }, []);

  const resubmitRegistration = useCallback(
    async (payload: ResubmitRequest) => {
      await engineerAuthApi.resubmitRegistration(payload);
      await refreshRegistrationStatus();
    },
    [refreshRegistrationStatus]
  );

  /**
   * There is no engineer logout endpoint on the backend, and the token
   * cannot be revoked server-side — clearing it locally is the whole of
   * logout today. Noted in docs/specs/10-api-contract.md.
   */
  const logout = useCallback(async () => {
    // First, while the session token still authorises the call — this phone
    // should stop receiving this engineer's notifications.
    await unregisterPushNotifications();
    await endSession(null);
  }, [endSession]);

  const clearSessionEndedReason = useCallback(() => setSessionEndedReason(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      engineer,
      sessionEndedReason,
      login,
      register,
      updateProfile,
      refreshRegistrationStatus,
      resubmitRegistration,
      logout,
      clearSessionEndedReason,
      lastLoginId,
    }),
    [
      status,
      engineer,
      sessionEndedReason,
      login,
      register,
      updateProfile,
      refreshRegistrationStatus,
      resubmitRegistration,
      logout,
      clearSessionEndedReason,
      lastLoginId,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
