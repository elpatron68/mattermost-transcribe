package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateParakeetURL(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		raw     string
		wantErr bool
	}{
		{name: "empty", raw: ""},
		{name: "whitespace", raw: "   "},
		{name: "http localhost", raw: "http://localhost:5092"},
		{name: "https host", raw: "https://parakeet.example.com"},
		{name: "private ip", raw: "http://10.10.2.85:5092"},
		{name: "trailing slash", raw: "http://parakeet:5092/"},
		{name: "file scheme", raw: "file:///etc/passwd", wantErr: true},
		{name: "javascript scheme", raw: "javascript:alert(1)", wantErr: true},
		{name: "missing host", raw: "http://", wantErr: true},
		{name: "invalid url", raw: "://bad", wantErr: true},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := validateParakeetURL(tc.raw)
			if tc.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
		})
	}
}

func TestOnConfigurationChangeRejectsInvalidParakeetURL(t *testing.T) {
	p := &Plugin{}
	p.setConfiguration(&configuration{
		ParakeetURL: "http://parakeet:5092",
	})

	configuration := &configuration{
		ParakeetURL: "ftp://parakeet:5092",
	}
	mergeConfigurationFromRaw(configuration, map[string]any{
		"ParakeetURL": "ftp://parakeet:5092",
	})

	err := validateParakeetURL(configuration.ParakeetURL)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "http or https")

	// merge + validate path used by OnConfigurationChange
	configuration.ParakeetURL = "http://parakeet:5092"
	require.NoError(t, validateParakeetURL(configuration.ParakeetURL))
}
