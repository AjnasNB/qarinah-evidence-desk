# Bounded package-cache audit

Read-only audit, 22 October 2026, approximately 12:34 IST. No deletion, package cleanup, app/browser control or configuration change was performed. Only this report was written. Exact-root Qarinah ensure and focused summary recall were completed; no relevant prior disk checkpoint was returned.

Free space at the final observation: **C: 18,311,663,616 bytes (about 17.06 GiB); D: 5,541,740,544 bytes (about 5.16 GiB)**. These values can change while other work continues.

## Later Docker cleanup

After this package-cache audit, the user explicitly approved deleting Docker's containers, images, volumes and build cache. The operator removed 23 containers and 12 volumes; `docker system df` then reported zero images, containers, volumes and build cache, with 24.91 GB reclaimed internally. Windows free space did not increase correspondingly: Docker's virtual disk remains about 44.77 GiB. Automatic approval review rejected deletion of that virtual disk with the reason “blocked by policy”; no equivalent deletion was attempted. Source folders and the Ubuntu distribution were preserved.

The WSL configuration was backed up privately, then its memory limit changed from 4 GB to 8 GB, preserving four processors and 2 GB swap. This is a memory limit, not an amount of disk data to delete. A restart exposed Docker Desktop's recurring stale-socket startup fault; only verified zero-byte runtime endpoint directories were preserved by renaming before retrying. The package-cache findings below remain the pre-cleanup snapshot.

## Findings

Sizes are logical file bytes, not guaranteed physically reclaimable space. Dates below are oldest/newest file last-write timestamps in UTC; directory dates and last-write age do not prove last use. Enumeration skipped reparse points; none were encountered in these measured trees, and no read errors were reported.

| Absolute directory | Logical size | Oldest → newest file write, UTC | Assessment |
| --- | ---: | --- | --- |
| `C:\Users\20cs0\AppData\Local\NuGet\v3-cache` | 11,279 B; 2 files | 2026-08-10 09:08:48 → 2026-08-10 09:08:50 | Only entirely older-than-30-days candidate; negligible benefit. HTTP downloads are reconstructible subject to source availability. |
| `C:\Users\20cs0\AppData\Local\npm-cache\_cacache` | 253,108,540 B; 241.38 MiB | 2026-10-19 03:55:29 → 2026-10-22 06:38:50 | Hold: recent development cache, including today's writes. No files older than 30 days. |
| `C:\Users\20cs0\AppData\Local\pip\cache\http-v2` | 72,496,816 B; 69.14 MiB | 2026-10-19 04:02:08 → 2026-10-19 04:03:36 | Hold: recent HTTP download cache. Re-downloadable, but little space benefit. |
| `C:\Users\20cs0\AppData\Local\uv\cache` | 928,104,752 B; 885.11 MiB | 2026-10-12 13:42:09 → 2026-10-17 10:36:31 | Hold: recent cache with an `environments-v2` bucket. Do not manually delete its internal folders. |
| `D:\superteam tasks\settleproof\artifacts\private\relocated-npm-cache` | 890,303,317 B; 849.06 MiB | 2026-10-16 16:14:45 → 2026-10-17 15:03:02 | Optional second-tier candidate if confirmed retired. Layout is only `content-v2`, `index-v5`, `tmp`, consistent with relocated npm cache. Recent, so it does not satisfy the 30-day preference. |

`C:\Users\20cs0\AppData\Local\pip\cache\http` and `C:\Users\20cs0\AppData\Local\pip\cache\wheels` contained no files. Their old directory timestamps did not identify useful cleanup space. The pip HTTP cache above was recent despite its older parent-directory timestamp.

## Conservative cleanup order

1. No substantial old-cache deletion is justified by the measured age preference. The old NuGet HTTP cache is technically a candidate but saves only 11 KB. Preserve `.nuget\packages`, which projects can use directly. [NuGet cache distinctions](https://learn.microsoft.com/en-us/nuget/consume-packages/managing-the-global-packages-and-cache-folders)
2. If additional D: space is needed, confirm the relocated npm directory is a retired snapshot and no invocation/configuration points to it. No process-handle or complete configuration audit was performed. The cache-only layout is distinct from installed dependencies; deleting it would forfeit offline reuse and require future downloads. npm explicitly treats its content cache as disposable, not durable package storage. [npm cache contract](https://docs.npmjs.com/cli/v11/commands/npm-cache/)
3. Keep current npm/pip caches for this cleanup pass. Pip caches downloads/builds independently of installed environments; future cleanup would trade space for downloads/build time. [pip caching](https://pip.pypa.io/en/stable/topics/caching/)
4. Hold uv entirely. Its documented cleanup commands coordinate locks; manual internal deletion is unsupported. Even `uv cache prune` removes centralized project environments, which does not fit the request to leave active dependencies undisturbed. No cleanup command was run. [uv cache safety and cleanup](https://docs.astral.sh/uv/concepts/cache/#cache-safety)

Before any later deletion, recheck the exact resolved absolute target, reparse status and current activity. Do not expand a target to its parent.

## Deliberately excluded

Browser profiles, Codex/Qarinah memory and caches, credentials, source trees, recordings/media, `node_modules`, virtual environments and indiscriminate temporary-folder cleanup were excluded. Existing npm `_npx`, Yarn Cache and pnpm store were not enumerated because they may provide shared executable/dependency content. `D:\FlutterCache` and `D:\pub-cache` were seen only by top-level name and excluded as potentially active SDK/dependency stores. No recursive home or drive scan was performed.
