#!/bin/sh
set -e

if command -v systemctl >/dev/null 2>&1; then
    if systemctl is-active --quiet stem.service 2>/dev/null; then
        systemctl stop stem.service || true
    fi
    if systemctl is-enabled --quiet stem.service 2>/dev/null; then
        systemctl disable stem.service || true
    fi
fi

exit 0
