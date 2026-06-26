package main

import (
	"encoding/json"
	"io"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/pkg/errors"
)

type clientConfigResponse struct {
	MaxRecordingDuration int64 `json:"maxRecordingDuration"`
}

func (p *Plugin) initRouter() *mux.Router {
	router := mux.NewRouter()

	router.Use(p.MattermostAuthorizationRequired)

	apiRouter := router.PathPrefix("/api/v1").Subrouter()

	apiRouter.HandleFunc("/config", p.GetClientConfig).Methods(http.MethodGet)
	apiRouter.HandleFunc("/transcribe", p.HandleTranscribe).Methods(http.MethodPost)

	return router
}

func (p *Plugin) ServeHTTP(c *plugin.Context, w http.ResponseWriter, r *http.Request) {
	p.router.ServeHTTP(w, r)
}

func (p *Plugin) MattermostAuthorizationRequired(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("Mattermost-User-ID")
		if userID == "" {
			http.Error(w, "Not authorized", http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (p *Plugin) GetClientConfig(w http.ResponseWriter, _ *http.Request) {
	cfg := p.getConfiguration()
	maxDuration := cfg.MaxRecordingDuration
	if maxDuration <= 0 {
		maxDuration = 120
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(clientConfigResponse{MaxRecordingDuration: maxDuration}); err != nil {
		p.API.LogError("Failed to encode client config", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

const clientErrorTranscriptionFailed = "Transcription failed"

func (p *Plugin) HandleTranscribe(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(maxAudioUploadSize); err != nil {
		http.Error(w, "Failed to parse upload", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("audio")
	if err != nil {
		http.Error(w, "Missing audio file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	audio, err := io.ReadAll(io.LimitReader(file, maxAudioUploadSize+1))
	if err != nil {
		http.Error(w, "Failed to read audio file", http.StatusBadRequest)
		return
	}
	if len(audio) == 0 {
		http.Error(w, "Audio file is empty", http.StatusBadRequest)
		return
	}
	if len(audio) > maxAudioUploadSize {
		http.Error(w, "Audio file exceeds maximum size", http.StatusBadRequest)
		return
	}

	filename := "recording.webm"
	if header != nil && header.Filename != "" {
		filename = filepath.Base(header.Filename)
	}

	text, err := p.transcribeAudio(audio, filename)
	if err != nil {
		if p.API != nil {
			p.API.LogError("Transcription failed", "error", err)
		}
		http.Error(w, clientErrorTranscriptionFailed, http.StatusBadGateway)
		return
	}

	if strings.TrimSpace(text) == "" {
		http.Error(w, "No speech detected in recording", http.StatusUnprocessableEntity)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(transcribeResult{Text: text}); err != nil {
		p.API.LogError("Failed to encode transcription response", "error", errors.Wrap(err, "encode failed"))
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
