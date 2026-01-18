/**
 * @fileoverview Interfaces Hook
 * @description Manages network interface discovery and selection.
 * @copyright 2025 Mustard Seed Networks. All rights reserved.
 * @license Proprietary
 */

import { useCallback, useEffect, useState } from 'react';
import { type InterfaceInfo, isValidInterfaceArray } from '../types/api';

interface UseInterfacesOptions {
  /** Authenticated fetch function */
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  /** Whether authenticated */
  isAuthenticated: boolean;
  /** Set connected state */
  setConnected: (connected: boolean) => void;
}

interface UseInterfacesResult {
  /** List of available network interfaces */
  interfaces: InterfaceInfo[];
  /** Currently selected interface name */
  selectedInterface: string;
  /** Update selected interface */
  setSelectedInterface: (name: string) => void;
  /** Refresh interface list */
  fetchInterfaces: () => Promise<void>;
  /** Get the currently selected interface object */
  selectedInterfaceInfo: InterfaceInfo | undefined;
}

/**
 * Hook for managing network interface discovery and selection.
 * Automatically fetches interfaces on mount and auto-selects the best one.
 */
export function useInterfaces({
  authFetch,
  isAuthenticated,
  setConnected,
}: UseInterfacesOptions): UseInterfacesResult {
  const [interfaces, setInterfaces] = useState<InterfaceInfo[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>('');

  // Fetch available interfaces
  const fetchInterfaces = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    try {
      const response = await authFetch('/api/v1/interfaces');
      if (!response.ok) {
        throw new Error('Failed to load interfaces');
      }
      const data: unknown = await response.json();
      if (!isValidInterfaceArray(data)) {
        throw new Error('Invalid interface data received from server');
      }
      setInterfaces(data);
      // Auto-select highest scored interface
      if (data.length > 0) {
        setSelectedInterface((prev) => {
          if (prev) return prev;
          const best = data.reduce((a: InterfaceInfo, b: InterfaceInfo) =>
            a.score > b.score ? a : b,
          );
          return best.name;
        });
      }
      setConnected(true);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      if (err.message === 'Unauthorized') {
        return;
      }
      setConnected(false);
    }
  }, [authFetch, isAuthenticated, setConnected]);

  // Fetch interfaces on mount
  useEffect(() => {
    fetchInterfaces();
  }, [fetchInterfaces]);

  // Get selected interface object
  const selectedInterfaceInfo = interfaces.find((i) => i.name === selectedInterface);

  return {
    interfaces,
    selectedInterface,
    setSelectedInterface,
    fetchInterfaces,
    selectedInterfaceInfo,
  };
}
