# Seed Test Suite Makefile
# Mustard Seed Networks - Part of The Seed ecosystem
#
# Targets:
#   make           - Build everything (UI + Go binary)
#   make ui        - Build React WebUI only
#   make go        - Build Go binary only
#   make clean     - Clean build artifacts
#   make dev       - Run development servers
#   make test      - Run all tests

# Version
VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo "v3.0.0-dev")
COMMIT := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Go settings
GO := go
GOFLAGS := -ldflags "-X main.Version=$(VERSION) -X main.Commit=$(COMMIT)"

# Binary name
BINARY := seedtest

# Platform detection
UNAME := $(shell uname -s)
ifeq ($(UNAME),Darwin)
    BINARY_NAME := bin/$(BINARY)-darwin
else ifeq ($(UNAME),Linux)
    BINARY_NAME := bin/$(BINARY)-linux
else
    BINARY_NAME := bin/$(BINARY)
endif

# ============================================================================
# Main Targets
# ============================================================================

.PHONY: all ui ui-deps go clean test dev install help

# Default: build everything
all: ui go
	@echo ""
	@echo "Build complete!"
	@echo "  Binary: $(BINARY_NAME)"
	@echo "  Version: $(VERSION)"

# Build React WebUI
ui-deps:
	@echo "Installing UI dependencies..."
	cd ui && npm install

ui: ui-deps
	@echo "Building React WebUI..."
	cd ui && npm run build
	@echo "Copying dist to pkg/web for embedding..."
	mkdir -p pkg/web/dist
	cp -r ui/dist/* pkg/web/dist/

# Build Go binary
go:
	@echo "Building $(BINARY)..."
	mkdir -p bin
	$(GO) build $(GOFLAGS) -o $(BINARY_NAME) ./cmd/seedtest/
	@echo "Built: $(BINARY_NAME)"

# Quick build (Go only, assumes UI is already built)
quick:
	@echo "Quick build (Go only)..."
	mkdir -p bin
	$(GO) build $(GOFLAGS) -o $(BINARY_NAME) ./cmd/seedtest/

# Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -rf bin/
	rm -rf ui/dist/
	rm -rf ui/node_modules/
	rm -rf pkg/web/dist/
	rm -f coverage.out coverage.html
	@echo "Clean complete"

# ============================================================================
# Development
# ============================================================================

# Run UI dev server
ui-dev:
	cd ui && npm run dev

# Run Go backend
go-dev:
	$(GO) run ./cmd/seedtest/ web -p 8080

# Development mode (run both)
dev:
	@echo "Starting development servers..."
	@echo "UI: http://localhost:3000"
	@echo "API: http://localhost:8080"
	@echo ""
	@echo "Run in separate terminals:"
	@echo "  make ui-dev    # React dev server"
	@echo "  make go-dev    # Go backend"

# ============================================================================
# Testing
# ============================================================================

# Run Go tests
test:
	@echo "Running Go tests..."
	$(GO) test -v -race ./pkg/...

# Run tests with coverage
test-coverage:
	@echo "Running Go tests with coverage..."
	$(GO) test -v -race -coverprofile=coverage.out -covermode=atomic ./pkg/...
	$(GO) tool cover -func=coverage.out

# Generate HTML coverage report
test-coverage-html: test-coverage
	$(GO) tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

# ============================================================================
# Installation
# ============================================================================

# Install to /usr/local/bin
install: all
	@echo "Installing $(BINARY) to /usr/local/bin..."
	install -m 755 $(BINARY_NAME) /usr/local/bin/$(BINARY)
	@echo "Installed: /usr/local/bin/$(BINARY)"

# Uninstall
uninstall:
	rm -f /usr/local/bin/$(BINARY)
	@echo "Uninstalled: /usr/local/bin/$(BINARY)"

# ============================================================================
# C Dataplane (Linux only)
# ============================================================================

# C compiler settings
CC := gcc
CFLAGS := -Wall -Wextra -O3 -march=native -pthread -Iinclude
LDFLAGS := -pthread -lm

# Common C sources
C_SRCS := $(wildcard src/dataplane/common/*.c)
C_OBJS := $(C_SRCS:.c=.o)

# Build C dataplane (Linux only)
dataplane:
ifeq ($(UNAME),Linux)
	@echo "Building C dataplane..."
	$(CC) $(CFLAGS) -c $(C_SRCS)
	ar rcs librfc2544.a $(C_OBJS)
	@echo "Built: librfc2544.a"
else
	@echo "Dataplane requires Linux (uses AF_PACKET/AF_XDP)"
endif

# ============================================================================
# Help
# ============================================================================

help:
	@echo "Seed Test Suite - Mustard Seed Networks"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Main targets:"
	@echo "  all            Build everything (UI + Go binary)"
	@echo "  ui             Build React WebUI"
	@echo "  go             Build Go binary"
	@echo "  quick          Quick build (Go only, skip UI)"
	@echo "  clean          Clean all build artifacts"
	@echo ""
	@echo "Development:"
	@echo "  ui-dev         Run React dev server (port 3000)"
	@echo "  go-dev         Run Go backend (port 8080)"
	@echo "  dev            Show dev instructions"
	@echo ""
	@echo "Testing:"
	@echo "  test           Run Go unit tests"
	@echo "  test-coverage  Run tests with coverage report"
	@echo ""
	@echo "Installation:"
	@echo "  install        Install to /usr/local/bin"
	@echo "  uninstall      Remove from /usr/local/bin"
	@echo ""
	@echo "C Dataplane (Linux):"
	@echo "  dataplane      Build C dataplane library"
