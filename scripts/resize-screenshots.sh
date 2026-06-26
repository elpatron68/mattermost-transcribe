#!/usr/bin/env bash
# Resize Mattermost plugin screenshots for README / Marketplace (1280px wide).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="${ROOT}/docs/screenshots"

if ! command -v mogrify >/dev/null 2>&1; then
	echo "mogrify not found. Install ImageMagick 6, e.g.: sudo apt install imagemagick" >&2
	exit 1
fi

shopt -s nullglob
files=("${DIR}"/*.png)
if ((${#files[@]} == 0)); then
	echo "No PNG files in ${DIR}" >&2
	exit 1
fi

mogrify -resize 1280x -strip "${files[@]}"

for f in "${files[@]}"; do
	identify "$f"
done
