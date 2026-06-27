package main

import (
	"fmt"
	"reflect"
	"strconv"
	"strings"

	"github.com/pkg/errors"
)

const (
	transcriptionBackendParakeet = "parakeet"
	transcriptionBackendOpenAI   = "openai"
	defaultParakeetURL           = "http://parakeet:5092"
	defaultOpenAIURL             = "https://api.openai.com"
	defaultOpenAIModel           = "whisper-1"
)

type configuration struct {
	TranscriptionBackend string
	ParakeetURL          string
	ParakeetAPIKey       string
	TranscriptionModel   string
	DefaultLanguage      string
	MaxRecordingDuration int64
}

func (c *configuration) transcriptionBackend() string {
	if strings.TrimSpace(c.TranscriptionBackend) == transcriptionBackendOpenAI {
		return transcriptionBackendOpenAI
	}
	return transcriptionBackendParakeet
}

func (c *configuration) effectiveTranscriptionURL() string {
	if c.transcriptionBackend() == transcriptionBackendOpenAI {
		if trimmed := strings.TrimSpace(c.ParakeetURL); trimmed != "" {
			return trimmed
		}
		return defaultOpenAIURL
	}

	if trimmed := strings.TrimSpace(c.ParakeetURL); trimmed != "" {
		return trimmed
	}

	return defaultParakeetURL
}

func (c *configuration) effectiveTranscriptionModel() string {
	if c.transcriptionBackend() == transcriptionBackendOpenAI {
		if trimmed := strings.TrimSpace(c.TranscriptionModel); trimmed != "" {
			return trimmed
		}
		return defaultOpenAIModel
	}

	return ""
}

func (c *configuration) Clone() *configuration {
	clone := *c
	return &clone
}

func (p *Plugin) getConfiguration() *configuration {
	p.configurationLock.RLock()
	defer p.configurationLock.RUnlock()

	if p.configuration == nil {
		return &configuration{
			TranscriptionBackend: transcriptionBackendParakeet,
			DefaultLanguage:      "de",
			MaxRecordingDuration: 120,
		}
	}

	return p.configuration
}

func (p *Plugin) setConfiguration(configuration *configuration) {
	p.configurationLock.Lock()
	defer p.configurationLock.Unlock()

	if configuration != nil && p.configuration == configuration {
		if reflect.ValueOf(*configuration).NumField() == 0 {
			return
		}

		panic("setConfiguration called with the existing configuration")
	}

	p.configuration = configuration
}

func (p *Plugin) getRawPluginSettings() map[string]any {
	cfg := p.API.GetConfig()
	if cfg == nil || cfg.PluginSettings.Plugins == nil {
		return nil
	}

	pluginID := pluginConfigID()
	if pluginID == "" {
		return nil
	}

	return cfg.PluginSettings.Plugins[pluginID]
}

func pluginConfigID() string {
	if manifest != nil && manifest.Id != "" {
		return manifest.Id
	}

	return "de.medisoftware.mattermost-transcribe"
}

func mergeConfigurationFromRaw(configuration *configuration, raw map[string]any) {
	if configuration == nil || len(raw) == 0 {
		return
	}

	configuration.ParakeetURL = firstNonEmpty(
		stringSetting(raw, "parakeeturl"),
		stringSetting(raw, "ParakeetURL"),
		configuration.ParakeetURL,
	)
	configuration.TranscriptionBackend = firstNonEmpty(
		stringSetting(raw, "transcriptionbackend"),
		stringSetting(raw, "TranscriptionBackend"),
		configuration.TranscriptionBackend,
	)
	configuration.ParakeetAPIKey = firstNonEmpty(
		stringSetting(raw, "parakeetapikey"),
		stringSetting(raw, "ParakeetAPIKey"),
		configuration.ParakeetAPIKey,
	)
	configuration.TranscriptionModel = firstNonEmpty(
		stringSetting(raw, "transcriptionmodel"),
		stringSetting(raw, "TranscriptionModel"),
		configuration.TranscriptionModel,
	)
	configuration.DefaultLanguage = firstNonEmpty(
		stringSetting(raw, "defaultlanguage"),
		stringSetting(raw, "DefaultLanguage"),
		configuration.DefaultLanguage,
	)

	if duration := int64Setting(raw, "maxrecordingduration", "MaxRecordingDuration"); duration > 0 {
		configuration.MaxRecordingDuration = duration
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}

	return ""
}

func stringSetting(raw map[string]any, key string) string {
	value, ok := raw[key]
	if !ok || value == nil {
		return ""
	}

	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	case float64:
		return strings.TrimSpace(strconv.FormatInt(int64(typed), 10))
	case int:
		return strconv.Itoa(typed)
	case int64:
		return strconv.FormatInt(typed, 10)
	default:
		return strings.TrimSpace(fmt.Sprint(typed))
	}
}

func int64Setting(raw map[string]any, keys ...string) int64 {
	for _, key := range keys {
		value, ok := raw[key]
		if !ok || value == nil {
			continue
		}

		switch typed := value.(type) {
		case float64:
			return int64(typed)
		case int:
			return int64(typed)
		case int64:
			return typed
		case string:
			if parsed, err := strconv.ParseInt(strings.TrimSpace(typed), 10, 64); err == nil {
				return parsed
			}
		}
	}

	return 0
}

func (p *Plugin) OnConfigurationChange() error {
	configuration := new(configuration)

	if err := p.API.LoadPluginConfiguration(configuration); err != nil {
		return errors.Wrap(err, "failed to load plugin configuration")
	}

	mergeConfigurationFromRaw(configuration, p.getRawPluginSettings())

	if configuration.DefaultLanguage == "" {
		configuration.DefaultLanguage = "de"
	}
	if configuration.MaxRecordingDuration <= 0 {
		configuration.MaxRecordingDuration = 120
	}
	if strings.TrimSpace(configuration.TranscriptionBackend) == "" {
		configuration.TranscriptionBackend = transcriptionBackendParakeet
	}

	if err := validateParakeetURL(configuration.effectiveTranscriptionURL()); err != nil {
		return errors.Wrap(err, "invalid ParakeetURL setting")
	}

	p.setConfiguration(configuration)

	return nil
}
