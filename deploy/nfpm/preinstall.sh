#!/bin/sh
set -e

if ! getent group stem >/dev/null 2>&1; then
    groupadd --system stem
fi

if ! getent passwd stem >/dev/null 2>&1; then
    useradd --system \
        --gid stem \
        --home-dir /var/lib/stem \
        --no-create-home \
        --shell /usr/sbin/nologin \
        --comment "The Stem Network Performance Testing" \
        stem
fi

exit 0
