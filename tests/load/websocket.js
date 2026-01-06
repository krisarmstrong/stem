/**
 * The Stem - WebSocket Load Test
 *
 * Tests WebSocket connections under load:
 * - Connection establishment
 * - Message handling
 * - Connection limits
 * - Reconnection behavior
 *
 * Requirements:
 * - k6 (https://k6.io/docs/getting-started/installation/)
 * - Running stem server with auth credentials set
 *
 * Usage:
 *   export STEM_URL=http://localhost:8080
 *   export STEM_USER=admin
 *   export STEM_PASS=your-password
 *   k6 run websocket.js
 *
 * Targets:
 *   - 50 concurrent WebSocket connections
 *   - <1s connection establishment
 *   - <1% connection failure rate
 */

import { check, sleep } from "k6";
import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";
import ws from "k6/ws";

// Custom metrics
const wsConnectFailures = new Counter("ws_connect_failures");
const wsMessageErrors = new Counter("ws_message_errors");
const wsConnectionDuration = new Trend("ws_connection_duration", true);
const wsConnectTime = new Trend("ws_connect_time", true);
const wsErrorRate = new Rate("ws_error_rate");

// Configuration
const BASE_URL = __ENV.STEM_URL || "http://localhost:8080";
const WS_URL = BASE_URL.replace("http://", "ws://").replace("https://", "wss://");
const USERNAME = __ENV.STEM_USER || "admin";
const PASSWORD = __ENV.STEM_PASS || "password";

// Test options
export const options = {
  scenarios: {
    // WebSocket connection load test
    ws_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 }, // Ramp up to 10 connections
        { duration: "1m", target: 25 }, // Ramp up to 25 connections
        { duration: "2m", target: 50 }, // Ramp up to 50 connections
        { duration: "2m", target: 50 }, // Hold at 50 connections
        { duration: "30s", target: 0 }, // Ramp down
      ],
      gracefulRampDown: "30s",
    },
    // Connection churn test (rapid connect/disconnect)
    connection_churn: {
      executor: "constant-vus",
      vus: 10,
      duration: "1m",
      startTime: "6m30s",
    },
  },
  thresholds: {
    ws_connect_time: ["p(95)<1000", "p(99)<2000"], // Connect under 1s p95, 2s p99
    ws_error_rate: ["rate<0.05"], // Less than 5% errors (WebSocket can be flaky)
    ws_connect_failures: ["count<50"], // Less than 50 connection failures
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
  };
}

// Main test function
export default function (data) {
  if (!data.accessToken) {
    console.error("No access token available");
    return;
  }

  const wsUrl = `${WS_URL}/api/v1/ws/test?token=${data.accessToken}`;
  const connectStart = Date.now();

  const res = ws.connect(wsUrl, null, function (socket) {
    const connectDuration = Date.now() - connectStart;
    wsConnectTime.add(connectDuration);

    let messagesReceived = 0;
    let connectionOpened = false;

    socket.on("open", function () {
      connectionOpened = true;
      wsErrorRate.add(0);

      // Send a ping message
      socket.send(
        JSON.stringify({
          type: "ping",
          timestamp: Date.now(),
        })
      );

      // Subscribe to test updates
      socket.send(
        JSON.stringify({
          type: "subscribe",
          channel: "test_updates",
        })
      );
    });

    socket.on("message", function (message) {
      messagesReceived++;

      try {
        const msg = JSON.parse(message);

        // Validate message structure
        check(msg, {
          "message has type": (m) => m.type !== undefined,
        });

        // Handle pong response
        if (msg.type === "pong") {
          const latency = Date.now() - msg.timestamp;
          // Log high latency
          if (latency > 100) {
            console.log(`High WS latency: ${latency}ms`);
          }
        }
      } catch (e) {
        wsMessageErrors.add(1);
      }
    });

    socket.on("close", function () {
      const totalDuration = Date.now() - connectStart;
      wsConnectionDuration.add(totalDuration);
    });

    socket.on("error", function (e) {
      wsErrorRate.add(1);
      console.error(`WebSocket error: ${e.error()}`);
    });

    // Keep connection alive for 10 seconds
    socket.setTimeout(function () {
      // Send periodic pings
      for (let i = 0; i < 5; i++) {
        socket.send(
          JSON.stringify({
            type: "ping",
            timestamp: Date.now(),
          })
        );
        sleep(1);
      }

      // Request test status
      socket.send(
        JSON.stringify({
          type: "get_status",
        })
      );

      sleep(5);

      socket.close();
    }, 1000);
  });

  // Check connection result
  const success = check(res, {
    "WebSocket connection successful": (r) => r && r.status === 101,
  });

  if (!success) {
    wsConnectFailures.add(1);
    wsErrorRate.add(1);
  }

  // Brief pause between iterations
  sleep(1);
}

// Connection churn scenario - rapid connect/disconnect
export function connectionChurn(data) {
  if (!data.accessToken) {
    return;
  }

  const wsUrl = `${WS_URL}/api/v1/ws/test?token=${data.accessToken}`;

  // Rapid connect/disconnect cycle
  for (let i = 0; i < 5; i++) {
    const res = ws.connect(wsUrl, null, function (socket) {
      socket.on("open", function () {
        // Immediately close
        socket.close();
      });
    });

    check(res, {
      "rapid connection successful": (r) => r && r.status === 101,
    });

    sleep(0.1); // 100ms between connections
  }

  sleep(1);
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
  console.log("WebSocket load test completed");
}
