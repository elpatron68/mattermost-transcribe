package main

import (
	"reflect"

	"github.com/pkg/errors"
)

type configuration struct {
	ParakeetURL            string
	ParakeetAPIKey         string
	DefaultLanguage        string
	MaxRecordingDuration   int64
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

func (p *Plugin) OnConfigurationChange() error {
	configuration := new(configuration)

	if err := p.API.LoadPluginConfiguration(configuration); err != nil {
		return errors.Wrap(err, "failed to load plugin configuration")
	}

	if configuration.DefaultLanguage == "" {
		configuration.DefaultLanguage = "de"
	}
	if configuration.MaxRecordingDuration <= 0 {
		configuration.MaxRecordingDuration = 120
	}

	p.setConfiguration(configuration)

	return nil
}
