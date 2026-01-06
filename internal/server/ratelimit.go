// Copyright (c) 2025 Mustard Seed Networks. All rights reserved.

package server

import (
	"net"
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"

	"github.com/krisarmstrong/stem/internal/logging"
)

// Rate limiting configuration constants.
const (
	// AuthRateLimit is the rate limit for authentication endpoints (per minute).
	AuthRateLimit = 5
	// AuthBurstLimit is the burst limit for authentication endpoints.
	AuthBurstLimit = 5

	// APIRateLimit is the rate limit for standard API endpoints (per minute).
	APIRateLimit = 100
	// APIBurstLimit is the burst limit for standard API endpoints.
	APIBurstLimit = 100

	// CleanupInterval is how often to clean up old rate limiter entries.
	CleanupInterval = 10 * time.Minute
	// VisitorTTL is how long to keep a visitor's rate limiter after last access.
	VisitorTTL = 15 * time.Minute

	// secondsPerMinute is used for converting per-minute rates to per-second.
	secondsPerMinute = 60.0
)

// visitor holds the rate limiter and last seen time for an IP.
type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// RateLimiter provides per-IP rate limiting using the token bucket algorithm.
type RateLimiter struct {
	visitors map[string]*visitor
	mu       sync.RWMutex
	rate     rate.Limit
	burst    int
	done     chan struct{}
}

// NewRateLimiter creates a new rate limiter with the specified rate (events per second) and burst.
// The rate is specified as events per second; use rate.Every() for other intervals.
func NewRateLimiter(r rate.Limit, burst int) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		mu:       sync.RWMutex{},
		rate:     r,
		burst:    burst,
		done:     make(chan struct{}),
	}

	// Start background cleanup goroutine.
	go rl.cleanupLoop()

	return rl
}

// NewAuthRateLimiter creates a rate limiter configured for authentication endpoints.
// Limits to 5 requests per minute with burst of 5.
func NewAuthRateLimiter() *RateLimiter {
	// Convert per-minute rate to per-second for rate.Limit.
	r := rate.Limit(float64(AuthRateLimit) / secondsPerMinute)
	return NewRateLimiter(r, AuthBurstLimit)
}

// NewAPIRateLimiter creates a rate limiter configured for standard API endpoints.
// Limits to 100 requests per minute with burst of 100.
func NewAPIRateLimiter() *RateLimiter {
	// Convert per-minute rate to per-second for rate.Limit.
	r := rate.Limit(float64(APIRateLimit) / secondsPerMinute)
	return NewRateLimiter(r, APIBurstLimit)
}

// GetLimiter returns the rate limiter for the given IP address.
// Creates a new limiter if one doesn't exist for this IP.
func (rl *RateLimiter) GetLimiter(ip string) *rate.Limiter {
	rl.mu.RLock()
	v, exists := rl.visitors[ip]
	rl.mu.RUnlock()

	if exists {
		rl.mu.Lock()
		v.lastSeen = time.Now()
		rl.mu.Unlock()
		return v.limiter
	}

	// Create new limiter for this IP.
	limiter := rate.NewLimiter(rl.rate, rl.burst)
	rl.mu.Lock()
	rl.visitors[ip] = &visitor{
		limiter:  limiter,
		lastSeen: time.Now(),
	}
	rl.mu.Unlock()

	return limiter
}

// Allow checks if a request from the given IP should be allowed.
func (rl *RateLimiter) Allow(ip string) bool {
	return rl.GetLimiter(ip).Allow()
}

// cleanupLoop periodically removes old visitors to prevent memory leaks.
func (rl *RateLimiter) cleanupLoop() {
	ticker := time.NewTicker(CleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			rl.cleanup()
		case <-rl.done:
			return
		}
	}
}

// cleanup removes visitors that haven't been seen recently.
func (rl *RateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	cutoff := time.Now().Add(-VisitorTTL)
	for ip, v := range rl.visitors {
		if v.lastSeen.Before(cutoff) {
			delete(rl.visitors, ip)
		}
	}
}

// Stop stops the cleanup goroutine.
func (rl *RateLimiter) Stop() {
	close(rl.done)
}

// Middleware returns an HTTP middleware that applies rate limiting.
// Responds with 429 Too Many Requests when the limit is exceeded.
func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getClientIP(r)

		if !rl.Allow(ip) {
			logging.Warn("Rate limit exceeded",
				"ip", ip,
				"path", r.URL.Path,
				"method", r.Method,
			)

			// Audit log the rate limit event.
			logging.AuditRateLimited(r.Context(), r, "", r.URL.Path, "1m")

			w.Header().Set("Retry-After", "60")
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// getClientIP extracts the client IP from the request.
// Checks X-Forwarded-For and X-Real-IP headers before falling back to RemoteAddr.
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header (may contain comma-separated list).
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		// Take the first IP in the list (client's original IP).
		ip := xff
		for i := range xff {
			if xff[i] == ',' {
				ip = xff[:i]
				break
			}
		}
		ip = trimSpace(ip)
		if ip != "" {
			return ip
		}
	}

	// Check X-Real-IP header.
	xri := r.Header.Get("X-Real-IP")
	if xri != "" {
		return trimSpace(xri)
	}

	// Fall back to RemoteAddr, stripping the port.
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		// RemoteAddr might not have a port.
		return r.RemoteAddr
	}
	return ip
}

// trimSpace removes leading and trailing whitespace from a string.
func trimSpace(s string) string {
	start := 0
	end := len(s)

	for start < end && (s[start] == ' ' || s[start] == '\t') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t') {
		end--
	}

	return s[start:end]
}
