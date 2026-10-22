"""Inspect and extract a vendor ZIP into a new private runtime directory."""
import hashlib
import json
import pathlib
import stat
import sys
import zipfile

if len(sys.argv) != 3:
    raise SystemExit("Usage: python scripts/extract-platform.py BUNDLE.zip NEW_PARENT")
bundle = pathlib.Path(sys.argv[1]).resolve(strict=True)
parent = pathlib.Path(sys.argv[2]).resolve()
target = parent / "zetaris-platform"
if target.exists():
    raise SystemExit("Runtime directory already exists; inspect it rather than overwriting.")
with zipfile.ZipFile(bundle) as archive:
    entries = archive.infolist()
    if len(entries) > 100 or sum(e.file_size for e in entries) > 128 * 1024 * 1024:
        raise SystemExit("Bundle exceeds inspection bounds.")
    for entry in entries:
        parts = pathlib.PurePosixPath(entry.filename)
        if parts.is_absolute() or not parts.parts or parts.parts[0] != "zetaris-platform":
            raise SystemExit("Unexpected archive root.")
        if ".." in parts.parts or "\\" in entry.filename or ":" in entry.filename:
            raise SystemExit("Unsafe archive path.")
        resolved = (parent / pathlib.Path(*parts.parts)).resolve()
        if not resolved.is_relative_to(target):
            raise SystemExit("Archive path escapes the private runtime.")
        if stat.S_ISLNK(entry.external_attr >> 16) or entry.file_size > 40 * 1024 * 1024:
            raise SystemExit("Unsupported archive entry.")
    parent.mkdir(parents=True, exist_ok=True)
    archive.extractall(parent)
print(json.dumps({"runtime": str(target), "entries": len(entries),
                  "sha256": hashlib.sha256(bundle.read_bytes()).hexdigest()}))
