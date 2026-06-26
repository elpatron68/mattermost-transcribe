package main

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestPlugin(parakeetURL string) *Plugin {
	plugin := &Plugin{}
	plugin.setConfiguration(&configuration{
		ParakeetURL:          parakeetURL,
		DefaultLanguage:      "de",
		MaxRecordingDuration: 120,
	})
	plugin.router = plugin.initRouter()
	return plugin
}

func TestGetClientConfig(t *testing.T) {
	plugin := setupTestPlugin("http://localhost:5092")

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/v1/config", nil)
	r.Header.Set("Mattermost-User-ID", "test-user-id")

	plugin.ServeHTTP(nil, w, r)

	result := w.Result()
	require.Equal(t, http.StatusOK, result.StatusCode)
	defer func() { _ = result.Body.Close() }()

	var response clientConfigResponse
	err := json.NewDecoder(result.Body).Decode(&response)
	require.NoError(t, err)
	assert.Equal(t, int64(120), response.MaxRecordingDuration)
}

func TestTranscribeEndpointUnauthorized(t *testing.T) {
	plugin := setupTestPlugin("http://localhost:5092")

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/v1/transcribe", nil)

	plugin.ServeHTTP(nil, w, r)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestTranscribeEndpoint(t *testing.T) {
	parakeetServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/audio/transcriptions", r.URL.Path)
		assert.Equal(t, http.MethodPost, r.Method)

		err := r.ParseMultipartForm(25 << 20)
		require.NoError(t, err)
		assert.Equal(t, "de", r.FormValue("language"))
		assert.Equal(t, "json", r.FormValue("response_format"))

		file, header, err := r.FormFile("file")
		require.NoError(t, err)
		defer file.Close()

		content, err := io.ReadAll(file)
		require.NoError(t, err)
		assert.NotEmpty(t, content)
		assert.Equal(t, "recording.webm", header.Filename)

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"text":"Hallo Welt"}`))
	}))
	defer parakeetServer.Close()

	plugin := setupTestPlugin(parakeetServer.URL)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("audio", "recording.webm")
	require.NoError(t, err)
	_, err = part.Write([]byte("fake-audio-data"))
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/v1/transcribe", body)
	r.Header.Set("Content-Type", writer.FormDataContentType())
	r.Header.Set("Mattermost-User-ID", "test-user-id")

	plugin.ServeHTTP(nil, w, r)

	result := w.Result()
	require.Equal(t, http.StatusOK, result.StatusCode)
	defer func() { _ = result.Body.Close() }()

	var response transcribeResult
	err = json.NewDecoder(result.Body).Decode(&response)
	require.NoError(t, err)
	assert.Equal(t, "Hallo Welt", response.Text)
}

func TestTranscribeEndpointMissingAudio(t *testing.T) {
	plugin := setupTestPlugin("http://localhost:5092")

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/v1/transcribe", nil)
	r.Header.Set("Mattermost-User-ID", "test-user-id")

	plugin.ServeHTTP(nil, w, r)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}
