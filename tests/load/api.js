/**
 * The Stem - API Load Test
 *
 * Tests API endpoints under load:
 * - Health endpoints
 * - Module listing
 * - Test configuration
 * - License status
 *
 * Requirements:
 * - k6 (https://k6.io/docs/getting-started/installation/)
 * - Running stem server with auth credentials set
 *
 * Usage:
 *   export STEM_URL=http://localhost:8080
 *   export STEM_USER=admin
 *   export STEM_PASS=your-password
 *   k6 run api.js
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
const apiErrors = new Counter("api_errors");
const apiErrorRate = new Rate("api_error_rate");
const healthDuration = new Trend("health_check_duration", true);
const modulesDuration = new Trend("modules_list_duration", true);
const licenseDuration = new Trend("license_check_duration", true);

// Configuration
const BASE_URL = __ENV.STEM_URL || "http://localhost:8080";
const USERNAME = __ENV.STEM_USER || "admin";
const PASSWORD = __ENV.STEM_PASS || "password";

// Test options
export const options = {
  scenarios: {
    // Main API load test
    api_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 25 }, // Ramp up to 25 users
        { duration: "1m", target: 50 }, // Ramp up to 50 users
        { duration: "2m", target: 100 }, // Ramp up to 100 users
        { duration: "3m", target: 100 }, // Hold at 100 users
        { duration: "30s", target: 0 }, // Ramp down
      ],
      gracefulRampDown: "10s",
    },
    // Constant rate for throughput measurement
    throughput_test: {
      executor: "constant-arrival-rate",
      rate: 100, // 100 requests per second
      timeUnit: "1s",
      duration: "1m",
      preAllocatedVUs: 50,
      startTime: "7m30s", // Run after main test
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<200", "p(99)<500"], // 95% under 200ms, 99% under 500ms
    api_error_rate: ["rate<0.01"], // Less than 1% errors
    health_check_duration: ["p(99)<50"], // Health check p99 under 50ms
    modules_list_duration: ["p(99)<100"], // Modules list p99 under 100ms
  },
};

// Setup - authenticate and get token
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
    return { accessToken: null };
  }

  const body = JSON.parse(loginRes.body);
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
  };
}

// Helper to make authenticated requests
function authGet(url, token, tags) {
  return http.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    tags: tags,
  });
}

function authPost(url, body, token, tags) {
  return http.post(url, JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    tags: tags,
  });
}

// Main test function
export default function (data) {
  if (!data.accessToken) {
    console.error("No access token available");
    return;
  }

  // Test 1: Health Endpoints (unauthenticated)
  group("Health Endpoints", function () {
    // Liveness probe
    const startLive = Date.now();
    const liveRes = http.get(`${BASE_URL}/health/live`, {
      tags: { name: "health_live" },
    });
    healthDuration.add(Date.now() - startLive);

    const liveSuccess = check(liveRes, {
      "liveness probe returns 200": (r) => r.status === 200,
    });

    if (!liveSuccess) {
      apiErrors.add(1);
      apiErrorRate.add(1);
    } else {
      apiErrorRate.add(0);
    }

    // Readiness probe
    const readyRes = http.get(`${BASE_URL}/health/ready`, {
      tags: { name: "health_ready" },
    });

    const readySuccess = check(readyRes, {
      "readiness probe returns 200": (r) => r.status === 200,
    });

    if (!readySuccess) {
      apiErrors.add(1);
      apiErrorRate.add(1);
    } else {
      apiErrorRate.add(0);
    }

    // Detailed health (authenticated)
    const healthRes = authGet(
      `${BASE_URL}/api/v1/health`,
      data.accessToken,
      { name: "health_detailed" }
    );

    check(healthRes, {
      "detailed health returns 200": (r) => r.status === 200,
      "health response has status": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status !== undefined;
        } catch {
          return false;
        }
      },
    });
  });

  sleep(0.2);

  // Test 2: Module Endpoints
  group("Module Endpoints", function () {
    const startModules = Date.now();
    const modulesRes = authGet(
      `${BASE_URL}/api/v1/modules`,
      data.accessToken,
      { name: "modules_list" }
    );
    modulesDuration.add(Date.now() - startModules);

    const modulesSuccess = check(modulesRes, {
      "modules list returns 200": (r) => r.status === 200,
      "modules response is array": (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body);
        } catch {
          return false;
        }
      },
      "modules contains expected items": (r) => {
        try {
          const body = JSON.parse(r.body);
          const names = body.map((m) => m.name);
          return (
            names.includes("benchmark") &&
            names.includes("servicetest") &&
            names.includes("reflector")
          );
        } catch {
          return false;
        }
      },
    });

    if (!modulesSuccess) {
      apiErrors.add(1);
      apiErrorRate.add(1);
    } else {
      apiErrorRate.add(0);
    }

    // Get specific module
    const benchmarkRes = authGet(
      `${BASE_URL}/api/v1/modules/benchmark`,
      data.accessToken,
      { name: "module_benchmark" }
    );

    check(benchmarkRes, {
      "benchmark module returns 200": (r) => r.status === 200,
      "benchmark has test types": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.test_types && body.test_types.length > 0;
        } catch {
          return false;
        }
      },
    });
  });

  sleep(0.2);

  // Test 3: License Endpoint
  group("License Endpoint", function () {
    const startLicense = Date.now();
    const licenseRes = authGet(
      `${BASE_URL}/api/v1/license`,
      data.accessToken,
      { name: "license_status" }
    );
    licenseDuration.add(Date.now() - startLicense);

    const licenseSuccess = check(licenseRes, {
      "license returns 200": (r) => r.status === 200,
      "license has tier info": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.tier !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (!licenseSuccess) {
      apiErrors.add(1);
      apiErrorRate.add(1);
    } else {
      apiErrorRate.add(0);
    }
  });

  sleep(0.2);

  // Test 4: Interfaces Endpoint
  group("Interfaces Endpoint", function () {
    const interfacesRes = authGet(
      `${BASE_URL}/api/v1/interfaces`,
      data.accessToken,
      { name: "interfaces_list" }
    );

    check(interfacesRes, {
      "interfaces returns 200": (r) => r.status === 200,
      "interfaces response is array": (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body);
        } catch {
          return false;
        }
      },
    });
  });

  sleep(0.2);

  // Test 5: Invalid Endpoints (404 handling)
  group("Error Handling", function () {
    const notFoundRes = authGet(
      `${BASE_URL}/api/v1/nonexistent`,
      data.accessToken,
      { name: "not_found" }
    );

    check(notFoundRes, {
      "nonexistent endpoint returns 404": (r) => r.status === 404,
    });

    // Invalid auth token
    const invalidAuthRes = http.get(`${BASE_URL}/api/v1/modules`, {
      headers: {
        Authorization: "Bearer invalid-token",
      },
      tags: { name: "invalid_auth" },
    });

    check(invalidAuthRes, {
      "invalid token returns 401": (r) => r.status === 401,
    });
  });

  sleep(0.5);
}

// Teardown
export function teardown(data) {
  // Logout
  if (data.accessToken) {
    http.post(
      `${BASE_URL}/api/v1/auth/logout`,
      JSON.stringify({}),
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.accessToken}`,
        },
      }
    );
  }
  console.log("API load test completed");
}
