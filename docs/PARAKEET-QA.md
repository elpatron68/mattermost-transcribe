# Parakeet setup for Mattermost QA and reviewers

This plugin requires a **self-hosted** [Parakeet](https://github.com/achetronic/parakeet) ASR server.
MediSoftware does **not** provide a public demo endpoint — reviewers run Parakeet locally with Docker.

For full plugin testing you also need Mattermost with the Transcribe plugin enabled. Use
[`mattermost-server-dev`](../mattermost-server-dev/) in this repository or your own Mattermost instance.

## Supported Parakeet versions

| | Image | Notes |
|---|-------|-------|
| **Tested / production pin** | `ghcr.io/achetronic/parakeet:0.5.0-int8` | Used in MediSoftware production; `latest` points here (int8, ~2 GiB RAM per active job) |
| **Minimum supported** | `ghcr.io/achetronic/parakeet:0.4.0-int8` | Requires Whisper-compatible `POST /v1/audio/transcriptions` and ffmpeg for WebM |
| **Not supported** | `*-fp32` tags | Higher RAM; not required for this plugin |

The plugin calls:

- `GET /health` (optional sanity check)
- `POST /v1/audio/transcriptions` — multipart `file`, `language`, optional `model`, `response_format=json`
- Optional header `Authorization: Bearer <PARAKEET_API_KEY>`

Audio from Mattermost is **WebM** from the browser; Parakeet transcodes via ffmpeg.

## Quick start — Parakeet only

From this repository:

```bash
cd docs/parakeet-qa
docker compose up -d
curl http://localhost:5092/health
```

Expected: `{"status":"ok"}`

Smoke-test transcription (requires a small WAV file):

```bash
curl -X POST http://localhost:5092/v1/audio/transcriptions \
  -H "Authorization: Bearer qa-test-key" \
  -F file=@sample.wav \
  -F language=en \
  -F response_format=json
```

**Host requirements:** ~4 GiB RAM free, Docker with `mem_limit` support. First start may take a minute while models load.

## Connect Mattermost to Parakeet

### A) Mattermost on the host, Parakeet in Docker (simplest)

1. Start Parakeet (`docs/parakeet-qa`, port **5092**).
2. In **System Console → Plugins → Transcribe** choose **Parakeet** and set:
   - **Server URL:** `http://localhost:5092`
   - **API Key:** `qa-test-key` (or your `PARAKEET_API_KEY` from `.env`)
   - **Default Language:** `en` or `de`

### B) Mattermost and Parakeet both in Docker

Use [`mattermost-server-dev`](../mattermost-server-dev/) plus Parakeet on a shared network.

**Terminal 1 — Mattermost:**

```bash
cd mattermost-server-dev
cp .env.example .env
docker compose up -d
```

**Terminal 2 — Parakeet on the same Compose project network:**

```bash
cd docs/parakeet-qa
docker compose -f docker-compose.yml -f docker-compose.mm-dev.yml up -d
```

In the plugin settings use:

- **Parakeet Server URL:** `http://parakeet:5092`
- **Parakeet API Key:** `qa-test-key`

(`docker-compose.mm-dev.yml` attaches Parakeet to the `mattermost-server-dev_default` network.)

### C) Mattermost in Docker, Parakeet on the host

Set **Parakeet Server URL** to:

- `http://host.docker.internal:5092` (Docker Desktop and some Linux setups)
- Host gateway IP on Linux, e.g. `http://172.17.0.1:5092`

## End-to-end plugin test

1. Install/enable **Transcribe** (`de.medisoftware.mattermost-transcribe`) on Mattermost.
2. Configure Parakeet URL and API key (above).
3. Open a channel in the **web or desktop** client (mobile apps are not supported).
4. Click the **microphone** icon or run `/transcribe`.
5. Record a short phrase → **Stop & Transcribe** → edit text → **Send**.

See [README screenshots](../README.md#screenshots) for the expected UI.

## Production vs QA settings

| Setting | QA (`docs/parakeet-qa`) | Production (see [README](../README.md#recommended-docker-compose)) |
|---------|-------------------------|---------------------------------------------------------------------|
| Image | `0.5.0-int8` (pinned) | `latest` / `0.5.0-int8` |
| `-workers` | `1` | `1` |
| `mem_limit` | `4g` | `8g` on 16 GiB host |
| API key | `qa-test-key` in `.env` | strong secret |

## Troubleshooting

| Problem | Check |
|---------|--------|
| `connection refused` from Mattermost | URL reachable **from the Mattermost server/container**, not only from your browser |
| `401` from Parakeet | API key in plugin settings matches `PARAKEET_API_KEY` |
| `400` unsupported audio | Parakeet image includes ffmpeg; use int8 tag ≥ `0.4.0` |
| Transcription timeout (60 s) | Parakeet logs: `docker compose logs -f`; CPU/RAM sufficient? |
| Container OOM | Increase `mem_limit` or ensure `-workers 1` |

## Offering a hosted test endpoint (optional)

If MediSoftware exposes a reviewer endpoint later, document here:

- URL: _not available — use Docker instructions above_
- API key: _provided out of band to Mattermost QA_

Update this section before Marketplace submission if a temporary endpoint is arranged.
