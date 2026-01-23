// Package version provides build-time version information for The Stem.
package version

// Set via ldflags: -X github.com/krisarmstrong/stem/internal/version.semver=...
// nolint:gochecknoglobals // Required for ldflags injection.
var (
	semver    = "dev"     //nolint:gochecknoglobals // ldflags
	commit    = "unknown" //nolint:gochecknoglobals // ldflags
	buildTime = "unknown" //nolint:gochecknoglobals // ldflags
)

// Version returns the semantic version (set via ldflags).
func Version() string {
	return semver
}

// Commit returns the git commit SHA (set via ldflags).
func Commit() string {
	return commit
}

// BuildTime returns the UTC build timestamp (set via ldflags).
func BuildTime() string {
	return buildTime
}

// Info returns version information as a map for JSON serialization.
func Info() map[string]string {
	return map[string]string{
		"version":   semver,
		"commit":    commit,
		"buildTime": buildTime,
	}
}

// SetForTesting sets version info for testing purposes only.
// This function should only be called in test code.
func SetForTesting(ver, cmt, bt string) func() {
	origSemver, origCommit, origBuildTime := semver, commit, buildTime
	semver = ver
	commit = cmt
	buildTime = bt
	return func() {
		semver = origSemver
		commit = origCommit
		buildTime = origBuildTime
	}
}
