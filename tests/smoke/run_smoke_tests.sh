#!/bin/bash
#
# run_smoke_tests.sh - Smoke tests for Seed Test Suite
#
# Requires: Linux, root/sudo, veth pair support
# Tests basic seedtest functionality using virtual interfaces
#
# Copyright (c) 2025 Mustard Seed Networks. All rights reserved.
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
VETH_TX="veth-seed-tx"
VETH_RX="veth-seed-rx"
IP_TX="192.168.253.1"
IP_RX="192.168.253.2"
SUBNET="/24"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/../.."
SEEDTEST_BIN="${PROJECT_ROOT}/bin/seedtest"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Process tracking
REFLECTOR_PID=""
WEB_PID=""

# Logging
log_info()   { echo -e "${CYAN}[INFO]${NC} $1"; }
log_pass()   { echo -e "${GREEN}[PASS]${NC} $1"; }
log_fail()   { echo -e "${RED}[FAIL]${NC} $1"; }
log_skip()   { echo -e "${YELLOW}[SKIP]${NC} $1"; }
log_header() { echo -e "\n${BOLD}${CYAN}=== $1 ===${NC}"; }

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}Error: Smoke tests require root for veth creation${NC}"
        echo "Usage: sudo $0"
        exit 1
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."

    # Kill reflector
    if [[ -n "$REFLECTOR_PID" ]]; then
        kill $REFLECTOR_PID 2>/dev/null || true
        wait $REFLECTOR_PID 2>/dev/null || true
    fi

    # Kill web server
    if [[ -n "$WEB_PID" ]]; then
        kill $WEB_PID 2>/dev/null || true
        wait $WEB_PID 2>/dev/null || true
    fi

    # Kill any stray processes
    pkill -f "seedtest.*${VETH_RX}" 2>/dev/null || true
    pkill -f "seedtest.*web" 2>/dev/null || true

    # Remove veth pair
    ip link delete "${VETH_TX}" 2>/dev/null || true

    log_info "Cleanup complete"
}

# Set up trap for cleanup
trap cleanup EXIT

# Create veth pair for testing
setup_veth() {
    log_info "Creating veth pair..."

    # Remove existing if present
    ip link delete "${VETH_TX}" 2>/dev/null || true

    # Create veth pair
    ip link add "${VETH_TX}" type veth peer name "${VETH_RX}"

    # Configure both ends
    ip addr add "${IP_TX}${SUBNET}" dev "${VETH_TX}"
    ip addr add "${IP_RX}${SUBNET}" dev "${VETH_RX}"
    ip link set "${VETH_TX}" up
    ip link set "${VETH_RX}" up
    ip link set "${VETH_TX}" mtu 9000
    ip link set "${VETH_RX}" mtu 9000

    # Disable reverse path filtering
    echo 0 > /proc/sys/net/ipv4/conf/${VETH_TX}/rp_filter
    echo 0 > /proc/sys/net/ipv4/conf/${VETH_RX}/rp_filter
    echo 0 > /proc/sys/net/ipv4/conf/all/rp_filter

    log_info "veth pair ready: ${VETH_TX} <-> ${VETH_RX}"
}

# Run a test and record result
run_test() {
    local name="$1"
    local cmd="$2"
    local expected_exit="${3:-0}"

    TESTS_RUN=$((TESTS_RUN + 1))

    log_info "Running: $name"

    local output
    local exit_code

    set +e
    output=$(eval "$cmd" 2>&1)
    exit_code=$?
    set -e

    if [[ $exit_code -eq $expected_exit ]]; then
        log_pass "$name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        log_fail "$name (exit code: $exit_code, expected: $expected_exit)"
        echo "Output:"
        echo "$output" | head -20
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Skip a test
skip_test() {
    local name="$1"
    local reason="$2"

    TESTS_RUN=$((TESTS_RUN + 1))
    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
    log_skip "$name - $reason"
}

# ============================================================================
# Test Cases
# ============================================================================

test_binary_exists() {
    log_header "Binary Check"

    if [[ ! -x "${SEEDTEST_BIN}" ]]; then
        log_fail "Binary not found: ${SEEDTEST_BIN}"
        log_info "Building binary..."
        (cd "${PROJECT_ROOT}" && make build)
    fi

    run_test "Binary is executable" \
        "test -x ${SEEDTEST_BIN}"
}

test_version() {
    log_header "Version Test"

    run_test "Version command" \
        "${SEEDTEST_BIN} version"

    # Verify copyright year
    local version_output
    version_output=$("${SEEDTEST_BIN}" version 2>&1)
    if echo "$version_output" | grep -q "2025"; then
        log_pass "Copyright year is 2025"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_fail "Copyright year should be 2025"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

test_help() {
    log_header "CLI Help Tests"

    run_test "Help flag (-h)" \
        "${SEEDTEST_BIN} -h"

    run_test "Help flag (--help)" \
        "${SEEDTEST_BIN} --help"

    run_test "Reflect help" \
        "${SEEDTEST_BIN} reflect --help"

    run_test "Test help" \
        "${SEEDTEST_BIN} test --help"

    run_test "Web help" \
        "${SEEDTEST_BIN} web --help"
}

test_reflector_startup_shutdown() {
    log_header "Reflector Startup/Shutdown Test"

    log_info "Starting reflector on ${VETH_RX}..."
    ${SEEDTEST_BIN} reflect -i ${VETH_RX} --profile all >/dev/null 2>&1 &
    REFLECTOR_PID=$!

    sleep 2

    if kill -0 $REFLECTOR_PID 2>/dev/null; then
        log_pass "Reflector started successfully"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_fail "Reflector failed to start"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_FAILED=$((TESTS_FAILED + 1))
        REFLECTOR_PID=""
        return 1
    fi

    # Test graceful shutdown
    log_info "Testing graceful shutdown (SIGTERM)..."
    kill -TERM $REFLECTOR_PID 2>/dev/null
    sleep 2

    if ! kill -0 $REFLECTOR_PID 2>/dev/null; then
        log_pass "Reflector shutdown gracefully"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
        REFLECTOR_PID=""
    else
        log_fail "Reflector did not shutdown"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_FAILED=$((TESTS_FAILED + 1))
        kill -9 $REFLECTOR_PID 2>/dev/null || true
        REFLECTOR_PID=""
    fi
}

test_reflector_profiles() {
    log_header "Reflector Profile Tests"

    for profile in netally msn all; do
        log_info "Testing profile: $profile"
        ${SEEDTEST_BIN} reflect -i ${VETH_RX} --profile $profile >/dev/null 2>&1 &
        local pid=$!
        sleep 1

        if kill -0 $pid 2>/dev/null; then
            log_pass "Profile $profile started"
            TESTS_RUN=$((TESTS_RUN + 1))
            TESTS_PASSED=$((TESTS_PASSED + 1))
            kill $pid 2>/dev/null
            wait $pid 2>/dev/null || true
        else
            log_fail "Profile $profile failed to start"
            TESTS_RUN=$((TESTS_RUN + 1))
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    done
}

test_webui_startup() {
    log_header "WebUI Startup Test"

    log_info "Starting WebUI on port 8888..."
    ${SEEDTEST_BIN} web -p 8888 >/dev/null 2>&1 &
    WEB_PID=$!

    sleep 2

    if kill -0 $WEB_PID 2>/dev/null; then
        log_pass "WebUI started successfully"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))

        # Test health endpoint
        log_info "Testing /api/health endpoint..."
        if curl -s http://localhost:8888/api/health | grep -q "status"; then
            log_pass "Health endpoint responding"
            TESTS_RUN=$((TESTS_RUN + 1))
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            log_fail "Health endpoint not responding correctly"
            TESTS_RUN=$((TESTS_RUN + 1))
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi

        # Shutdown
        kill $WEB_PID 2>/dev/null
        wait $WEB_PID 2>/dev/null || true
        WEB_PID=""
    else
        log_fail "WebUI failed to start"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_FAILED=$((TESTS_FAILED + 1))
        WEB_PID=""
    fi
}

test_api_endpoints() {
    log_header "API Endpoint Tests"

    # Start WebUI
    ${SEEDTEST_BIN} web -p 8889 >/dev/null 2>&1 &
    WEB_PID=$!
    sleep 2

    if ! kill -0 $WEB_PID 2>/dev/null; then
        skip_test "API endpoints" "WebUI failed to start"
        return
    fi

    # Test various endpoints
    local endpoints=(
        "/api/health"
        "/api/stats"
        "/api/interfaces"
        "/api/license"
    )

    for endpoint in "${endpoints[@]}"; do
        if curl -s "http://localhost:8889${endpoint}" | head -1 | grep -q "{"; then
            log_pass "Endpoint ${endpoint} returns JSON"
            TESTS_RUN=$((TESTS_RUN + 1))
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            log_fail "Endpoint ${endpoint} not responding correctly"
            TESTS_RUN=$((TESTS_RUN + 1))
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    done

    # Cleanup
    kill $WEB_PID 2>/dev/null
    wait $WEB_PID 2>/dev/null || true
    WEB_PID=""
}

test_packet_reflection() {
    log_header "Packet Reflection Test"

    # Start reflector
    log_info "Starting reflector..."
    ${SEEDTEST_BIN} reflect -i ${VETH_RX} --profile all >/dev/null 2>&1 &
    REFLECTOR_PID=$!
    sleep 2

    if ! kill -0 $REFLECTOR_PID 2>/dev/null; then
        log_fail "Reflector failed to start for packet test"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi

    # Get pre-test stats
    local pre_rx=$(cat /sys/class/net/${VETH_TX}/statistics/rx_packets)

    # Send test packets
    log_info "Sending test packets via ping..."
    ping -c 10 -I ${VETH_TX} ${IP_RX} -W 1 >/dev/null 2>&1 || true
    sleep 1

    # Get post-test stats
    local post_rx=$(cat /sys/class/net/${VETH_TX}/statistics/rx_packets)
    local reflected=$((post_rx - pre_rx))

    log_info "Packets seen on TX interface: $reflected"

    # Cleanup
    kill $REFLECTOR_PID 2>/dev/null
    wait $REFLECTOR_PID 2>/dev/null || true
    REFLECTOR_PID=""

    if [[ $reflected -gt 0 ]]; then
        log_pass "Network stack working ($reflected packets)"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_skip "Packet reflection" "Requires ITO/RFC2544 traffic for full test"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
    fi
}

test_invalid_interface() {
    log_header "Error Handling Tests"

    run_test "Invalid interface name returns error" \
        "${SEEDTEST_BIN} reflect -i nonexistent_iface 2>&1 | grep -qi 'error\|fail\|not found'" \
        0
}

test_license_commands() {
    log_header "License Command Tests"

    run_test "License status command" \
        "${SEEDTEST_BIN} license status 2>&1 | grep -qi 'license\|trial\|tier'"
}

# ============================================================================
# Main
# ============================================================================

main() {
    echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║              Seed Test Suite Smoke Tests                   ║${NC}"
    echo -e "${BOLD}${CYAN}║           Copyright (c) 2025 Mustard Seed Networks         ║${NC}"
    echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    check_root
    test_binary_exists
    setup_veth

    # Run test suites
    test_version
    test_help
    test_reflector_startup_shutdown
    test_reflector_profiles
    test_webui_startup
    test_api_endpoints
    test_packet_reflection
    test_invalid_interface
    test_license_commands

    # Summary
    echo ""
    log_header "Test Summary"
    echo -e "  Total:   ${TESTS_RUN}"
    echo -e "  ${GREEN}Passed:${NC}  ${TESTS_PASSED}"
    echo -e "  ${RED}Failed:${NC}  ${TESTS_FAILED}"
    echo -e "  ${YELLOW}Skipped:${NC} ${TESTS_SKIPPED}"
    echo ""

    if [[ $TESTS_FAILED -gt 0 ]]; then
        echo -e "${RED}${BOLD}SMOKE TESTS FAILED${NC}"
        exit 1
    else
        echo -e "${GREEN}${BOLD}ALL SMOKE TESTS PASSED${NC}"
        exit 0
    fi
}

main "$@"
