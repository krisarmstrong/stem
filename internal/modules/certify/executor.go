// Copyright (c) 2025 Mustard Seed Networks. All rights reserved.

package certify

import (
	"fmt"
	"math"

	"github.com/krisarmstrong/stem/internal/modules/modtypes"
	"github.com/krisarmstrong/stem/internal/testmaster/dataplane"
)

const (
	defaultRFC6349MinRTTMs  = 0.1
	defaultRFC6349MaxRTTMs  = 1000.0
	defaultRFC2889WarmupSec = 2
	defaultRFC2889AddressCt = 8192
	defaultRFC2889PortCt    = 2
	defaultRFC2889Duration  = 60
	defaultRFC6349RWND      = 65535
	defaultRFC6349MSS       = 1460
	defaultRFC6349Duration  = 30
	defaultTSNWarmupSec     = 2
	defaultTSNClassCount    = 8
	defaultTSNDuration      = 60
	defaultTSNFrameSize     = 128
)

// Executor wraps the Certify module with test execution capability.
type Executor struct {
	*Module

	ctx *dataplane.Context
}

// NewExecutor creates a new Certify executor with a dataplane context.
func NewExecutor(iface string) (*Executor, error) {
	ctx, err := dataplane.NewContext(iface)
	if err != nil {
		return nil, fmt.Errorf("failed to create dataplane context: %w", err)
	}

	return &Executor{
		Module: New(),
		ctx:    ctx,
	}, nil
}

// SupportsExecution returns true as Certify can accept execution requests.
func (e *Executor) SupportsExecution() bool {
	return true
}

// Close releases any resources.
func (e *Executor) Close() {
	if e.ctx != nil {
		e.ctx.Close()
	}
}

// Execute runs an RFC 2889, RFC 6349, or TSN test.
func (e *Executor) Execute(testType string, cfg *modtypes.TestConfig) (*modtypes.Result, error) {
	if !e.CanRun(testType) {
		return nil, fmt.Errorf("certify module cannot run test type: %s", testType)
	}

	if cfg == nil {
		return nil, modtypes.ErrInvalidConfig
	}

	result := &modtypes.Result{
		TestType:   testType,
		ModuleName: ModuleName,
		Success:    false,
		Error:      "",
		Data:       nil,
	}

	var data any
	var runErr error

	switch testType {
	case "rfc2889_forwarding":
		data, runErr = e.ctx.RunRFC2889ForwardingTest(buildRFC2889Config(cfg))
	case "rfc2889_caching":
		data, runErr = e.ctx.RunRFC2889CachingTest(buildRFC2889Config(cfg))
	case "rfc2889_learning":
		data, runErr = e.ctx.RunRFC2889LearningTest(buildRFC2889Config(cfg))
	case "rfc2889_broadcast":
		data, runErr = e.ctx.RunRFC2889BroadcastTest(buildRFC2889Config(cfg))
	case "rfc2889_congestion":
		data, runErr = e.ctx.RunRFC2889CongestionTest(buildRFC2889Config(cfg))

	case "rfc6349_throughput":
		data, runErr = e.ctx.RunRFC6349ThroughputTest(buildRFC6349Config(cfg))
	case "rfc6349_path":
		data, runErr = e.ctx.RunRFC6349PathTest(buildRFC6349Config(cfg))

	case "tsn_timing":
		data, runErr = e.ctx.RunTSNGateTimingTest(buildTSNConfig(cfg))
	case "tsn_isolation":
		data, runErr = e.ctx.RunTSNIsolationTest(buildTSNConfig(cfg))
	case "tsn_latency":
		data, runErr = e.ctx.RunTSNLatencyTest(buildTSNConfig(cfg))
	case "tsn":
		data, runErr = e.ctx.RunTSNFullTest(buildTSNConfig(cfg))
	default:
		return nil, modtypes.ErrTestNotImplemented
	}

	if runErr != nil {
		result.Error = runErr.Error()
		return result, fmt.Errorf("certify %s failed: %w", testType, runErr)
	}

	result.Success = true
	result.Data = data
	return result, nil
}

func buildRFC2889Config(cfg *modtypes.TestConfig) *dataplane.RFC2889Config {
	config := &dataplane.RFC2889Config{
		FrameSize:         cfg.FrameSize,
		DurationSec:       safeUint32FromInt(cfg.Duration, 0),
		WarmupSec:         modtypes.GetUint32Param(cfg.Params, "warmup_sec", defaultRFC2889WarmupSec),
		AddressCount:      modtypes.GetUint32Param(cfg.Params, "address_count", defaultRFC2889AddressCt),
		AcceptableLossPct: modtypes.GetFloat64Param(cfg.Params, "acceptable_loss_pct", 0.0),
		PortCount:         modtypes.GetUint32Param(cfg.Params, "port_count", defaultRFC2889PortCt),
		Pattern:           modtypes.GetUint32Param(cfg.Params, "pattern", 0),
	}

	if config.DurationSec == 0 {
		config.DurationSec = modtypes.GetUint32Param(cfg.Params, "duration_sec", defaultRFC2889Duration)
	}

	if config.AcceptableLossPct == 0 {
		config.AcceptableLossPct = modtypes.GetFloat64Param(cfg.Params, "acceptable_loss", 0.0)
	}

	return config
}

func buildRFC6349Config(cfg *modtypes.TestConfig) *dataplane.RFC6349Config {
	config := &dataplane.RFC6349Config{
		TargetRateMbps:  modtypes.GetFloat64Param(cfg.Params, "target_rate_mbps", 0.0),
		MinRTTMs:        modtypes.GetFloat64Param(cfg.Params, "min_rtt_ms", defaultRFC6349MinRTTMs),
		MaxRTTMs:        modtypes.GetFloat64Param(cfg.Params, "max_rtt_ms", defaultRFC6349MaxRTTMs),
		RWNDSize:        modtypes.GetUint32Param(cfg.Params, "rwnd_size", defaultRFC6349RWND),
		DurationSec:     safeUint32FromInt(cfg.Duration, 0),
		ParallelStreams: modtypes.GetUint32Param(cfg.Params, "parallel_streams", 1),
		MSS:             modtypes.GetUint32Param(cfg.Params, "mss", defaultRFC6349MSS),
		Mode:            modtypes.GetUint32Param(cfg.Params, "mode", 0),
	}

	if config.DurationSec == 0 {
		config.DurationSec = modtypes.GetUint32Param(cfg.Params, "duration_sec", defaultRFC6349Duration)
	}

	return config
}

func buildTSNConfig(cfg *modtypes.TestConfig) *dataplane.TSNConfig {
	config := &dataplane.TSNConfig{
		DurationSec:       safeUint32FromInt(cfg.Duration, 0),
		WarmupSec:         modtypes.GetUint32Param(cfg.Params, "warmup_sec", defaultRFC2889WarmupSec),
		FrameSize:         cfg.FrameSize,
		MaxLatencyNs:      modtypes.GetUint32Param(cfg.Params, "max_latency_ns", 0),
		MaxJitterNs:       modtypes.GetUint32Param(cfg.Params, "max_jitter_ns", 0),
		RequirePTPSync:    getBoolParam(cfg.Params, "require_ptp_sync", false),
		MaxSyncOffsetNs:   modtypes.GetUint32Param(cfg.Params, "max_sync_offset_ns", 0),
		PTPEnabled:        getBoolParam(cfg.Params, "ptp_enabled", false),
		PreemptionEnabled: getBoolParam(cfg.Params, "preemption_enabled", false),
		NumTrafficClasses: modtypes.GetUint32Param(cfg.Params, "num_traffic_classes", defaultTSNClassCount),
		BaseTimeNs:        modtypes.GetUint64Param(cfg.Params, "base_time_ns", 0),
		CycleTimeNs:       modtypes.GetUint32Param(cfg.Params, "cycle_time_ns", 0),
		TrafficClass:      modtypes.GetUint32Param(cfg.Params, "traffic_class", 0),
	}

	if config.DurationSec == 0 {
		config.DurationSec = modtypes.GetUint32Param(cfg.Params, "duration_sec", defaultTSNDuration)
	}

	if config.FrameSize == 0 {
		config.FrameSize = modtypes.GetUint32Param(cfg.Params, "frame_size", defaultTSNFrameSize)
	}

	return config
}

func getBoolParam(params map[string]any, key string, defaultVal bool) bool {
	if params == nil {
		return defaultVal
	}
	if val, ok := params[key]; ok {
		if boolVal, okBool := val.(bool); okBool {
			return boolVal
		}
	}
	return defaultVal
}

func safeUint32FromInt(value int, fallback uint32) uint32 {
	if value < 0 || value > math.MaxUint32 {
		return fallback
	}
	return uint32(value)
}
