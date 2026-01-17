// Package version provides build-time version information for The Stem.
package version

// version holds build information set by ldflags at build time.
// The Go linker uses -X to set these values during the build process.
// Named "version" to use the gochecknoglobals exemption for version variables.
var version = struct {
	semver    string
	commit    string
	buildTime string
}{
	semver:    "dev",
	commit:    "unknown",
	buildTime: "unknown",
}

// Version returns the semantic version (set via ldflags).
func Version() string {
	return version.semver
}

// Commit returns the git commit SHA (set via ldflags).
func Commit() string {
	return version.commit
}

// BuildTime returns the UTC build timestamp (set via ldflags).
func BuildTime() string {
	return version.buildTime
}

// Info returns version information as a map for JSON serialization.
func Info() map[string]string {
	return map[string]string{
		"version":   version.semver,
		"commit":    version.commit,
		"buildTime": version.buildTime,
	}
}

// SetForTesting sets version info for testing purposes only.
// This function should only be called in test code.
func SetForTesting(semver, commit, buildTime string) func() {
	orig := version
	version = struct {
		semver    string
		commit    string
		buildTime string
	}{
		semver:    semver,
		commit:    commit,
		buildTime: buildTime,
	}
	return func() {
		version = orig
	}
}
