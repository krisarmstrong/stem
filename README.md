# The Stem

**Unified Network Testing Tool by Mustard Seed Networks**

Part of The Seed ecosystem - combining packet reflection and RFC-compliant network testing in a single tool.

## Quick Start

```bash
# Build everything
make

# Run reflector (Tier 1)
./bin/stem reflect -i eth0

# Run network tests (Tier 2)
./bin/stem test -t throughput -i eth0

# Start WebUI
./bin/stem web -p 8080

# Start TUI dashboard
./bin/stem tui
```

## Features

### Tier 1: Reflector
- High-performance packet reflection
- ITO/RFC2544/Y.1564/MSN signature detection
- Profile presets (NetAlly, MSN, All, Custom)
- AF_XDP and DPDK support

### Tier 2: Full Test Suite (includes Reflector)
- **RFC 2544**: Throughput, Latency, Frame Loss, Back-to-Back, System Recovery, Reset
- **ITU-T Y.1564**: Configuration Test, Performance Test, Full Test
- **RFC 2889**: Forwarding, Caching, Learning, Broadcast, Congestion
- **RFC 6349**: TCP Throughput, Path Analysis
- **ITU-T Y.1731**: Delay, Loss, SLM, Loopback (OAM)
- **MEF 48/49**: Service Configuration, Performance Test
- **IEEE 802.1Qbv TSN**: Gate Timing, Traffic Isolation, Scheduled Latency

## Interfaces

| Interface | Command | Description |
|-----------|---------|-------------|
| CLI | `stem <command>` | Command-line interface |
| TUI | `stem tui` | Terminal dashboard |
| WebUI | `stem web -p 8080` | http://localhost:8080 |

## Realtime Updates

The WebUI supports real-time test result streaming via Server-Sent Events (SSE) at `/api/v1/events`.

## Build

### Prerequisites
- Go 1.25+
- Node.js 25+
- GCC/Clang (for C dataplane, C23 standard)

### Build Commands

```bash
# Build CLI binary
make build

# Build WebUI
cd ui && npm install && npm run build

# Build everything
make

# Run tests
make test

# Run linting
make lint
```

## Licensing

The Stem uses a tiered licensing model:

| Tier | Features | License Key Prefix |
|------|----------|-------------------|
| Tier 1 | Reflector only | `1001-*` |
| Tier 2 | Full test suite + Reflector | `2001-*` |
| Tier 3 | Enterprise (future) | `3001-*` |

### Trial Mode
- 14-day full-featured trial (no license required)
- Start via WebUI Settings > License > Start Trial

### Activation
- License keys are 16-character alphanumeric (XXXX-XXXX-XXXX-XXXX)
- Offline validation (no internet required after activation)
- 3 device activations per license
- Device binding via hardware fingerprint

## Project Structure

```
stem/
├── cmd/stem/           # CLI entrypoint
├── internal/           # Private Go packages
│   ├── modules/        # Test modules (benchmark, servicetest, etc.)
│   ├── reflector/      # Reflector subsystem
│   ├── testmaster/     # Test execution subsystem
│   ├── server/         # REST API server
│   ├── auth/           # JWT authentication
│   ├── license/        # Licensing system
│   └── netif/          # Network interface detection
├── src/dataplane/      # C dataplane code (C23)
├── include/            # C headers
└── ui/                 # React WebUI (TypeScript)
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server health check |
| `/api/interfaces` | GET | List network interfaces |
| `/api/settings` | GET/POST | Get/update settings |
| `/api/mode` | GET/POST | Get/set operating mode |
| `/api/test/start` | POST | Start test (requires auth) |
| `/api/test/stop` | POST | Stop test (requires auth) |
| `/api/test/result` | GET | Get test results (requires auth) |
| `/api/auth/login` | POST | Authenticate and get JWT |
| `/api/v1/events` | GET | SSE for live results |
| `/api/modules` | GET | List test modules |
| `/api/modules/{name}` | GET | Get module details |
| `/api/license` | GET | License status |
| `/api/license/activate` | POST | Activate license |
| `/api/license/trial` | POST | Start trial |
| `/api/reflector/config` | GET/POST | Reflector configuration |
| `/api/reflector/stats` | GET | Reflector statistics |

## Support

For licensing inquiries and support, contact Mustard Seed Networks.

## License

Copyright (c) 2025 Mustard Seed Networks. All rights reserved.
