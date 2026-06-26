package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMergeConfigurationFromRawPrefersLowercaseParakeetURL(t *testing.T) {
	cfg := &configuration{
		ParakeetURL:          "http://10.10.2.238:5092",
		ParakeetAPIKey:       "old-key",
		DefaultLanguage:      "en",
		MaxRecordingDuration: 60,
	}

	mergeConfigurationFromRaw(cfg, map[string]any{
		"ParakeetURL":          "http://10.10.2.238:5092",
		"parakeeturl":          "http://10.10.2.85:5092",
		"ParakeetAPIKey":       "old-key",
		"parakeetapikey":       "new-key",
		"DefaultLanguage":      "en",
		"defaultlanguage":      "de",
		"MaxRecordingDuration": float64(60),
		"maxrecordingduration": float64(120),
	})

	assert.Equal(t, "http://10.10.2.85:5092", cfg.ParakeetURL)
	assert.Equal(t, "new-key", cfg.ParakeetAPIKey)
	assert.Equal(t, "de", cfg.DefaultLanguage)
	assert.Equal(t, int64(120), cfg.MaxRecordingDuration)
}

func TestMergeConfigurationFromRawUsesPascalCaseWhenOnlySchemaKeysExist(t *testing.T) {
	cfg := &configuration{}

	mergeConfigurationFromRaw(cfg, map[string]any{
		"ParakeetURL":          "http://parakeet:5092",
		"ParakeetAPIKey":       "secret",
		"DefaultLanguage":      "de",
		"MaxRecordingDuration": float64(90),
	})

	assert.Equal(t, "http://parakeet:5092", cfg.ParakeetURL)
	assert.Equal(t, "secret", cfg.ParakeetAPIKey)
	assert.Equal(t, "de", cfg.DefaultLanguage)
	assert.Equal(t, int64(90), cfg.MaxRecordingDuration)
}

func TestFirstNonEmpty(t *testing.T) {
	assert.Equal(t, "b", firstNonEmpty("", "  ", "b", "c"))
	assert.Equal(t, "", firstNonEmpty("", " "))
}
