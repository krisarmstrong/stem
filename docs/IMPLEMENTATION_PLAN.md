# Seed Test Suite - Unified Project Plan

## Overview

**Company:** Mustard Seed Networks
**Product Ecosystem:** The Seed
**This Component:** Seed Test Suite (Network Testing + Reflector)

**NEW UNIFIED PROJECT: `seed-test-suite`**

Create a fresh repository combining Reflector and Test Master:
- Part of "The Seed" ecosystem
- Tiered licensing (Reflector-only vs Full Suite)
- Single unified WebUI
- CLI command: `seedtest`

---

## Part 1: New Project Structure

### Repository: `seed-test-suite`

```
seed-test-suite/
├── cmd/
│   └── seedtest/               # Unified CLI: seedtest reflect, seedtest test
│       └── main.go
├── pkg/
│   ├── reflector/              # Reflector logic (from reflector-native)
│   ├── testmaster/             # Test suite logic (from rfc2544-master)
│   ├── license/                # NEW: Licensing system
│   ├── interfaces/             # NEW: Interface detection
│   ├── web/                    # Web server
│   └── tui/                    # Terminal UI
├── src/
│   └── dataplane/              # C code (copy from rfc2544-master)
│       ├── common/
│       ├── linux_packet/
│       └── linux_xdp/
├── include/                    # C headers
├── ui/                         # React WebUI (NEW unified)
│   ├── src/
│   │   ├── components/
│   │   │   ├── CollapsibleSection.tsx
│   │   │   ├── SettingsDrawer.tsx
│   │   │   └── sections/       # Test category sections
│   │   ├── hooks/
│   │   ├── types/
│   │   └── App.tsx
│   └── package.json
├── Makefile
├── go.mod
└── README.md
```

### What Gets Copied

| From | To | Notes |
|------|----|----|
| `rfc2544-master/src/dataplane/` | `seed-test-suite/src/dataplane/` | All C code |
| `rfc2544-master/include/` | `seed-test-suite/include/` | Headers |
| `rfc2544-master/pkg/` | `seed-test-suite/pkg/testmaster/` | Go code |
| `reflector-native/pkg/` | `seed-test-suite/pkg/reflector/` | Go code |
| seed design system | `seed-test-suite/ui/src/` | Fresh UI |

### Product Tiers

| Tier | Name | Features | Price Point |
|------|------|----------|-------------|
| **Tier 1** | Seed Reflector | Packet reflection only | $ (Entry) |
| **Tier 2** | Seed Test Suite | Full test suite + Reflector | $$ (Full) |

### Single Binary, Multiple Modes

```bash
# Reflector mode (Tier 1 license)
seedtest reflect --interface eth0

# Test Master mode (Tier 2 license)
seedtest test --type throughput --interface eth0

# WebUI (shows features based on license tier)
seedtest web --port 8080

# TUI dashboard
seedtest tui
```

---

## Part 2: MSN Licensing System

**PRIORITY: Implement AFTER WebUI is complete (Phase 2)**

### Design Principles (from Enigma-v300 analysis)

The licensing system uses **hybrid validation** (offline-first with optional check-in):

| Feature | Implementation |
|---------|----------------|
| **Device Binding** | Hardware fingerprint (MAC + CPU ID + disk serial) |
| **Device Count** | 3 activations per license (confirmed) |
| **Validation** | Hybrid: works offline, optional periodic check-in |
| **Key Format** | 16-character alphanumeric (easy to type) |
| **Checksum** | Built-in validation without server |

### License Key Format

```
MSN Key Structure (16 chars):
┌──────┬────────┬────────┬──────┬──────────┐
│ CC   │ PPPP   │ SSSSSSS│ TTT  │ XX       │
│Check │Product │Serial  │Tier  │Reserved  │
└──────┴────────┴────────┴──────┴──────────┘

Product Codes:
- 1001: MSN Reflector (Tier 1)
- 2001: MSN Test Master (Tier 2)

Tier Codes:
- 001: Reflector Only
- 002: Test Master + Reflector
- 003: Enterprise (future)
```

### Rotor Cipher (MSN-specific)

```c
// MSN rotor tables (unique to MSN products)
static const int MSN_ROTOR_10[] = {7, 2, 9, 0, 5, 8, 1, 6, 3, 4};
static const int MSN_ROTOR_26[] = {
    19, 3, 24, 7, 12, 0, 21, 15, 8, 25,
    2, 17, 10, 5, 22, 13, 1, 18, 6, 11,
    23, 4, 16, 9, 20, 14
};
```

### Hardware Fingerprint

```go
// Combine multiple hardware identifiers for fingerprint
type DeviceFingerprint struct {
    MACAddress    string // Primary NIC MAC
    CPUSerial     string // /proc/cpuinfo or dmidecode
    DiskSerial    string // Root disk serial
    Hostname      string // Machine hostname (salt)
}

func GenerateFingerprint() string {
    fp := DeviceFingerprint{...}
    hash := sha256(fp.MACAddress + fp.CPUSerial + fp.DiskSerial + fp.Hostname)
    return hash[:16] // First 16 chars of hash
}
```

### Activation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    LICENSE ACTIVATION FLOW                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User enters license key                                    │
│       ↓                                                     │
│  Local validation (checksum, format)                        │
│       ↓                                                     │
│  Generate device fingerprint                                │
│       ↓                                                     │
│  Call activation server:                                    │
│    POST /api/activate                                       │
│    {key, fingerprint, product, version}                     │
│       ↓                                                     │
│  Server checks:                                             │
│    - Key valid?                                             │
│    - Under device limit (3)?                                │
│    - Fingerprint already registered?                        │
│       ↓                                                     │
│  Server returns:                                            │
│    - activation_token (JWT, 365-day expiry)                 │
│    - tier (1 or 2)                                          │
│    - features []                                            │
│       ↓                                                     │
│  Store token locally (encrypted)                            │
│  Enable features based on tier                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Offline Grace Period

- **First run**: 14-day trial (no license required)
- **After activation**: Check server every 30 days
- **Offline tolerance**: 90 days without phone-home
- **Expired**: Degrades to read-only mode (can view results, can't run new tests)

### Activation Server API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/activate` | POST | Activate license on device |
| `/api/validate` | POST | Periodic validation (every 30 days) |
| `/api/deactivate` | POST | Release activation slot |
| `/api/status` | GET | Check license status |

---

## Part 3: WebUI Test Types (CRITICAL GAP)

### Current State: 4/29 Tests Exposed (14%)

**WebUI Currently Has:**
- throughput, latency, frame_loss, back_to_back

### Missing 25 Tests to Add:

| Category | Tests | Priority |
|----------|-------|----------|
| **RFC 2544** | system_recovery, reset | HIGH |
| **Y.1564** | y1564_config, y1564_perf, y1564 | HIGH |
| **RFC 2889** | forwarding, caching, learning, broadcast, congestion | MEDIUM |
| **RFC 6349** | rfc6349_throughput, rfc6349_path | MEDIUM |
| **Y.1731** | delay, loss, slm, loopback | MEDIUM |
| **MEF** | mef_config, mef_perf, mef | MEDIUM |
| **TSN** | tsn_timing, tsn_isolation, tsn_latency, tsn | LOW |

### Test Category UI Organization

```
Settings Drawer (gear icon)
├── CollapsibleSection: Mode Selection
│   ├── Radio: Reflector Mode (Tier 1+)
│   └── Radio: Test Master Mode (Tier 2 only)
│
├── CollapsibleSection: Interface
│   ├── Dropdown: Select Interface (auto-detected)
│   └── Info: Speed/Duplex/Status
│
├── CollapsibleSection: RFC 2544 Tests (6 tests)
│   ├── Checkbox: Throughput
│   ├── Checkbox: Latency
│   ├── Checkbox: Frame Loss
│   ├── Checkbox: Back-to-Back
│   ├── Checkbox: System Recovery
│   └── Checkbox: Reset
│
├── CollapsibleSection: Y.1564 / EtherSAM (3 tests)
│   ├── Checkbox: Configuration Test
│   ├── Checkbox: Performance Test
│   ├── Checkbox: Full Test (both)
│   └── CIR/EIR/Thresholds config
│
├── CollapsibleSection: RFC 2889 LAN Switch (5 tests)
│   ├── Checkbox: Forwarding Rate
│   ├── Checkbox: Address Caching
│   ├── Checkbox: Address Learning
│   ├── Checkbox: Broadcast
│   └── Checkbox: Congestion Control
│
├── CollapsibleSection: RFC 6349 TCP (2 tests)
│   ├── Checkbox: TCP Throughput
│   ├── Checkbox: Path Analysis
│   └── MSS/RWND config
│
├── CollapsibleSection: Y.1731 OAM (4 tests)
│   ├── Checkbox: Delay (DMM/DMR)
│   ├── Checkbox: Loss (LMM/LMR)
│   ├── Checkbox: Synthetic Loss
│   ├── Checkbox: Loopback
│   └── MEP/MEG config
│
├── CollapsibleSection: MEF Service (3 tests)
│   ├── Checkbox: Configuration
│   ├── Checkbox: Performance
│   ├── Checkbox: Full Test
│   └── Service type/CoS config
│
├── CollapsibleSection: TSN 802.1Qbv (4 tests)
│   ├── Checkbox: Gate Timing
│   ├── Checkbox: Traffic Isolation
│   ├── Checkbox: Scheduled Latency
│   ├── Checkbox: Full Suite
│   └── GCL config
│
└── CollapsibleSection: Reflector Config (Tier 1+)
    ├── Profile: NetAlly / MSN / All / Custom
    ├── Signature Filter
    ├── OUI Filter
    └── Port Filter
```

---

## Part 4: Interface Detection

### Backend API

```go
// GET /api/interfaces
type InterfaceInfo struct {
    Name       string `json:"name"`       // eth0, enp3s0
    MAC        string `json:"mac"`        // 00:11:22:33:44:55
    Speed      int    `json:"speed"`      // Mbps (1000, 10000)
    Duplex     string `json:"duplex"`     // full, half
    State      string `json:"state"`      // up, down
    Driver     string `json:"driver"`     // ixgbe, mlx5_core
    IsPhysical bool   `json:"physical"`   // true for real NICs
    XDPSupport bool   `json:"xdp"`        // AF_XDP capable
    DPDKSupport bool  `json:"dpdk"`       // DPDK capable
    Score      int    `json:"score"`      // Auto-selection score
}
```

### Auto-Selection Algorithm

```go
func ScoreInterface(iface InterfaceInfo) int {
    score := 0

    // Physical NICs preferred
    if iface.IsPhysical { score += 100 }

    // Higher speed = higher score
    score += iface.Speed / 100  // 10G = +100, 1G = +10

    // AF_XDP support bonus
    if iface.XDPSupport { score += 50 }

    // DPDK support bonus
    if iface.DPDKSupport { score += 30 }

    // Up state required
    if iface.State != "up" { score = 0 }

    return score
}
```

### WebUI Interface Selector

```tsx
<CollapsibleSection title="Interface">
  <select value={selectedInterface} onChange={...}>
    {interfaces
      .sort((a, b) => b.score - a.score)
      .map(iface => (
        <option key={iface.name} value={iface.name}>
          {iface.name} ({iface.speed}Mbps)
          {iface.score === maxScore && " ★ Recommended"}
        </option>
      ))}
  </select>
  <div className="text-sm text-muted">
    {selectedIface.driver} | {selectedIface.state} |
    {selectedIface.xdp && "XDP ✓"} {selectedIface.dpdk && "DPDK ✓"}
  </div>
</CollapsibleSection>
```

---

## Part 5: Settings Drawer Architecture (Seed Pattern)

### Key Components to Implement

| Component | Source | Purpose |
|-----------|--------|---------|
| CollapsibleSection | Seed | Accordion sections |
| AutoSaveIndicator | Seed | "Saving..." / "Saved" badge |
| SettingsDrawer | New | Combined settings panel |

### Auto-Save Pattern

```tsx
// Debounced auto-save (800ms)
useEffect(() => {
  if (initRef.current) return; // Skip initial load
  if (timerRef.current) clearTimeout(timerRef.current);

  timerRef.current = setTimeout(() => {
    saveSettings();
  }, 800);

  return () => clearTimeout(timerRef.current);
}, [settings]);
```

### Settings State Structure

```typescript
interface AppSettings {
  // Mode
  mode: "reflector" | "test_master";

  // License
  license: {
    key: string;
    tier: 1 | 2;
    activated: boolean;
    expiresAt: string;
  };

  // Interface
  interface: {
    name: string;
    autoSelect: boolean;
  };

  // Reflector Config
  reflector: {
    profile: "netally" | "msn" | "all" | "custom";
    signatureFilter: string[];
    ouiFilter: string;
    portFilter: number;
  };

  // Test Config
  tests: {
    rfc2544: TestConfig;
    y1564: Y1564Config;
    rfc2889: RFC2889Config;
    rfc6349: RFC6349Config;
    y1731: Y1731Config;
    mef: MEFConfig;
    tsn: TSNConfig;
  };

  // Appearance
  appearance: {
    theme: "light" | "dark" | "system";
  };
}
```

---

## Part 6: Implementation Order (REVISED)

**User Decisions:**
- WebUI + all 29 tests first, licensing later
- NEW unified project `msn-test-suite` (clean slate)

### Phase 0: Project Setup
1. Create new repo `seed-test-suite`
2. Copy C dataplane code from rfc2544-master
3. Copy Go packages (restructure into pkg/reflector, pkg/testmaster)
4. Setup fresh React UI with Seed design system
5. Create unified CLI (`cmd/seed/main.go`)
6. Verify C code compiles with new structure

### Phase 1: WebUI Foundation (PRIORITY)
7. Create CollapsibleSection component (from Seed)
8. Create SettingsDrawer architecture
9. Add interface detection backend (`/api/interfaces`)
10. Add interface selector with auto-detect in UI
11. Add mode toggle (Reflector/Test Master)

### Phase 2: All 29 Test Types in WebUI
12. Add all RFC 2544 tests (6 total including system_recovery, reset)
13. Add Y.1564 tests + configuration (CIR/EIR/thresholds)
14. Add RFC 2889 tests + configuration (port count, patterns)
15. Add RFC 6349 tests + configuration (MSS/RWND)
16. Add Y.1731 tests + configuration (MEP/MEG)
17. Add MEF tests + configuration (service type/CoS)
18. Add TSN tests + configuration (GCL)

### Phase 3: Reflector Integration
19. Reflector stats dashboard
20. Reflector config in settings drawer
21. Profile presets (NetAlly, MSN, All, Custom)
22. Auto-save with debouncing

### Phase 4: Licensing System (AFTER WebUI)
23. Create `pkg/license/` package with fingerprint
24. Implement rotor cipher (encrypt/decrypt)
25. Add hybrid validation (offline + optional check-in)
26. License tier enforcement (gray out locked features)
27. License input/status display in settings

### Phase 5: Polish & Testing
28. WebUI dark/light mode
29. MSN branding consistency check
30. End-to-end testing
31. Documentation
32. Deprecate old repos (reflector-native, rfc2544-master)

---

## Part 7: Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `pkg/license/fingerprint.go` | Hardware fingerprint generation |
| `pkg/license/cipher.go` | MSN rotor cipher |
| `pkg/license/validator.go` | License key validation |
| `pkg/license/activation.go` | Activation server client |
| `pkg/interfaces/detect.go` | Interface detection |
| `pkg/interfaces/score.go` | Auto-selection scoring |
| `ui/src/components/CollapsibleSection.tsx` | Accordion component |
| `ui/src/components/SettingsDrawer.tsx` | Main settings panel |
| `ui/src/components/sections/*.tsx` | Individual sections |
| `ui/src/hooks/useAutoSave.ts` | Debounced save hook |

### Modified Files

| File | Changes |
|------|---------|
| `cmd/rfc2544/main.go` | Add license check at startup |
| `pkg/web/server.go` | Add `/api/license/*`, `/api/interfaces` |
| `ui/src/App.tsx` | Add SettingsDrawer, mode switching |
| `ui/src/types/settings.ts` | Full settings type definitions |

---

## Part 8: Design System (from Seed)

### Brand Colors

| Color | Light | Dark | Usage |
|-------|-------|------|-------|
| **Seed Green** | `#2d7a3e` | `#81c784` | Actions, focus |
| **Mustard Gold** | `#d4a017` | `#fbbf24` | Premium highlights |
| Surface Base | `#f8fafc` | `#1a1a1a` | Background |
| Surface Raised | `#ffffff` | `#333333` | Cards |

### Files to Copy from Seed
1. `web/src/styles/theme.ts` - Design tokens
2. `web/src/index.css` - Tailwind v4 config
3. `web/src/components/ui/CollapsibleSection.tsx` - Accordion

---

## Success Criteria

1. ✅ License system prevents unauthorized use
2. ✅ 3 device activations per license (reasonable limit)
3. ✅ Interface auto-detection selects best NIC
4. ✅ All 29 test types accessible in WebUI
5. ✅ Mode toggle switches between Reflector/Test Master
6. ✅ Settings use CollapsibleSection pattern
7. ✅ Auto-save with status indicator
8. ✅ Tier 2 features locked until licensed

