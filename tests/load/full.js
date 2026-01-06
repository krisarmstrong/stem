/**
 * The Stem - Full Load Test Suite
 *
 * Comprehensive load test combining:
 * - Authentication flows
 * - API endpoints
 * - WebSocket connections
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
 *   - 50 concurrent WebSocket connections
 */

import { check, group, sleep } from "k6";
import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";
import ws from "k6/ws";

// Custom metrics
const authFailures = new Counter("auth_failures");
const apiErrors = new Counter("api_errors");
const wsErrors = new Counter("ws_errors");
const overallErrorRate = new Rate("overall_error_rate");

const loginDuration = new Trend("login_duration", true);
const apiDuration = new Trend("api_duration", true);
const wsConnectDuration = new Trend("ws_connect_duration", true);

// Configuration
const BASE_URL = __ENV.STEM_URL || "http://localhost:8080";
const WS_URL = BASE_URL.replace("http://", "ws://").replace("https://", "wss://");
const USERNAME = __ENV.STEM_USER || "admin";
const PASSWORD = __ENV.STEM_PASS || "password";

// Test options - full production simulation
export const options = {
  scenarios: {
    // API users - typical web usage pattern
    api_users: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 25 }, // Ramp up
        { duration: "3m", target: 50 }, // Normal load
        { duration: "2m", target: 100 }, // Peak load
        { duration: "2m", target: 100 }, // Sustained peak
        { duration: "1m", target: 50 }, // Return to normal
        { duration: "1m", target: 0 }, // Ramp down
      ],
      exec: "apiUserFlow",
    },
    // WebSocket users - long-running dashboard connections
    ws_users: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 10 },
        { duration: "5m", target: 25 },
        { duration: "2m", target: 50 },
        { duration: "1m", target: 25 },
        { duration: "1m", target: 0 },
      ],
      exec: "wsUserFlow",
    },
    // Auth stress - login/logout cycles
    auth_stress: {
      executor: "constant-arrival-rate",
      rate: 5, // 5 auth operations per second
      timeUnit: "1s",
      duration: "5m",
      preAllocatedVUs: 20,
      startTime: "2m",
      exec: "authStressFlow",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<300", "p(99)<1000"], // Requests
    login_duration: ["p(99)<200"], // Login
    api_duration: ["p(99)<100"], // API
    ws_connect_duration: ["p(99)<2000"], // WebSocket
    overall_error_rate: ["rate<0.02"], // <2% errors overall
    auth_failures: ["count<100"],
    api_errors: ["count<100"],
    ws_errors: ["count<50"],
  },
};

// Shared token storage (per VU)
const tokenStore = {};

// Helper functions
function login() {
  const startTime = Date.now();
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { "Content-Type": "application/json" }, tags: { name: "login" } }
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
  group("Dashboard Load", function () {
    // Get modules
    const modulesRes = authGet(
      `${BASE_URL}/api/v1/modules`,
      tokens.accessToken,
      "modules"
    );
    if (!check(modulesRes, { "modules ok": (r) => r.status === 200 })) {
      apiErrors.add(1);
      overallErrorRate.add(1);
    } else {
      overallErrorRate.add(0);
    }

    // Get license
    const licenseRes = authGet(
      `${BASE_URL}/api/v1/license`,
      tokens.accessToken,
      "license"
    );
    check(licenseRes, { "license ok": (r) => r.status === 200 });

    // Get interfaces
    const ifacesRes = authGet(
      `${BASE_URL}/api/v1/interfaces`,
      tokens.accessToken,
      "interfaces"
    );
    check(ifacesRes, { "interfaces ok": (r) => r.status === 200 });

    // Get health
    const healthRes = authGet(
      `${BASE_URL}/api/v1/health`,
      tokens.accessToken,
      "health"
    );
    check(healthRes, { "health ok": (r) => r.status === 200 });
  });

  sleep(2);

  group("Browse Modules", function () {
    // Browse through modules
    const modules = ["benchmark", "servicetest", "reflector", "trafficgen"];
    for (const mod of modules) {
      const res = authGet(
        `${BASE_URL}/api/v1/modules/${mod}`,
        tokens.accessToken,
        `module_${mod}`
      );
      check(res, { [`${mod} ok`]: (r) => r.status === 200 });
      sleep(0.5);
    }
  });

  sleep(1);

  // Logout
  http.post(
    `${BASE_URL}/api/v1/auth/logout`,
    JSON.stringify({}),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      tags: { name: "logout" },
    }
  );

  sleep(2);
}

// Scenario: WebSocket User Flow
export function wsUserFlow() {
  // Login first
  const tokens = login();
  if (!tokens) {
    authFailures.add(1);
    overallErrorRate.add(1);
    return;
  }

  const wsUrl = `${WS_URL}/api/v1/ws/test?token=${tokens.accessToken}`;
  const connectStart = Date.now();

  const res = ws.connect(wsUrl, null, function (socket) {
    wsConnectDuration.add(Date.now() - connectStart);

    socket.on("open", function () {
      overallErrorRate.add(0);

      // Subscribe to updates
      socket.send(JSON.stringify({ type: "subscribe", channel: "test_updates" }));
    });

    socket.on("message", function (message) {
      // Just receive messages
    });

    socket.on("error", function (e) {
      wsErrors.add(1);
      overallErrorRate.add(1);
    });

    // Keep connection for 30-60 seconds (simulating dashboard user)
    const duration = 30 + Math.random() * 30;
    socket.setTimeout(function () {
      // Send periodic pings
      for (let i = 0; i < Math.floor(duration / 5); i++) {
        socket.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
        sleep(5);
      }
      socket.close();
    }, 1000);
  });

  if (!res || res.status !== 101) {
    wsErrors.add(1);
    overallErrorRate.add(1);
  }

  sleep(5);
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
      headers: { "Content-Type": "application/json" },
      tags: { name: "refresh" },
    }
  );

  if (!check(refreshRes, { "refresh ok": (r) => r.status === 200 })) {
    authFailures.add(1);
    overallErrorRate.add(1);
  } else {
    overallErrorRate.add(0);
  }

  sleep(0.5);

  // Logout
  http.post(
    `${BASE_URL}/api/v1/auth/logout`,
    JSON.stringify({}),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      tags: { name: "logout" },
    }
  );
}

// Teardown
export function teardown() {
  console.log("Full load test completed");
  console.log("Check k6 output for detailed metrics and threshold results");
}
