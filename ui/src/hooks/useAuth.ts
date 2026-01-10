/**
 * @fileoverview Authentication Hook
 * @description Manages authentication state, login/logout, and token refresh.
 * @copyright 2025 Mustard Seed Networks. All rights reserved.
 * @license Proprietary
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { isValidAuthResponse } from '../types/api';
import { logWarn } from '../utils/logger';

const AUTH_FLAG_KEY = 'stem-authenticated';

interface UseAuthResult {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether a login request is in progress */
  loginLoading: boolean;
  /** Error message from last login attempt */
  loginError: string | null;
  /** Whether connected to the backend */
  connected: boolean;
  /** Handle login form submission */
  handleLogin: (username: string, password: string) => Promise<void>;
  /** Handle logout */
  handleLogout: () => Promise<void>;
  /** Expire the session with an optional message */
  expireSession: (message?: string) => void;
  /** Authenticated fetch wrapper with token refresh */
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  /** Set connected state */
  setConnected: (connected: boolean) => void;
  /** Clear login error */
  clearLoginError: () => void;
  /** Stats polling interval ref (for cleanup on session expire) */
  statsIntervalRef: React.MutableRefObject<number | null>;
}

/**
 * Hook for managing authentication state and operations.
 * Handles login, logout, token refresh, and session expiration.
 */
export function useAuth(): UseAuthResult {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(AUTH_FLAG_KEY) === 'true';
    }
    return false;
  });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(AUTH_FLAG_KEY) === 'true';
    }
    return false;
  });
  const statsIntervalRef = useRef<number | null>(null);

  // Expire session handler
  const expireSession = useCallback((message = 'Session expired. Please sign in again.') => {
    if (statsIntervalRef.current !== null) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    setIsAuthenticated(false);
    setConnected(false);
    setLoginError(message);
    window.localStorage.removeItem(AUTH_FLAG_KEY);
  }, []);

  // Token refresh function
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  // Authenticated fetch wrapper
  const authFetch = useCallback(
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Auth logic with retry requires branching
    async (input: RequestInfo, init: RequestInit = {}): Promise<Response> => {
      if (!isAuthenticated) {
        throw new Error('Not authenticated');
      }
      const headers = new Headers(init.headers || {});
      if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      let response = await fetch(input, { ...init, headers, credentials: 'include' });

      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          response = await fetch(input, { ...init, headers, credentials: 'include' });
          if (response.ok) {
            return response;
          }
        }
        expireSession();
        throw new Error('Unauthorized');
      }

      if (response.status === 403) {
        expireSession('Access forbidden. Please sign in again.');
        throw new Error('Forbidden');
      }
      return response;
    },
    [expireSession, isAuthenticated, refreshAccessToken],
  );

  // Login handler
  const handleLogin = useCallback(async (username: string, password: string): Promise<void> => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const text = (await response.text()) || 'Authentication failed';
        setLoginError(text);
        setConnected(false);
        return;
      }
      const data: unknown = await response.json();
      if (!isValidAuthResponse(data)) {
        setLoginError('Authentication failed');
        setConnected(false);
        return;
      }
      setIsAuthenticated(true);
      window.localStorage.setItem(AUTH_FLAG_KEY, 'true');
      setLoginError(null);
      setConnected(true);
    } catch {
      setLoginError('Unable to reach authentication server.');
      setConnected(false);
    } finally {
      setLoginLoading(false);
    }
  }, []);

  // Logout handler
  const handleLogout = useCallback(async (): Promise<void> => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      logWarn('Logout API call failed', {
        component: 'useAuth',
        action: 'handleLogout',
        additionalData: { error: error instanceof Error ? error.message : String(error) },
      });
    }
    setIsAuthenticated(false);
    setConnected(false);
    setLoginError(null);
    window.localStorage.removeItem(AUTH_FLAG_KEY);
  }, []);

  // Clear login error
  const clearLoginError = useCallback(() => {
    setLoginError(null);
  }, []);

  // Sync auth flag with localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isAuthenticated) {
      window.localStorage.setItem(AUTH_FLAG_KEY, 'true');
    } else {
      window.localStorage.removeItem(AUTH_FLAG_KEY);
    }
  }, [isAuthenticated]);

  return {
    isAuthenticated,
    loginLoading,
    loginError,
    connected,
    handleLogin,
    handleLogout,
    expireSession,
    authFetch,
    setConnected,
    clearLoginError,
    statsIntervalRef,
  };
}
