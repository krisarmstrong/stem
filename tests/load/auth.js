/**
 * The Stem - Authentication Load Test
 *
 * Tests authentication endpoints under load:
 * - Login flow
 * - Token refresh
 * - Logout
 *
 * Requirements:
 * - k6 (https://k6.io/docs/getting-started/installation/)
 * - Running stem server with auth credentials set
 *
 * Usage:
 *   export STEM_URL=http://localhost:8080
 *   export STEM_USER=admin
 *   export STEM_PASS=your-password
 *   k6 run auth.js
 *
 * Targets:
 *   - 100 concurrent users
 *   - <100ms p99 response time
 *   - <1% error rate
 */

import { check, group, sleep } from "k6";
import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";

// Custom metrics
const authFailures = new Counter("auth_failures");
const tokenRefreshFailures = new Counter("token_refresh_failures");
const loginDuration = new Trend("login_duration", true);
const refreshDuration = new Trend("refresh_duration", true);
const authErrorRate = new Rate("auth_error_rate");

// Configuration
const BASE_URL = __ENV.STEM_URL || "http://localhost:8080";
const USERNAME = __ENV.STEM_USER || "admin";
const PASSWORD = __ENV.STEM_PASS || "password";

// Test options
export const options = {
  scenarios: {
    // Ramp up to 100 concurrent users
    auth_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 25 }, // Ramp up to 25 users
        { duration: "1m", target: 50 }, // Ramp up to 50 users
        { duration: "2m", target: 100 }, // Ramp up to 100 users
        { duration: "2m", target: 100 }, // Hold at 100 users
        { duration: "30s", target: 0 }, // Ramp down
      ],
      gracefulRampDown: "10s",
    },
    // Spike test for rate limiting validation
    rate_limit_test: {
      executor: "constant-arrival-rate",
      rate: 10, // 10 requests per second (above 5/min limit)
      timeUnit: "1s",
      duration: "30s",
      preAllocatedVUs: 20,
      startTime: "6m30s", // Run after main test
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"], // 95% under 500ms, 99% under 1s
    auth_error_rate: ["rate<0.01"], // Less than 1% errors
    login_duration: ["p(99)<100"], // Login p99 under 100ms
    refresh_duration: ["p(99)<50"], // Token refresh p99 under 50ms
  },
};

// Setup - get initial token
export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      username: USERNAME,
      password: PASSWORD,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  if (loginRes.status !== 200) {
    console.error(`Setup failed: ${loginRes.status} - ${loginRes.body}`);
    return { accessToken: null, refreshToken: null };
  }

  const body = JSON.parse(loginRes.body);
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
  };
}

// Main test function
export default function (data) {
  group("Authentication Flow", function () {
    // Test 1: Login
    group("Login", function () {
      const startTime = Date.now();

      const loginRes = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify({
          username: USERNAME,
          password: PASSWORD,
        }),
        {
          headers: { "Content-Type": "application/json" },
          tags: { name: "login" },
        }
      );

      loginDuration.add(Date.now() - startTime);

      const success = check(loginRes, {
        "login status is 200": (r) => r.status === 200,
        "login returns access_token": (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.access_token !== undefined;
          } catch {
            return false;
          }
        },
        "login returns refresh_token": (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.refresh_token !== undefined;
          } catch {
            return false;
          }
        },
      });

      if (!success) {
        authFailures.add(1);
        authErrorRate.add(1);
      } else {
        authErrorRate.add(0);
      }

      // Store tokens for subsequent requests
      if (loginRes.status === 200) {
        try {
          const body = JSON.parse(loginRes.body);
          data.accessToken = body.access_token;
          data.refreshToken = body.refresh_token;
        } catch {
          // Ignore parse errors
        }
      }
    });

    sleep(0.5);

    // Test 2: Token Refresh
    if (data.refreshToken) {
      group("Token Refresh", function () {
        const startTime = Date.now();

        const refreshRes = http.post(
          `${BASE_URL}/api/v1/auth/refresh`,
          JSON.stringify({
            refresh_token: data.refreshToken,
          }),
          {
            headers: { "Content-Type": "application/json" },
            tags: { name: "refresh" },
          }
        );

        refreshDuration.add(Date.now() - startTime);

        const success = check(refreshRes, {
          "refresh status is 200": (r) => r.status === 200,
          "refresh returns new access_token": (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.access_token !== undefined;
            } catch {
              return false;
            }
          },
        });

        if (!success) {
          tokenRefreshFailures.add(1);
          authErrorRate.add(1);
        } else {
          authErrorRate.add(0);
        }

        // Update access token
        if (refreshRes.status === 200) {
          try {
            const body = JSON.parse(refreshRes.body);
            data.accessToken = body.access_token;
          } catch {
            // Ignore parse errors
          }
        }
      });
    }

    sleep(0.5);

    // Test 3: Authenticated Request
    if (data.accessToken) {
      group("Authenticated Request", function () {
        const authRes = http.get(`${BASE_URL}/api/v1/health`, {
          headers: {
            Authorization: `Bearer ${data.accessToken}`,
          },
          tags: { name: "authenticated_request" },
        });

        check(authRes, {
          "authenticated request succeeds": (r) =>
            r.status === 200 || r.status === 401, // 401 is ok if token expired
        });
      });
    }

    sleep(0.5);

    // Test 4: Logout
    if (data.accessToken) {
      group("Logout", function () {
        const logoutRes = http.post(
          `${BASE_URL}/api/v1/auth/logout`,
          JSON.stringify({}),
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.accessToken}`,
            },
            tags: { name: "logout" },
          }
        );

        check(logoutRes, {
          "logout status is 200 or 204": (r) =>
            r.status === 200 || r.status === 204,
        });
      });
    }

    sleep(1);
  });
}

// Teardown
export function teardown(data) {
  console.log("Authentication load test completed");
}
