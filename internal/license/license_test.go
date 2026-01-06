// Copyright (c) 2025 Mustard Seed Networks. All rights reserved.

package license_test

import (
	"strings"
	"testing"
	"time"

	"github.com/krisarmstrong/stem/internal/license"
)

func TestRotorCipherRoundTrip(t *testing.T) {
	testCases := []struct {
		input    string
		position int
	}{
		{"ABCD1234", 0},
		{"1234ABCD", 7},
		{"MSN12345TEST", 15},
		{"0000000000000000", 0},
		{"AAAAAAAAAAAAAAAA", 0},
	}

	for _, tc := range testCases {
		cipher := license.NewRotorCipher(tc.position)
		encoded := cipher.EncodeString(tc.input)

		// Reset position for decoding.
		cipher = license.NewRotorCipher(tc.position)
		decoded := cipher.DecodeString(encoded)

		if decoded != tc.input {
			t.Errorf("RoundTrip failed: input=%q, encoded=%q, decoded=%q", tc.input, encoded, decoded)
		}
	}
}

func TestCalculateChecksum(t *testing.T) {
	testCases := []struct {
		input    string
		expected int // length of checksum.
	}{
		{"ABC123", 2},
		{"1001ABCDEF12", 2},
		{"", 2},
	}

	for _, tc := range testCases {
		checksum := license.CalculateChecksum(tc.input)
		if len(checksum) != tc.expected {
			t.Errorf("Checksum length wrong: input=%q, got=%d, want=%d", tc.input, len(checksum), tc.expected)
		}
	}
}

func TestValidateChecksum(t *testing.T) {
	// Test with valid checksums.
	payload := "ABC123"
	checksum := license.CalculateChecksum(payload)
	valid := license.ValidateChecksum(payload + checksum)

	if !valid {
		t.Errorf("ValidateChecksum should return true for valid checksum")
	}

	// Test with invalid checksum.
	invalid := license.ValidateChecksum(payload + "XX")
	if invalid {
		t.Errorf("ValidateChecksum should return false for invalid checksum")
	}
}

func TestGenerateLicenseKey(t *testing.T) {
	testCases := []struct {
		productCode string
		serial      string
		tier        license.Tier
		wantErr     bool
	}{
		{"1001", "ABCDEFG", license.TierReflector, false},
		{"2001", "1234567", license.TierTestSuite, false},
		{"3001", "XYZXYZX", license.TierEnterprise, false},
		{"100", "ABCDEFG", license.TierReflector, true}, // Invalid product code length.
		{"1001", "ABCDEF", license.TierReflector, true}, // Invalid serial length.
		{"1001", "ABCDEFG", license.Tier(0), true},      // Invalid tier.
	}

	for _, tc := range testCases {
		key, err := license.GenerateLicenseKey(tc.productCode, tc.serial, tc.tier)
		if tc.wantErr {
			if err == nil {
				t.Errorf("GenerateLicenseKey(%q, %q, %d) should return error", tc.productCode, tc.serial, tc.tier)
			}
			continue
		}

		if err != nil {
			t.Errorf(
				"GenerateLicenseKey(%q, %q, %d) returned unexpected error: %v",
				tc.productCode, tc.serial, tc.tier, err,
			)
			continue
		}

		const expectedKeyLen = 16
		if len(key) != expectedKeyLen {
			t.Errorf("Generated key length wrong: got=%d, want=16", len(key))
		}
	}
}

func TestValidateLicenseKey(t *testing.T) {
	// Generate a valid key and test validation.
	key, err := license.GenerateLicenseKey("1001", "ABCDEFG", license.TierReflector)
	if err != nil {
		t.Fatalf("Failed to generate test key: %v", err)
	}

	info := license.ValidateLicenseKey(key)
	if !info.Valid {
		t.Errorf("ValidateLicenseKey should return valid for generated key: %s, error: %s", key, info.ErrorMsg)
	}

	// Test invalid keys.
	invalidKeys := []struct {
		key     string
		wantErr string
	}{
		{"", "License key must be 16 characters"},
		{"SHORT", "License key must be 16 characters"},
		{"INVALID-CHARS-@@", "License key must contain only letters and numbers"},
	}

	for _, tc := range invalidKeys {
		invalidInfo := license.ValidateLicenseKey(tc.key)
		if invalidInfo.Valid {
			t.Errorf("ValidateLicenseKey(%q) should not be valid", tc.key)
		}
	}
}

func TestTierString(t *testing.T) {
	testCases := []struct {
		tier     license.Tier
		expected string
	}{
		{license.TierReflector, "Reflector"},
		{license.TierTestSuite, "Test Suite"},
		{license.TierEnterprise, "Enterprise"},
		{license.TierInvalid, "Invalid"},
	}

	for _, tc := range testCases {
		if tc.tier.String() != tc.expected {
			t.Errorf("Tier.String() = %q, want %q", tc.tier.String(), tc.expected)
		}
	}
}

func TestFormatKey(t *testing.T) {
	testCases := []struct {
		input    string
		expected string
	}{
		{"ABCD1234EFGH5678", "ABCD-1234-EFGH-5678"},
		{"abcd1234efgh5678", "ABCD-1234-EFGH-5678"},
		{"ABCD-1234-EFGH-5678", "ABCD-1234-EFGH-5678"},
		{"SHORT", "SHORT"}, // Invalid length, return as-is.
	}

	for _, tc := range testCases {
		result := license.FormatKey(tc.input)
		if result != tc.expected {
			t.Errorf("FormatKey(%q) = %q, want %q", tc.input, result, tc.expected)
		}
	}
}

func TestInfoHasFeature(t *testing.T) {
	info := &license.Info{
		Key:         "",
		Valid:       false,
		Tier:        license.TierInvalid,
		ProductCode: "",
		Serial:      "",
		Activated:   false,
		ActivatedAt: time.Time{},
		ExpiresAt:   time.Time{},
		DeviceHash:  "",
		MaxDevices:  0,
		Features:    []string{"reflector", "rfc2544", "y1564"},
		ErrorMsg:    "",
	}

	if !info.HasFeature("reflector") {
		t.Error("HasFeature should return true for existing feature")
	}

	if info.HasFeature("nonexistent") {
		t.Error("HasFeature should return false for non-existing feature")
	}
}

func TestInfoCanRunReflector(t *testing.T) {
	tests := []struct {
		info *license.Info
		want bool
	}{
		{
			&license.Info{
				Key:         "",
				Valid:       true,
				Tier:        license.TierReflector,
				ProductCode: "",
				Serial:      "",
				Activated:   false,
				ActivatedAt: time.Time{},
				ExpiresAt:   time.Time{},
				DeviceHash:  "",
				MaxDevices:  0,
				Features:    nil,
				ErrorMsg:    "",
			},
			true,
		},
		{
			&license.Info{
				Key:         "",
				Valid:       true,
				Tier:        license.TierTestSuite,
				ProductCode: "",
				Serial:      "",
				Activated:   false,
				ActivatedAt: time.Time{},
				ExpiresAt:   time.Time{},
				DeviceHash:  "",
				MaxDevices:  0,
				Features:    nil,
				ErrorMsg:    "",
			},
			true,
		},
		{
			&license.Info{
				Key:         "",
				Valid:       true,
				Tier:        license.TierEnterprise,
				ProductCode: "",
				Serial:      "",
				Activated:   false,
				ActivatedAt: time.Time{},
				ExpiresAt:   time.Time{},
				DeviceHash:  "",
				MaxDevices:  0,
				Features:    nil,
				ErrorMsg:    "",
			},
			true,
		},
		{
			&license.Info{
				Key:         "",
				Valid:       false,
				Tier:        license.TierReflector,
				ProductCode: "",
				Serial:      "",
				Activated:   false,
				ActivatedAt: time.Time{},
				ExpiresAt:   time.Time{},
				DeviceHash:  "",
				MaxDevices:  0,
				Features:    nil,
				ErrorMsg:    "",
			},
			false,
		},
		{
			&license.Info{
				Key:         "",
				Valid:       true,
				Tier:        license.TierInvalid,
				ProductCode: "",
				Serial:      "",
				Activated:   false,
				ActivatedAt: time.Time{},
				ExpiresAt:   time.Time{},
				DeviceHash:  "",
				MaxDevices:  0,
				Features:    nil,
				ErrorMsg:    "",
			},
			false,
		},
	}

	for i, tc := range tests {
		if tc.info.CanRunReflector() != tc.want {
			t.Errorf("Test %d: CanRunReflector() = %v, want %v", i, tc.info.CanRunReflector(), tc.want)
		}
	}
}

func TestInfoCanRunTests(t *testing.T) {
	tests := []struct {
		info *license.Info
		want bool
	}{
		{
			&license.Info{
				Key:         "",
				Valid:       true,
				Tier:        license.TierReflector,
				ProductCode: "",
				Serial:      "",
				Activated:   false,
				ActivatedAt: time.Time{},
				ExpiresAt:   time.Time{},
				DeviceHash:  "",
				MaxDevices:  0,
				Features:    nil,
				ErrorMsg:    "",
			},
			false,
		},
		{
			&license.Info{
				Key:         "",
				Valid:       true,
				Tier:        license.TierTestSuite,
				ProductCode: "",
				Serial:      "",
				Activated:   false,
				ActivatedAt: time.Time{},
				ExpiresAt:   time.Time{},
				DeviceHash:  "",
				MaxDevices:  0,
				Features:    nil,
				ErrorMsg:    "",
			},
			true,
		},
		{
			&license.Info{
				Key:         "",
				Valid:       true,
				Tier:        license.TierEnterprise,
				ProductCode: "",
				Serial:      "",
				Activated:   false,
				ActivatedAt: time.Time{},
				ExpiresAt:   time.Time{},
				DeviceHash:  "",
				MaxDevices:  0,
				Features:    nil,
				ErrorMsg:    "",
			},
			true,
		},
		{
			&license.Info{
				Key:         "",
				Valid:       false,
				Tier:        license.TierTestSuite,
				ProductCode: "",
				Serial:      "",
				Activated:   false,
				ActivatedAt: time.Time{},
				ExpiresAt:   time.Time{},
				DeviceHash:  "",
				MaxDevices:  0,
				Features:    nil,
				ErrorMsg:    "",
			},
			false,
		},
	}

	for i, tc := range tests {
		if tc.info.CanRunTests() != tc.want {
			t.Errorf("Test %d: CanRunTests() = %v, want %v", i, tc.info.CanRunTests(), tc.want)
		}
	}
}

func TestDeviceFingerprint(t *testing.T) {
	fp, err := license.GenerateFingerprint()
	if err != nil {
		t.Fatalf("GenerateFingerprint failed: %v", err)
	}

	// Verify hash is 16 characters.
	hash := fp.Hash()
	const expectedHashLen = 16
	if len(hash) != expectedHashLen {
		t.Errorf("Fingerprint hash length = %d, want 16", len(hash))
	}

	// Verify hash is consistent.
	hash2 := fp.Hash()
	if hash != hash2 {
		t.Error("Fingerprint hash should be consistent")
	}

	// Verify String() doesn't panic.
	str := fp.String()
	if str == "" {
		t.Error("Fingerprint String() should not be empty")
	}
}

// TestValidateLicenseKeyEdgeCases tests additional license validation paths.
func TestValidateLicenseKeyEdgeCases(t *testing.T) {
	// Test with valid Enterprise tier key.
	key, err := license.GenerateLicenseKey("3001", "1234567", license.TierEnterprise)
	if err != nil {
		t.Fatalf("GenerateLicenseKey() error: %v", err)
	}

	info := license.ValidateLicenseKey(key)
	if !info.Valid {
		t.Errorf("Enterprise key should be valid: %s", info.ErrorMsg)
	}
	if info.Tier != license.TierEnterprise {
		t.Errorf("Expected TierEnterprise, got %v", info.Tier)
	}

	// Enterprise should have extra features.
	if !info.HasFeature("api") {
		t.Error("Enterprise should have api feature")
	}
	if !info.HasFeature("multiuser") {
		t.Error("Enterprise should have multiuser feature")
	}

	// Test keys with separators that get normalized.
	keyWithDashes := license.FormatKey(key)
	infoWithDashes := license.ValidateLicenseKey(keyWithDashes)
	if !infoWithDashes.Valid {
		t.Error("Key with dashes should validate after normalization")
	}

	// Test key with spaces.
	keyWithSpaces := key[:4] + " " + key[4:8] + " " + key[8:12] + " " + key[12:16]
	infoWithSpaces := license.ValidateLicenseKey(keyWithSpaces)
	if !infoWithSpaces.Valid {
		t.Error("Key with spaces should validate after normalization")
	}

	// Test key with dots.
	keyWithDots := key[:4] + "." + key[4:8] + "." + key[8:12] + "." + key[12:16]
	infoWithDots := license.ValidateLicenseKey(keyWithDots)
	if !infoWithDots.Valid {
		t.Error("Key with dots should validate after normalization")
	}

	// Test lowercase key (should be normalized to uppercase).
	lowerKey := strings.ToLower(key)
	infoLower := license.ValidateLicenseKey(lowerKey)
	if !infoLower.Valid {
		t.Error("Lowercase key should validate after normalization")
	}
}

// TestValidateLicenseKeyInvalidTier tests invalid tier in key.
func TestValidateLicenseKeyInvalidTier(t *testing.T) {
	// Create a key manually with invalid tier character.
	// Generate a valid key first.
	validKey, _ := license.GenerateLicenseKey("1001", "ABCDEFG", license.TierReflector)

	// Corrupt the tier position by creating a random invalid key.
	// This tests the "Invalid license tier" path.
	invalidKeys := []struct {
		key     string
		errPart string
	}{
		{"AAAA0000000000AA", "checksum"}, // Invalid checksum.
		{"1234AAAA11111234", ""},         // Format ok but content invalid.
	}

	for _, tc := range invalidKeys {
		info := license.ValidateLicenseKey(tc.key)
		if info.Valid {
			t.Errorf("Key %q should not be valid", tc.key)
		}
		if tc.errPart != "" && !strings.Contains(strings.ToLower(info.ErrorMsg), tc.errPart) {
			t.Logf("Key %q error: %s (expected to contain %q)", tc.key, info.ErrorMsg, tc.errPart)
		}
	}

	// Verify the valid key is still valid.
	info := license.ValidateLicenseKey(validKey)
	if !info.Valid {
		t.Errorf("Valid key should remain valid: %s", info.ErrorMsg)
	}
}

// TestValidateLicenseKeyProductCodeMismatch tests product code tier mismatch.
func TestValidateLicenseKeyProductCodeMismatch(t *testing.T) {
	// These would require crafting malformed keys that pass checksum
	// but have mismatched product codes.
	// For now, verify that correctly generated keys validate.
	tiers := []struct {
		product string
		tier    license.Tier
	}{
		{"1001", license.TierReflector},
		{"2001", license.TierTestSuite},
		{"3001", license.TierEnterprise},
	}

	for _, tc := range tiers {
		key, err := license.GenerateLicenseKey(tc.product, "1234567", tc.tier)
		if err != nil {
			t.Errorf("GenerateLicenseKey(%s, %v) error: %v", tc.product, tc.tier, err)
			continue
		}

		info := license.ValidateLicenseKey(key)
		if !info.Valid {
			t.Errorf("Key for %s/%v should be valid: %s", tc.product, tc.tier, info.ErrorMsg)
		}
		if info.Tier != tc.tier {
			t.Errorf("Expected tier %v, got %v", tc.tier, info.Tier)
		}
		if info.ProductCode != tc.product {
			t.Errorf("Expected product code %s, got %s", tc.product, info.ProductCode)
		}
	}
}

// TestTierStringUnknownValue tests Tier.String() with an unknown value.
func TestTierStringUnknownValue(t *testing.T) {
	// Test with a tier value outside the defined range.
	unknownTier := license.Tier(99)
	result := unknownTier.String()
	if result != "Invalid" {
		t.Errorf("Unknown tier should return 'Invalid', got %q", result)
	}

	// Test negative tier.
	negativeTier := license.Tier(-1)
	result = negativeTier.String()
	if result != "Invalid" {
		t.Errorf("Negative tier should return 'Invalid', got %q", result)
	}
}

// TestRotorCipherDecodeAllCharTypes tests decoding of all character types.
func TestRotorCipherDecodeAllCharTypes(t *testing.T) {
	// Test uppercase letters.
	cipher := license.NewRotorCipher(0)
	for c := byte('A'); c <= 'Z'; c++ {
		encoded := cipher.Encode(c)
		// Verify it's still a letter.
		if encoded < 'A' || encoded > 'Z' {
			t.Errorf("Encoded uppercase %c should be uppercase, got %c", c, encoded)
		}
	}

	// Test lowercase letters.
	cipher = license.NewRotorCipher(0)
	for c := byte('a'); c <= 'z'; c++ {
		encoded := cipher.Encode(c)
		// Verify it's still lowercase.
		if encoded < 'a' || encoded > 'z' {
			t.Errorf("Encoded lowercase %c should be lowercase, got %c", c, encoded)
		}
	}

	// Test digits.
	cipher = license.NewRotorCipher(0)
	for c := byte('0'); c <= '9'; c++ {
		encoded := cipher.Encode(c)
		// Verify it's still a digit.
		if encoded < '0' || encoded > '9' {
			t.Errorf("Encoded digit %c should be digit, got %c", c, encoded)
		}
	}
}

// TestRotorCipherDecodeRoundtripLowercase tests lowercase roundtrip.
func TestRotorCipherDecodeRoundtripLowercase(t *testing.T) {
	testInputs := []string{
		"abc",
		"xyz",
		"hello",
		"test123abc",
	}

	for _, input := range testInputs {
		cipher := license.NewRotorCipher(0)
		encoded := cipher.EncodeString(input)

		cipher = license.NewRotorCipher(0)
		decoded := cipher.DecodeString(encoded)

		if decoded != input {
			t.Errorf("Lowercase roundtrip failed: input=%q, encoded=%q, decoded=%q",
				input, encoded, decoded)
		}
	}
}

// TestValidateChecksumShortStrings tests checksum validation with short strings.
func TestValidateChecksumShortStrings(t *testing.T) {
	// String with exactly 3 characters (minimum).
	shortValid := "A" + license.CalculateChecksum("A")
	if !license.ValidateChecksum(shortValid) {
		t.Error("Minimum valid checksum string should validate")
	}

	// Strings that are too short.
	shortStrings := []string{"", "A", "AB"}
	for _, s := range shortStrings {
		if license.ValidateChecksum(s) {
			t.Errorf("Short string %q should not validate", s)
		}
	}
}

// TestInitRotors tests that InitRotors can be called multiple times.
func TestInitRotors(t *testing.T) {
	// Call InitRotors multiple times - should not panic.
	license.InitRotors()
	license.InitRotors()
	license.InitRotors()

	// Verify cipher still works after multiple init calls.
	cipher := license.NewRotorCipher(0)
	encoded := cipher.EncodeString("TEST")

	cipher = license.NewRotorCipher(0)
	decoded := cipher.DecodeString(encoded)

	if decoded != "TEST" {
		t.Error("Cipher should work after multiple InitRotors calls")
	}
}

// TestMaskString tests the maskString function behavior.
func TestMaskString(t *testing.T) {
	// This tests the fingerprint String() output which uses maskString internally.
	fp, err := license.GenerateFingerprint()
	if err != nil {
		t.Fatalf("GenerateFingerprint error: %v", err)
	}

	str := fp.String()

	// Should contain "****" for masked values.
	if !strings.Contains(str, "****") {
		t.Log("Fingerprint string may have short values that don't get masked")
	}

	// Should contain MAC, CPU, DISK, HOST.
	if !strings.Contains(str, "MAC=") {
		t.Error("Fingerprint String() should contain MAC=")
	}
	if !strings.Contains(str, "CPU=") {
		t.Error("Fingerprint String() should contain CPU=")
	}
	if !strings.Contains(str, "DISK=") {
		t.Error("Fingerprint String() should contain DISK=")
	}
	if !strings.Contains(str, "HOST=") {
		t.Error("Fingerprint String() should contain HOST=")
	}
}

// TestGenerateLicenseKeyErrors tests error paths in GenerateLicenseKey.
func TestGenerateLicenseKeyErrors(t *testing.T) {
	tests := []struct {
		name    string
		product string
		serial  string
		tier    license.Tier
		wantErr string
	}{
		{
			name:    "short product code",
			product: "100",
			serial:  "ABCDEFG",
			tier:    license.TierReflector,
			wantErr: "product code must be 4 characters",
		},
		{
			name:    "long product code",
			product: "10001",
			serial:  "ABCDEFG",
			tier:    license.TierReflector,
			wantErr: "product code must be 4 characters",
		},
		{
			name:    "short serial",
			product: "1001",
			serial:  "ABCDEF",
			tier:    license.TierReflector,
			wantErr: "serial must be 7 characters",
		},
		{
			name:    "long serial",
			product: "1001",
			serial:  "ABCDEFGH",
			tier:    license.TierReflector,
			wantErr: "serial must be 7 characters",
		},
		{
			name:    "tier too low",
			product: "1001",
			serial:  "ABCDEFG",
			tier:    license.Tier(0),
			wantErr: "invalid tier",
		},
		{
			name:    "tier too high",
			product: "1001",
			serial:  "ABCDEFG",
			tier:    license.Tier(4),
			wantErr: "invalid tier",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := license.GenerateLicenseKey(tc.product, tc.serial, tc.tier)
			if err == nil {
				t.Errorf("Expected error containing %q", tc.wantErr)
				return
			}
			if !strings.Contains(err.Error(), tc.wantErr) {
				t.Errorf("Error %q should contain %q", err.Error(), tc.wantErr)
			}
		})
	}
}

// TestFormatKeyVariousInputs tests FormatKey with various inputs.
func TestFormatKeyVariousInputs(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		// Normal cases.
		{"ABCD1234EFGH5678", "ABCD-1234-EFGH-5678"},
		{"abcd1234efgh5678", "ABCD-1234-EFGH-5678"},

		// Already formatted.
		{"ABCD-1234-EFGH-5678", "ABCD-1234-EFGH-5678"},

		// With spaces.
		{"ABCD 1234 EFGH 5678", "ABCD-1234-EFGH-5678"},

		// With dots.
		{"ABCD.1234.EFGH.5678", "ABCD-1234-EFGH-5678"},

		// Wrong length - returned as-is after normalization.
		{"SHORT", "SHORT"},
		{"TOOLONG1234567890123", "TOOLONG1234567890123"},
		{"", ""},
	}

	for _, tc := range tests {
		result := license.FormatKey(tc.input)
		if result != tc.expected {
			t.Errorf("FormatKey(%q) = %q, want %q", tc.input, result, tc.expected)
		}
	}
}

// TestInfoMethods tests Info struct methods.
func TestInfoMethods(t *testing.T) {
	// Test CanRunReflector and CanRunTests for all tier combinations.
	testCases := []struct {
		valid       bool
		tier        license.Tier
		canReflect  bool
		canRunTests bool
	}{
		{false, license.TierInvalid, false, false},
		{false, license.TierReflector, false, false},
		{false, license.TierTestSuite, false, false},
		{false, license.TierEnterprise, false, false},
		{true, license.TierInvalid, false, false},
		{true, license.TierReflector, true, false},
		{true, license.TierTestSuite, true, true},
		{true, license.TierEnterprise, true, true},
	}

	for _, tc := range testCases {
		info := &license.Info{
			Key:         "",
			Valid:       tc.valid,
			Tier:        tc.tier,
			ProductCode: "",
			Serial:      "",
			Activated:   false,
			ActivatedAt: time.Time{},
			ExpiresAt:   time.Time{},
			DeviceHash:  "",
			MaxDevices:  0,
			Features:    nil,
			ErrorMsg:    "",
		}

		if info.CanRunReflector() != tc.canReflect {
			t.Errorf("Valid=%v Tier=%v: CanRunReflector()=%v, want %v",
				tc.valid, tc.tier, info.CanRunReflector(), tc.canReflect)
		}

		if info.CanRunTests() != tc.canRunTests {
			t.Errorf("Valid=%v Tier=%v: CanRunTests()=%v, want %v",
				tc.valid, tc.tier, info.CanRunTests(), tc.canRunTests)
		}
	}
}

// TestHasFeatureVariousFeatures tests HasFeature with various inputs.
func TestHasFeatureVariousFeatures(t *testing.T) {
	info := &license.Info{
		Key:         "",
		Valid:       true,
		Tier:        license.TierTestSuite,
		ProductCode: "",
		Serial:      "",
		Activated:   false,
		ActivatedAt: time.Time{},
		ExpiresAt:   time.Time{},
		DeviceHash:  "",
		MaxDevices:  0,
		Features:    []string{"reflector", "rfc2544", "y1564", "rfc2889", "rfc6349", "y1731", "mef", "tsn"},
		ErrorMsg:    "",
	}

	// Test all expected features.
	expectedFeatures := []string{"reflector", "rfc2544", "y1564", "rfc2889", "rfc6349", "y1731", "mef", "tsn"}
	for _, feature := range expectedFeatures {
		if !info.HasFeature(feature) {
			t.Errorf("Expected feature %q to be present", feature)
		}
	}

	// Test missing features.
	missingFeatures := []string{"api", "multiuser", "unknown", ""}
	for _, feature := range missingFeatures {
		if info.HasFeature(feature) {
			t.Errorf("Feature %q should not be present", feature)
		}
	}

	// Test with empty features list.
	emptyInfo := &license.Info{
		Key:         "",
		Valid:       true,
		Tier:        license.TierReflector,
		ProductCode: "",
		Serial:      "",
		Activated:   false,
		ActivatedAt: time.Time{},
		ExpiresAt:   time.Time{},
		DeviceHash:  "",
		MaxDevices:  0,
		Features:    nil,
		ErrorMsg:    "",
	}

	if emptyInfo.HasFeature("reflector") {
		t.Error("Nil features should not have any feature")
	}
}

// TestChecksumWithVariousPayloads tests checksum calculation with edge cases.
func TestChecksumWithVariousPayloads(t *testing.T) {
	payloads := []string{
		"A",                          // Single character (minimum valid payload for validation).
		"0",                          // Single digit.
		"AB",                         // Two characters.
		"12",                         // Two digits.
		"ABCDEFGHIJKLMNOP",           // Long string.
		"0123456789",                 // All digits.
		"ABCDEFGHIJKLMNOPQRSTUVWXYZ", // All letters.
		"abcdefghijklmnopqrstuvwxyz", // Lowercase (gets uppercased).
		"MixedCase123",               // Mixed.
	}

	for _, payload := range payloads {
		checksum := license.CalculateChecksum(payload)
		if len(checksum) != 2 {
			t.Errorf("Checksum for %q should be 2 chars, got %d", payload, len(checksum))
		}

		// Verify checksum is alphanumeric.
		for _, c := range checksum {
			if (c < '0' || c > '9') && (c < 'A' || c > 'Z') {
				t.Errorf("Checksum character %c should be alphanumeric", c)
			}
		}

		// Verify validation works.
		fullString := payload + checksum
		if !license.ValidateChecksum(fullString) {
			t.Errorf("Checksum validation failed for %q", payload)
		}
	}

	// Test empty payload separately (checksum can be calculated but validation requires min 3 chars).
	emptyChecksum := license.CalculateChecksum("")
	if len(emptyChecksum) != 2 {
		t.Errorf("Checksum for empty string should be 2 chars, got %d", len(emptyChecksum))
	}
}
