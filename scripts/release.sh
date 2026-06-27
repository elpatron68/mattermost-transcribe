#!/usr/bin/env bash
# Prepare and publish a versioned GitHub release (triggers CI on tag push).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION=""
ASSUME_YES=false
DRY_RUN=false
NO_PUSH=false
UNSIGNED_TAG=false
PROTECTED_BRANCH="${RELEASE_BRANCH:-master}"

usage() {
	cat <<'EOF'
Usage: scripts/release.sh -v <version> [options]

Prepare a release: bump plugin.json, refresh generated manifests, update
CHANGELOG.md, commit, create tag v<version>, and push to origin.

Options:
  -v, --version <x.y.z>   Release version (required, semver)
  -y, --yes               Skip confirmation prompt
      --dry-run           Show planned actions without changing files
      --no-push           Commit and tag locally only
      --unsigned          Create an unsigned tag (default: signed with -s)
  -h, --help              Show this help

Examples:
  scripts/release.sh -v 0.2.0
  scripts/release.sh -v 0.2.0 --dry-run
  scripts/release.sh -v 1.0.0 -y

After push, GitHub Actions (Build workflow) runs tests, builds the plugin
bundle, and attaches it to the GitHub Release for tag v<version>.
EOF
}

log() {
	printf '%s\n' "$*"
}

die() {
	printf 'release.sh: %s\n' "$*" >&2
	exit 1
}

require_cmd() {
	command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

github_repo_url() {
	local url owner repo
	url="$(git remote get-url origin 2>/dev/null || true)"
	if [[ "$url" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
		owner="${BASH_REMATCH[1]}"
		repo="${BASH_REMATCH[2]}"
		printf 'https://github.com/%s/%s' "$owner" "$repo"
		return 0
	fi
	die "could not determine GitHub repository URL from origin remote"
}

validate_version() {
	local version="$1"
	[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-rc[0-9]+)?$ ]] \
		|| die "invalid version '$version' (expected semver, e.g. 0.2.0)"
}

parse_args() {
	if [[ $# -eq 0 ]]; then
		usage
		exit 0
	fi

	while [[ $# -gt 0 ]]; do
		case "$1" in
			-v|--version)
				[[ $# -ge 2 ]] || die "missing value for $1"
				VERSION="$2"
				shift 2
				;;
			-y|--yes)
				ASSUME_YES=true
				shift
				;;
			--dry-run)
				DRY_RUN=true
				shift
				;;
			--no-push)
				NO_PUSH=true
				shift
				;;
			--unsigned)
				UNSIGNED_TAG=true
				shift
				;;
			-h|--help)
				usage
				exit 0
				;;
			*)
				die "unknown argument: $1"
				;;
		esac
	done

	[[ -n "$VERSION" ]] || die "version is required (-v <x.y.z>)"
	validate_version "$VERSION"
}

assert_preconditions() {
	local branch tag

	require_cmd git
	require_cmd jq
	require_cmd python3

	git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
		|| die "not inside a git repository"

	branch="$(git rev-parse --abbrev-ref HEAD)"
	[[ "$branch" == "$PROTECTED_BRANCH" ]] \
		|| die "releases must be cut from branch '$PROTECTED_BRANCH' (current: $branch)"

	if [[ "$DRY_RUN" == false && -n "$(git status --porcelain)" ]]; then
		die "working tree is not clean; commit or stash changes first"
	fi

	tag="v${VERSION}"
	if [[ "$DRY_RUN" == false ]] && git rev-parse "$tag" >/dev/null 2>&1; then
		die "tag $tag already exists"
	fi

	git fetch origin "$PROTECTED_BRANCH" >/dev/null 2>&1 || true
	if ! git merge-base --is-ancestor "origin/${PROTECTED_BRANCH}" HEAD 2>/dev/null; then
		die "local branch is missing commits from origin/${PROTECTED_BRANCH}; pull before releasing"
	fi
}

update_plugin_json() {
	local repo_url notes_url tmp
	repo_url="$(github_repo_url)"
	notes_url="${repo_url}/releases/tag/v${VERSION}"
	tmp="$(mktemp)"

	jq --arg version "$VERSION" --arg notes_url "$notes_url" \
		'.version = $version | .release_notes_url = $notes_url' \
		plugin.json >"$tmp"
	mv "$tmp" plugin.json
}

update_changelog() {
	local repo_url
	repo_url="$(github_repo_url)"
	python3 - "$VERSION" "$repo_url" CHANGELOG.md <<'PY'
import re
import sys
from datetime import date
from pathlib import Path

version, repo_url, path = sys.argv[1:4]
content = Path(path).read_text(encoding="utf-8")
today = date.today().isoformat()
tag = f"v{version}"

header_re = re.compile(r"^## \[(?P<name>[^\]]+)\](?: - (?P<date>[^\n]+))?\n", re.MULTILINE)
matches = list(header_re.finditer(content))
if not matches or matches[0].group("name") != "Unreleased":
    raise SystemExit("CHANGELOG.md must start with ## [Unreleased]")

unreleased_start = matches[0].end()
unreleased_end = matches[1].start() if len(matches) > 1 else len(content)
unreleased_body = content[unreleased_start:unreleased_end].strip()

new_section = f"## [{version}] - {today}\n\n"
if unreleased_body:
    new_section += unreleased_body + "\n\n"

rest = content[unreleased_end:] if len(matches) > 1 else ""
updated = content[: matches[0].end()] + "\n" + new_section + rest.lstrip("\n")

compare_url = f"{repo_url}/compare/{tag}...HEAD"
release_url = f"{repo_url}/releases/tag/{tag}"

if re.search(r"^\[Unreleased\]:", updated, re.MULTILINE):
    updated = re.sub(
        r"^\[Unreleased\]:.*$",
        f"[Unreleased]: {compare_url}",
        updated,
        count=1,
        flags=re.MULTILINE,
    )
else:
    updated = updated.rstrip() + f"\n\n[Unreleased]: {compare_url}\n"

entry = f"[{version}]: {release_url}"
if re.search(rf"^\[{re.escape(version)}\]:", updated, re.MULTILINE):
    updated = re.sub(
        rf"^\[{re.escape(version)}\]:.*$",
        entry,
        updated,
        count=1,
        flags=re.MULTILINE,
    )
else:
    updated = updated.rstrip() + f"\n{entry}\n"

Path(path).write_text(updated, encoding="utf-8")
PY
}

run_apply() {
	make apply
}

commit_release() {
	local message tag sign_args=()

	message="Release v${VERSION}."
	tag="v${VERSION}"

	if [[ "$UNSIGNED_TAG" == false ]]; then
		sign_args=(-s)
	fi

	git add plugin.json CHANGELOG.md server/manifest.go webapp/src/manifest.ts
	git commit -m "$message"
	git tag "${sign_args[@]}" -a "$tag" -m "$message"

	if [[ "$NO_PUSH" == true ]]; then
		log "Created commit and tag $tag locally (--no-push)."
		return 0
	fi

	git push origin "$PROTECTED_BRANCH"
	git push origin "$tag"
	log "Pushed $PROTECTED_BRANCH and $tag. GitHub Actions will publish the release."
}

main() {
	parse_args "$@"
	assert_preconditions

	current="$(jq -r .version plugin.json)"
	if [[ "$current" == "$VERSION" ]]; then
		die "plugin.json already has version $VERSION"
	fi

	log "Release v${VERSION} (current plugin.json version: ${current})"
	if [[ "$ASSUME_YES" == false && "$DRY_RUN" == false ]]; then
		printf 'Proceed with release preparation and push? [y/N] '
		read -r reply
		[[ "$reply" == "y" || "$reply" == "Y" ]] || die "aborted"
	fi

	if [[ "$DRY_RUN" == true ]]; then
		log "[dry-run] would set plugin.json version to $VERSION"
		log "[dry-run] would move CHANGELOG [Unreleased] entries to [$VERSION]"
		log "[dry-run] would run: make apply"
		log "[dry-run] would git add plugin.json CHANGELOG.md server/manifest.go webapp/src/manifest.ts"
		log "[dry-run] would git commit -m \"Release v${VERSION}.\""
		if [[ "$UNSIGNED_TAG" == true ]]; then
			log "[dry-run] would git tag -a v${VERSION} -m \"Release v${VERSION}.\""
		else
			log "[dry-run] would git tag -s -a v${VERSION} -m \"Release v${VERSION}.\""
		fi
		if [[ "$NO_PUSH" == false ]]; then
			log "[dry-run] would git push origin $PROTECTED_BRANCH"
			log "[dry-run] would git push origin v${VERSION}"
		fi
		return 0
	fi

	update_plugin_json
	update_changelog
	run_apply
	commit_release
}

main "$@"
