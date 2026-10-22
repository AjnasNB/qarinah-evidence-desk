# R5: an actual repair journey

This edition preserves the original 96-second, 120 BPM score and the original Qarinah mark while showing the newer working product. The real local sequence imports the unchanged old `d0c2bce` packet, withholds readiness because its observations are stale, opens bounded next steps and original evidence, then imports a separate actual clean `968764a` capture. Its 46 tests and build were genuinely recorded before the film helpers changed. The supplied capture does not turn later editorial changes into tested production code.

The recording helper is `scripts/record-repair-workflow.mjs`. It uses an ephemeral headless Playwright context, allows only localhost, blocks source queries and generation, verifies actual retained command-log hashes, and never edits the source packet, reruns CI, invents API responses or visits authentication pages. It records response times and outcome assertions in an ignored manifest. The two invented failure/missing cases are explicit synthetic copies with real-CI detail removed.

The actual local recording succeeded once at `.local/video/repair-20261022T100024518Z/`, with 106.981 seconds of raw footage, no blocked requests and no page errors. Old observations remained stale, fresh evidence produced four citations and a complete repair plan, and synthetic cases produced HOLD/ABSTAIN with the appropriate guidance. No desktop automation was used.

The finished r5 also includes a separate actual Zetaris source-read excerpt from the passed 30.417-second recording `.local/video/live-20261022T101816860Z/`. It was adopted only after the passed source-verification receipt matched the exact fresh packet and source identities. Main repair scenes remain explicit local imports; the separate source check is identified on screen and in speech. Actual Cursor development evidence remains pending. See `QA.md` for final measurements and review limits.

## Fixed edit

| Time | Real picture and explanation |
|---|---|
| 0–6s | Establish the evidence desk |
| 6–18s | Original old packet and withheld readiness |
| 18–30s | Bounded next steps, preserved times and source links |
| 30–44s | Separate actual fresh capture and qualified four-citation review |
| 44–58s | Exact citation text/time/hash, then actual reference-memory audit |
| 58–66s | Separate actual verified Zetaris source read; the local fallback retains a complete context inspector |
| 66–78s | Explicit synthetic failed-tests HOLD and source-fix guidance |
| 78–90s | Explicit synthetic missing-build abstention and capture guidance |
| 90–96s | Honest remaining limits |

Real footage stays chronological within each excerpt. The forest rails, chapter cues, diagram, moving packet markers and typography are editorial. They do not impersonate app UI, cursor actions, network timing or CI activity. Outcome graphics wait until after the measured application response plus a visible-render margin. Four-second reframes and gradual 2.5% pushes keep the app legible. The opening and complete inspector stay wide enough to retain their headings and numeric columns.

## Reproduce locally

Existing requirements: Node.js, Playwright/Chromium, Showtime's installed Kokoro model and FFmpeg/FFprobe. No helper installs dependencies or downloads assets/models. Set `PLAYWRIGHT_MODULE` only to an existing package if standard `require('playwright')` cannot resolve; it is not tied to another private project. `FFMPEG` and `FFPROBE` may specify executable paths.

From the repository root, provide actual original packets with a matching `capture.json`, `tests.log` and `build.log` beside the fresh packet. The product source must match the tested fresh revision. At least ten minutes must remain in its one-hour freshness window:

```powershell
node scripts/record-repair-workflow.mjs --old=.local/handoff/<old>/packet.json --fresh=.local/handoff/<fresh>/packet.json --check
node scripts/record-repair-workflow.mjs --old=.local/handoff/<old>/packet.json --fresh=.local/handoff/<fresh>/packet.json
node scripts/video-r5/plan.mjs --recording=.local/video/repair-<timestamp>
showtime voice script scripts/video-r5/narration.json -o .local/video/r5-repair/voice
node scripts/video-r5/edit.mjs --look
```

Only after reviewing the actual source/first looks and final claim text:

```powershell
node scripts/video-r5/edit.mjs --render
node scripts/video-r5/mix.mjs
node scripts/video-r5/verify.mjs
showtime qa .local/video/r5-repair/qarinah-evidence-r5.mp4 --lufs -14 --captions .local/video/r5-repair/qarinah-evidence-r5.srt --no-sheet -o .local/video/r5-repair/showtime-qa
```

`--look=5` renders only the inspector/source chapter's first look. Render caching fingerprints source hashes, crops, captions and motion; it does not silently reuse a changed scene. All prior films are preserved. The final file, exact speech transcript/SRT, logs, source hashes and review pack stay ignored under `.local/video/r5-repair/`. No helper stages, commits, publishes or submits anything.

The mixer generates readable exact-word sidecar captions using `captions.mjs`. It groups the model word timings with at least 0.7s per cue, at most two 32-character lines and at most 20 characters/s, and checks the written SRT against the complete spoken script. This fixes short single-word fragments without changing the audio or burning another caption layer into the picture. `review.mjs` extracts actual final frames and a waveform; it does not recreate the app.

## Optional verified source clip

`adopt-live.mjs` is read-only toward all providers. It accepts only an actual passed `record-live-integration.mjs` manifest and an actual passed source-verification receipt. It rereads the exact fresh packet under `.local/handoff`, checks its original file-byte hash against the recording/EDL, computes the `JSON.stringify` canonical-byte hash used by the CSV verifier, and compares revision, observation count and all four production-derived source IDs to the receipt. It requires confirmed cleanup and rejects uncertainty. It replaces the reserved eight-second chapter, labels it a separate live source read, changes the voice cue and narrows the ending to the still-pending Cursor evidence. It never upgrades a local import into a live query claim. Source-ID validation uses the project's existing `tsx` loader; it does not initialize or call the app.

```powershell
node --import tsx scripts/video-r5/adopt-live.mjs --recording=.local/video/live-<timestamp> --verification=.local/zetaris-verification/<run>/receipt.json
showtime voice script scripts/video-r5/narration.json -o .local/video/r5-repair/voice
node scripts/video-r5/edit.mjs --look=5
```

Do not rerun `plan.mjs` after adopting the verified clip: it intentionally rebuilds the local fallback. The pre-adoption EDL and script are preserved separately. New provider footage requires visual review before encoding. Transport does not independently authenticate the caller-declared CI or authorize deployment.

## Sound, sources and limits

Local Kokoro `af_heart` at normal speed supplies a generic synthetic explanation, with model-derived exact word timing and an SRT matching the spoken script. The original locally composed r3 instrumental remains continuous, with smooth 10dB speech ducking below its −3dB baseline. The mixed output targets −14 LUFS and −1.5 dBTP before AAC; measured encoded values belong in `QA.md` after rendering. Existing local Whisper `small.en` may audit intelligibility; no extra recognition model is installed and no human listening is implied.

The authentic unmodified mark, native rasterization provenance, IBM Plex OFL fonts, original texture and original score are reused from r3's frozen asset ledger. See `docs/video/r3/ASSETS.md` and the copied ignored `assets.json`/`logo-provenance.json`. Kokoro weights are [Apache-2.0](https://huggingface.co/hexgrad/Kokoro-82M), with the MIT [kokoro-onnx runtime](https://github.com/thewh1teagle/kokoro-onnx); dependencies and model weights are not vendored. There is no external music sample, paid synthesis or cloned identity.

Byte measurements include overhead and remain distinct from actual provider tokens. Hash retrieval is disclosed as deterministic reference behavior. The film makes no authenticated-CI, release authorization, token-savings, eligibility or submission claim. Sponsor claims must follow the actual adopted receipt, never a setup/configuration badge. Final independent review and objective QA are recorded separately after the encode.
