package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"github.com/pkg/errors"
)

const (
	maxAudioUploadSize = 25 << 20 // 25 MB, Parakeet limit
	transcribeTimeout  = 60 * time.Second
)

type transcribeResult struct {
	Text string `json:"text"`
}

type parakeetResponse struct {
	Text string `json:"text"`
}

func (p *Plugin) transcribeAudio(audio []byte, filename string) (string, error) {
	cfg := p.getConfiguration()
	if strings.TrimSpace(cfg.ParakeetURL) == "" {
		return "", errors.New("Parakeet URL is not configured")
	}

	language := cfg.DefaultLanguage
	if language == "" {
		language = "de"
	}

	baseURL := strings.TrimRight(cfg.ParakeetURL, "/")
	endpoint := baseURL + "/v1/audio/transcriptions"

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return "", errors.Wrap(err, "failed to create multipart file field")
	}

	if _, err := part.Write(audio); err != nil {
		return "", errors.Wrap(err, "failed to write audio data")
	}

	if err := writer.WriteField("language", language); err != nil {
		return "", errors.Wrap(err, "failed to write language field")
	}

	if err := writer.WriteField("response_format", "json"); err != nil {
		return "", errors.Wrap(err, "failed to write response_format field")
	}

	if err := writer.Close(); err != nil {
		return "", errors.Wrap(err, "failed to close multipart writer")
	}

	ctx, cancel := context.WithTimeout(context.Background(), transcribeTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, body)
	if err != nil {
		return "", errors.Wrap(err, "failed to create transcription request")
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())
	if cfg.ParakeetAPIKey != "" {
		req.Header.Set("Authorization", "Bearer "+cfg.ParakeetAPIKey)
	}

	client := &http.Client{Timeout: transcribeTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return "", errors.Wrap(err, "failed to call Parakeet")
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", errors.Wrap(err, "failed to read Parakeet response")
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Parakeet returned status %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	var result parakeetResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", errors.Wrap(err, "failed to parse Parakeet response")
	}

	return strings.TrimSpace(result.Text), nil
}
