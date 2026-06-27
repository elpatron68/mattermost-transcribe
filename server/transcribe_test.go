package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTranscribeAudioOmitsModelWhenUnset(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.NoError(t, r.ParseMultipartForm(25<<20))
		assert.Empty(t, r.FormValue("model"))
		assert.Equal(t, "de", r.FormValue("language"))
		assert.Equal(t, "json", r.FormValue("response_format"))

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"text":"ok"}`))
	}))
	defer server.Close()

	plugin := &Plugin{}
	plugin.setConfiguration(&configuration{
		ParakeetURL:     server.URL,
		DefaultLanguage: "de",
	})

	text, err := plugin.transcribeAudio([]byte("audio"), "recording.webm")
	require.NoError(t, err)
	assert.Equal(t, "ok", text)
}

func TestTranscribeAudioOpenAISendsDefaultModel(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.NoError(t, r.ParseMultipartForm(25<<20))
		assert.Equal(t, "whisper-1", r.FormValue("model"))

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"text":"hello"}`))
	}))
	defer server.Close()

	plugin := &Plugin{}
	plugin.setConfiguration(&configuration{
		TranscriptionBackend: transcriptionBackendOpenAI,
		ParakeetURL:          server.URL,
		DefaultLanguage:      "en",
	})

	text, err := plugin.transcribeAudio([]byte("audio"), "recording.webm")
	require.NoError(t, err)
	assert.Equal(t, "hello", text)
}

func TestTranscribeAudioSendsModelWhenConfigured(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		file, header, err := r.FormFile("file")
		require.NoError(t, err)
		defer file.Close()

		content, err := io.ReadAll(file)
		require.NoError(t, err)
		assert.Equal(t, []byte("audio"), content)
		assert.Equal(t, "recording.webm", header.Filename)

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"text":"hello"}`))
	}))
	defer server.Close()

	plugin := &Plugin{}
	plugin.setConfiguration(&configuration{
		TranscriptionBackend: transcriptionBackendOpenAI,
		ParakeetURL:          server.URL,
		TranscriptionModel:   "whisper-1",
		DefaultLanguage:      "en",
		ParakeetAPIKey:       "test-key",
	})

	text, err := plugin.transcribeAudio([]byte("audio"), "recording.webm")
	require.NoError(t, err)
	assert.Equal(t, "hello", text)
}
