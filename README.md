# Mattermost Transcribe Plugin

Record voice in Mattermost, transcribe it with [Parakeet](https://github.com/achetronic/parakeet) ASR, review the text, and send it as a channel message.

**Plugin ID:** `de.medisoftware.mattermost-transcribe`  
**Current version:** 0.1.0

## Features

- Microphone button in the message input (next to file upload)
- `/transcribe` slash command (web/desktop client)
- Live microphone level indicator while recording
- **Review step** — edit the transcript before posting
- Server-side proxy to Parakeet (API key stays on the server)
- German and English UI strings

## Requirements

- Mattermost server 6.2.1+
- Parakeet ASR server (external, e.g. Docker)
- Web or desktop client (mobile apps are not supported)
- HTTPS for microphone access in the browser

## Parakeet Setup

Run Parakeet as a separate service. The official Docker image includes ONNX Runtime, models, and ffmpeg:

```yaml
services:
  parakeet:
    image: ghcr.io/achetronic/parakeet:latest
    ports:
      - "5092:5092"
    environment:
      - PARAKEET_API_KEY=your-secret-key
    restart: unless-stopped
```

Verify the service:

```bash
curl http://localhost:5092/health
```

If Mattermost and Parakeet run in Docker on the same network, use the container hostname (e.g. `http://parakeet:5092`) instead of `localhost`.

## Installation

1. Build or download `dist/de.medisoftware.mattermost-transcribe-<version>.tar.gz`.
2. Upload via **System Console → Plugins → Plugin Management**.
3. Enable the plugin and configure Parakeet (see below).

The bundle is about 60–65 MB (all platform binaries). Ensure upload limits allow it:

- Mattermost `FileSettings.MaxFileSize` (default often 100 MB)
- Reverse proxy `client_max_body_size` (e.g. nginx) must be **≥ 100M** in every `location` block that handles `/api/v4/plugins`

## Plugin Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| Parakeet Server URL | Base URL of Parakeet | `http://localhost:5092` |
| Parakeet API Key | Optional bearer token | empty |
| Default Language | ISO-639-1 code sent to Parakeet | `de` |
| Max Recording Duration | Max seconds per recording | `120` |

## Usage

1. Open a channel in the web or desktop app.
2. Click the microphone icon or type `/transcribe`.
3. Speak, then click **Stop & Transcribe**.
4. Review and edit the transcript in the dialog.
5. Click **Send** to post, or **Discard** to cancel.

## Architecture

```
Browser (MediaRecorder) → Plugin Server → Parakeet /v1/audio/transcriptions
                                ↓
                         Review in client → Text post
```

Audio is recorded as WebM in the browser. The plugin server forwards it to Parakeet's Whisper-compatible API and returns the transcript. The client does not post until the user confirms.

## Build

Recommended on Linux or WSL:

```bash
make dist
```

Output: `dist/de.medisoftware.mattermost-transcribe-<version>.tar.gz` (version from `plugin.json`).

`make dist` uses `build/package_bundle.py` to set executable bits on Linux plugin binaries in the archive (avoids `permission denied` on install).

### Prerequisites

- Go (see `go.mod`)
- Node.js (see `.nvmrc`)
- npm, make, python3

### WSL

Run `make` from a **WSL shell**, not PowerShell or cmd. The Makefile prefers Linux `go`/`npm` over Windows binaries under `/mnt/c/Program Files/...`.

One-time setup:

```bash
bash scripts/install-wsl-node.sh
```

Go is expected at `~/.local/go/bin/go` or on `PATH`. Prefer cloning the repo on the Linux filesystem (`~/...`) rather than `/mnt/c/...` for faster builds and fewer line-ending issues.

### Development

Enable plugin uploads in `config.json`, then:

```bash
export MM_SERVICESETTINGS_SITEURL=http://localhost:8065
export MM_ADMIN_TOKEN=your-token
make watch
```

### Versioning

Set the release version in `plugin.json` (`version` field) before `make dist`. The Makefile also provides `make patch`, `make minor`, and `make major` for signed git tags (`v*`).

### CI

GitHub Actions workflow [`.github/workflows/build.yml`](.github/workflows/build.yml):

- **Test** — `make test-ci` on push/PR to `master`
- **Build** — `make dist`, uploads the `.tar.gz` as an artifact
- **Release** — on tags `v*`, attaches the bundle to a GitHub Release

## Limitations

- No mobile native app support (browser microphone APIs)
- No streaming transcription
- Parakeet must be reachable from the Mattermost server
- Maximum audio upload to Parakeet is 25 MB

## License

MIT License — see [LICENSE](LICENSE).  
Copyright (c) 2026 MediSoftware GmbH.
