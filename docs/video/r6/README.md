# R6: founder-reported Cursor disclosure

This is a narrow update to the reviewed 96-second r5 film. Only the 90–96s editorial ending and its narration change. The closing line says: “Cursor validation is founder-reported. These are local source observations.” The visible text explains that the founder reports a validation task passed inside Cursor, original source dates remain, and there is no new Cursor recording. This is a founder-attested development disclosure, not independently recorded Cursor activity or a Cursor AI session.

The first 90s picture retains the actual old-to-fresh repair workflow, exact source/citation audit, separate verified Zetaris read, and clearly labeled synthetic failure/missing cases. The final background remains explicitly labeled as an earlier synthetic replay. Its clean `968764a` packet was a 46-test capture; this edit does not turn it into a later 51-test capture or refresh its timestamps.

The original 120 BPM score and first eleven local Kokoro `af_heart` voice cues are reused. The new final cue starts at 90.4s at speed 1.0, with speech ending at 94.958s. The final audio is remastered with the same smooth music ducking; earlier audio is not asserted to be bit-identical. No hosted voice service, identity cloning, account, new model download or installation is used.

## Reproduce

Requirements are the existing Node.js, FFmpeg/FFprobe and installed Showtime/Kokoro setup used by r5. Provide the original ignored r5 recording/render pack and its original r3 assets; these helpers deliberately refuse a changed r5 movie or renderer. The four reviewed renderer/mixer/caption/QA sources are pinned by SHA-256, copied into the ignored r6 runtime and narrowly redirected to r6. The first eight cached picture clips are copied, not hardlinked. No original source is overwritten.

Run from the repository root, using the installed `showtime` command:

```powershell
node scripts/video-r6/prepare.mjs
showtime voice script scripts/video-r6/narration.json -o .local/video/r6-entry/voice
node .local/video/r6-entry/runtime/edit.mjs --look=8
```

Inspect the actual ending before encoding:

```powershell
node .local/video/r6-entry/runtime/edit.mjs --render
node .local/video/r6-entry/runtime/mix.mjs
node .local/video/r6-entry/runtime/verify.mjs
node scripts/video-r6/verify-update.mjs
showtime qa .local/video/r6-entry/qarinah-evidence-r6.mp4 --lufs -14 --captions .local/video/r6-entry/qarinah-evidence-r6.srt --no-sheet -o .local/video/r6-entry/showtime-qa
showtime transcribe .local/video/r6-entry/qarinah-evidence-r6.mp4 --model small.en --language en --no-stem --separate off --no-vad --no-events --no-gap-scan --threads 4 --from 90 --to 96 -o .local/video/r6-entry/outro-readback.json
node scripts/video-r6/audit-readback.mjs
```

Whisper is an optional already-installed bounded audit, not a reason to download another model. Raw recognition is preserved. It split “founder-reported” into “found or reported”; the audit documents that phonetic spacing and does not claim verbatim recognition or human listening.

The output, sidecar SRT, exact transcript, decoded-prefix comparison, source pins and review frames stay ignored under `.local/video/r6-entry/`. Authentic Qarinah mark, IBM Plex OFL fonts, original texture/music and local generic voice attribution remain as recorded in `docs/video/r3/ASSETS.md` and `docs/video/r5/README.md`. No new third-party asset is introduced. The helpers do not stage, commit, publish, upload or submit anything.
