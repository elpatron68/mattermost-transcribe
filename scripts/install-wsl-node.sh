#!/usr/bin/env bash
set -euo pipefail

if ! grep -qiE 'microsoft|WSL' /proc/version 2>/dev/null; then
	echo "This script is intended for WSL." >&2
	exit 1
fi

wsl_clean_path() {
	local clean="" part
	IFS=':' read -r -a path_parts <<< "${PATH:-}"
	for part in "${path_parts[@]}"; do
		[[ "$part" == /mnt/* ]] && continue
		clean+="${part}:"
	done
	PATH="${clean%:}"
	export PATH
}

wsl_clean_path

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
	echo "Installing nvm..."
	curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
	wsl_clean_path
fi

# shellcheck source=/dev/null
. "$NVM_DIR/nvm.sh"

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"
nvm install
nvm use

echo "Node $(node -v), npm $(npm -v) ready in WSL."
