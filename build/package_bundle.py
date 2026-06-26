#!/usr/bin/env python3
"""Create a plugin tar.gz with executable bits on Linux server binaries."""

from __future__ import annotations

import sys
import tarfile
from pathlib import Path

LINUX_PLUGIN_BINARIES = frozenset({
    "plugin-linux-amd64",
    "plugin-linux-arm64",
})


def package_bundle(plugin_dir: Path, output_path: Path) -> None:
    if not plugin_dir.is_dir():
        raise SystemExit(f"plugin directory not found: {plugin_dir}")

    plugin_id = plugin_dir.name
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with tarfile.open(output_path, "w:gz") as tar:
        for path in sorted(plugin_dir.rglob("*")):
            if not path.is_file():
                continue

            relative = path.relative_to(plugin_dir).as_posix()
            arcname = f"{plugin_id}/{relative}"
            tarinfo = tar.gettarinfo(path, arcname=arcname)

            if path.name in LINUX_PLUGIN_BINARIES:
                tarinfo.mode = 0o755

            with path.open("rb") as source:
                tar.addfile(tarinfo, source)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(f"usage: {sys.argv[0]} <plugin-dir> <output.tar.gz>")

    package_bundle(Path(sys.argv[1]), Path(sys.argv[2]))


if __name__ == "__main__":
    main()
