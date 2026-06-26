# Mattermost Marketplace publication

Checklist and steps for publishing **Transcribe** (`de.medisoftware.mattermost-transcribe`) to the
[Mattermost Marketplace](https://mattermost.com/marketplace/). Use this document when the plugin is
ready for a public **v1.0.0** release.

Official Mattermost references:

- [Contribute to the Marketplace](https://developers.mattermost.com/integrate/marketplace-submissions/) — submission form
- [Community plugin process](https://developers.mattermost.com/integrate/plugins/community_process/) — code review, QA, security
- [Community plugins overview](https://developers.mattermost.com/integrate/plugins/community-plugin-marketplace/)
- [Plugin manifest reference](https://developers.mattermost.com/integrate/plugins/manifest-reference/)
- [mattermost/mattermost-marketplace](https://github.com/mattermost/mattermost-marketplace) — plugin index (PR via generator)

## One-paragraph summary (for listing / PM review)

Transcribe adds voice-to-text to Mattermost using a self-hosted [Parakeet](https://github.com/achetronic/parakeet) ASR server. Users record from the message box or via `/transcribe`, review and edit the transcript, then post to a channel. Audio never leaves your infrastructure except to your own Parakeet instance; API keys stay on the Mattermost server.

## Primary use cases

- Dictate a channel message instead of typing
- Capture meeting notes as editable text before posting
- Accessibility: speech input for users who prefer voice
- On-premises speech recognition without cloud ASR APIs

## Pre-submission checklist

### Repository and legal

- [x] Public Git repository: [github.com/medisoftware/mattermost-transcribe](https://github.com/medisoftware/mattermost-transcribe)
- [x] Apache-compatible license (MIT) — see [LICENSE](../LICENSE)
- [x] Issue tracker linked in manifest (`support_url`)
- [x] Security policy — see [SECURITY.md](../SECURITY.md)
- [ ] **Release version ≥ 1.0.0** (Marketplace expects out-of-beta; currently `0.1.0`)

### Manifest (`plugin.json`)

- [x] Unique reverse-DNS `id`: `de.medisoftware.mattermost-transcribe`
- [x] `min_server_version` set (`6.2.1`)
- [x] `homepage_url`, `support_url`, `release_notes_url`
- [x] Custom `icon_path` (`assets/icon.svg`)
- [x] All configuration via System Console (`settings_schema`)
- [ ] Bump `version` to `1.0.0` and tag `v1.0.0` before submission
- [ ] Update `release_notes_url` to the specific release if required (e.g. `.../releases/tag/v1.0.0`)

### Documentation

- [x] README: features, requirements, Parakeet setup, installation, configuration, usage, architecture, limitations
- [x] [CHANGELOG.md](../CHANGELOG.md) with release history
- [x] **Screenshots** in [docs/screenshots/](screenshots/) and embedded in README (see [screenshots/README.md](screenshots/README.md))
- [x] **512×512 PNG** for the web Marketplace form (`docs/screenshots/marketplace-icon-512.png`, exported from `assets/icon.svg`)

### Build and releases

- [x] CI: test + `make dist` on push/PR ([`.github/workflows/build.yml`](../.github/workflows/build.yml))
- [x] GitHub Releases attach `.tar.gz` bundle
- [ ] Publish **`v1.0.0`** GitHub Release with complete release notes
- [ ] Provide Mattermost QA a **stable download URL** for nightly/master builds if requested (pre-release tags from CI on `master` may suffice)

### External dependency (Parakeet)

- [x] Parakeet setup documented in README (Docker Compose, production notes)
- [ ] Offer Mattermost reviewers a **test Parakeet endpoint** or step-by-step Docker instructions they can run
- [ ] Document minimum Parakeet version / image tag if you pin one in production

### Quality and review (Mattermost-led)

- [ ] Submit [Marketplace contribution form](https://developers.mattermost.com/integrate/marketplace-submissions/)
- [ ] Post in **Integrations and Apps** on [Mattermost Community](https://community.mattermost.com) to start review
- [ ] Basic code review (experimental / ci-extensions)
- [ ] Full code review — two committers, one security-focused
- [ ] QA pass on advertised functionality
- [ ] PM/UX review (summary, use cases, helper text)

### Add to plugin index (after acceptance)

After Mattermost approves the plugin, open a PR to [mattermost/mattermost-marketplace](https://github.com/mattermost/mattermost-marketplace):

```bash
git clone https://github.com/mattermost/mattermost-marketplace.git
cd mattermost-marketplace
go run ./cmd/generator/ add medisoftware/mattermost-transcribe v1.0.0 --community
# Review plugins.json diff, then submit PR
```

Replace `v1.0.0` with the released version. Use `--official` only for Mattermost-owned plugins.

## Release steps (when ready for v1.0.0)

1. Complete open checklist items (screenshots, Parakeet QA notes).
2. Update [CHANGELOG.md](../CHANGELOG.md) for `1.0.0`.
3. Set `"version": "1.0.0"` in `plugin.json`.
4. Commit, tag, and push:
   ```bash
   git tag -s v1.0.0 -m "v1.0.0"
   git push origin master v1.0.0
   ```
5. Verify GitHub Actions created the release and attached the bundle.
6. Submit Marketplace form and community review request.
7. After approval, run `generator add` PR to mattermost-marketplace.

## Marketplace listing assets

| Asset | Location / spec |
|-------|-----------------|
| Plugin bundle | `dist/de.medisoftware.mattermost-transcribe-<version>.tar.gz` |
| SVG icon (in bundle) | `assets/icon.svg` |
| Web listing icon | `docs/screenshots/marketplace-icon-512.png` (512×512 PNG) |
| Screenshots | `docs/screenshots/*.png`, shown in README |
| Release notes | GitHub Release + [CHANGELOG.md](../CHANGELOG.md) |

## Security

- Plugin vulnerabilities: [SECURITY.md](../SECURITY.md) / GitHub Security Advisories
- Mattermost platform: [responsibledisclosure@mattermost.com](mailto:responsibledisclosure@mattermost.com)

## Internal install (before Marketplace)

Upload the bundle via **System Console → Plugins → Plugin Management**. No Marketplace listing required for private use.
