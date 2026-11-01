#!/usr/bin/env python3
"""Memastikan tautan internal pada dokumentasi Markdown tetap valid."""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
SKIP_DIRS = {".git", "node_modules", ".next", "out", "dist", "build", "coverage"}


def markdown_files() -> list[Path]:
    return [
        path
        for path in ROOT.rglob("*.md")
        if not any(part in SKIP_DIRS for part in path.relative_to(ROOT).parts)
    ]


def targets_in(path: Path):
    in_fence = False
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if line.lstrip().startswith(("```", "~~~")):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        for match in LINK_RE.finditer(line):
            target = match.group(1).strip().split(maxsplit=1)[0].strip("<>")
            yield line_number, target


def main() -> int:
    errors: list[str] = []
    for source in markdown_files():
        for line_number, target in targets_in(source):
            parsed = urlsplit(target)
            if parsed.scheme or target.startswith("//") or not parsed.path:
                continue
            relative = Path(unquote(parsed.path))
            resolved = (source.parent / relative).resolve()
            try:
                resolved.relative_to(ROOT)
            except ValueError:
                errors.append(f"{source.relative_to(ROOT)}:{line_number}: tautan keluar dari repository: {target}")
                continue
            if resolved.is_dir():
                exists = (resolved / "README.md").is_file() or (resolved / "index.md").is_file()
            else:
                exists = resolved.is_file()
            if not exists:
                errors.append(f"{source.relative_to(ROOT)}:{line_number}: target tidak ditemukan: {target}")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Pemeriksaan tautan dokumentasi lulus: {len(markdown_files())} file Markdown diperiksa.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
