// Package web provides the HTTP server for the Seed Test Suite WebUI
package web

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/krisarmstrong/seed-test-suite/pkg/interfaces"
)

//go:embed dist/*
var staticFiles embed.FS

// Server represents the web server
type Server struct {
	port         int
	mux          *http.ServeMux
	stats        *Stats
	statsMu      sync.RWMutex
	testStatus   string
	currentTest  string
	startTime    time.Time
	selectedIface string
}

// Stats holds runtime statistics
type Stats struct {
	PacketsReceived uint64  `json:"packetsReceived"`
	PacketsSent     uint64  `json:"packetsSent"`
	BytesReceived   uint64  `json:"bytesReceived"`
	BytesSent       uint64  `json:"bytesSent"`
	CurrentPPS      float64 `json:"currentPps"`
	CurrentMbps     float64 `json:"currentMbps"`
	Uptime          int64   `json:"uptime"`
	TestStatus      string  `json:"testStatus"`
	CurrentTest     *string `json:"currentTest"`
}

// NewServer creates a new web server
func NewServer(port int) *Server {
	s := &Server{
		port:       port,
		mux:        http.NewServeMux(),
		stats:      &Stats{},
		testStatus: "idle",
		startTime:  time.Now(),
	}
	s.setupRoutes()
	return s
}

// setupRoutes configures the HTTP routes
func (s *Server) setupRoutes() {
	// API routes
	s.mux.HandleFunc("/api/interfaces", s.handleInterfaces)
	s.mux.HandleFunc("/api/stats", s.handleStats)
	s.mux.HandleFunc("/api/test/start", s.handleTestStart)
	s.mux.HandleFunc("/api/test/stop", s.handleTestStop)
	s.mux.HandleFunc("/api/settings", s.handleSettings)
	s.mux.HandleFunc("/api/health", s.handleHealth)

	// Static files (embedded UI)
	staticFS, err := fs.Sub(staticFiles, "dist")
	if err != nil {
		log.Printf("Warning: Could not load embedded UI: %v", err)
		// Serve a simple fallback page
		s.mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "text/html")
			w.Write([]byte(`<!DOCTYPE html>
<html>
<head><title>Seed Test Suite</title></head>
<body>
<h1>Seed Test Suite</h1>
<p>WebUI not built. Run 'cd ui && npm install && npm run build' first.</p>
<p>API available at <a href="/api/health">/api/health</a></p>
</body>
</html>`))
		})
	} else {
		fileServer := http.FileServer(http.FS(staticFS))
		s.mux.Handle("/", fileServer)
	}
}

// handleInterfaces returns the list of network interfaces
func (s *Server) handleInterfaces(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ifaces, err := interfaces.DetectInterfaces()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ifaces)
}

// handleStats returns current runtime statistics
func (s *Server) handleStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	s.statsMu.RLock()
	stats := *s.stats
	stats.Uptime = int64(time.Since(s.startTime).Seconds())
	stats.TestStatus = s.testStatus
	if s.currentTest != "" {
		stats.CurrentTest = &s.currentTest
	}
	s.statsMu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// handleTestStart starts a test run
func (s *Server) handleTestStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	s.statsMu.Lock()
	if s.testStatus == "running" {
		s.statsMu.Unlock()
		http.Error(w, "Test already running", http.StatusConflict)
		return
	}
	s.testStatus = "running"
	s.currentTest = "throughput" // Default test
	s.statsMu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "started"})
}

// handleTestStop stops the current test
func (s *Server) handleTestStop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	s.statsMu.Lock()
	if s.testStatus != "running" {
		s.statsMu.Unlock()
		http.Error(w, "No test running", http.StatusBadRequest)
		return
	}
	s.testStatus = "completed"
	s.currentTest = ""
	s.statsMu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "stopped"})
}

// handleSettings handles settings get/update
func (s *Server) handleSettings(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		// Return current settings
		settings := map[string]interface{}{
			"mode":      "test_master",
			"interface": s.selectedIface,
			"theme":     "system",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(settings)

	case http.MethodPost:
		// Update settings
		var settings map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		if iface, ok := settings["interface"].(string); ok {
			s.selectedIface = iface
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "updated"})

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleHealth returns server health status
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	health := map[string]interface{}{
		"status":  "healthy",
		"version": "3.0.0-dev",
		"product": "Seed Test Suite",
		"company": "Mustard Seed Networks",
		"uptime":  int64(time.Since(s.startTime).Seconds()),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(health)
}

// UpdateStats updates the runtime statistics (called by test runner)
func (s *Server) UpdateStats(packetsRx, packetsTx, bytesRx, bytesTx uint64, pps, mbps float64) {
	s.statsMu.Lock()
	defer s.statsMu.Unlock()
	s.stats.PacketsReceived = packetsRx
	s.stats.PacketsSent = packetsTx
	s.stats.BytesReceived = bytesRx
	s.stats.BytesSent = bytesTx
	s.stats.CurrentPPS = pps
	s.stats.CurrentMbps = mbps
}

// Run starts the web server
func (s *Server) Run() error {
	addr := fmt.Sprintf(":%d", s.port)
	log.Printf("Starting Seed Test Suite web server on http://localhost%s", addr)
	return http.ListenAndServe(addr, s.mux)
}
