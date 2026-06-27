package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestConfigurationEffectiveTranscriptionURLParakeetDefault(t *testing.T) {
	cfg := &configuration{TranscriptionBackend: transcriptionBackendParakeet}
	assert.Equal(t, defaultParakeetURL, cfg.effectiveTranscriptionURL())
}

func TestConfigurationEffectiveTranscriptionURLOpenAIDefault(t *testing.T) {
	cfg := &configuration{TranscriptionBackend: transcriptionBackendOpenAI}
	assert.Equal(t, defaultOpenAIURL, cfg.effectiveTranscriptionURL())
}

func TestConfigurationEffectiveTranscriptionModelOpenAIDefault(t *testing.T) {
	cfg := &configuration{TranscriptionBackend: transcriptionBackendOpenAI}
	assert.Equal(t, defaultOpenAIModel, cfg.effectiveTranscriptionModel())
}

func TestConfigurationEffectiveTranscriptionModelParakeetEmpty(t *testing.T) {
	cfg := &configuration{
		TranscriptionBackend: transcriptionBackendParakeet,
		TranscriptionModel:   "ignored",
	}
	assert.Equal(t, "", cfg.effectiveTranscriptionModel())
}

func TestConfigurationTranscriptionBackendDefaultsToParakeet(t *testing.T) {
	cfg := &configuration{}
	assert.Equal(t, transcriptionBackendParakeet, cfg.transcriptionBackend())
}
