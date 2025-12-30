# The Stem - Issue Tracker

## CRITICAL

### Issue #1: JSON encode errors silently ignored in web handlers
**Severity**: CRITICAL
**Files**: `internal/web/server.go`
**Lines**: 147, 167, 188, 209, 223, 238, 262, 283, 300, 313, 343, 409, 474, 511, 543

16 instances of `json.NewEncoder().Encode()` calls ignore the returned error.

---

## HIGH

### Issue #2: Missing port validation allows invalid values
**Severity**: HIGH
**File**: `cmd/stem/main.go:717-719`

The `--port` flag accepts any integer without validation (1-65535).

### Issue #3: Nil license manager not handled consistently
**Severity**: HIGH
**File**: `cmd/stem/main.go:758, 798`

Errors from `license.NewManager()` ignored, nil case not handled.

---

## MEDIUM

### Issue #4: Frame size validation silently drops invalid values
**Severity**: MEDIUM
**File**: `cmd/stem/main.go:547`

Invalid frame sizes dropped without warning user.

### Issue #5: Wildcard CORS headers allow any origin
**Severity**: MEDIUM
**File**: `internal/reflector/web/server.go:160, 175`

`Access-Control-Allow-Origin: *` is a security risk.

---

## LOW

### Issue #6: Signal handler makes blocking call in select
**Severity**: LOW
**File**: `cmd/stem/main.go:352-378`

`dp.Stop()` could block other select cases.

### Issue #7: Replace interface{} with concrete types
**Severity**: LOW
**Files**: `internal/web/server.go:217, 227, 252`, `cmd/stem/main.go:512`

Use struct types for type safety.

### Issue #8: Extract hardcoded values to constants
**Severity**: LOW
**Files**: `cmd/stem/main.go:307`, `internal/web/server.go:81`, `internal/reflector/tui/tui.go:73`

Magic values should be constants.

### Issue #9: Logging initialization error ignored
**Severity**: LOW
**File**: `cmd/stem/main.go:113-116`

Error from `logging.Init()` ignored with `_`.

---

*Generated: 2025-12-29*
