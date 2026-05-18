package api

import (
	"net/http"

	"github.com/krisarmstrong/stem/internal/version"
)

// handleBuildVersion serves GET /__version with build metadata for deployment
// validation. Unauthenticated by design — operators need to verify which
// binary is running without holding a session. Required by the Universal
// Build Contract (CLAUDE.md): all three sibling projects (seed/stem/niac)
// expose this endpoint with lowercase JSON keys: version, commit, buildTime,
// uiBuildHash.
func (s *Server) handleBuildVersion(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, version.Info())
}
