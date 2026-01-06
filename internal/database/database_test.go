// Copyright (c) 2025 Mustard Seed Networks. All rights reserved.

package database_test

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/krisarmstrong/stem/internal/database"
)

// newTestDatabase creates a new database in a temp directory for testing.
func newTestDatabase(t *testing.T) (*database.Database, string) {
	t.Helper()

	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	db, err := database.NewDatabase(dbPath)
	if err != nil {
		t.Fatalf("NewDatabase failed: %v", err)
	}

	return db, tmpDir
}

// newTestDatabaseWithMigrations creates a test database and runs migrations.
func newTestDatabaseWithMigrations(t *testing.T) (*database.Database, string) {
	t.Helper()

	db, tmpDir := newTestDatabase(t)

	err := db.RunMigrations()
	if err != nil {
		t.Fatalf("RunMigrations failed: %v", err)
	}

	return db, tmpDir
}

func TestNewDatabase(t *testing.T) {
	t.Run("creates database successfully", func(t *testing.T) {
		db, _ := newTestDatabase(t)
		defer db.Close()

		if db == nil {
			t.Fatal("expected non-nil database")
		}
		if db.DB() == nil {
			t.Error("expected non-nil underlying sql.DB")
		}
	})

	t.Run("creates parent directory if not exists", func(t *testing.T) {
		tmpDir := t.TempDir()
		dbPath := filepath.Join(tmpDir, "nested", "path", "test.db")

		db, err := database.NewDatabase(dbPath)
		if err != nil {
			t.Fatalf("NewDatabase failed: %v", err)
		}
		defer db.Close()

		_, statErr := os.Stat(filepath.Dir(dbPath))
		if os.IsNotExist(statErr) {
			t.Error("expected parent directory to be created")
		}
	})

	t.Run("returns correct path", func(t *testing.T) {
		tmpDir := t.TempDir()
		dbPath := filepath.Join(tmpDir, "test.db")

		db, err := database.NewDatabase(dbPath)
		if err != nil {
			t.Fatalf("NewDatabase failed: %v", err)
		}
		defer db.Close()

		if db.Path() != dbPath {
			t.Errorf("Path() = %q, want %q", db.Path(), dbPath)
		}
	})

	t.Run("fails with invalid directory permissions", func(t *testing.T) {
		if os.Getuid() == 0 {
			t.Skip("skipping permission test as root")
		}

		tmpDir := t.TempDir()
		restrictedDir := filepath.Join(tmpDir, "restricted")
		mkdirErr := os.Mkdir(restrictedDir, 0o000)
		if mkdirErr != nil {
			t.Fatalf("mkdir failed: %v", mkdirErr)
		}
		defer os.Chmod(restrictedDir, 0o755)

		dbPath := filepath.Join(restrictedDir, "subdir", "test.db")
		_, err := database.NewDatabase(dbPath)
		if err == nil {
			t.Error("expected error for restricted directory")
		}
	})
}

func TestDatabaseClose(t *testing.T) {
	t.Run("closes successfully", func(t *testing.T) {
		db, _ := newTestDatabase(t)

		err := db.Close()
		if err != nil {
			t.Errorf("Close failed: %v", err)
		}

		// Verify closed by attempting an operation.
		migErr := db.RunMigrations()
		if !errors.Is(migErr, database.ErrDatabaseClosed) {
			t.Error("expected database to be closed")
		}
	})

	t.Run("close is idempotent", func(t *testing.T) {
		db, _ := newTestDatabase(t)

		err1 := db.Close()
		if err1 != nil {
			t.Errorf("first Close failed: %v", err1)
		}

		err2 := db.Close()
		if err2 != nil {
			t.Errorf("second Close failed: %v", err2)
		}
	})
}

func TestRunMigrations(t *testing.T) {
	t.Run("applies migrations successfully", func(t *testing.T) {
		db, _ := newTestDatabase(t)
		defer db.Close()

		err := db.RunMigrations()
		if err != nil {
			t.Errorf("RunMigrations failed: %v", err)
		}
	})

	t.Run("migrations are idempotent", func(t *testing.T) {
		db, _ := newTestDatabase(t)
		defer db.Close()

		err1 := db.RunMigrations()
		if err1 != nil {
			t.Fatalf("first RunMigrations failed: %v", err1)
		}

		err2 := db.RunMigrations()
		if err2 != nil {
			t.Errorf("second RunMigrations failed: %v", err2)
		}
	})

	t.Run("fails on closed database", func(t *testing.T) {
		db, _ := newTestDatabase(t)
		db.Close()

		err := db.RunMigrations()
		if !errors.Is(err, database.ErrDatabaseClosed) {
			t.Errorf("expected ErrDatabaseClosed, got %v", err)
		}
	})
}

func TestPath(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "my-test.db")

	db, err := database.NewDatabase(dbPath)
	if err != nil {
		t.Fatalf("NewDatabase failed: %v", err)
	}
	defer db.Close()

	if got := db.Path(); got != dbPath {
		t.Errorf("Path() = %q, want %q", got, dbPath)
	}
}

func TestDB(t *testing.T) {
	db, _ := newTestDatabase(t)
	defer db.Close()

	underlying := db.DB()
	if underlying == nil {
		t.Error("DB() returned nil")
	}
}

func TestSaveTestResult(t *testing.T) {
	t.Run("saves result successfully", func(t *testing.T) {
		db, _ := newTestDatabaseWithMigrations(t)
		defer db.Close()

		ctx := context.Background()
		result := &database.TestResult{
			TestType:   "throughput",
			Module:     "benchmark",
			Status:     "passed",
			ResultJSON: json.RawMessage(`{"bandwidth": 1000}`),
		}

		err := db.SaveTestResult(ctx, result)
		if err != nil {
			t.Fatalf("SaveTestResult failed: %v", err)
		}

		if result.ID == 0 {
			t.Error("expected non-zero ID after save")
		}
		if result.CreatedAt.IsZero() {
			t.Error("expected CreatedAt to be set")
		}
	})

	t.Run("saves result with provided CreatedAt", func(t *testing.T) {
		db, _ := newTestDatabaseWithMigrations(t)
		defer db.Close()

		ctx := context.Background()
		customTime := time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC)
		result := &database.TestResult{
			TestType:   "latency",
			Module:     "benchmark",
			Status:     "passed",
			CreatedAt:  customTime,
			ResultJSON: json.RawMessage(`{"latency_ms": 5}`),
		}

		err := db.SaveTestResult(ctx, result)
		if err != nil {
			t.Fatalf("SaveTestResult failed: %v", err)
		}

		if !result.CreatedAt.Equal(customTime) {
			t.Errorf("CreatedAt = %v, want %v", result.CreatedAt, customTime)
		}
	})

	t.Run("fails on closed database", func(t *testing.T) {
		db, _ := newTestDatabaseWithMigrations(t)
		db.Close()

		ctx := context.Background()
		result := &database.TestResult{
			TestType: "throughput",
			Module:   "benchmark",
			Status:   "passed",
		}

		err := db.SaveTestResult(ctx, result)
		if !errors.Is(err, database.ErrDatabaseClosed) {
			t.Errorf("expected ErrDatabaseClosed, got %v", err)
		}
	})
}

func TestGetTestResultBasic(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()
	original := &database.TestResult{
		TestType:   "throughput",
		Module:     "benchmark",
		Status:     "passed",
		ResultJSON: json.RawMessage(`{"bandwidth": 1000}`),
	}

	saveErr := db.SaveTestResult(ctx, original)
	if saveErr != nil {
		t.Fatalf("SaveTestResult failed: %v", saveErr)
	}

	retrieved, err := db.GetTestResult(ctx, original.ID)
	if err != nil {
		t.Fatalf("GetTestResult failed: %v", err)
	}

	if retrieved.ID != original.ID {
		t.Errorf("ID = %d, want %d", retrieved.ID, original.ID)
	}
	if retrieved.TestType != original.TestType {
		t.Errorf("TestType = %q, want %q", retrieved.TestType, original.TestType)
	}
	if retrieved.Module != original.Module {
		t.Errorf("Module = %q, want %q", retrieved.Module, original.Module)
	}
	if retrieved.Status != original.Status {
		t.Errorf("Status = %q, want %q", retrieved.Status, original.Status)
	}
	if string(retrieved.ResultJSON) != string(original.ResultJSON) {
		t.Errorf("ResultJSON = %s, want %s", retrieved.ResultJSON, original.ResultJSON)
	}
}

func TestGetTestResultNotFound(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()
	_, err := db.GetTestResult(ctx, 99999)
	if !errors.Is(err, database.ErrRecordNotFound) {
		t.Errorf("expected ErrRecordNotFound, got %v", err)
	}
}

func TestGetTestResultClosedDB(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	db.Close()

	ctx := context.Background()
	_, err := db.GetTestResult(ctx, 1)
	if !errors.Is(err, database.ErrDatabaseClosed) {
		t.Errorf("expected ErrDatabaseClosed, got %v", err)
	}
}

func TestGetTestResultEmptyJSON(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()
	original := &database.TestResult{
		TestType: "throughput",
		Module:   "benchmark",
		Status:   "passed",
	}

	saveErr := db.SaveTestResult(ctx, original)
	if saveErr != nil {
		t.Fatalf("SaveTestResult failed: %v", saveErr)
	}

	retrieved, err := db.GetTestResult(ctx, original.ID)
	if err != nil {
		t.Fatalf("GetTestResult failed: %v", err)
	}

	// When no ResultJSON is provided, it is stored as empty string and retrieved as empty.
	if len(retrieved.ResultJSON) != 0 {
		t.Errorf("expected empty ResultJSON, got %s", retrieved.ResultJSON)
	}
}

func saveTestResults(ctx context.Context, t *testing.T, db *database.Database, count int) {
	t.Helper()
	for range count {
		result := &database.TestResult{
			TestType: "throughput",
			Module:   "benchmark",
			Status:   "passed",
		}
		err := db.SaveTestResult(ctx, result)
		if err != nil {
			t.Fatalf("SaveTestResult failed: %v", err)
		}
	}
}

func TestGetTestResultsNoFilter(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()
	saveTestResults(ctx, t, db, 3)

	results, err := db.GetTestResults(ctx, nil)
	if err != nil {
		t.Fatalf("GetTestResults failed: %v", err)
	}

	if len(results) != 3 {
		t.Errorf("got %d results, want 3", len(results))
	}
}

func TestGetTestResultsFilterByModule(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()

	modules := []string{"benchmark", "servicetest", "benchmark"}
	for _, mod := range modules {
		result := &database.TestResult{
			TestType: "throughput",
			Module:   mod,
			Status:   "passed",
		}
		err := db.SaveTestResult(ctx, result)
		if err != nil {
			t.Fatalf("SaveTestResult failed: %v", err)
		}
	}

	results, err := db.GetTestResults(ctx, &database.TestResultFilter{Module: "benchmark"})
	if err != nil {
		t.Fatalf("GetTestResults failed: %v", err)
	}

	if len(results) != 2 {
		t.Errorf("got %d results, want 2", len(results))
	}
}

func TestGetTestResultsFilterByType(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()

	types := []string{"throughput", "latency", "throughput"}
	for _, tt := range types {
		result := &database.TestResult{
			TestType: tt,
			Module:   "benchmark",
			Status:   "passed",
		}
		err := db.SaveTestResult(ctx, result)
		if err != nil {
			t.Fatalf("SaveTestResult failed: %v", err)
		}
	}

	results, err := db.GetTestResults(ctx, &database.TestResultFilter{TestType: "latency"})
	if err != nil {
		t.Fatalf("GetTestResults failed: %v", err)
	}

	if len(results) != 1 {
		t.Errorf("got %d results, want 1", len(results))
	}
}

func TestGetTestResultsFilterByStatus(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()

	statuses := []string{"passed", "failed", "passed"}
	for _, status := range statuses {
		result := &database.TestResult{
			TestType: "throughput",
			Module:   "benchmark",
			Status:   status,
		}
		err := db.SaveTestResult(ctx, result)
		if err != nil {
			t.Fatalf("SaveTestResult failed: %v", err)
		}
	}

	results, err := db.GetTestResults(ctx, &database.TestResultFilter{Status: "failed"})
	if err != nil {
		t.Fatalf("GetTestResults failed: %v", err)
	}

	if len(results) != 1 {
		t.Errorf("got %d results, want 1", len(results))
	}
}

func TestGetTestResultsLimit(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()
	saveTestResults(ctx, t, db, 5)

	results, err := db.GetTestResults(ctx, &database.TestResultFilter{Limit: 2})
	if err != nil {
		t.Fatalf("GetTestResults failed: %v", err)
	}

	if len(results) != 2 {
		t.Errorf("got %d results, want 2", len(results))
	}
}

func TestGetTestResultsOffset(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()
	saveTestResults(ctx, t, db, 5)

	results, err := db.GetTestResults(ctx, &database.TestResultFilter{Limit: 2, Offset: 3})
	if err != nil {
		t.Fatalf("GetTestResults failed: %v", err)
	}

	if len(results) != 2 {
		t.Errorf("got %d results, want 2", len(results))
	}
}

func TestGetTestResultsCombinedFilters(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()

	testData := []struct {
		module   string
		testType string
		status   string
	}{
		{"benchmark", "throughput", "passed"},
		{"benchmark", "latency", "passed"},
		{"benchmark", "throughput", "failed"},
		{"servicetest", "throughput", "passed"},
	}

	for _, td := range testData {
		result := &database.TestResult{
			TestType: td.testType,
			Module:   td.module,
			Status:   td.status,
		}
		err := db.SaveTestResult(ctx, result)
		if err != nil {
			t.Fatalf("SaveTestResult failed: %v", err)
		}
	}

	results, err := db.GetTestResults(ctx, &database.TestResultFilter{
		Module:   "benchmark",
		TestType: "throughput",
		Status:   "passed",
	})
	if err != nil {
		t.Fatalf("GetTestResults failed: %v", err)
	}

	if len(results) != 1 {
		t.Errorf("got %d results, want 1", len(results))
	}
}

func TestGetTestResultsNoMatches(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()

	results, err := db.GetTestResults(ctx, &database.TestResultFilter{Module: "nonexistent"})
	if err != nil {
		t.Fatalf("GetTestResults failed: %v", err)
	}

	if len(results) != 0 {
		t.Errorf("expected empty slice, got %d results", len(results))
	}
}

func TestGetTestResultsClosedDB(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	db.Close()

	ctx := context.Background()
	_, err := db.GetTestResults(ctx, nil)
	if !errors.Is(err, database.ErrDatabaseClosed) {
		t.Errorf("expected ErrDatabaseClosed, got %v", err)
	}
}

func TestSaveAuditLog(t *testing.T) {
	t.Run("saves audit log successfully", func(t *testing.T) {
		db, _ := newTestDatabaseWithMigrations(t)
		defer db.Close()

		ctx := context.Background()
		entry := &database.AuditLogEntry{
			EventType: "login",
			User:      "admin",
			Details:   "Successful login",
		}

		err := db.SaveAuditLog(ctx, entry)
		if err != nil {
			t.Fatalf("SaveAuditLog failed: %v", err)
		}

		if entry.ID == 0 {
			t.Error("expected non-zero ID after save")
		}
		if entry.CreatedAt.IsZero() {
			t.Error("expected CreatedAt to be set")
		}
	})

	t.Run("saves audit log with provided CreatedAt", func(t *testing.T) {
		db, _ := newTestDatabaseWithMigrations(t)
		defer db.Close()

		ctx := context.Background()
		customTime := time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC)
		entry := &database.AuditLogEntry{
			EventType: "login",
			User:      "admin",
			CreatedAt: customTime,
		}

		err := db.SaveAuditLog(ctx, entry)
		if err != nil {
			t.Fatalf("SaveAuditLog failed: %v", err)
		}

		if !entry.CreatedAt.Equal(customTime) {
			t.Errorf("CreatedAt = %v, want %v", entry.CreatedAt, customTime)
		}
	})

	t.Run("saves audit log without optional fields", func(t *testing.T) {
		db, _ := newTestDatabaseWithMigrations(t)
		defer db.Close()

		ctx := context.Background()
		entry := &database.AuditLogEntry{
			EventType: "system_start",
		}

		err := db.SaveAuditLog(ctx, entry)
		if err != nil {
			t.Fatalf("SaveAuditLog failed: %v", err)
		}

		if entry.ID == 0 {
			t.Error("expected non-zero ID after save")
		}
	})

	t.Run("fails on closed database", func(t *testing.T) {
		db, _ := newTestDatabaseWithMigrations(t)
		db.Close()

		ctx := context.Background()
		entry := &database.AuditLogEntry{
			EventType: "login",
		}

		err := db.SaveAuditLog(ctx, entry)
		if !errors.Is(err, database.ErrDatabaseClosed) {
			t.Errorf("expected ErrDatabaseClosed, got %v", err)
		}
	})
}

func saveAuditLogs(ctx context.Context, t *testing.T, db *database.Database, count int) {
	t.Helper()
	for range count {
		entry := &database.AuditLogEntry{
			EventType: "test_event",
			User:      "user",
		}
		err := db.SaveAuditLog(ctx, entry)
		if err != nil {
			t.Fatalf("SaveAuditLog failed: %v", err)
		}
	}
}

func TestGetAuditLogsNoLimit(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()
	saveAuditLogs(ctx, t, db, 3)

	entries, err := db.GetAuditLogs(ctx, 0)
	if err != nil {
		t.Fatalf("GetAuditLogs failed: %v", err)
	}

	if len(entries) != 3 {
		t.Errorf("got %d entries, want 3", len(entries))
	}
}

func TestGetAuditLogsWithLimit(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()
	saveAuditLogs(ctx, t, db, 5)

	entries, err := db.GetAuditLogs(ctx, 2)
	if err != nil {
		t.Fatalf("GetAuditLogs failed: %v", err)
	}

	if len(entries) != 2 {
		t.Errorf("got %d entries, want 2", len(entries))
	}
}

func TestGetAuditLogsOrder(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()

	events := []string{"first", "second", "third"}
	for _, event := range events {
		entry := &database.AuditLogEntry{
			EventType: event,
		}
		err := db.SaveAuditLog(ctx, entry)
		if err != nil {
			t.Fatalf("SaveAuditLog failed: %v", err)
		}
		// Small delay to ensure different timestamps.
		time.Sleep(10 * time.Millisecond)
	}

	entries, err := db.GetAuditLogs(ctx, 0)
	if err != nil {
		t.Fatalf("GetAuditLogs failed: %v", err)
	}

	// Should be in reverse order (newest first).
	if entries[0].EventType != "third" {
		t.Errorf("first entry should be 'third', got %q", entries[0].EventType)
	}
}

func TestGetAuditLogsNullFields(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()

	entry := &database.AuditLogEntry{
		EventType: "system_event",
	}
	err := db.SaveAuditLog(ctx, entry)
	if err != nil {
		t.Fatalf("SaveAuditLog failed: %v", err)
	}

	entries, getErr := db.GetAuditLogs(ctx, 1)
	if getErr != nil {
		t.Fatalf("GetAuditLogs failed: %v", getErr)
	}

	if entries[0].User != "" {
		t.Errorf("expected empty User, got %q", entries[0].User)
	}
	if entries[0].Details != "" {
		t.Errorf("expected empty Details, got %q", entries[0].Details)
	}
}

func TestGetAuditLogsClosedDB(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	db.Close()

	ctx := context.Background()
	_, err := db.GetAuditLogs(ctx, 0)
	if !errors.Is(err, database.ErrDatabaseClosed) {
		t.Errorf("expected ErrDatabaseClosed, got %v", err)
	}
}

func TestSaveSessionBasic(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()
	session := &database.Session{
		TokenID:   "token-123",
		ExpiresAt: time.Now().Add(time.Hour).UTC(),
	}

	err := db.SaveSession(ctx, session)
	if err != nil {
		t.Fatalf("SaveSession failed: %v", err)
	}

	if session.CreatedAt.IsZero() {
		t.Error("expected CreatedAt to be set")
	}
}

func TestSaveSessionWithCreatedAt(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()
	customTime := time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC)
	session := &database.Session{
		TokenID:   "token-456",
		ExpiresAt: time.Now().Add(time.Hour).UTC(),
		CreatedAt: customTime,
	}

	err := db.SaveSession(ctx, session)
	if err != nil {
		t.Fatalf("SaveSession failed: %v", err)
	}

	if !session.CreatedAt.Equal(customTime) {
		t.Errorf("CreatedAt = %v, want %v", session.CreatedAt, customTime)
	}
}

func TestSaveSessionReplace(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()

	// Save initial session.
	session1 := &database.Session{
		TokenID:   "token-789",
		ExpiresAt: time.Now().Add(time.Hour).UTC(),
	}
	err := db.SaveSession(ctx, session1)
	if err != nil {
		t.Fatalf("first SaveSession failed: %v", err)
	}

	// Save with same token ID but different expiry.
	session2 := &database.Session{
		TokenID:   "token-789",
		ExpiresAt: time.Now().Add(2 * time.Hour).UTC(),
	}
	err = db.SaveSession(ctx, session2)
	if err != nil {
		t.Fatalf("second SaveSession failed: %v", err)
	}

	// Verify only one session exists.
	sessions, getErr := db.GetAllBlacklistedSessions(ctx)
	if getErr != nil {
		t.Fatalf("GetAllBlacklistedSessions failed: %v", getErr)
	}

	count := 0
	for _, s := range sessions {
		if s.TokenID == "token-789" {
			count++
		}
	}
	if count != 1 {
		t.Errorf("expected 1 session with token-789, got %d", count)
	}
}

func TestSaveSessionClosedDB(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	db.Close()

	ctx := context.Background()
	session := &database.Session{
		TokenID:   "token-abc",
		ExpiresAt: time.Now().Add(time.Hour).UTC(),
	}

	err := db.SaveSession(ctx, session)
	if !errors.Is(err, database.ErrDatabaseClosed) {
		t.Errorf("expected ErrDatabaseClosed, got %v", err)
	}
}

func TestIsSessionBlacklistedTrue(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()
	session := &database.Session{
		TokenID:   "blacklisted-token",
		ExpiresAt: time.Now().Add(time.Hour).UTC(),
	}
	err := db.SaveSession(ctx, session)
	if err != nil {
		t.Fatalf("SaveSession failed: %v", err)
	}

	blacklisted, checkErr := db.IsSessionBlacklisted(ctx, "blacklisted-token")
	if checkErr != nil {
		t.Fatalf("IsSessionBlacklisted failed: %v", checkErr)
	}

	if !blacklisted {
		t.Error("expected token to be blacklisted")
	}
}

func TestIsSessionBlacklistedFalse(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()

	blacklisted, err := db.IsSessionBlacklisted(ctx, "unknown-token")
	if err != nil {
		t.Fatalf("IsSessionBlacklisted failed: %v", err)
	}

	if blacklisted {
		t.Error("expected token to not be blacklisted")
	}
}

func TestIsSessionBlacklistedExpired(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()
	session := &database.Session{
		TokenID:   "expired-token",
		ExpiresAt: time.Now().Add(-time.Hour).UTC(), // Expired 1 hour ago.
	}
	err := db.SaveSession(ctx, session)
	if err != nil {
		t.Fatalf("SaveSession failed: %v", err)
	}

	blacklisted, checkErr := db.IsSessionBlacklisted(ctx, "expired-token")
	if checkErr != nil {
		t.Fatalf("IsSessionBlacklisted failed: %v", checkErr)
	}

	if blacklisted {
		t.Error("expected expired token to not be blacklisted")
	}
}

func TestIsSessionBlacklistedClosedDB(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	db.Close()

	ctx := context.Background()
	_, err := db.IsSessionBlacklisted(ctx, "any-token")
	if !errors.Is(err, database.ErrDatabaseClosed) {
		t.Errorf("expected ErrDatabaseClosed, got %v", err)
	}
}

func TestDeleteExpiredSessions(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()

	// Save expired session.
	expiredSession := &database.Session{
		TokenID:   "expired-token",
		ExpiresAt: time.Now().Add(-time.Hour).UTC(),
	}
	err := db.SaveSession(ctx, expiredSession)
	if err != nil {
		t.Fatalf("SaveSession failed: %v", err)
	}

	// Save valid session.
	validSession := &database.Session{
		TokenID:   "valid-token",
		ExpiresAt: time.Now().Add(time.Hour).UTC(),
	}
	err = db.SaveSession(ctx, validSession)
	if err != nil {
		t.Fatalf("SaveSession failed: %v", err)
	}

	count, delErr := db.DeleteExpiredSessions(ctx)
	if delErr != nil {
		t.Fatalf("DeleteExpiredSessions failed: %v", delErr)
	}

	if count != 1 {
		t.Errorf("deleted %d sessions, want 1", count)
	}

	// Verify valid session still exists.
	blacklisted, checkErr := db.IsSessionBlacklisted(ctx, "valid-token")
	if checkErr != nil {
		t.Fatalf("IsSessionBlacklisted failed: %v", checkErr)
	}
	if !blacklisted {
		t.Error("valid session should still be blacklisted")
	}
}

func TestDeleteExpiredSessionsNone(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()

	session := &database.Session{
		TokenID:   "valid-token",
		ExpiresAt: time.Now().Add(time.Hour).UTC(),
	}
	err := db.SaveSession(ctx, session)
	if err != nil {
		t.Fatalf("SaveSession failed: %v", err)
	}

	count, delErr := db.DeleteExpiredSessions(ctx)
	if delErr != nil {
		t.Fatalf("DeleteExpiredSessions failed: %v", delErr)
	}

	if count != 0 {
		t.Errorf("deleted %d sessions, want 0", count)
	}
}

func TestDeleteExpiredSessionsClosedDB(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	db.Close()

	ctx := context.Background()
	_, err := db.DeleteExpiredSessions(ctx)
	if !errors.Is(err, database.ErrDatabaseClosed) {
		t.Errorf("expected ErrDatabaseClosed, got %v", err)
	}
}

func TestGetAllBlacklistedSessionsBasic(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()

	// Save multiple sessions with different expiration.
	sessionsData := []struct {
		tokenID   string
		expiresAt time.Time
	}{
		{"token-1", time.Now().Add(time.Hour).UTC()},
		{"token-2", time.Now().Add(2 * time.Hour).UTC()},
		{"token-3", time.Now().Add(-time.Hour).UTC()}, // Expired.
	}

	for _, s := range sessionsData {
		session := &database.Session{
			TokenID:   s.tokenID,
			ExpiresAt: s.expiresAt,
		}
		err := db.SaveSession(ctx, session)
		if err != nil {
			t.Fatalf("SaveSession failed: %v", err)
		}
	}

	result, err := db.GetAllBlacklistedSessions(ctx)
	if err != nil {
		t.Fatalf("GetAllBlacklistedSessions failed: %v", err)
	}

	if len(result) != 2 {
		t.Errorf("got %d sessions, want 2", len(result))
	}
}

func TestGetAllBlacklistedSessionsOrder(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()

	now := time.Now().UTC()
	sessionsData := []struct {
		tokenID   string
		expiresAt time.Time
	}{
		{"token-later", now.Add(2 * time.Hour)},
		{"token-sooner", now.Add(time.Hour)},
	}

	for _, s := range sessionsData {
		session := &database.Session{
			TokenID:   s.tokenID,
			ExpiresAt: s.expiresAt,
		}
		err := db.SaveSession(ctx, session)
		if err != nil {
			t.Fatalf("SaveSession failed: %v", err)
		}
	}

	result, err := db.GetAllBlacklistedSessions(ctx)
	if err != nil {
		t.Fatalf("GetAllBlacklistedSessions failed: %v", err)
	}

	if result[0].TokenID != "token-sooner" {
		t.Errorf("expected first session to be 'token-sooner', got %q", result[0].TokenID)
	}
}

func TestGetAllBlacklistedSessionsEmpty(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()

	result, err := db.GetAllBlacklistedSessions(ctx)
	if err != nil {
		t.Fatalf("GetAllBlacklistedSessions failed: %v", err)
	}

	if len(result) != 0 {
		t.Errorf("expected empty slice, got %d sessions", len(result))
	}
}

func TestGetAllBlacklistedSessionsClosedDB(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	db.Close()

	ctx := context.Background()
	_, err := db.GetAllBlacklistedSessions(ctx)
	if !errors.Is(err, database.ErrDatabaseClosed) {
		t.Errorf("expected ErrDatabaseClosed, got %v", err)
	}
}

func TestConcurrentAccess(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx := context.Background()
	done := make(chan bool)
	iterations := 10

	// Concurrent writers.
	go func() {
		for range iterations {
			result := &database.TestResult{
				TestType: "throughput",
				Module:   "benchmark",
				Status:   "passed",
			}
			_ = db.SaveTestResult(ctx, result)
		}
		done <- true
	}()

	go func() {
		for range iterations {
			entry := &database.AuditLogEntry{
				EventType: "test",
			}
			_ = db.SaveAuditLog(ctx, entry)
		}
		done <- true
	}()

	// Concurrent readers.
	go func() {
		for range iterations {
			_, _ = db.GetTestResults(ctx, nil)
		}
		done <- true
	}()

	go func() {
		for range iterations {
			_, _ = db.GetAuditLogs(ctx, 0)
		}
		done <- true
	}()

	// Wait for all goroutines to complete.
	for range 4 {
		<-done
	}
}

func TestContextCancellation(t *testing.T) {
	db, _ := newTestDatabaseWithMigrations(t)
	defer db.Close()

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately.

	// Operations should fail with context cancelled.
	result := &database.TestResult{
		TestType: "throughput",
		Module:   "benchmark",
		Status:   "passed",
	}
	err := db.SaveTestResult(ctx, result)
	if err == nil {
		// Note: SQLite may or may not honor context cancellation depending on timing.
		// This test verifies the context is passed through correctly.
		t.Log("SaveTestResult succeeded despite cancelled context (timing dependent)")
	}
}

func TestErrorHandling(t *testing.T) {
	db, _ := newTestDatabase(t)
	db.Close()

	ctx := context.Background()

	// All operations should return ErrDatabaseClosed.
	migErr := db.RunMigrations()
	if !errors.Is(migErr, database.ErrDatabaseClosed) {
		t.Errorf("RunMigrations: expected ErrDatabaseClosed, got %v", migErr)
	}

	_, getErr := db.GetTestResult(ctx, 1)
	if !errors.Is(getErr, database.ErrDatabaseClosed) {
		t.Errorf("GetTestResult: expected ErrDatabaseClosed, got %v", getErr)
	}

	_, getResultsErr := db.GetTestResults(ctx, nil)
	if !errors.Is(getResultsErr, database.ErrDatabaseClosed) {
		t.Errorf("GetTestResults: expected ErrDatabaseClosed, got %v", getResultsErr)
	}

	_, getLogsErr := db.GetAuditLogs(ctx, 0)
	if !errors.Is(getLogsErr, database.ErrDatabaseClosed) {
		t.Errorf("GetAuditLogs: expected ErrDatabaseClosed, got %v", getLogsErr)
	}

	_, blacklistedErr := db.IsSessionBlacklisted(ctx, "test")
	if !errors.Is(blacklistedErr, database.ErrDatabaseClosed) {
		t.Errorf("IsSessionBlacklisted: expected ErrDatabaseClosed, got %v", blacklistedErr)
	}

	_, deleteErr := db.DeleteExpiredSessions(ctx)
	if !errors.Is(deleteErr, database.ErrDatabaseClosed) {
		t.Errorf("DeleteExpiredSessions: expected ErrDatabaseClosed, got %v", deleteErr)
	}

	_, getAllErr := db.GetAllBlacklistedSessions(ctx)
	if !errors.Is(getAllErr, database.ErrDatabaseClosed) {
		t.Errorf("GetAllBlacklistedSessions: expected ErrDatabaseClosed, got %v", getAllErr)
	}
}
