# The Stem Module Implementation Status

This document tracks which modules and tests are fully implemented vs stubbed.

**Last Updated:** 2025-12-30
**Version:** v0.1.5

---

## Implementation Summary

| Module | Status | Executable Tests | Notes |
|--------|--------|------------------|-------|
| **Benchmark** | ✅ Implemented | 6/6 | Full RFC 2544 support |
| **ServiceTest** | ✅ Implemented | 6/6 | Y.1564 and MEF tests supported |
| **TrafficGen** | ✅ Implemented | 1/1 | Custom stream generation supported |
| **Measure** | ✅ Implemented | 4/4 | Y.1731 OAM tests supported |
| **Certify** | ✅ Implemented | 11/11 | RFC 2889, RFC 6349, and TSN tests supported |

---

## Module Details

### Benchmark (RFC 2544) ✅ IMPLEMENTED

**Location:** `internal/modules/benchmark/`
**Dataplane:** Uses `internal/testmaster/dataplane`
**Status:** Fully functional with CGO-enabled Linux builds

| Test Type | Status | Command |
|-----------|--------|---------|
| `throughput` | ✅ Works | `stem test -t throughput` |
| `latency` | ✅ Works | `stem test -t latency` |
| `frame_loss` | ✅ Works | `stem test -t frame_loss` |
| `back_to_back` | ✅ Works | `stem test -t back_to_back` |
| `system_recovery` | ✅ Works | `stem test -t system_recovery` |
| `reset` | ✅ Works | `stem test -t reset` |

**Notes:**
- Requires CGO and Linux for actual test execution
- Non-CGO builds return `ErrNotSupported`
- Full RFC 2544 methodology implemented in C dataplane

---

### ServiceTest (Y.1564 / MEF) ✅ IMPLEMENTED

**Location:** `internal/modules/servicetest/`
**Dataplane:** Uses `internal/testmaster/dataplane`
**Status:** Y.1564 and MEF tests are implemented.

| Test Type | Status | Command |
|-----------|--------|---------|
| `y1564_config` | ✅ Works | `stem test -t y1564_config --cir 100` |
| `y1564_perf` | ✅ Works | `stem test -t y1564_perf --cir 100` |
| `y1564` | ✅ Works | `stem test -t y1564 --cir 100` |
| `mef_config` | ✅ Works | `stem test -t mef_config --cir 100` |
| `mef_perf` | ✅ Works | `stem test -t mef_perf --cir 100` |
| `mef` | ✅ Works | `stem test -t mef --cir 100` |

**Notes:**
- Requires CGO-enabled Linux builds for dataplane execution
- MEF tests use MEF 48/49 defaults with configurable SLA parameters

---

---

### TrafficGen (Custom Traffic) ✅ IMPLEMENTED

**Location:** `internal/modules/trafficgen/`
**Dataplane:** Uses `internal/testmaster/dataplane`
**Status:** Custom stream generation is supported via the dataplane.

| Test Type | Status | Command |
|-----------|--------|---------|
| `custom_stream` | ✅ Works | `stem test -t custom_stream --rate_pct 10` |

**Notes:**
- Uses the dataplane custom trial path for rate-controlled streams
- Stream parameters are provided via test config params

---

---

### Measure (Y.1731 OAM) ✅ IMPLEMENTED

**Location:** `internal/modules/measure/`
**Dataplane:** Uses `internal/testmaster/dataplane`
**Status:** Y.1731 delay, loss, synthetic loss, and loopback tests are supported.

| Test Type | Status | Command |
|-----------|--------|---------|
| `y1731_delay` | ✅ Works | `stem test -t y1731_delay --count 10` |
| `y1731_loss` | ✅ Works | `stem test -t y1731_loss --duration 60` |
| `y1731_slm` | ✅ Works | `stem test -t y1731_slm --count 10` |
| `y1731_loopback` | ✅ Works | `stem test -t y1731_loopback --count 10` |

**Notes:**
- Requires a Y.1731-capable path and suitable MEP configuration

---

---

### Certify (RFC 2889 / RFC 6349 / TSN) ✅ IMPLEMENTED

**Location:** `internal/modules/certify/`
**Dataplane:** Uses `internal/testmaster/dataplane`
**Status:** RFC 2889, RFC 6349, and TSN tests are implemented.

#### RFC 2889 (LAN Switching)

| Test Type | Status | Notes |
|-----------|--------|-------|
| `rfc2889_forwarding` | ✅ Works | Multi-port forwarding rate |
| `rfc2889_caching` | ✅ Works | MAC address table capacity |
| `rfc2889_learning` | ✅ Works | Address learning rate |
| `rfc2889_broadcast` | ✅ Works | Broadcast frame handling |
| `rfc2889_congestion` | ✅ Works | Congestion control behavior |

#### RFC 6349 (TCP Throughput)

| Test Type | Status | Notes |
|-----------|--------|-------|
| `rfc6349_throughput` | ✅ Works | TCP throughput measurement |
| `rfc6349_path` | ✅ Works | Path analysis (RTT, BDP) |

#### TSN (IEEE 802.1Qbv)

| Test Type | Status | Notes |
|-----------|--------|-------|
| `tsn_timing` | ✅ Works | Gate timing accuracy |
| `tsn_isolation` | ✅ Works | Traffic class isolation |
| `tsn_latency` | ✅ Works | Scheduled latency |
| `tsn` | ✅ Works | Full TSN validation |

---

---

## Platform Requirements

### Full Functionality (CGO + Linux)

For full test execution capability, build with:

```bash
CGO_ENABLED=1 GOOS=linux go build ./cmd/stem
```

Requirements:
- Linux kernel 4.15+ (for AF_PACKET)
- Optional: AF_XDP support (kernel 4.18+, libbpf)
- Optional: DPDK 23.11 LTS
- GCC 7.3+ or Clang 7+

### Stub Mode (Non-CGO or Non-Linux)

On macOS or with `CGO_ENABLED=0`:

- All dataplane operations return `ErrNotSupported`
- API endpoints return HTTP 503 with status "unavailable"
- Useful for development and testing of non-dataplane code

---

## Reflector Mode

The reflector mode (`stem reflect`) is separate from the module system:

| Feature | Status | Notes |
|---------|--------|-------|
| MAC reflection | ✅ Works | Swaps src/dst MAC |
| MAC+IP reflection | ✅ Works | Swaps MAC and IP |
| Full reflection | ✅ Works | All-layer swap |
| OUI filtering | ✅ Works | Filter by vendor OUI |
| Signature detection | ✅ Works | ITO, RFC2544, Y.1564, etc. |
| Statistics | ✅ Works | Real-time counters |
| Runtime config | ✅ Works | Hot-reconfigurable |

**Location:** `internal/reflector/`
**Dataplane:** Uses `internal/reflector/dataplane/`

---

## API Behavior

### When Tests Are Available

```json
POST /api/test/start
{
  "testType": "throughput",
  "interface": "eth0"
}

Response 200:
{
  "status": "running",
  "testType": "throughput"
}
```

### When Tests Are Stubbed

```json
POST /api/test/start
{
  "testType": "y1731_delay",
  "interface": "eth0"
}

Response 503:
{
  "status": "unavailable",
  "error": "Y.1731 OAM tests require additional dataplane implementation"
}
```

### When Platform Doesn't Support

```json
POST /api/test/start
{
  "testType": "throughput",
  "interface": "eth0"
}

Response 503:
{
  "status": "unavailable",
  "error": "CGO dataplane not available on this platform"
}
```

---

## Roadmap

### v0.2.0 (Planned)
- [ ] MEF test implementation
- [ ] Reflector API wiring to dataplane

### v0.3.0 (Planned)
- [ ] Y.1731 OAM basic support (loopback, delay)
- [ ] RFC 2889 forwarding rate

### Future
- [ ] RFC 6349 TCP throughput
- [ ] TSN support
- [ ] Custom traffic generation

---

## Contributing

To implement a stubbed module:

1. Add C implementation in `src/dataplane/`
2. Add CGO bindings in `internal/*/dataplane/`
3. Wire executor to call dataplane functions
4. Add tests in `*_test.go`
5. Update this document

See `internal/modules/benchmark/executor.go` for a reference implementation.
