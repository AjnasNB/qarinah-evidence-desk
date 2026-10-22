# r3 — Evidence before output

A 96-second, 120 BPM edit of the actual browser recording. It retains the real handoff, four citations, source inspection, H-MEM audit, byte panel, explicitly synthetic failure/missing cases and honest runtime limits. Reading holds are shortened on whole musical beats; chronology is preserved. The earlier raw recording and 108-second draft are untouched.

The product picture is only cropped/scaled recorded footage. Camera changes occur every four seconds (two musical bars), with an eased 2.5% push within each shot. Wide/source-detail framings alternate without changing recorded chronology. The forest rails, source → H-MEM → cited-review diagram, large audit sidebar, HOLD/ABSTAIN cues, chapter progress rules and typography are editorial motion graphics. They are separate from the app and labeled accordingly. Readiness/outcome cues wait until the recorded result appears. No application UI or cursor is fabricated. Transition accents and packet movement are editorial signals, not recordings of network timing or application-generated sounds.

## Reproduce this specific edit

Requirements: Node 22.12+, Python with NumPy/Pillow, FFmpeg/FFprobe with libx264, AAC and libass, plus Playwright/Chromium for the one-time original-logo rasterization. Start the local product on port 5183 for that logo export only. No existing browser profile is used. No cloud service, paid GPU, API credential or runtime install is needed. Tested local versions and final validation appear in QA. SciPy is not required.

```text
python scripts/video-r3/compose.py .local/video/r3-20261022/revision-2/assets
node scripts/video-r3/logo.mjs
node scripts/video-r3/edit.mjs --look
node scripts/video-r3/edit.mjs
```

The original local capture `.local/video/20261022T073821010Z/raw.webm` and its verified `manifest.json` are required; they are ignored private artifacts, not files supplied by a fresh Git clone. This film shows the actual earlier d0c2bce handoff, not any later source changes or provider setup. The logo helper resolves `playwright` normally; set an explicit `PLAYWRIGHT_MODULE` environment variable to an existing installed module when needed. It reads only the original localhost SVG in a fresh headless context and records its unchanged-source hash and rasterization method.

The editor downloads about 406 KB of unmodified IBM Plex font/license assets directly from a pinned primary repository revision on the first run, then verifies their saved hashes. Prior r3 asset reuse is optional and guarded; a fresh prepared asset folder can fetch fonts without a prior ledger. Generated output stays under ignored `.local/video/r3-20261022/revision-2/`, preserving the earlier r3 and original capture/draft. To regenerate picture clips after editing source settings, use `node scripts/video-r3/edit.mjs --fresh`; otherwise completed picture clips are reused. Do not treat a file left by a failed render as a verified final: require `qa.json` and the review verdict.

The score is synthesized locally from oscillators and deterministic noise. Its own composition grid drives the cuts. It is original generated instrumental music, not a found/downloaded track, licensed library recording or imitation of an artist. No narration was generated. The optional read-aloud copy in the earlier video folder remains a draft for the user; its old timings need adjustment before voice is added here.

## Outputs

`qarinah-evidence-r3.mp4`, `edl.json`, per-chapter ASS/picture clips, original and mastered WAV stems, the composed beat grid, source-asset hashes, full-frame/audio QA and a reviewer pack live in the ignored output folder. Primary resources, provenance and credits are in [ASSETS.md](ASSETS.md); the upstream OFL is shipped beside this file.

The edit masters the reading-oriented instrumental bed to −18 LUFS with a −1.5 dBTP pre-encode target. Final AAC is measured separately; the report gives measured loudness and true peak. The absence of a voice means voice-to-music balance is not applicable. Metering is not a claim that a human listened.

No sponsor query is shown. Zetaris live-query and actual Cursor development evidence remain pending as recorded. Configuration, downloads, account support and this film do not prove sponsor execution or competition eligibility. No release authorization, publication or submission is implied.
