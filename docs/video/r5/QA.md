# R5 film verification — 22 October 2026

Final: `.local/video/r5-repair/qarinah-evidence-r5.mp4`, **96.000 seconds**, 29,761,979 bytes.

SHA-256: `9183bb9f53f83b1d31923e1118bbfb3d31488c6fd20485e03c1261cb50f5331a`.

## Source and claim integrity

The main repair journey is actual localhost product footage from `repair-20261022T100024518Z`, a passed 106.981-second recording. It imports the original unchanged `d0c2bce` packet; those observations really are stale. The actual result abstains with zero citations and gives bounded stale-evidence next steps. It then imports the separate clean `968764add439b8ea7e7b75f9989a91dd607ec0d3` packet, whose 46 tests/build and retained log hashes were genuinely captured. The qualified ready review has four citations and a complete plan. It is caller-declared local evidence, not authenticated CI or permission to deploy.

The separate **58–66s** clip is actual Zetaris source-read footage from passed recording `live-20261022T101816860Z`, 30.417 seconds, with no page errors or blocked requests. It is supported by passed source verification `.local/zetaris-verification/20261022T101806658Z-328155a0/receipt.json`: source identity matched, the qualified fresh review had four citations, model attempts were zero, and source cleanup was confirmed. The clip's UI visibly marks the fixed current-release query verified. It is explicitly a separate recorded source check, rather than a claim that the preceding local import was a live query.

Adoption checked the exact original file hash `5a09d9e2ca927e8b137d127c021b5c7df46c41fa9d89ce4f3a9db363f2877b9b` against the EDL/live manifest. It separately checked the canonical decoded-JSON hash `3764abcc347dc10937f95cbb8dbdaffd27a7ae1fc1ed1cfd37b7efca726d442e` against the CSV/source receipt. Both resolve to the same packet, clean revision and four production-derived evidence IDs. The receipt's source/verification hashes are preserved in `edl.json`. No credentials, authentication pages or private raw provider errors enter the film.

The failure/missing examples are explicitly synthetic copies with real-CI claims removed. They show actual product HOLD/ABSTAIN and repair guidance. The ending retains the earlier synthetic background with an explicit label and says actual Cursor evidence is pending. It does not claim a competition submission, sponsor eligibility, authenticated CI, release safety or provider-token savings.

## Picture, motion and all-frame checks

The finished file is H.264/yuv420p, 1920×1080 at 30fps, faststart, with BT.709 primaries/transfer/matrix and 2,880 decoded frames. Full final frame/audio decoding reports **zero errors**. The complete final decoded picture equals the rendered picture stream: SHA-256 `4bee4ddd5155820d40c85ae372a915c79bfb4c0082fb099136730c28ed57fb78`. Narration mixing did not change a pixel.

An automated central-product ROI check covered all 2,880 frames. Its longest low-luma run was two frames, within the short intended transition allowance of six. Showtime found no black stretch and no frozen stretch beyond 2.5 seconds; its longest still estimate is 1.6s. Nine bar-aligned scenes use actual chronological excerpts, four-second reframes, gradual 2.5% pushes, original texture, the original mark, animated editorial diagrams and clear provenance labels. No CSS slide, generated app image, synthetic cursor or fabricated application response replaces the footage.

First-look review caught a clipped inspector numeric column and an opening-heading crop; both were corrected before the single picture encode. Representative actual encoded frames were extracted at 29 timestamps, including before/after result gates, live-source completion, synthetic outcomes and ending. Main ready qualification, actual source verification and synthetic abstention were also visually inspected after encoding. This is not a claim that a person watched every frame or tested a phone.

## Narration, music and speech captions

Installed local Kokoro `af_heart` reads **165 words at normal speed 1.0** across 12 pinned cues. The final spoken word ends at **93.977s**, with 2.023s before film end. Every word fits its intended window; the tightest spoken-word clearance before the next topic is 0.473s. The original locally composed beat remains continuous, with smooth speech ducking. No account, paid synthesis, cloning, installation or model download was used.

The actual encoded AAC stereo/48kHz mix measures **−14.08 LUFS integrated / −1.46 dBTP true peak**, LRA 3.7 LU. Showtime independently measures approximately −14.0 LUFS/−1.46 dBTP and reports no clipping, silent gap or abrupt ending. These are programme measurements; they are not a subjective music/naturalness judgment, an isolated-stem loudness ratio or physical-phone listening proof.

The final SRT matches the spoken script and model-derived word boundaries: **26 cues**, shortest **1.278s**, maximum **32 characters per line**, maximum **19.56 characters/s**. An initial generated 0.07s single-word “The” cue was regrouped into readable captions. Only the sidecar changed; the MP4/audio hash stayed the same. The original raw generated SRT remains in `voice/`. Captions are separate from the in-picture editorial summaries and are not burned on top of them.

## ASR and remaining review limits

Existing local Whisper `small.en` audited both dry voice and encoded mix. The complete mixed transcript matches after explicit phonetic spelling aliases (`Carina`/`Karina` → `Qarinah`, `Zetara` → `Zetaris`) and hyphen spacing. Full dry recognition also inserted a repeated “tests” around the live cue's boundary; an independent 58–66s no-VAD dry recognition recovered the exact cue, including “Zetaris.” The bounded same-audio check replaces only that window for comparison, preserving all original ASR outputs. Separate intro and mixed live-cue transcripts are retained as diagnostics. `readback-audit.json` declares the transformations; exact ASR spelling, ideal pronunciation and human listening approval are not claimed.

Final Showtime QA is **PASS: zero failures, zero warnings, one information note**. The note is the partial automatic phone typography/UI-zone check for an external FFmpeg edit. The earlier warning about the short caption was repaired without rerendering the picture. Objective receipts are `qa.json`, `caption-qa.json`, `readback-audit.json`, `showtime-qa-final/qa.json`, `receipt.json`, `picture-receipt.json`, source manifests, logs and the 29-frame review pack under ignored `.local/video/r5-repair/`.

Independent agent review cleared the final hash as a qualified dated product demonstration in `.local/video/r5-repair/review/FINDINGS.md`, with no material blocker and no further encode requested. It inspected representative final frames, all five live-source keyframes, source-identity receipts, truth gates, timing, waveform and objective QA. Main imports and the separate live query remain distinct; full qualifications and synthetic/ending labels survive. Peripheral UI cropping is a cosmetic trade-off. The review preserves the ASR, pronunciation, human-listening and phone-test limits. The recorded 46-test capture is distinct from later 51-test validation.

Reproduction sources are under `scripts/video-r5/` with this documentation. Generated media, private source receipts and runtime caches remain ignored under `.local/`; previous films remain intact. Submission readiness and publication permission are not inferred from this verdict.
