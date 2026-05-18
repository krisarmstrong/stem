/**
 * RoleContext — global stem role (Reflector vs Test Master).
 *
 * A single stem instance runs in exactly one role at a time. The role
 * is selected on first boot (Setup Wizard) and can be switched at any
 * time via the header RoleChip. The selection persists to localStorage
 * under the key `stem-role` so it survives reload.
 *
 * The backend role-switch endpoint does not exist yet; see
 * TODO(#66) below — for now the chip updates the local context only.
 */
import {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type StemRole = 'reflector' | 'test_master';

export const ROLE_STORAGE_KEY = 'stem-role';
export const DEFAULT_ROLE: StemRole = 'reflector';

function readPersistedRole(): StemRole {
  if (typeof window === 'undefined') {
    return DEFAULT_ROLE;
  }
  const raw = window.localStorage.getItem(ROLE_STORAGE_KEY);
  if (raw === 'reflector' || raw === 'test_master') {
    return raw;
  }
  return DEFAULT_ROLE;
}

export interface RoleContextValue {
  role: StemRole;
  setRole: (role: StemRole) => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

interface RoleProviderProps {
  children: ReactNode;
}

export const RoleProvider: FC<RoleProviderProps> = ({ children }) => {
  const [role, setRoleState] = useState<StemRole>(() => readPersistedRole());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(ROLE_STORAGE_KEY, role);
  }, [role]);

  const setRole = useCallback((next: StemRole): void => {
    // TODO(#66): wire to backend role-switch when endpoint exists.
    // Today we only update local context + persist to localStorage.
    setRoleState(next);
  }, []);

  const value = useMemo<RoleContextValue>(() => ({ role, setRole }), [role, setRole]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error('useRole must be used inside <RoleProvider>');
  }
  return ctx;
}
