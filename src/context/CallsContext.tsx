import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { engineerCallsApi } from '@/api/endpoints/engineerCalls';
import { isNetworkError, serverMessage } from '@/api/client';
import type { EngineerCall, EngineerCallSummary } from '@/types/call';

const EMPTY_SUMMARY: EngineerCallSummary = {
  totalCount: 0,
  pendingCount: 0,
  inProgressCount: 0,
  completedCount: 0,
};

interface CallsContextValue {
  calls: EngineerCall[];
  summary: EngineerCallSummary;
  loading: boolean;
  refreshing: boolean;
  errorMessage: string | null;
  /** Re-fetches the assigned list. Pass true for a pull-to-refresh. */
  refresh: (isRefresh?: boolean) => Promise<void>;
  getById: (id: string) => EngineerCall | undefined;
  /** Patches one call in place after a successful update, without a refetch. */
  applyUpdate: (updated: EngineerCall) => void;
}

const CallsContext = createContext<CallsContextValue | undefined>(undefined);

/**
 * Holds the assigned-call list once, shared between the list screen and the
 * job-detail screen. There is no GET /engineer-calls/:id endpoint on the
 * backend — the list is the only source for a single call's full document,
 * so both screens read from here rather than each fetching independently.
 */
export const CallsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [calls, setCalls] = useState<EngineerCall[]>([]);
  const [summary, setSummary] = useState<EngineerCallSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setErrorMessage(null);

    try {
      const response = await engineerCallsApi.getAssignedCalls();
      setCalls(response.calls);
      setSummary(response.summary);
    } catch (error) {
      const message = isNetworkError(error)
        ? 'Could not reach the server. Pull down to try again once you have signal.'
        : (serverMessage(error) ?? 'Could not load your jobs. Try again.');
      setErrorMessage(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  const getById = useCallback((id: string) => calls.find((c) => c._id === id), [calls]);

  const applyUpdate = useCallback((updated: EngineerCall) => {
    setCalls((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
  }, []);

  const value = useMemo<CallsContextValue>(
    () => ({ calls, summary, loading, refreshing, errorMessage, refresh, getById, applyUpdate }),
    [calls, summary, loading, refreshing, errorMessage, refresh, getById, applyUpdate]
  );

  return <CallsContext.Provider value={value}>{children}</CallsContext.Provider>;
};

export const useCalls = (): CallsContextValue => {
  const context = useContext(CallsContext);
  if (!context) {
    throw new Error('useCalls must be used within a CallsProvider');
  }
  return context;
};
