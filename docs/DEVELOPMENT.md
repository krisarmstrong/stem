# Development Guide

## Prerequisites

- Go 1.25.5+
- Node.js 25.2.1+
- npm 11.7.0+
- GCC/Clang 7.3.0+ (for C components)

## Setup

```bash
# Clone and setup
git clone <repo-url>
cd stem

# Backend
make build

# Frontend
cd ui
npm install
```

## Development

```bash
# Backend
make dev          # Run backend with hot reload
make test         # Run tests
make lint         # Run linters (Go + C)

# Frontend (cd ui/)
npm run dev       # Start dev server (port 5173)
npm run test      # Run unit tests
npm run test:e2e  # Run E2E tests
npm run lint      # Run Biome linter
```

## Project Structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## Common Tasks

| Task | Command |
|------|---------|
| Build all | `make build` |
| Run tests | `make test` |
| Lint Go | `make lint-go` |
| Lint C | `make lint-c` |
| Clean | `make clean` |
| Dev server | `cd ui && npm run dev` |
