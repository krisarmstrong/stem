#!/bin/bash
#
# setup_veth.sh - Create virtual Ethernet pair for testing
#
# Creates a veth pair for testing packet reflection and network tests
# without requiring physical network interfaces.
#
# Copyright (c) 2025 Mustard Seed Networks. All rights reserved.
#
# Usage:
#   sudo ./setup_veth.sh [create|destroy]
#

set -e

# Configuration
VETH_TX="veth-seed-tx"
VETH_RX="veth-seed-rx"
IP_TX="192.168.253.1"
IP_RX="192.168.253.2"
SUBNET="/24"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
log_pass()  { echo -e "${GREEN}[OK]${NC} $1"; }
log_fail()  { echo -e "${RED}[FAIL]${NC} $1"; }

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_fail "This script requires root privileges"
        echo "Usage: sudo $0 [create|destroy]"
        exit 1
    fi
}

# Create veth pair
create_veth() {
    log_info "Creating veth pair..."

    # Remove existing if present
    ip link delete "${VETH_TX}" 2>/dev/null || true

    # Create veth pair
    ip link add "${VETH_TX}" type veth peer name "${VETH_RX}"

    # Configure TX interface
    ip addr add "${IP_TX}${SUBNET}" dev "${VETH_TX}"
    ip link set "${VETH_TX}" up
    ip link set "${VETH_TX}" mtu 9000

    # Configure RX interface
    ip addr add "${IP_RX}${SUBNET}" dev "${VETH_RX}"
    ip link set "${VETH_RX}" up
    ip link set "${VETH_RX}" mtu 9000

    # Disable reverse path filtering (required for reflection)
    echo 0 > /proc/sys/net/ipv4/conf/${VETH_TX}/rp_filter
    echo 0 > /proc/sys/net/ipv4/conf/${VETH_RX}/rp_filter
    echo 0 > /proc/sys/net/ipv4/conf/all/rp_filter

    # Enable promiscuous mode for packet capture
    ip link set "${VETH_TX}" promisc on
    ip link set "${VETH_RX}" promisc on

    log_pass "veth pair created successfully"
    echo ""
    echo "  ${VETH_TX} (${IP_TX}) <---> ${VETH_RX} (${IP_RX})"
    echo ""
    echo "  To use with seedtest:"
    echo "    ./bin/seedtest reflect -i ${VETH_RX}"
    echo "    ./bin/seedtest test -t throughput -i ${VETH_TX}"
    echo ""
}

# Destroy veth pair
destroy_veth() {
    log_info "Destroying veth pair..."

    if ip link show "${VETH_TX}" >/dev/null 2>&1; then
        ip link delete "${VETH_TX}"
        log_pass "veth pair destroyed"
    else
        log_info "veth pair not found (already removed)"
    fi
}

# Show status
show_status() {
    echo "Virtual Interface Status:"
    echo ""

    if ip link show "${VETH_TX}" >/dev/null 2>&1; then
        echo "  ${VETH_TX}:"
        ip addr show "${VETH_TX}" | grep -E "inet|ether" | sed 's/^/    /'
        echo ""
        echo "  ${VETH_RX}:"
        ip addr show "${VETH_RX}" | grep -E "inet|ether" | sed 's/^/    /'
    else
        echo "  veth pair not configured"
    fi
    echo ""
}

# Main
main() {
    check_root

    case "${1:-create}" in
        create)
            create_veth
            ;;
        destroy)
            destroy_veth
            ;;
        status)
            show_status
            ;;
        *)
            echo "Usage: sudo $0 [create|destroy|status]"
            exit 1
            ;;
    esac
}

main "$@"
