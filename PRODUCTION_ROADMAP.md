# The Stem - Production Readiness Roadmap

**Created**: 2026-01-05
**Target**: Production Ready Release
**Estimated Duration**: 8-12 weeks (remaining)
**Current Version**: v0.1.17

---

## Executive Summary

This roadmap outlines the path from beta to production-ready status. All work is tracked via GitHub issues and organized into phases. Each phase has specific goals, deliverables, and recommended agents/approaches.

### Completed Phases
- **Phase 1**: Critical Security Fixes ✅ (v0.1.17)
- **Phase 3**: Operational Readiness ✅ (v0.1.17)

### Current State
- **Rating**: Beta (Security Hardened)
- **Test Coverage**: ~25%
- **Open Issues**: 15 (0 P0, 8 P1, 7 P2)
- **Completed**: Credential security, license validation, JWT revocation, graceful shutdown, WebSocket fixes, metrics, persistence

### Target State
- **Rating**: Production Ready
- **Test Coverage**: 90%+
- **Security**: Audit passed, no critical findings
- **Operations**: ✅ Metrics, ✅ Persistence, CI/CD pending

---

## Phase 2: Test Coverage Foundation

**Goal**: Achieve 90% test coverage on Go code, establish testing infrastructure.

### Issues to Complete

| Issue | Title | Agent | Approach |
|-------|-------|-------|----------|
| #64 | 90% Go test coverage | `Explore` + manual | Identify gaps, write tests systematically |
| #65 | C dataplane test suite | `Plan` | Set up Unity framework, write tests |
| #66 | E2E tests with Playwright | `Plan` | Set up Playwright, test critical flows |
| #74 | CI/CD pipeline | manual | GitHub Actions workflow |

### Detailed Tasks

#### #64 - Go Test Coverage
```
Priority order by package:
1. internal/auth (security critical)
2. internal/license (security critical)
3. internal/server (API surface)
4. internal/modules (business logic)
5. internal/netif (infrastructure)

Commands to track progress:
go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out | grep total
go tool cover -html=coverage.out -o coverage.html

Target per package:
- internal/auth: 95%
- internal/license: 95%
- internal/server: 90%
- internal/modules: 85%
- internal/netif: 80%
```

#### #65 - C Dataplane Tests
```
Setup:
1. Add Unity test framework to src/test/
2. Create test files for each .c file
3. Add Makefile target: make test-c

Test files to create:
- src/test/test_packet.c
- src/test/test_core.c
- src/test/test_mef.c
- src/test/test_rfc2889.c
- src/test/test_rfc6349.c

Memory testing:
make test-c-valgrind  # Run with valgrind
make test-c-asan      # Run with AddressSanitizer
```

#### #66 - E2E Tests
```
Setup:
cd ui && npm install -D @playwright/test
npx playwright install

Test files to create:
- ui/e2e/auth.spec.ts
- ui/e2e/test-execution.spec.ts
- ui/e2e/settings.spec.ts
- ui/e2e/license.spec.ts

Critical flows:
1. Login -> Dashboard -> Logout
2. Select interface -> Start test -> View results
3. Activate license -> Verify tier access
```

#### #74 - CI/CD Pipeline
```
Create: .github/workflows/ci.yml

Jobs:
1. go-test: Build, test, coverage check
2. go-lint: golangci-lint
3. c-build: Compile C code
4. c-lint: clang-tidy
5. ui-build: TypeScript build
6. ui-lint: Biome
7. security: gosec, Semgrep
8. e2e: Playwright tests (on merge only)

Quality gates:
- Coverage >= 90%
- Zero lint errors
- Zero high/critical security findings
```

### Validation
```bash
# Coverage report
go test -coverprofile=coverage.out ./...
COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print $3}')
echo "Coverage: $COVERAGE"  # Must be >= 90%

# C tests
make test-c

# E2E tests
cd ui && npx playwright test

# CI check
gh workflow run ci.yml
```

---

## Phase 4: Feature Completion & Security Audit

**Goal**: Complete all module implementations, pass security audit.

### Issues to Complete

| Issue | Title | Agent | Approach |
|-------|-------|-------|----------|
| #56 | Complete module implementations | `Plan` | Implement each module executor |
| #76 | Security audit | external | Third-party pentest |
| #60 | CORS bypass fix | `code-reviewer` | Proper URL parsing |
| #63 | Rate limiting | `code-reviewer` | Token bucket middleware |

### Detailed Tasks

#### #56 - Module Implementations
```
Modules to complete:
1. Benchmark (RFC 2544)
   - Files: internal/modules/benchmark/executor.go
   - Tests: throughput, latency, frame_loss, back_to_back

2. ServiceTest (Y.1564/MEF)
   - Files: internal/modules/servicetest/executor.go
   - Tests: y1564_config, y1564_perf, mef_config, mef_perf

3. TrafficGen
   - Files: internal/modules/trafficgen/executor.go
   - Tests: custom_stream

4. Measure (Y.1731)
   - Files: internal/modules/measure/executor.go
   - Tests: y1731_delay, y1731_loss, y1731_slm

5. Certify (RFC 2889/6349/TSN)
   - Files: internal/modules/certify/executor.go
   - Tests: rfc2889_*, rfc6349_*, tsn_*

Each executor needs:
- Start() method connecting to C dataplane
- Progress reporting via callback
- Result collection and formatting
- Proper error handling for unsupported platforms
```

#### #76 - Security Audit
```
Pre-audit checklist:
1. Run gosec: gosec ./...
2. Run Semgrep: semgrep --config auto .
3. Run Snyk: snyk test
4. Run TruffleHog: trufflehog git file://. --only-verified

Audit scope:
- Authentication/Authorization
- Input validation
- Session management
- Cryptographic implementations
- API security (OWASP API Top 10)

Deliverables:
- Penetration test report
- Remediation plan for findings
- Sign-off from security team
```

#### #60 - CORS Fix
```
File: internal/server/server.go

Before:
func isLocalhostOrigin(origin string) bool {
    return strings.Contains(origin, "localhost")
}

After:
func isLocalhostOrigin(origin string) bool {
    u, err := url.Parse(origin)
    if err != nil {
        return false
    }
    host := u.Hostname()
    return host == "localhost" || host == "127.0.0.1" || host == "::1"
}
```

#### #63 - Rate Limiting
```
New file: internal/server/ratelimit.go

Implementation:
- Use golang.org/x/time/rate
- Per-IP rate limiting
- Configurable limits per endpoint
- Auth endpoints: 5/minute
- Other endpoints: 100/minute

Apply to routes:
s.handle("/api/auth/login", rateLimitStrict(s.handleAuthLogin))
s.handle("/api/test/start", rateLimit(s.handleTestStart))
```

### Validation
```bash
# Module tests (on Linux)
go test ./internal/modules/... -v

# Security scan
gosec ./... 2>&1 | grep -c "Severity: HIGH"  # Should be 0

# CORS test
curl -H "Origin: http://localhost.evil.com" http://localhost:8080/api/health
# Should return 403

# Rate limit test
for i in {1..10}; do
  curl -X POST http://localhost:8080/api/auth/login \
    -d '{"username":"x","password":"x"}'
done
# Should get 429 after 5 attempts
```

---

## Phase 5: Polish & Documentation (Weeks 13-16)

**Goal**: Complete remaining P2 issues, production documentation.

### Issues to Complete

| Issue | Title | Agent | Approach |
|-------|-------|-------|----------|
| #61 | Security event logging | `code-reviewer` | Structured audit logs |
| #62 | Error handling improvements | `code-reviewer` | Sanitize client errors |
| #67 | Load tests | manual | k6 test suite |
| #70 | API versioning | `code-reviewer` | Add /api/v1/ prefix |
| #71 | Health check endpoints | `code-reviewer` | Liveness/readiness probes |
| #72 | Backup/restore | `Plan` | Archive functionality |
| #73 | Structured JSON logging | `code-reviewer` | JSON log format |
| #75 | Production documentation | manual | Deployment guide |

### Detailed Tasks

#### Documentation Deliverables
```
docs/
├── DEPLOYMENT.md          # Installation and setup
├── SECURITY.md            # Hardening guide
├── OPERATIONS.md          # Runbook and monitoring
├── API.md                 # API reference (from OpenAPI)
├── TROUBLESHOOTING.md     # Common issues and solutions
└── CHANGELOG.md           # Version history
```

#### Final Checklist
```
Before release:
[ ] All P0 issues closed
[ ] All P1 issues closed
[ ] 90%+ test coverage
[ ] Security audit passed
[ ] Load test passed (10x expected load)
[ ] Documentation complete
[ ] CHANGELOG updated
[ ] Version bumped to v1.0.0
```

---

## Agent Reference Guide

### When to Use Each Agent

| Agent | Use For | Example |
|-------|---------|---------|
| `Explore` | Finding code, understanding codebase | "Where is JWT validation?" |
| `Plan` | Designing new features | "Plan database persistence" |
| `code-reviewer` | After writing code | Review security fixes |
| `code-simplifier` | Refactoring | Clean up after changes |
| `silent-failure-hunter` | Error handling review | Find swallowed errors |
| `type-design-analyzer` | New types | Review new data models |
| `pr-test-analyzer` | Before PR | Check test coverage |

### Command Patterns

```bash
# Start work on an issue
gh issue view 52  # Read the issue
# Use Explore agent to find relevant code
# Use Plan agent if major changes needed
# Make changes
# Use code-reviewer agent
# Create PR

# After completing a phase
gh issue list --label P0 --state open  # Check remaining
go test -cover ./...                    # Verify coverage
```

---

## Progress Tracking

### Completed
- ✅ Phase 1: Critical Security Fixes (#52, #53, #54, #55)
- ✅ Phase 3: Operational Readiness (#57, #58, #59, #68, #69)

### Remaining Weekly Checkpoints

| Week | Phase | Target Issues | Coverage Target |
|------|-------|---------------|-----------------|
| 1-2 | Phase 2 | #64 (auth, license, server) | 50-70% |
| 3 | Phase 2 | #65, #66, #74 | 80% |
| 4-5 | Phase 4 | #56 (all modules) | 90% |
| 6-7 | Phase 4 | #60, #63, #76 | 90% |
| 8-9 | Phase 5 | #61, #62, #70, #71 | 90% |
| 10-11 | Phase 5 | #72, #73, #67, #75 | 90% |
| 12 | Phase 5 | Final polish, release | 90%+ |

### Commands for Progress

```bash
# Check open issues by priority
gh issue list --label P0 --state open
gh issue list --label P1 --state open
gh issue list --label P2 --state open

# Check coverage
go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out | grep total

# Check CI status
gh run list --limit 5
```

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| C dataplane complexity | High | Start tests early, mock if needed |
| Security audit findings | High | Run SAST tools continuously |
| Module implementation delays | Medium | Prioritize most-used tests first |
| Coverage target hard to reach | Medium | Focus on critical paths first |
| Third-party audit scheduling | Medium | Book early, have backup vendor |

---

## Success Criteria

### Release v1.0.0 Requirements

- [ ] Zero P0 issues open
- [ ] Zero P1 issues open
- [ ] Test coverage >= 90%
- [ ] Security audit passed (no critical/high findings)
- [ ] Load test passed (100 concurrent users, <100ms p99)
- [ ] All documentation complete
- [ ] CI/CD pipeline enforcing all quality gates
- [ ] Graceful shutdown verified
- [ ] Database persistence working
- [ ] Metrics endpoint functional

---

*This document is the source of truth for production readiness planning.*
*Last updated: 2026-01-05 (Phase 1 & 3 completed in v0.1.17)*
