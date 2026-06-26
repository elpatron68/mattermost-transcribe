package main

import (
	"net/url"
	"strings"

	"github.com/pkg/errors"
)

func validateParakeetURL(raw string) error {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil
	}

	parsed, err := url.Parse(trimmed)
	if err != nil {
		return errors.Wrap(err, "invalid Parakeet URL")
	}

	switch strings.ToLower(parsed.Scheme) {
	case "http", "https":
	default:
		return errors.Errorf("Parakeet URL must use http or https")
	}

	if parsed.Host == "" {
		return errors.New("Parakeet URL must include a host")
	}

	return nil
}
