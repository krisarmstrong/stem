# =============================================================================
# Test Targets
# =============================================================================
#
# All testing targets:
#   - Go unit tests
#   - Frontend tests (Vitest)
#   - C unit tests (Linux only)
#   - E2E tests (Playwright)
#   - Coverage reports
#   - Smoke tests
#
# =============================================================================

.PHONY: test test-all test-backend test-backend-quiet test-frontend test-frontend-quiet \
        test-coverage test-coverage-html c-test smoke-test \
        test-e2e test-e2e-ui test-e2e-install

# =============================================================================
# Main Test Targets
# =============================================================================

test: ## Run unit tests (backend + frontend)
	@printf "$(BOLD)$(CYAN)┌─ Unit Tests ─────────────────────────────────────────────────────────────────┐$(RESET)\n"
	@printf "$(CYAN)│$(RESET) $(BOLD)[1/2]$(RESET) Backend (Go)                                                          $(CYAN)│$(RESET)\n"
	$(call timer-start,test-backend)
	@$(MAKE) --no-print-directory test-backend-quiet
	$(call timer-end,test-backend,Backend tests)
	@printf "$(CYAN)│$(RESET) $(BOLD)[2/2]$(RESET) Frontend (Vitest)                                                      $(CYAN)│$(RESET)\n"
	$(call timer-start,test-frontend)
	@$(MAKE) --no-print-directory test-frontend-quiet
	$(call timer-end,test-frontend,Frontend tests)
	@printf "$(CYAN)└──────────────────────────────────────────────────────────────────────────────┘$(RESET)\n"

test-all: test c-test test-e2e ## Run ALL tests (Go + C + E2E)
	@echo "All tests complete"

# =============================================================================
# Backend Tests
# =============================================================================

test-backend: ## Run Go tests with progress
	@printf "\n$(BOLD)🧪 Running backend tests...$(RESET)\n"
	@PKGS=$$(go list ./... | grep -v '/ui$$'); \
	PKG_COUNT=$$(echo "$$PKGS" | wc -l | tr -d ' '); \
	printf "   📦 Testing $$PKG_COUNT packages...\n\n"; \
	if command -v gotestsum > /dev/null 2>&1; then \
		gotestsum --format pkgname-and-test-fails -- -race -parallel 8 -coverprofile=coverage.out $$PKGS; \
	else \
		$(GO) test -v -race -parallel 8 -coverprofile=coverage.out $$PKGS; \
	fi
	@if [ -f coverage.out ]; then \
		COV=$$(go tool cover -func=coverage.out | grep total | awk '{print $$3}'); \
		printf "\n   📊 Coverage: %s\n" "$$COV"; \
	fi
	@printf "\n$(GREEN)✓ Backend tests complete$(RESET)\n"

test-backend-quiet:
	@PKGS=$$(go list ./... | grep -v '/ui$$'); \
	PKG_COUNT=$$(echo "$$PKGS" | wc -l | tr -d ' '); \
	printf "   Testing $$PKG_COUNT packages...\n"; \
	$(GO) test -race -parallel 8 -coverprofile=coverage.out $$PKGS 2>&1 | grep -E "^(ok|FAIL|---)" || true
	@if [ -f coverage.out ]; then \
		COV=$$(go tool cover -func=coverage.out | grep total | awk '{print $$3}'); \
		printf "   📊 Coverage: %s\n" "$$COV"; \
	fi

# =============================================================================
# Frontend Tests
# =============================================================================

test-frontend: ## Run frontend tests with progress
	@printf "\n$(BOLD)🧪 Running frontend tests...$(RESET)\n"
	@STORY_COUNT=$$(find ui/src -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l | tr -d ' '); \
	printf "   📦 Running $$STORY_COUNT test files...\n\n"
	@cd ui && npm test
	@printf "\n$(GREEN)✓ Frontend tests complete$(RESET)\n"

test-frontend-quiet:
	@STORY_COUNT=$$(find ui/src -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l | tr -d ' '); \
	printf "   Running $$STORY_COUNT test files...\n"
	@cd ui && npm test 2>&1 | grep -E "(PASS|FAIL|Tests:)" || true

# =============================================================================
# Coverage Reports
# =============================================================================

test-coverage: ## Run tests with coverage
	@echo "Running Go tests with coverage..."
	$(GO) test -v -race -parallel 8 -coverprofile=coverage.out -covermode=atomic ./internal/...
	$(GO) tool cover -func=coverage.out

test-coverage-html: test-coverage ## Generate HTML coverage report
	$(GO) tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

# =============================================================================
# C Tests (Linux only)
# =============================================================================

c-test: ## Build and run C unit tests
ifeq ($(UNAME),Linux)
	@echo "Building C tests..."
	mkdir -p bin
	$(CC) $(CFLAGS) -o bin/test_pacing tests/c/test_pacing.c $(C_PACING_SRCS) $(C_LDFLAGS)
	$(CC) $(CFLAGS) -o bin/test_protocols tests/c/test_protocols.c $(C_PROTO_SRCS) $(C_LDFLAGS)
	@echo "Running C tests..."
	./bin/test_pacing
	./bin/test_protocols
else ifeq ($(UNAME),Darwin)
	@echo "Building C tests (common code only, macOS)..."
	mkdir -p bin
	$(CC) $(CFLAGS) -DSTUB_PLATFORM -o bin/test_pacing tests/c/test_pacing.c $(C_PACING_SRCS) $(C_LDFLAGS)
	@echo "Running C tests..."
	./bin/test_pacing
	@echo "Note: Protocol tests require Linux networking APIs"
else
	@echo "C tests require Linux or macOS"
endif

smoke-test: ## Run smoke tests (requires root, Linux only)
ifeq ($(UNAME),Linux)
	@echo "Running smoke tests..."
	sudo tests/smoke/run_smoke_tests.sh
else
	@echo "Smoke tests require Linux"
endif

# =============================================================================
# E2E Tests
# =============================================================================

test-e2e: ## Run frontend E2E tests (requires backend running)
	@echo ""
	@echo "🎭 Running E2E tests (Playwright)..."
	@E2E_COUNT=$$(find ui/e2e -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' '); \
	echo "   📦 Running $$E2E_COUNT spec files..."
	@echo ""
	@cd ui && npm run test:e2e
	@echo ""
	@echo "✅ E2E tests complete"

test-e2e-ui: ## Run E2E tests with Playwright UI
	@echo "🎭 Starting Playwright UI mode..."
	cd ui && npx playwright test --ui

test-e2e-install: ## Install Playwright browsers
	cd ui && npx playwright install --with-deps chromium
