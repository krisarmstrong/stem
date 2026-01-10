/*
 * The Stem - Internationalization (i18n) Support
 *
 * Provides localization for English (en) and Spanish (es).
 * Translations are loaded from embedded JSON files in the locales directory.
 *
 * Copyright (c) 2025 Mustard Seed Networks. All rights reserved.
 */

package i18n

import (
	"embed"
	"encoding/json"
	"os"
	"strings"
	"sync"
)

//go:embed locales
var localesFS embed.FS

// Language represents a supported language.
type Language string

const (
	English Language = "en"
	Spanish Language = "es"
)

// DefaultLanguage is the fallback language.
const DefaultLanguage = English

// jsonFiles lists the translation files to load for each language.
var jsonFiles = []string{
	"common.json",
	"errors.json",
	"modules.json",
	"settings.json",
	"cli.json",
	"params.json",
}

//nolint:gochecknoglobals // Required for message catalog.
var messages = make(map[Language]map[string]string)

//nolint:gochecknoglobals // Required for language state.
var (
	currentLang Language
	langMu      sync.RWMutex
	loadOnce    sync.Once
)

//nolint:gochecknoinits // Required for language detection at startup.
func init() {
	currentLang = detectLanguage()
}

// loadMessages loads all translation files for all languages.
func loadMessages() {
	loadOnce.Do(func() {
		for _, lang := range SupportedLanguages() {
			messages[lang] = make(map[string]string)
			for _, file := range jsonFiles {
				path := "locales/" + string(lang) + "/" + file
				data, err := localesFS.ReadFile(path)
				if err != nil {
					// File doesn't exist for this language, skip it.
					continue
				}

				var nested map[string]any
				if err := json.Unmarshal(data, &nested); err != nil {
					continue
				}

				// Flatten nested JSON to dot-notation keys.
				flatten("", nested, messages[lang])
			}
		}
	})
}

// flatten recursively flattens a nested map to dot-notation keys.
func flatten(prefix string, nested map[string]any, result map[string]string) {
	for key, value := range nested {
		fullKey := key
		if prefix != "" {
			fullKey = prefix + "." + key
		}

		switch v := value.(type) {
		case string:
			result[fullKey] = v
		case map[string]any:
			flatten(fullKey, v, result)
		}
	}
}

// detectLanguage attempts to detect the user's language from environment.
func detectLanguage() Language {
	// Check STEM_LANG first (explicit override)
	if lang := os.Getenv("STEM_LANG"); lang != "" {
		if l := parseLanguage(lang); l != "" {
			return l
		}
	}

	// Check LANGUAGE, LANG, LC_ALL, LC_MESSAGES
	for _, env := range []string{"LANGUAGE", "LANG", "LC_ALL", "LC_MESSAGES"} {
		if lang := os.Getenv(env); lang != "" {
			if l := parseLanguage(lang); l != "" {
				return l
			}
		}
	}

	return DefaultLanguage
}

// parseLanguage extracts language code from locale string (e.g., "es_ES.UTF-8" -> "es").
func parseLanguage(locale string) Language {
	// Handle empty string
	if locale == "" || locale == "C" || locale == "POSIX" {
		return ""
	}

	// Extract language part (before _ or .)
	locale = strings.ToLower(locale)
	if idx := strings.Index(locale, "_"); idx > 0 {
		locale = locale[:idx]
	}
	if idx := strings.Index(locale, "."); idx > 0 {
		locale = locale[:idx]
	}

	switch locale {
	case "en", "english":
		return English
	case "es", "spanish", "espanol":
		return Spanish
	default:
		return ""
	}
}

// SetLanguage sets the current language.
func SetLanguage(lang Language) {
	langMu.Lock()
	defer langMu.Unlock()
	loadMessages()
	if _, ok := messages[lang]; ok {
		currentLang = lang
	}
}

// GetLanguage returns the current language.
func GetLanguage() Language {
	langMu.RLock()
	defer langMu.RUnlock()
	return currentLang
}

// SupportedLanguages returns all supported languages.
func SupportedLanguages() []Language {
	return []Language{English, Spanish}
}

// T translates a message key to the current language.
// If the key is not found, returns the key itself.
func T(key string) string {
	loadMessages()

	langMu.RLock()
	lang := currentLang
	langMu.RUnlock()

	if msgs, found := messages[lang]; found {
		if msg, exists := msgs[key]; exists {
			return msg
		}
	}

	// Fallback to English
	if msgs, found := messages[English]; found {
		if msg, exists := msgs[key]; exists {
			return msg
		}
	}

	// Return key as last resort
	return key
}

// TL translates a message key to a specific language.
func TL(key string, lang Language) string {
	loadMessages()

	if msgs, found := messages[lang]; found {
		if msg, exists := msgs[key]; exists {
			return msg
		}
	}

	// Fallback to English
	if msgs, found := messages[English]; found {
		if msg, exists := msgs[key]; exists {
			return msg
		}
	}

	return key
}

// LanguageName returns the display name for a language.
func LanguageName(lang Language) string {
	switch lang {
	case English:
		return "English"
	case Spanish:
		return "Espanol"
	default:
		return string(lang)
	}
}

// LanguageNativeName returns the native name for a language.
func LanguageNativeName(lang Language) string {
	switch lang {
	case English:
		return "English"
	case Spanish:
		return "Espanol"
	default:
		return string(lang)
	}
}

// GetAllKeys returns all translation keys for the current language.
// Useful for debugging and testing.
func GetAllKeys() []string {
	loadMessages()

	langMu.RLock()
	lang := currentLang
	langMu.RUnlock()

	msgs := messages[lang]
	keys := make([]string, 0, len(msgs))
	for k := range msgs {
		keys = append(keys, k)
	}
	return keys
}

// TranslationEntry represents a single translation key with all language values.
type TranslationEntry struct {
	Key     string            `json:"key"`
	Values  map[Language]string `json:"values"`
	Missing []Language        `json:"missing,omitempty"`
}

// ExportTranslations returns all translations in a format suitable for review.
// This is useful for handing off to translators to review/improve translations.
func ExportTranslations() []TranslationEntry {
	loadMessages()

	// Collect all unique keys across all languages
	allKeys := make(map[string]bool)
	for _, msgs := range messages {
		for key := range msgs {
			allKeys[key] = true
		}
	}

	// Build entries
	entries := make([]TranslationEntry, 0, len(allKeys))
	for key := range allKeys {
		entry := TranslationEntry{
			Key:    key,
			Values: make(map[Language]string),
		}

		for _, lang := range SupportedLanguages() {
			if val, ok := messages[lang][key]; ok {
				entry.Values[lang] = val
			} else {
				entry.Missing = append(entry.Missing, lang)
			}
		}

		entries = append(entries, entry)
	}

	return entries
}

// FindMissingTranslations returns keys that are missing in a specific language.
func FindMissingTranslations(targetLang Language) []string {
	loadMessages()

	// Get all keys from English (the base language)
	englishKeys := messages[English]
	targetMsgs := messages[targetLang]

	missing := make([]string, 0)
	for key := range englishKeys {
		if _, ok := targetMsgs[key]; !ok {
			missing = append(missing, key)
		}
	}

	return missing
}

// CompareTranslations returns side-by-side comparison for translator review.
// Format: []struct{Key, English, Target, NeedsReview}
func CompareTranslations(targetLang Language) []map[string]string {
	loadMessages()

	englishMsgs := messages[English]
	targetMsgs := messages[targetLang]

	result := make([]map[string]string, 0, len(englishMsgs))
	for key, enVal := range englishMsgs {
		entry := map[string]string{
			"key":     key,
			"english": enVal,
		}

		if targetVal, ok := targetMsgs[key]; ok {
			entry["target"] = targetVal
			// Flag if English and target are identical (might need translation)
			if enVal == targetVal {
				entry["status"] = "needs_review"
			} else {
				entry["status"] = "translated"
			}
		} else {
			entry["target"] = ""
			entry["status"] = "missing"
		}

		result = append(result, entry)
	}

	return result
}
