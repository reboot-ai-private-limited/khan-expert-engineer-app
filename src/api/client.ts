import axios, { AxiosError, AxiosInstance } from 'axios';
import { env } from '@/config/env';
import { sessionStorage } from '@/services/storage/secureStore';

/**
 * Single axios instance for the whole app.
 *
 * `withCredentials` is deliberately absent — the backend also sets a cookie
 * on login, but a native app carries the Bearer token instead.
 */
export const api: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Attach the token per request rather than caching it in a module variable,
 * so a logout in one place cannot leave a stale header behind.
 */
api.interceptors.request.use(async (config) => {
  const token = await sessionStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * A 401 means the token is gone, expired, or the account was deactivated
 * mid-session. The session is cleared here; AuthContext registers a listener
 * to route the engineer out with an explanation rather than a silent bounce.
 */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  onUnauthorized = handler;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await sessionStorage.clearSession();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

/** True when the request never reached the server. */
export const isNetworkError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false;
  return !error.response;
};

/** The backend's `message` field, when it sent one. */
export const serverMessage = (error: unknown): string | undefined => {
  if (!axios.isAxiosError(error)) return undefined;
  const data = error.response?.data as { message?: string } | undefined;
  return typeof data?.message === 'string' ? data.message : undefined;
};
