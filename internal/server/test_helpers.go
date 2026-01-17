// Copyright (c) 2025 Mustard Seed Networks. All rights reserved.

package server

import (
	"crypto/tls"

	"golang.org/x/crypto/acme/autocert"
)

// CreateACMETLSConfigForTest exposes ACME TLS config creation for tests.
func CreateACMETLSConfigForTest(manager *autocert.Manager) *tls.Config {
	return createACMETLSConfig(manager)
}

// CreateACMEManagerForTest exposes ACME manager creation for tests.
func CreateACMEManagerForTest(config ACMEConfig) (*autocert.Manager, error) {
	return createACMEManager(config)
}

// DefaultACMECacheDirForTest exposes default ACME cache dir.
func DefaultACMECacheDirForTest() string {
	return defaultACMECacheDir
}
