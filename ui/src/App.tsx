/**
 * @fileoverview The Stem - Main Application Component
 * @description The primary React component that renders the test suite dashboard.
 *              Handles connection state, test execution, and real-time statistics display.
 * @copyright 2025 Mustard Seed Networks. All rights reserved.
 * @license Proprietary
 */

import {
  Activity,
  AlertTriangle,
  Clock,
  Gauge,
  HelpCircle,
  Lock,
  Moon,
  Play,
  RefreshCw,
  Settings,
  Square,
  Sun,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { FormEvent, ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { HelpDrawer } from './components/HelpDrawer';
import { SettingsDrawer } from './components/SettingsDrawer';

interface Stats {
  packetsReceived: number;
  packetsSent: number;
  bytesReceived: number;
  bytesSent: number;
  currentPps: number;
  currentMbps: number;
  uptime: number;
  testStatus: 'idle' | 'starting' | 'running' | 'completed' | 'cancelled' | 'error';
  currentTest: string | null;
}

interface InterfaceInfo {
  name: string;
  mac: string;
  speed: number;
  duplex: string;
  state: string;
  driver: string;
  physical: boolean;
  xdp: boolean;
  dpdk: boolean;
  score: number;
}

const initialStats: Stats = {
  packetsReceived: 0,
  packetsSent: 0,
  bytesReceived: 0,
  bytesSent: 0,
  currentPps: 0,
  currentMbps: 0,
  uptime: 0,
  testStatus: 'idle',
  currentTest: null,
};

function formatNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toString();
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getStatusClassName(status: Stats['testStatus']): string {
  switch (status) {
    case 'running':
      return 'text-[var(--color-status-success)]';
    case 'error':
      return 'text-[var(--color-status-error)]';
    case 'completed':
      return 'text-[var(--color-status-info)]';
    case 'starting':
      return 'text-[var(--color-status-info)]';
    case 'cancelled':
      return 'text-[var(--color-status-warning)]';
    default:
      return 'text-[var(--color-text-muted)]';
  }
}

interface StatsCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subvalue: string;
}

function StatsCard({ icon, title, value, subvalue }: StatsCardProps): ReactElement {
  return (
    <div className="card">
      <div className="card-header">
        {icon}
        {title}
      </div>
      <div className="card-value">{value}</div>
      <div className="card-subvalue">{subvalue}</div>
    </div>
  );
}

interface InterfaceDetailsProps {
  iface: InterfaceInfo;
}

function InterfaceDetails({ iface }: InterfaceDetailsProps): ReactElement {
  const stateClassName =
    iface.state === 'up'
      ? 'text-[var(--color-status-success)]'
      : 'text-[var(--color-status-error)]';

  return (
    <div className="card mb-6">
      <div className="card-header">
        <Wifi className="w-4 h-4" />
        Interface Details
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-[var(--color-text-muted)]">Name</div>
          <div className="font-medium">{iface.name}</div>
        </div>
        <div>
          <div className="text-[var(--color-text-muted)]">MAC</div>
          <div className="font-mono">{iface.mac}</div>
        </div>
        <div>
          <div className="text-[var(--color-text-muted)]">Speed</div>
          <div>
            {iface.speed} Mbps / {iface.duplex}
          </div>
        </div>
        <div>
          <div className="text-[var(--color-text-muted)]">Driver</div>
          <div>{iface.driver}</div>
        </div>
        <div>
          <div className="text-[var(--color-text-muted)]">State</div>
          <div className={stateClassName}>{iface.state}</div>
        </div>
        <div>
          <div className="text-[var(--color-text-muted)]">XDP Support</div>
          <div>{iface.xdp ? 'Yes' : 'No'}</div>
        </div>
        <div>
          <div className="text-[var(--color-text-muted)]">DPDK Support</div>
          <div>{iface.dpdk ? 'Yes' : 'No'}</div>
        </div>
        <div>
          <div className="text-[var(--color-text-muted)]">Score</div>
          <div>{iface.score}</div>
        </div>
      </div>
    </div>
  );
}

interface TestResultsProps {
  testStatus: Stats['testStatus'];
}

function TestResults({ testStatus }: TestResultsProps): ReactElement {
  let message: string;
  switch (testStatus) {
    case 'idle':
      message = 'No tests running. Configure tests in Settings and click Start.';
      break;
    case 'starting':
      message = 'Test is starting. Results will stream in shortly.';
      break;
    case 'running':
      message = 'Test in progress... Results will appear here when complete.';
      break;
    case 'completed':
      message = 'Test completed. Detailed results coming soon.';
      break;
    case 'cancelled':
      message = 'Test cancelled. Adjust settings or restart when ready.';
      break;
    case 'error':
      message = 'An error occurred during the test.';
      break;
    default:
      message = 'Waiting for the backend to report a status.';
  }

  return (
    <div className="card">
      <div className="card-header">
        <AlertTriangle className="w-4 h-4" />
        Test Results
      </div>
      <div className="text-center py-12 text-[var(--color-text-muted)]">
        <p>{message}</p>
      </div>
    </div>
  );
}

const TOKEN_STORAGE_KEY = 'stem-token';

interface TestEventPayload {
  status?: string;
  testType?: string | null;
  module?: string;
  success?: boolean;
  error?: string;
  message?: string;
  data?: unknown;
}

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

function App(): ReactElement {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(TOKEN_STORAGE_KEY);
    }
    return null;
  });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [connected, setConnected] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return Boolean(window.localStorage.getItem(TOKEN_STORAGE_KEY));
    }
    return false;
  });
  const [stats, setStats] = useState<Stats>(initialStats);
  const [interfaces, setInterfaces] = useState<InterfaceInfo[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>('');
  const [mode, setMode] = useState<'reflector' | 'test_master'>('test_master');
  const [selectedTests, setSelectedTests] = useState<string[]>([
    'rfc2544_throughput',
    'rfc2544_latency',
    'rfc2544_frame_loss',
    'rfc2544_back_to_back',
  ]);
  const [reflectorProfile, setReflectorProfile] = useState<string>('all');

  const expireSession = useCallback((message = 'Session expired. Please sign in again.') => {
    setToken(null);
    setConnected(false);
    setLoginError(message);
  }, []);

  const authFetch = useCallback(
    async (input: RequestInfo, init: RequestInit = {}) => {
      if (!token) {
        throw new Error('Missing authentication token');
      }
      const headers = new Headers(init.headers || {});
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      const response = await fetch(input, { ...init, headers });
      if (response.status === 401 || response.status === 403) {
        expireSession();
        throw new Error('Unauthorized');
      }
      return response;
    },
    [expireSession, token],
  );

  const fetchInterfaces = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const response = await authFetch('/api/interfaces');
      if (!response.ok) {
        throw new Error('Failed to load interfaces');
      }
      const data = (await response.json()) as InterfaceInfo[];
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
  }, [authFetch, token]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await authFetch('/api/stats');
      if (!response.ok) {
        throw new Error('Failed to refresh stats');
      }
      const data = await response.json();
      setStats(mapStatsPayload(data));
    } catch (error) {
      if ((error as Error).message === 'Unauthorized') {
        return;
      }
      // Silently ignore other polling failures
    }
  }, [authFetch]);

  const handleLogin = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoginLoading(true);
      setLoginError(null);
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        if (!response.ok) {
          const text = (await response.text()) || 'Authentication failed';
          setLoginError(text);
          setConnected(false);
          return;
        }
        const data = await response.json();
        if (!data?.token) {
          setLoginError('Authentication failed');
          setConnected(false);
          return;
        }
        setToken(data.token);
        setLoginError(null);
        setConnected(true);
      } catch (_error) {
        setLoginError('Unable to reach authentication server.');
        setConnected(false);
      } finally {
        setLoginLoading(false);
      }
    },
    [password, username],
  );

  const handleStartTest = useCallback(async (): Promise<void> => {
    if (!token) return;
    try {
      await authFetch('/api/test/start', {
        method: 'POST',
        body: JSON.stringify({
          interface: selectedInterface,
          testType: selectedTests[0] ?? 'throughput',
        }),
      });
    } catch (_error) {
      // Silently ignore test start errors
    }
  }, [authFetch, selectedInterface, selectedTests, token]);

  const handleStopTest = useCallback(async (): Promise<void> => {
    if (!token) return;
    try {
      await authFetch('/api/test/stop', { method: 'POST' });
    } catch (_error) {
      // Silently ignore test stop errors
    }
  }, [authFetch, token]);

  const handleWsMessage = useCallback((event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data) as TestEventPayload;
      const normalizedStatus = normalizeTestStatus(payload.status);
      setStats((prev) => ({
        ...prev,
        testStatus: normalizedStatus,
        currentTest: payload.testType ?? prev.currentTest,
      }));
    } catch (_error) {
      // Ignore malformed websocket messages
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, [token]);

  // Toggle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Fetch interfaces on mount
  useEffect(() => {
    fetchInterfaces();
  }, [fetchInterfaces]);

  // Poll stats when connected
  useEffect(() => {
    if (!connected) return;

    const interval = setInterval(() => {
      void fetchStats();
    }, 1000);
    void fetchStats();

    return () => clearInterval(interval);
  }, [connected, fetchStats]);

  useEffect(() => {
    if (!token) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: number | undefined;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const hostname = window.location.hostname;
      const port = window.location.port === '3000' ? '8080' : window.location.port;
      const portSegment = port ? `:${port}` : '';
      const wsUrl = `${protocol}://${hostname}${portSegment}/api/ws/test-results?token=${token}`;
      ws = new WebSocket(wsUrl);
      ws.onmessage = handleWsMessage;
      ws.onclose = () => {
        reconnectTimer = window.setTimeout(connect, 3000);
      };
      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      ws?.close();
    };
  }, [handleWsMessage, token]);

  const toggleDarkMode = (): void => {
    setDarkMode(!darkMode);
  };

  const openHelp = (): void => {
    setHelpOpen(true);
  };

  const openSettings = (): void => {
    setSettingsOpen(true);
  };

  const selectedIface = interfaces.find((i) => i.name === selectedInterface);

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)]">
      {/* Header */}
      <header className="bg-[var(--color-surface-raised)] border-b border-[var(--color-surface-border)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-stem-green)] flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">The Stem</h1>
                <p className="text-xs text-[var(--color-text-muted)]">Mustard Seed Networks</p>
              </div>
            </div>

            {/* Connection Status */}
            <div className={`status-badge ${connected ? 'success' : 'error'}`}>
              {connected ? (
                <>
                  <Wifi className="w-3 h-3" /> Connected
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" /> Disconnected
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="btn btn-ghost"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchInterfaces}
              className="btn btn-ghost"
              title="Refresh interfaces"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {/* Help */}
            <button
              type="button"
              onClick={openHelp}
              className="btn btn-ghost"
              title="Help & Documentation"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {/* Settings */}
            <button type="button" onClick={openSettings} className="btn btn-secondary">
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Test Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <select
              value={selectedInterface}
              onChange={(e) => setSelectedInterface(e.target.value)}
              className="w-48"
            >
              <option value="">Select Interface</option>
              {interfaces.map((iface) => (
                <option key={iface.name} value={iface.name}>
                  {iface.name} ({iface.speed}Mbps)
                </option>
              ))}
            </select>

            {stats.testStatus === 'running' ? (
              <button type="button" onClick={handleStopTest} className="btn btn-secondary">
                <Square className="w-4 h-4" />
                Stop Test
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartTest}
                className="btn btn-primary"
                disabled={!selectedInterface}
              >
                <Play className="w-4 h-4" />
                Start Test
              </button>
            )}
          </div>

          {stats.currentTest && (
            <div className="status-badge warning">Running: {stats.currentTest}</div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            icon={<Activity className="w-4 h-4" />}
            title="Packets Received"
            value={formatNumber(stats.packetsReceived)}
            subvalue={`${formatNumber(stats.bytesReceived)} bytes`}
          />
          <StatsCard
            icon={<Activity className="w-4 h-4" />}
            title="Packets Sent"
            value={formatNumber(stats.packetsSent)}
            subvalue={`${formatNumber(stats.bytesSent)} bytes`}
          />
          <StatsCard
            icon={<Gauge className="w-4 h-4" />}
            title="Current Rate"
            value={`${formatNumber(stats.currentPps)} pps`}
            subvalue={`${stats.currentMbps.toFixed(2)} Mbps`}
          />
          <div className="card">
            <div className="card-header">
              <Clock className="w-4 h-4" />
              Uptime
            </div>
            <div className="card-value font-mono">{formatUptime(stats.uptime)}</div>
            <div className="card-subvalue">
              Status:{' '}
              <span className={getStatusClassName(stats.testStatus)}>{stats.testStatus}</span>
            </div>
          </div>
        </div>

        {/* Interface Details */}
        {selectedIface && <InterfaceDetails iface={selectedIface} />}

        {/* Results Area */}
        <TestResults testStatus={stats.testStatus} />
      </main>

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        mode={mode}
        setMode={setMode}
        interfaces={interfaces}
        selectedInterface={selectedInterface}
        setSelectedInterface={setSelectedInterface}
        selectedTests={selectedTests}
        setSelectedTests={setSelectedTests}
        reflectorProfile={reflectorProfile}
        setReflectorProfile={setReflectorProfile}
      />

      {/* Help Drawer */}
      <HelpDrawer isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      {!token && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
              <Lock className="w-5 h-5 text-[var(--color-stem-green)]" />
              Sign in to continue
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              Authenticate with your Stem credentials. Default dev account: admin / admin.
            </p>
            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              <div>
                <label
                  htmlFor="stem-login-username"
                  className="text-xs font-semibold text-[var(--color-text-muted)]"
                >
                  Username
                </label>
                <input
                  id="stem-login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-stem-green)] focus:outline-none focus:ring-2 focus:ring-[var(--color-stem-green)]/30"
                />
              </div>
              <div>
                <label
                  htmlFor="stem-login-password"
                  className="text-xs font-semibold text-[var(--color-text-muted)]"
                >
                  Password
                </label>
                <input
                  id="stem-login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-stem-green)] focus:outline-none focus:ring-2 focus:ring-[var(--color-stem-green)]/30"
                />
              </div>
              {loginError && (
                <p className="text-xs text-[var(--color-status-error)]">{loginError}</p>
              )}
              <button
                type="submit"
                className="btn btn-primary w-full justify-center"
                disabled={loginLoading}
              >
                {loginLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
