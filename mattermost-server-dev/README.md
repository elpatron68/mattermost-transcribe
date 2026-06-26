# Mattermost test server (Docker)

Local Mattermost **Team Edition** for developing and testing the Transcribe plugin in this repo.

## Quick start

```bash
cd mattermost-server-dev
cp .env.example .env
docker compose up -d
```

Open **http://localhost:8065** and complete the first-run wizard (create admin user and team).

Check status:

```bash
docker compose ps
docker compose logs -f mattermost
```

Stop:

```bash
docker compose down
```

Remove all data (Docker named volumes):

```bash
docker compose down -v
```

## Plugin development

1. Start this stack (`docker compose up -d`).
2. Create a **Personal Access Token** for your admin user:  
   **Profile → Security → Personal Access Tokens**
3. From the **repository root** (`mattermost-transcribe/`):

```bash
export MM_SERVICESETTINGS_SITEURL=http://localhost:8065
export MM_ADMIN_TOKEN=your-token
make deploy
# or hot reload:
make watch
```

Plugin uploads and 100 MB file limit are pre-enabled in `docker-compose.yml`.

### Parakeet

The Transcribe plugin needs a running [Parakeet](https://github.com/achetronic/parakeet) instance.
See the root [README](../README.md#parakeet-setup) and set **Parakeet Server URL** in  
**System Console → Plugins → Transcribe**.

From the Mattermost container, use a host-reachable URL (e.g. `http://host.docker.internal:5092`
on Docker Desktop, or your LAN IP).

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `MATTERMOST_PORT` | `8065` | Host port |
| `MM_SERVICESETTINGS_SITEURL` | `http://localhost:8065` | Site URL (must match browser address) |
| `MATTERMOST_IMAGE_TAG` | `10.5.0` | Mattermost version |
| `POSTGRES_*` | `mmuser` / `mattermost` | Database credentials |

Edit `.env` after copying from `.env.example`.

## Microphone / HTTPS

Browsers require **HTTPS** (or `localhost`) for microphone access. For voice recording tests on
`http://localhost:8065`, modern browsers usually allow the mic. For access via LAN hostname or IP,
put a reverse proxy with TLS in front or use the Mattermost desktop app.

## Data layout

Persistent data uses **Docker named volumes** (not bind mounts under `./volumes/`). This avoids
PostgreSQL permission errors when the repo lives on `/mnt/c/` in WSL.

| Volume | Content |
|--------|---------|
| `pgdata` | PostgreSQL data |
| `mm_config` | `config.json` |
| `mm_data` | uploads, etc. |
| `mm_plugins` / `mm_client_plugins` | plugin bundles |
| `mm_logs` / `mm_bleve` | logs and search index |

List volumes: `docker volume ls | grep mattermost-server-dev`

## Troubleshooting

**`db` unhealthy / `could not change permissions`** — caused by bind mounts on Windows drives
(`/mnt/c/...`). This compose file uses named volumes; run `docker compose down -v` and `docker compose up -d`
after updating.

**Server not ready** — first start can take 1–2 minutes while the DB is initialised.

**Plugin upload 413** — ensure `MM_FILESETTINGS_MAXFILESIZE` is `104857600` (already set).
