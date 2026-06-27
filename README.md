# Mattermost Transcribe Plugin

[![Build](https://github.com/elpatron68/mattermost-transcribe/actions/workflows/build.yml/badge.svg?branch=master)](https://github.com/elpatron68/mattermost-transcribe/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/github/license/elpatron68/mattermost-transcribe)](LICENSE)
[![Release](https://img.shields.io/github/v/release/elpatron68/mattermost-transcribe?include_prereleases)](https://github.com/elpatron68/mattermost-transcribe/releases)
[![Go](https://img.shields.io/github/go-mod/go-version/elpatron68/mattermost-transcribe)](go.mod)
[![Node.js](https://img.shields.io/badge/node-24.x-339933?logo=node.js&logoColor=white)](.nvmrc)
[![Mattermost](https://img.shields.io/badge/Mattermost-6.2.1%2B-0058CC?logo=mattermost&logoColor=white)](https://mattermost.com)
[![Parakeet ASR](https://img.shields.io/badge/ASR-Parakeet-0ea5e9)](https://github.com/achetronic/parakeet)
[![OpenAI Whisper](https://img.shields.io/badge/ASR-OpenAI%20Whisper-412991?logo=openai&logoColor=white)](https://platform.openai.com/docs/guides/speech-to-text)

Record voice in Mattermost, transcribe it with **self-hosted [Parakeet](https://github.com/achetronic/parakeet)** or the **OpenAI Whisper API**, review the text, and send it as a channel message.

**Plugin ID:** `de.medisoftware.mattermost-transcribe`

## Features

- Microphone button in the message input (next to file upload)
- `/transcribe` slash command (web/desktop client)
- Live microphone level indicator while recording
- **Review step** — edit the transcript before posting
- **Two transcription backends** — [Parakeet](https://github.com/achetronic/parakeet) (self-hosted) or OpenAI Whisper (cloud)
- Server-side proxy (API keys stay on the Mattermost server)
- German and English UI strings

## Requirements

| | All setups | Parakeet | OpenAI Whisper |
|---|------------|----------|----------------|
| Mattermost | 6.2.1+ | | |
| Client | Web or desktop (no mobile native apps) | | |
| Microphone | HTTPS in the browser | | |
| ASR service | | Parakeet server reachable from Mattermost (e.g. Docker) | Outbound HTTPS from Mattermost to `api.openai.com` |
| Credentials | | Optional `PARAKEET_API_KEY` on Parakeet | OpenAI API key with access to audio transcriptions |

## Choosing a backend

| | **Parakeet** (default) | **OpenAI Whisper** |
|---|------------------------|---------------------|
| Hosting | Self-hosted on your infrastructure | OpenAI cloud |
| Data residency | Audio stays on-premises | **Audio is sent to OpenAI** — review their [terms](https://openai.com/policies) and your compliance needs |
| Setup effort | Run and operate a Parakeet container | API key only; no ASR server to deploy |
| Ongoing cost | Server RAM/CPU (see below) | Per-minute API usage on your OpenAI account |
| Best for | Production, privacy-sensitive teams, predictable load | Quick start, dev/test, or when you cannot host Parakeet |

Both backends use the same Whisper-compatible `POST /v1/audio/transcriptions` API. The plugin forwards WebM audio from the browser through the Mattermost server.

## OpenAI Whisper Setup

No separate ASR container is required.

1. Create an API key at [platform.openai.com](https://platform.openai.com/api-keys) with permission to call the Audio API.
2. Install and enable the plugin (see [Installation](#installation)).
3. Open **System Console → Plugins → Transcribe**, select **OpenAI Whisper**, paste the key, and save.
4. Leave **Model** at the default `whisper-1` unless you use a different Whisper model on your account.
5. Set **Default Language** (`de`, `en`, …) to match your users.

The plugin calls `https://api.openai.com/v1/audio/transcriptions`. Requests time out after **60 seconds**; maximum upload size is **25 MB** per recording (same as Parakeet).

**Privacy:** voice recordings leave your network. Use Parakeet if on-premises processing is required.

**Local development:** you can run the Mattermost dev stack without Parakeet and point the plugin at OpenAI instead — only Mattermost (and PostgreSQL) need to be up in `mattermost-server-dev`.

## Parakeet Setup

Run Parakeet as a separate service. The official Docker image includes ONNX Runtime, models, and ffmpeg.

### Recommended Docker Compose

The image defaults to **`-workers 4`**, which pre-allocates several ONNX decoder sessions and can consume multiple gigabytes of RAM. For production we run **one worker** and cap container memory so a growing process cannot take down the host.

Example for a **16 GiB** LXC/VM (~30 Mattermost users, moderate voice-message usage):

```yaml
services:
  parakeet:
    image: ghcr.io/achetronic/parakeet:latest
    ports:
      - "5092:5092"
    environment:
      - PARAKEET_API_KEY=your-secret-key
    command:
      - "-models"
      - "/models"
      - "-workers"
      - "1"
      - "-log-level"
      - "info"
    mem_limit: 8g
    cpus: 8
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5092/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 60s
```

| Setting | Suggested value | Notes |
|---------|-----------------|-------|
| `-workers` | `1` | One transcription at a time; extra requests queue at Parakeet |
| `mem_limit` | `8g` on a 16 GiB host | Leaves headroom for the OS; container restarts on OOM |
| `cpus` | `8` on a 16-core host | Enough for a single ONNX job; host stays responsive |
| `healthcheck` | `/health` | Image includes `curl`; status shows as `healthy` in `docker ps` |

Scale `mem_limit` and `cpus` with your host (e.g. `mem_limit: 4g` / `cpus: 4` on an 8 GiB VM). Use `-workers 2` only if users often transcribe in parallel and you accept higher RAM use.

Verify the service:

```bash
curl http://localhost:5092/health
docker ps   # STATUS should include (healthy)
```

If Mattermost and Parakeet run in Docker on the same network, use the container hostname (e.g. `http://parakeet:5092`) instead of `localhost`.

**Mattermost QA / reviewers:** see [docs/PARAKEET-QA.md](docs/PARAKEET-QA.md) for a minimal Docker stack and version requirements.

### Operations notes (MediSoftware experience)

These notes come from running Parakeet behind this plugin in production-like tests.

**Memory does not fully return after transcription.** After a container restart, idle usage can be very low (on the order of tens of MiB). Each transcription loads ONNX encoder/decoder work and ffmpeg (WebM from the browser). When the job finishes, CPU drops, but **RSS often stays elevated** — Go and ONNX Runtime frequently keep memory in the process instead of returning it to the OS. Proxmox/LXC graphs can show stepwise RAM growth per transcription even with `-workers 1`. This is retention/allocator behaviour, not necessarily a leak in the plugin.

**More RAM alone does not fix it.** We observed the same pattern on 4 GiB, 8 GiB, and 16 GiB VMs: the ceiling moves, but memory still accumulates across requests unless the process is restarted.

**Multi-user behaviour (~30 users).** With `-workers 1`, Parakeet handles one job at a time; others wait in its HTTP queue. The plugin waits up to **60 seconds** per request (`server/transcribe.go`). Sporadic use (one or two people at a time) is fine; several simultaneous long recordings can cause waits or timeouts. The plugin does not queue on the Mattermost side.

**Mitigations that helped:**

- Always set `-workers` explicitly (do not rely on the default `4`).
- Set `mem_limit` so runaway RSS restarts the container instead of freezing the VM.
- Add **swap** on the Parakeet host if none is configured (e.g. 2–4 GiB).
- Optional **scheduled restart** (e.g. nightly `docker restart`) as a workaround until upstream improves memory release.
- Monitor with `docker stats` and `free -h`; alert on sustained high container memory or failed `/health`.

### Stable production outcome

After applying the recommended compose settings (`-workers 1`, `mem_limit: 8g`, `cpus: 8`, healthcheck) on a **16 GiB / 16 vCPU** Proxmox LXC with **2 GiB swap**, behaviour stabilised for ~30 Mattermost users:

| Metric | Idle | During transcription |
|--------|------|----------------------|
| RAM | ~2.4 GiB (~15 % of 16 GiB), flat over hours | Short spike, then returns to baseline |
| CPU | ~0 % | Peak ~90 %, drops to idle when the job finishes |
| Swap | 0 % used | Not needed under normal load |

CPU and network spikes align with active transcription only — no sustained high load after jobs complete. This is the expected healthy pattern. The earlier stepwise RAM growth to 100 % was seen on smaller VMs (4–8 GiB) **before** explicit `-workers 1`, `mem_limit`, and swap were in place.

Continue to watch RAM over days of regular use; a slow climb would indicate retention accumulating again and may warrant a scheduled container restart.

**nginx / upload size (Mattermost plugin bundle, not Parakeet):** ensure `client_max_body_size` is **≥ 100M** in every nginx `location` that handles plugin uploads — a global 50M limit caused HTTP 413 for our ~63 MB bundle even when other blocks allowed 100M.

## Installation

1. Build or download `dist/de.medisoftware.mattermost-transcribe-<version>.tar.gz`.
2. Upload via **System Console → Plugins → Plugin Management**.
3. Enable the plugin and configure a transcription backend (see [Plugin Configuration](#plugin-configuration)).

The bundle is about 60–65 MB (all platform binaries). Ensure upload limits allow it:

- Mattermost `FileSettings.MaxFileSize` (default often 100 MB)
- Reverse proxy `client_max_body_size` (e.g. nginx) must be **≥ 100M** in every `location` block that handles `/api/v4/plugins`

## Plugin Configuration

Open **System Console → Plugins → Transcribe**. The custom **Transcription Service** section lets you pick a backend; only the fields for that backend are shown.

| Setting | Parakeet | OpenAI Whisper |
|---------|----------|----------------|
| **Backend** | Parakeet (default) | OpenAI Whisper |
| **Server URL** | Base URL reachable from Mattermost, e.g. `http://parakeet:5092` | *(fixed)* `https://api.openai.com` |
| **API Key** | Optional; must match `PARAKEET_API_KEY` on Parakeet | Required OpenAI API key |
| **Model** | — | `whisper-1` (default) |
| **Default Language** | ISO-639-1 code (`de`, `en`, …) sent to the ASR API | same |
| **Max Recording Duration** | Max seconds per recording (default `120`) | same |

### OpenAI Whisper

1. Select **OpenAI Whisper**.
2. Enter your **OpenAI API Key** (stored in Mattermost plugin settings, used only server-side).
3. Confirm **Model** is `whisper-1` or adjust if your account uses another Whisper model.
4. Save and test with `/transcribe` in a channel.

Billing and rate limits follow your OpenAI plan. Failed or missing keys surface as transcription errors in the client.

### Parakeet

1. Select **Parakeet**.
2. Set **Parakeet Server URL** to a host reachable from the Mattermost server (e.g. `http://parakeet:5092` on the same Docker network).
3. If Parakeet runs with `PARAKEET_API_KEY`, enter the same value under **Parakeet API Key**.
4. Save and verify `curl http://<host>:5092/health` from the Mattermost host or container.

## Usage

1. Open a channel in the web or desktop app.
2. Click the microphone icon or type `/transcribe`.
3. Speak, then click **Stop & Transcribe**.
4. Review and edit the transcript in the dialog.
5. Click **Send** to post, or **Discard** to cancel.

## Screenshots

Message input with microphone button:

![Message input with microphone button](docs/screenshots/message-input-microphone.png)

Recording in progress (timer and level meter):

![Recording overlay](docs/screenshots/recording-overlay.png)

Review dialog before sending:

![Review dialog](docs/screenshots/review-dialog.png)

Plugin settings in System Console:

![Plugin settings](docs/screenshots/plugin-settings.png)

## Architecture

```
Browser (MediaRecorder, WebM)
        ↓
Mattermost plugin server  ──→  Parakeet  POST /v1/audio/transcriptions  (self-hosted)
        │                  or
        │                  ──→  OpenAI    POST /v1/audio/transcriptions  (cloud)
        ↓
Client review dialog → channel message (text)
```

Audio is recorded in the browser. The plugin server proxies it to the configured backend and returns JSON `{ "text": "..." }`. API keys never reach the client. Nothing is posted until the user confirms in the review step.

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

Start a local Mattermost test server (Docker), optionally with Parakeet:

```bash
cd mattermost-server-dev
cp .env.example .env
docker compose up -d
```

This starts Mattermost, PostgreSQL, and Parakeet on the same Docker network. See [mattermost-server-dev/README.md](mattermost-server-dev/README.md) for details.

1. Open **http://localhost:8065** and complete the first-run wizard.
2. In **System Console → Plugins → Transcribe**, configure a backend:
   - **Parakeet (default):** confirm **Server URL** is `http://parakeet:5092` and **API Key** matches `PARAKEET_API_KEY` in `.env` (default `dev-secret-key`) if used.
   - **OpenAI Whisper:** select OpenAI, enter your API key — Parakeet does not need to be running for transcription.
3. Create a **Personal Access Token** for your admin user (**Profile → Security → Personal Access Tokens**).
4. From the **repository root**:

```bash
export MM_SERVICESETTINGS_SITEURL=http://localhost:8065
export MM_ADMIN_TOKEN=your-token
make watch
```

Plugin uploads and the 100 MB file limit are pre-enabled in `docker-compose.yml`.

For a standalone Parakeet stack (e.g. Marketplace QA), see [docs/PARAKEET-QA.md](docs/PARAKEET-QA.md).

### Versioning

Set the release version in `plugin.json` (`version` field) before `make dist`. The Makefile also provides `make patch`, `make minor`, and `make major` for signed git tags (`v*`).

### CI

GitHub Actions workflow [`.github/workflows/build.yml`](.github/workflows/build.yml):

- **Test** — `make test-ci` on push/PR to `master`
- **Build** — `make dist`, uploads the `.tar.gz` as an artifact
- **Release** — on tags `v*`, attaches the bundle to a GitHub Release

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Security

Report vulnerabilities per [SECURITY.md](SECURITY.md). Use GitHub Security Advisories or
security@medisoftware.de — please do not file public issues for security bugs.

API keys (Parakeet or OpenAI) are stored in Mattermost plugin settings and used only on the server when proxying transcription requests. With **OpenAI Whisper**, audio leaves your infrastructure — treat this like any other third-party SaaS integration and restrict the plugin settings to Mattermost system admins.

## Limitations

- No mobile native app support (browser microphone APIs)
- No streaming transcription — full recording is sent after **Stop & Transcribe**
- Maximum audio upload is **25 MB** per request (both backends)
- Plugin timeout is **60 seconds** per transcription (both backends)
- **Parakeet:** ASR server must be reachable from Mattermost; one job per worker — concurrent users may wait (see [Operations notes](#operations-notes-medisoftware-experience)); memory may stay elevated after jobs — plan `mem_limit` or restarts
- **OpenAI Whisper:** requires outbound HTTPS to OpenAI; audio and metadata are processed under OpenAI's policies; subject to API availability, quotas, and billing

## License

MIT License — see [LICENSE](LICENSE).  
Copyright (c) 2026 MediSoftware GmbH & Co. KG
