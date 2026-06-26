# Mattermost Transcribe Plugin

Record voice in Mattermost and post the transcription as a text message, powered by [Parakeet](https://github.com/achetronic/parakeet) ASR.

## Features

- Microphone button in the message input (next to file upload)
- `/transcribe` slash command (opens recording in the web/desktop client)
- Server-side proxy to Parakeet (API key stays on the server)
- Posts transcribed text as a normal channel message

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

## Plugin Configuration

Upload the plugin bundle via **System Console > Plugins > Plugin Management**, then configure:

| Setting | Description | Default |
|---------|-------------|---------|
| Parakeet Server URL | Base URL of Parakeet | `http://localhost:5092` |
| Parakeet API Key | Optional bearer token | empty |
| Default Language | ISO-639-1 code sent to Parakeet | `de` |
| Max Recording Duration | Max seconds per recording | `120` |

If Mattermost and Parakeet run in Docker on the same network, use the container hostname (e.g. `http://parakeet:5092`) instead of `localhost`.

## Build

Recommended on Linux or WSL:

```bash
make dist
```

The bundle is written to `dist/com.medisoft.mattermost-transcribe.tar.gz`.

`make dist` uses `build/package_bundle.py` to set the executable bit on Linux plugin binaries in the archive. That avoids `permission denied` errors when Mattermost installs a bundle built on Windows.

### WSL

```bash
cd /mnt/c/Users/markus.MEDISOFT/source/repos/mattermost-transcribe
make dist
```

Ensure `go`, `node`, `npm`, and `python3` are available in WSL.

### Development

Enable plugin uploads in `config.json`, then:

```bash
export MM_SERVICESETTINGS_SITEURL=http://localhost:8065
export MM_ADMIN_TOKEN=your-token
make watch
```

## Usage

1. Open a channel in the web or desktop app.
2. Click the microphone icon next to the file attachment button, or type `/transcribe`.
3. Speak, then click **Stop & Transcribe**.
4. The plugin sends the audio to Parakeet and posts the transcript as a text message.

## Architecture

```
Browser (MediaRecorder) → Plugin Server → Parakeet /v1/audio/transcriptions → Text post
```

Audio is recorded as WebM in the browser. The plugin server forwards it to Parakeet's Whisper-compatible API and returns the transcript to the client.

## Limitations

- No mobile native app support (browser microphone APIs)
- No streaming transcription in v1
- Parakeet must be reachable from the Mattermost server
- Maximum upload size is 25 MB (Parakeet limit)

## License

See [LICENSE](LICENSE).
