// Copyright (c) 2025 Mustard Seed Networks. All rights reserved.

package benchmark

import (
	"errors"
	"fmt"
	"time"

	"github.com/krisarmstrong/stem/internal/testmaster/dataplane"
)

// Result is a generic test result.
type Result struct {
	TestType   string      `json:"testType"`
	ModuleName string      `json:"module"`
	Success    bool        `json:"success"`
	Error      string      `json:"error,omitempty"`
	Data       interface{} `json:"data,omitempty"`
}

// TestConfig holds configuration for test execution.
type TestConfig struct {
	Interface string
	FrameSize uint32
	Duration  int
	Params    map[string]interface{}
}

// Parameter extraction helpers for safe type conversion.
// JSON decoding converts all numbers to float64, so we need to handle both
// native types and float64 conversions.

// getFloat64Param extracts a float64 parameter from a map, handling both float64 and int types.
func getFloat64Param(params map[string]interface{}, key string, defaultVal float64) float64 {
	if params == nil {
		return defaultVal
	}
	v, ok := params[key]
	if !ok {
		return defaultVal
	}
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int:
		return float64(val)
	case int64:
		return float64(val)
	case int32:
		return float64(val)
	default:
		return defaultVal
	}
}

// getUint64Param extracts a uint64 parameter from a map, handling float64 and int types.
func getUint64Param(params map[string]interface{}, key string, defaultVal uint64) uint64 {
	if params == nil {
		return defaultVal
	}
	v, ok := params[key]
	if !ok {
		return defaultVal
	}
	switch val := v.(type) {
	case float64:
		if val >= 0 {
			return uint64(val)
		}
		return defaultVal
	case uint64:
		return val
	case int64:
		if val >= 0 {
			return uint64(val)
		}
		return defaultVal
	case int:
		if val >= 0 {
			return uint64(val)
		}
		return defaultVal
	default:
		return defaultVal
	}
}

// getUint32Param extracts a uint32 parameter from a map, handling float64 and int types.
func getUint32Param(params map[string]interface{}, key string, defaultVal uint32) uint32 {
	if params == nil {
		return defaultVal
	}
	v, ok := params[key]
	if !ok {
		return defaultVal
	}
	switch val := v.(type) {
	case float64:
		if val >= 0 && val <= float64(^uint32(0)) {
			return uint32(val)
		}
		return defaultVal
	case uint32:
		return val
	case int:
		if val >= 0 && val <= int(^uint32(0)) {
			return uint32(val)
		}
		return defaultVal
	case int64:
		if val >= 0 && val <= int64(^uint32(0)) {
			return uint32(val)
		}
		return defaultVal
	default:
		return defaultVal
	}
}

// getIntParam extracts an int parameter from a map, handling float64 type.
func getIntParam(params map[string]interface{}, key string, defaultVal int) int {
	if params == nil {
		return defaultVal
	}
	v, ok := params[key]
	if !ok {
		return defaultVal
	}
	switch val := v.(type) {
	case float64:
		return int(val)
	case int:
		return val
	case int64:
		return int(val)
	case int32:
		return int(val)
	default:
		return defaultVal
	}
}

// ErrTestNotImplemented is returned for unimplemented tests.
var ErrTestNotImplemented = errors.New("test type not implemented")

// ErrInvalidConfig is returned for invalid configuration.
var ErrInvalidConfig = errors.New("invalid test configuration")

// Executor wraps the Benchmark module with test execution capability.
type Executor struct {
	*Module
	ctx *dataplane.Context
}

// NewExecutor creates a new Benchmark executor with a dataplane context.
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

// NewExecutorWithContext creates an executor with an existing dataplane context.
func NewExecutorWithContext(ctx *dataplane.Context) *Executor {
	return &Executor{
		Module: New(),
		ctx:    ctx,
	}
}

// SupportsExecution returns true as Benchmark supports test execution.
func (e *Executor) SupportsExecution() bool {
	return true
}

// Close releases the dataplane context resources.
func (e *Executor) Close() {
	if e.ctx != nil {
		e.ctx.Close()
	}
}

// Execute runs an RFC 2544 test and returns the result.
func (e *Executor) Execute(testType string, cfg *TestConfig) (*Result, error) {
	if !e.CanRun(testType) {
		return nil, fmt.Errorf("benchmark module cannot run test type: %s", testType)
	}

	if cfg == nil {
		return nil, ErrInvalidConfig
	}

	// Configure the context
	if err := e.configureContext(cfg); err != nil {
		return nil, fmt.Errorf("failed to configure context: %w", err)
	}

	// Set frame size if provided
	if cfg.FrameSize > 0 {
		e.ctx.SetFrameSize(cfg.FrameSize)
	}

	// Execute the test
	result := &Result{
		TestType:   testType,
		ModuleName: ModuleName,
		Success:    false,
	}

	var data interface{}
	var err error

	switch testType {
	case "throughput":
		data, err = e.ctx.RunThroughputTest()
	case "latency":
		loadLevels := e.getLoadLevels(cfg)
		data, err = e.ctx.RunLatencyTest(loadLevels)
	case "frame_loss":
		startPct, endPct, stepPct := e.getFrameLossParams(cfg)
		data, err = e.ctx.RunFrameLossTest(startPct, endPct, stepPct)
	case "back_to_back":
		initialBurst, trials := e.getBackToBackParams(cfg)
		data, err = e.ctx.RunBackToBackTest(initialBurst, trials)
	case "system_recovery":
		throughputPct, overloadSec := e.getRecoveryParams(cfg)
		data, err = e.ctx.RunSystemRecoveryTest(throughputPct, overloadSec)
	case "reset":
		data, err = e.ctx.RunResetTest()
	default:
		return nil, ErrTestNotImplemented
	}

	if err != nil {
		result.Error = err.Error()
		return result, fmt.Errorf("benchmark test %s failed: %w", testType, err)
	}

	result.Success = true
	result.Data = data
	return result, nil
}

// configureContext sets up the dataplane context from test config.
func (e *Executor) configureContext(cfg *TestConfig) error {
	dpCfg := &dataplane.Config{
		Interface:  cfg.Interface,
		AutoDetect: true,
	}

	if cfg.Duration > 0 {
		dpCfg.TrialDuration = time.Duration(cfg.Duration) * time.Second
	}

	// Extract additional parameters using type-safe helpers
	dpCfg.ResolutionPct = getFloat64Param(cfg.Params, "resolution", 0.1)
	dpCfg.AcceptableLoss = getFloat64Param(cfg.Params, "max_loss", 0.0)
	warmup := getIntParam(cfg.Params, "warmup", 0)
	if warmup > 0 {
		dpCfg.WarmupPeriod = time.Duration(warmup) * time.Second
	}

	if err := e.ctx.Configure(dpCfg); err != nil {
		return fmt.Errorf("configure dataplane: %w", err)
	}
	return nil
}

// getLoadLevels extracts load levels from config or returns defaults.
func (e *Executor) getLoadLevels(cfg *TestConfig) []float64 {
	if cfg.Params != nil {
		if levels, ok := cfg.Params["load_levels"].([]float64); ok {
			return levels
		}
	}
	return []float64{10, 25, 50, 75, 90, 100}
}

// getFrameLossParams extracts frame loss parameters from config using type-safe helpers.
func (e *Executor) getFrameLossParams(cfg *TestConfig) (float64, float64, float64) {
	startPct := getFloat64Param(cfg.Params, "start_pct", 10.0)
	endPct := getFloat64Param(cfg.Params, "end_pct", 100.0)
	stepPct := getFloat64Param(cfg.Params, "step_pct", 10.0)
	return startPct, endPct, stepPct
}

// getBackToBackParams extracts back-to-back test parameters using type-safe helpers.
func (e *Executor) getBackToBackParams(cfg *TestConfig) (uint64, uint32) {
	initialBurst := getUint64Param(cfg.Params, "initial_burst", 10000)
	trials := getUint32Param(cfg.Params, "trials", 3)
	return initialBurst, trials
}

// getRecoveryParams extracts system recovery test parameters using type-safe helpers.
func (e *Executor) getRecoveryParams(cfg *TestConfig) (float64, uint32) {
	throughputPct := getFloat64Param(cfg.Params, "throughput_pct", 100.0)
	overloadSec := getUint32Param(cfg.Params, "overload_sec", 60)
	return throughputPct, overloadSec
}
