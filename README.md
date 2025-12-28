# Seed Test Suite

**Unified Network Testing Tool by Mustard Seed Networks**

Part of The Seed ecosystem - combining packet reflection and RFC-compliant network testing in a single tool.

## Quick Start

```bash
# Build the CLI
make

# Run reflector (Tier 1)
seedtest reflect -i eth0

# Run network tests (Tier 2)
seedtest test -t throughput -i eth0

# Start WebUI
seedtest web -p 8080

# Start TUI dashboard
seedtest tui
```

## Features

### Tier 1: Seed Reflector
- High-performance packet reflection
- ITO/RFC2544/Y.1564/MSN signature detection
- Profile presets (NetAlly, MSN, All, Custom)
- AF_XDP and DPDK support

### Tier 2: Seed Test Suite (includes Reflector)
- **RFC 2544**: Throughput, Latency, Frame Loss, Back-to-Back, System Recovery, Reset
- **ITU-T Y.1564**: Configuration Test, Performance Test, Full Test
- **RFC 2889**: Forwarding, Caching, Learning, Broadcast, Congestion
- **RFC 6349**: TCP Throughput, Path Analysis
- **ITU-T Y.1731**: Delay, Loss, SLM, Loopback (OAM)
- **MEF 48/49**: Service Configuration, Performance Test
- **IEEE 802.1Qbv TSN**: Gate Timing, Traffic Isolation, Scheduled Latency

## Interfaces

| Interface | Description |
|-----------|-------------|
| CLI | `seedtest <command>` |
| TUI | Terminal dashboard |
| WebUI | http://localhost:8080 |

## Documentation

See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for detailed architecture.

## License

Copyright (c) 2024 Mustard Seed Networks
