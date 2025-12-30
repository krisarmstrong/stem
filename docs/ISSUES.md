# The Stem - Issue Tracker

Issues are now tracked via GitHub Issues: https://github.com/krisarmstrong/stem/issues

## Open Issues

### P1 (High)
- [#10 Interface capability detection relies on driver heuristics](https://github.com/krisarmstrong/stem/issues/10)
- [#12 Interface selection depends on sysfs without operator guidance](https://github.com/krisarmstrong/stem/issues/12)

### P2 (Medium)
- [#2 Replace interface{} with concrete types](https://github.com/krisarmstrong/stem/issues/2)
- [#5 Add observability for config update failures](https://github.com/krisarmstrong/stem/issues/5)
- [#6 Document web server architecture](https://github.com/krisarmstrong/stem/issues/6)
- [#7 Fix errcheck warnings in test files](https://github.com/krisarmstrong/stem/issues/7)
- [#8 Fix all golangci-lint warnings (332 issues)](https://github.com/krisarmstrong/stem/issues/8)
- [#14 Limited test coverage for interface selection edge cases](https://github.com/krisarmstrong/stem/issues/14)

---

## FIXED (v0.1.5)

### ~~Issue #9: /api/test/start reports running without execution~~
**Status**: FIXED in v0.1.5
- Implemented actual test execution via module executors (benchmark, servicetest)
- Returns 503 with "unavailable" status on platforms without CGO support

### ~~Issue #11: UpdateConfig silently ignores invalid OUI values~~
**Status**: FIXED in v0.1.5
- Now returns error with invalid OUI value and restores previous configuration

### ~~Issue #13: Consolidate 3 web servers into single production server~~
**Status**: FIXED in v0.1.5
- Removed unused reflector/web and testmaster/web packages
- Single web server at internal/web serves all functionality

### ~~Issue #4: Add interface validation to handleSettings~~
**Status**: FIXED in v0.1.5
- Validates interface exists before accepting settings update
- Logs interface selection for observability

### ~~Issue #3: Extract hardcoded values to constants~~
**Status**: FIXED in v0.1.5
- Added HTTP timeout constants (HTTPReadHeaderTimeout, etc.)

---

## FIXED (v0.1.4)

### Module Architecture (v0.1.4)
- Created 6-module architecture (Reflector, Benchmark, ServiceTest, TrafficGen, Measure, Certify)
- Added module routing via handleTestStart
- Comprehensive module unit tests

### ~~Issue #1: JSON encode errors silently ignored in web handlers~~
**Status**: FIXED in v0.1.1, v0.1.2, v0.1.3
- Added `writeJSON()` helper with error logging to all web servers

### ~~Issue #5: Wildcard CORS headers allow any origin~~
**Status**: FIXED in v0.1.1, v0.1.2
- Added `setCORSHeaders()` function restricting to localhost origins

### ~~Issue #10: HTTP servers without timeouts~~
**Status**: FIXED in v0.1.3
- Added ReadHeaderTimeout, ReadTimeout, WriteTimeout, IdleTimeout

---

*Last Updated: 2025-12-30*
*Latest Release: v0.1.5*
