#!/usr/bin/env python3
"""Copy the public website into dist. Python standard library only."""

from pathlib import Path
import shutil


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
PUBLIC_FILES = ("index.html", "404.html", "robots.txt", "site.webmanifest", "favicon.svg", "CNAME")


def main():
    if not (ROOT / "index.html").is_file():
        raise SystemExit("Build failed: index.html is missing.")
    if DIST.is_symlink():
        raise SystemExit("Build failed: dist must not be a symbolic link.")
    assets = ROOT / "assets"
    if assets.exists() and any(path.is_symlink() for path in (assets, *assets.rglob("*"))):
        raise SystemExit("Build failed: public assets must not contain symbolic links.")
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    for name in PUBLIC_FILES:
        source = ROOT / name
        if source.is_file():
            shutil.copy2(source, DIST / name)
    if assets.is_dir():
        shutil.copytree(assets, DIST / "assets", ignore=shutil.ignore_patterns(".*", "__pycache__", "*.pyc"))
    (DIST / ".nojekyll").touch()
    files = [path for path in DIST.rglob("*") if path.is_file()]
    size = sum(path.stat().st_size for path in files)
    print(f"Built {len(files)} files ({size / 1024 / 1024:.2f} MiB) into {DIST}")


if __name__ == "__main__":
    main()
