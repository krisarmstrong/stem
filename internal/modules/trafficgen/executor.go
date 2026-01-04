// Copyright (c) 2025 Mustard Seed Networks. All rights reserved.

package trafficgen

import (
	"fmt"
	"math"

	"github.com/krisarmstrong/stem/internal/modules/modtypes"
	"github.com/krisarmstrong/stem/internal/testmaster/dataplane"
)

const (
	defaultRatePct     = 10.0
	defaultWarmupSec   = 1
	defaultDurationSec = 10
)

// Executor wraps the TrafficGen module with test execution capability.
type Executor struct {
	*Module

	ctx *dataplane.Context
}

// NewExecutor creates a new TrafficGen executor with a dataplane context.
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

// SupportsExecution returns true as TrafficGen supports test execution.
func (e *Executor) SupportsExecution() bool {
	return true
}

// Close releases the dataplane context resources.
func (e *Executor) Close() {
	if e.ctx != nil {
		e.ctx.Close()
	}
}

// Execute runs a custom traffic generation test.
func (e *Executor) Execute(testType string, cfg *modtypes.TestConfig) (*modtypes.Result, error) {
	if !e.CanRun(testType) {
		return nil, fmt.Errorf("trafficgen module cannot run test type: %s", testType)
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

	if testType != "custom_stream" {
		return nil, modtypes.ErrTestNotImplemented
	}

	config := &dataplane.TrafficGenConfig{
		FrameSize:   cfg.FrameSize,
		RatePct:     modtypes.GetFloat64Param(cfg.Params, "rate_pct", defaultRatePct),
		DurationSec: safeUint32FromInt(cfg.Duration, 0),
		WarmupSec:   modtypes.GetUint32Param(cfg.Params, "warmup_sec", defaultWarmupSec),
		StreamID:    modtypes.GetUint32Param(cfg.Params, "stream_id", 0),
	}

	if config.DurationSec == 0 {
		config.DurationSec = modtypes.GetUint32Param(cfg.Params, "duration_sec", defaultDurationSec)
	}

	data, runErr := e.ctx.RunCustomStreamTest(config)
	if runErr != nil {
		result.Error = runErr.Error()
		return result, fmt.Errorf("trafficgen %s failed: %w", testType, runErr)
	}

	result.Success = true
	result.Data = data
	return result, nil
}

func safeUint32FromInt(value int, fallback uint32) uint32 {
	if value < 0 || value > math.MaxUint32 {
		return fallback
	}
	return uint32(value)
}
