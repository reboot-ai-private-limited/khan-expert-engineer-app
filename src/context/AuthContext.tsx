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
import { AuthError, type AuthStatus, type EngineerProfile } from '@/types/auth';

interface AuthContextValue {
  status: AuthStatus;
  engineer: EngineerProfile | null;
  /** Set when the session ended on its own, so the login screen can explain why. */
  sessionEndedReason: string | null;
  login: (loginId: string, password: string) => Promise<void>;
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
        const valid = await engineerAuthApi.validateSession();
        if (cancelled) return;
        if (!valid) {
          await endSession('Your session has expired. Please sign in again.');
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

  const login = useCallback(async (loginId: string, password: string) => {
    const trimmedId = loginId.trim();

    if (!trimmedId || !password) {
      throw new AuthError(
        'missing_credentials',
        'Enter your phone number or email, and your password.'
      );
    }

    const response = await engineerAuthApi.login({ loginId: trimmedId, password });

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

  /**
   * There is no engineer logout endpoint on the backend, and the token
   * cannot be revoked server-side — clearing it locally is the whole of
   * logout today. Noted in docs/specs/10-api-contract.md.
   */
  const logout = useCallback(async () => {
    await endSession(null);
  }, [endSession]);

  const clearSessionEndedReason = useCallback(() => setSessionEndedReason(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      engineer,
      sessionEndedReason,
      login,
      logout,
      clearSessionEndedReason,
      lastLoginId,
    }),
    [status, engineer, sessionEndedReason, login, logout, clearSessionEndedReason, lastLoginId]
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
