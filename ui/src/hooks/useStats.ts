/**
 * @fileoverview Stats Hook
 * @description Manages statistics polling and state.
 * @copyright 2025 Mustard Seed Networks. All rights reserved.
 * @license Proprietary
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { initialStats, isValidStats, type Stats, type TestResult } from '../types/api';
import { logWarn } from '../utils/logger';

/** Normalize test status string to valid Stats testStatus */
function normalizeTestStatus(status?: string): Stats['testStatus'] {
  switch (status) {
    case 'starting':
      return 'starting';
    case 'running':
      return 'running';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'error':
      return 'error';
    default:
      return 'idle';
  }
}

/** Map stats payload to Stats type */
function mapStatsPayload(payload: Partial<Stats>): Stats {
  return {
    packetsReceived: Number(payload.packetsReceived ?? 0),
    packetsSent: Number(payload.packetsSent ?? 0),
    bytesReceived: Number(payload.bytesReceived ?? 0),
    bytesSent: Number(payload.bytesSent ?? 0),
    currentPps: Number(payload.currentPps ?? 0),
    currentMbps: Number(payload.currentMbps ?? 0),
    uptime: Number(payload.uptime ?? 0),
    testStatus: normalizeTestStatus(payload.testStatus),
    currentTest: payload.currentTest ?? null,
  };
}

/** Check if test just completed (status transition to completed/error) */
function isTestCompleted(prev: string, curr: string): boolean {
  return (curr === 'completed' || curr === 'error') && prev !== 'completed' && prev !== 'error';
}

/** Check if new test is starting */
function isTestStarting(prev: string, curr: string): boolean {
  return curr === 'starting' && prev !== 'starting';
}

interface UseStatsOptions {
  /** Authenticated fetch function */
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  /** Whether currently connected */
  connected: boolean;
  /** Ref for storing interval ID (for cleanup on session expire) */
  statsIntervalRef: React.MutableRefObject<number | null>;
}

interface UseStatsResult {
  /** Current stats */
  stats: Stats;
  /** Update stats directly */
  setStats: React.Dispatch<React.SetStateAction<Stats>>;
  /** Current test result */
  testResult: TestResult | null;
  /** Update test result */
  setTestResult: React.Dispatch<React.SetStateAction<TestResult | null>>;
  /** Reset stats to initial values */
  resetStats: () => void;
}

/**
 * Hook for managing stats polling and state.
 * Automatically polls stats when connected and handles test status transitions.
 */
export function useStats({
  authFetch,
  connected,
  statsIntervalRef,
}: UseStatsOptions): UseStatsResult {
  const [stats, setStats] = useState<Stats>(initialStats);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const prevTestStatus = useRef<string>('idle');

  // Fetch test result when test completes
  const fetchTestResult = useCallback(async () => {
    try {
      const response = await authFetch('/api/v1/test/result');
      if (!response.ok) return;
      const data = (await response.json()) as TestResult;
      if (data.status === 'completed' || data.status === 'error') {
        setTestResult(data);
      }
    } catch (error) {
      logWarn('Failed to fetch test result', {
        component: 'useStats',
        action: 'fetchTestResult',
        additionalData: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }, [authFetch]);

  // Fetch stats
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Stats fetch with validation and status transitions
  const fetchStats = useCallback(async () => {
    try {
      const response = await authFetch('/api/v1/stats');
      if (!response.ok) {
        throw new Error('Failed to refresh stats');
      }
      const data: unknown = await response.json();
      if (!isValidStats(data)) {
        throw new Error('Invalid stats data received from server');
      }
      const newStats = mapStatsPayload(data as Partial<Stats>);
      setStats(newStats);

      // Handle test status transitions
      const prevStatus = prevTestStatus.current;
      const newStatus = newStats.testStatus;
      if (isTestCompleted(prevStatus, newStatus)) {
        void fetchTestResult();
      }
      if (isTestStarting(prevStatus, newStatus)) {
        setTestResult(null);
      }
      prevTestStatus.current = newStatus;
    } catch (error) {
      if ((error as Error).message === 'Unauthorized') {
        return;
      }
      logWarn('Stats polling failed', {
        component: 'useStats',
        action: 'fetchStats',
        additionalData: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }, [authFetch, fetchTestResult]);

  // Poll stats when connected
  useEffect(() => {
    if (!connected) {
      if (statsIntervalRef.current !== null) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      return;
    }

    statsIntervalRef.current = window.setInterval(() => {
      void fetchStats();
    }, 1000);
    void fetchStats();

    return () => {
      if (statsIntervalRef.current !== null) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    };
  }, [connected, fetchStats, statsIntervalRef]);

  // Reset stats to initial values
  const resetStats = useCallback(() => {
    setStats(initialStats);
    setTestResult(null);
    prevTestStatus.current = 'idle';
  }, []);

  return {
    stats,
    setStats,
    testResult,
    setTestResult,
    resetStats,
  };
}
