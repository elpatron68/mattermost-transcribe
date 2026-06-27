# Changelog

All notable changes to this project are documented here. Release notes for the Mattermost plugin
manifest point to [GitHub Releases](https://github.com/medisoftware/mattermost-transcribe/releases).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-06-27

### Added

- Marketplace submission checklist ([docs/MARKETPLACE.md](docs/MARKETPLACE.md))
- Plugin icon, changelog, and security policy for publication

## [0.1.0] - 2026-06-26

### Added

- Microphone button in the message input and `/transcribe` slash command
- Live microphone level indicator while recording
- Review step to edit the transcript before posting
- Server-side proxy to on-premises [Parakeet](https://github.com/achetronic/parakeet) ASR
- Plugin settings for Parakeet URL, API key, default language, and max recording duration
- German and English UI strings
- GitHub Actions CI (test, build, release artifacts)

[Unreleased]: https://github.com/elpatron68/mattermost-transcribe/compare/v0.2.0...HEAD
[0.1.0]: https://github.com/medisoftware/mattermost-transcribe/releases/tag/v0.1.0
[0.2.0]: https://github.com/elpatron68/mattermost-transcribe/releases/tag/v0.2.0
