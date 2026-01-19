/**
 * The Stem - Full Load Test Suite
 *
 * Comprehensive load test combining:
 * - Authentication flows
 * - API endpoints
 * - SSE connections
 *
 * This test runs all scenarios to simulate realistic production load.
 *
 * Requirements:
 * - k6 (https://k6.io/docs/getting-started/installation/)
 * - Running stem server with auth credentials set
 *
 * Usage:
 *   export STEM_URL=http://localhost:8080
 *   export STEM_USER=admin
 *   export STEM_PASS=your-password
 *   k6 run full.js
 *
 * Targets:
 *   - 100 concurrent users
 *   - <100ms p99 for API requests
 *   - <1% error rate
 *   - 50 concurrent SSE connections
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const authFailures = new Counter('auth_failures');
const apiErrors = new Counter('api_errors');
const sseErrors = new Counter('sse_errors');
const overallErrorRate = new Rate('overall_error_rate');

const loginDuration = new Trend('login_duration', true);
const apiDuration = new Trend('api_duration', true);
const sseConnectDuration = new Trend('sse_connect_duration', true);

// Configuration
const BASE_URL = __ENV.STEM_URL || 'http://localhost:8080';
const USERNAME = __ENV.STEM_USER || 'admin';
const PASSWORD = __ENV.STEM_PASS || 'password';

// Test options - full production simulation
export const options = {
  scenarios: {
    // API users - typical web usage pattern
    api_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 25 }, // Ramp up
        { duration: '3m', target: 50 }, // Normal load
        { duration: '2m', target: 100 }, // Peak load
        { duration: '2m', target: 100 }, // Sustained peak
        { duration: '1m', target: 50 }, // Return to normal
        { duration: '1m', target: 0 }, // Ramp down
      ],
      exec: 'apiUserFlow',
    },
    // SSE users - long-running dashboard connections
    sse_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '5m', target: 25 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 25 },
        { duration: '1m', target: 0 },
      ],
      exec: 'sseUserFlow',
    },
    // Auth stress - login/logout cycles
    auth_stress: {
      executor: 'constant-arrival-rate',
      rate: 5, // 5 auth operations per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 20,
      startTime: '2m',
      exec: 'authStressFlow',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<1000'], // Requests
    login_duration: ['p(99)<200'], // Login
    api_duration: ['p(99)<100'], // API
    sse_connect_duration: ['p(99)<2000'], // SSE
    overall_error_rate: ['rate<0.02'], // <2% errors overall
    auth_failures: ['count<100'],
    api_errors: ['count<100'],
    sse_errors: ['count<50'],
  },
};

// Shared token storage (per VU) - prefixed to indicate intentionally unused in this scope
// biome-ignore lint/correctness/noUnusedVariables: k6 shared state variable
const _tokenStore = {};

// Helper functions
function login() {
  const startTime = Date.now();
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } },
  );
  loginDuration.add(Date.now() - startTime);

  if (res.status === 200) {
    try {
      const body = JSON.parse(res.body);
      return {
        accessToken: body.access_token,
        refreshToken: body.refresh_token,
      };
    } catch {
      return null;
    }
  }
  return null;
}

function authGet(url, token, name) {
  const startTime = Date.now();
  const res = http.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { name: name },
  });
  apiDuration.add(Date.now() - startTime);
  return res;
}

// Scenario: API User Flow
export function apiUserFlow() {
  // Login
  const tokens = login();
  if (!tokens) {
    authFailures.add(1);
    overallErrorRate.add(1);
    return;
  }
  overallErrorRate.add(0);

  // Typical user session
  group('Dashboard Load', () => {
    // Get modules
    const modulesRes = authGet(`${BASE_URL}/api/v1/modules`, tokens.accessToken, 'modules');
    if (!check(modulesRes, { 'modules ok': (r) => r.status === 200 })) {
      apiErrors.add(1);
      overallErrorRate.add(1);
    } else {
      overallErrorRate.add(0);
    }

    // Get license
    const licenseRes = authGet(`${BASE_URL}/api/v1/license`, tokens.accessToken, 'license');
    check(licenseRes, { 'license ok': (r) => r.status === 200 });

    // Get interfaces
    const ifacesRes = authGet(`${BASE_URL}/api/v1/interfaces`, tokens.accessToken, 'interfaces');
    check(ifacesRes, { 'interfaces ok': (r) => r.status === 200 });

    // Get health
    const healthRes = authGet(`${BASE_URL}/api/v1/health`, tokens.accessToken, 'health');
    check(healthRes, { 'health ok': (r) => r.status === 200 });
  });

  sleep(2);

  group('Browse Modules', () => {
    // Browse through modules
    const modules = ['benchmark', 'servicetest', 'reflector', 'trafficgen'];
    for (const mod of modules) {
      const res = authGet(`${BASE_URL}/api/v1/modules/${mod}`, tokens.accessToken, `module_${mod}`);
      check(res, { [`${mod} ok`]: (r) => r.status === 200 });
      sleep(0.5);
    }
  });

  sleep(1);

  // Logout
  http.post(`${BASE_URL}/api/v1/auth/logout`, JSON.stringify({}), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.accessToken}`,
    },
    tags: { name: 'logout' },
  });

  sleep(2);
}

// Scenario: SSE User Flow
// Note: k6 doesn't natively support SSE, so we simulate with long-polling HTTP requests
export function sseUserFlow() {
  // Login first
  const tokens = login();
  if (!tokens) {
    authFailures.add(1);
    overallErrorRate.add(1);
    return;
  }

  const connectStart = Date.now();

  // Simulate SSE connection by making a streaming request to the events endpoint
  const res = http.get(`${BASE_URL}/api/v1/events`, {
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      Accept: 'text/event-stream',
    },
    tags: { name: 'sse_connect' },
    timeout: '60s',
  });

  sseConnectDuration.add(Date.now() - connectStart);

  if (res.status === 200) {
    overallErrorRate.add(0);
  } else {
    sseErrors.add(1);
    overallErrorRate.add(1);
  }

  // Keep connection active for 30-60 seconds (simulating dashboard user)
  const duration = 30 + Math.random() * 30;
  sleep(duration);
}

// Scenario: Auth Stress Flow
export function authStressFlow() {
  // Rapid login
  const tokens = login();
  if (!tokens) {
    authFailures.add(1);
    overallErrorRate.add(1);
    return;
  }
  overallErrorRate.add(0);

  sleep(0.5);

  // Token refresh
  const refreshRes = http.post(
    `${BASE_URL}/api/v1/auth/refresh`,
    JSON.stringify({ refresh_token: tokens.refreshToken }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'refresh' },
    },
  );

  if (!check(refreshRes, { 'refresh ok': (r) => r.status === 200 })) {
    authFailures.add(1);
    overallErrorRate.add(1);
  } else {
    overallErrorRate.add(0);
  }

  sleep(0.5);

  // Logout
  http.post(`${BASE_URL}/api/v1/auth/logout`, JSON.stringify({}), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.accessToken}`,
    },
    tags: { name: 'logout' },
  });
}

// Teardown
export function teardown() {
  // biome-ignore lint/suspicious/noConsole: k6 teardown output is expected
  console.log('Full load test completed');
  // biome-ignore lint/suspicious/noConsole: k6 teardown output is expected
  console.log('Check k6 output for detailed metrics and threshold results');
}
