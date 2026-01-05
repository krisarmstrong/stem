// Copyright (c) 2025 Mustard Seed Networks. All rights reserved.

package server

import (
	"fmt"
	"net/http"

	"github.com/krisarmstrong/stem/internal/logging"
	"github.com/krisarmstrong/stem/internal/netif"
)

// handleSettings handles settings get/update.
func (s *Server) handleSettings(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.statsMu.RLock()
		mode := s.mode
		iface := s.selectedIface
		s.statsMu.RUnlock()

		writeJSON(w, SettingsResponse{
			Mode:      mode,
			Interface: iface,
			Theme:     "system",
		})

	case http.MethodPost:
		var update SettingsUpdate
		if !decodeJSONStrict(w, r, &update, maxRequestBodySize) {
			return
		}

		if update.Interface != "" {
			// Validate that the interface exists.
			if !validateInterfaceExists(w, update.Interface) {
				return
			}

			s.statsMu.Lock()
			s.selectedIface = update.Interface
			s.statsMu.Unlock()
			logging.Info("interface selected", "interface", update.Interface)
		}

		writeJSON(w, StatusResponse{Status: "updated"})

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleMode handles mode switching between reflector and test_master.
func (s *Server) handleMode(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.statsMu.RLock()
		mode := s.mode
		s.statsMu.RUnlock()
		writeJSON(w, ModeResponse{Mode: mode})

	case http.MethodPost:
		var req ModeRequest
		if !decodeJSONStrict(w, r, &req, maxRequestBodySize) {
			return
		}

		if req.Mode != modeReflector && req.Mode != modeTestMaster {
			logging.Warn("mode update failed: invalid mode", "mode", req.Mode)
			http.Error(w, "Invalid mode (must be 'reflector' or 'test_master')", http.StatusBadRequest)
			return
		}

		s.statsMu.Lock()
		oldMode := s.mode
		s.mode = req.Mode
		s.statsMu.Unlock()
		logging.Info("mode changed", "from", oldMode, "to", req.Mode)
		writeJSON(w, ModeUpdateResponse{Status: "updated", Mode: req.Mode})

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// validateInterfaceExists checks if an interface exists and returns false if not (writing error to response).
func validateInterfaceExists(w http.ResponseWriter, ifaceName string) bool {
	ifaces, detectErr := netif.DetectInterfaces()
	if detectErr != nil {
		logging.Error("failed to detect interfaces for validation", "error", detectErr)
		http.Error(w, "Failed to validate interface", http.StatusInternalServerError)
		return false
	}

	for _, iface := range ifaces {
		if iface.Name == ifaceName {
			return true
		}
	}

	http.Error(w, fmt.Sprintf("Interface '%s' not found", ifaceName), http.StatusBadRequest)
	return false
}
