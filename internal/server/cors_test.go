// Copyright (c) 2025 Mustard Seed Networks. All rights reserved.

package server

import "testing"

func TestIsLocalhostOrigin(t *testing.T) {
	tests := []struct {
		name   string
		origin string
		want   bool
	}{
		// Valid localhost origins - should accept.
		{
			name:   "localhost with port",
			origin: "http://localhost:8080",
			want:   true,
		},
		{
			name:   "localhost without port",
			origin: "http://localhost",
			want:   true,
		},
		{
			name:   "localhost HTTPS",
			origin: "https://localhost:8443",
			want:   true,
		},
		{
			name:   "IPv4 loopback with port",
			origin: "http://127.0.0.1:8080",
			want:   true,
		},
		{
			name:   "IPv4 loopback without port",
			origin: "http://127.0.0.1",
			want:   true,
		},
		{
			name:   "IPv6 loopback with port",
			origin: "http://[::1]:8080",
			want:   true,
		},
		{
			name:   "IPv6 loopback without port",
			origin: "http://[::1]",
			want:   true,
		},

		// CORS bypass attempts - should reject.
		{
			name:   "bypass via subdomain prefix",
			origin: "http://localhost.evil.com",
			want:   false,
		},
		{
			name:   "bypass via subdomain suffix",
			origin: "http://evil.localhost.com",
			want:   false,
		},
		{
			name:   "bypass via prefix without dot",
			origin: "http://notlocalhost:8080",
			want:   false,
		},
		{
			name:   "bypass via malicious subdomain",
			origin: "http://localhost.attacker.com:8080",
			want:   false,
		},
		{
			name:   "external domain",
			origin: "http://example.com",
			want:   false,
		},
		{
			name:   "external domain with port",
			origin: "http://example.com:8080",
			want:   false,
		},

		// Edge cases.
		{
			name:   "empty origin",
			origin: "",
			want:   false,
		},
		{
			name:   "malformed URL",
			origin: "not-a-valid-url",
			want:   false,
		},
		{
			name:   "localhost in path only",
			origin: "http://evil.com/localhost",
			want:   false,
		},
		{
			name:   "localhost in query",
			origin: "http://evil.com?host=localhost",
			want:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := isLocalhostOrigin(tt.origin)
			if got != tt.want {
				t.Errorf("isLocalhostOrigin(%q) = %v, want %v", tt.origin, got, tt.want)
			}
		})
	}
}
