# R6 validation — 22 October 2026

Final file: `.local/video/r6-entry/qarinah-evidence-r6.mp4`

SHA-256: `c0bb774c0fe42d50e774a0d12962005d7d5d01b496bcb65be14e2949b7f0dcc8`
Size: **29,768,735 bytes**. Duration: **96.000s**.

The change is confined to the final 90–96s editorial disclosure and its speech. It reports the founder's Cursor validation task, with no new Cursor recording or independently observed Cursor AI session implied. The earlier synthetic background retains its explicit label. The actual product/source footage keeps the original clean `968764a` 46-test packet identity and timestamps. This film does not claim a later 51-test capture, authenticated CI, deployment permission or a competition submission.

## Preservation and technical checks

`update-source.json`, `update-qa.json`, `qa.json`, `caption-qa.json`, `readback-audit.json` and `showtime-qa/qa.json` are retained beside the ignored final file.

| Check | Actual result |
|---|---|
| Original r5 retained | SHA-256 `9183bb9f53f83b1d31923e1118bbfb3d31488c6fd20485e03c1261cb50f5331a`, unchanged |
| Decoded first 90s picture | Both editions: `9343142a27f62bffc949277385ed86deaaceb0e0fdc1db98a94584f929ae8f43` |
| Eight original picture clips | File hashes and cache tags match r5 |
| First eleven voice cues | Source WAV hashes, text, start times and model word timings match r5 |
| Original score master | SHA-256 `6738df925dd33928a650f4a097b4ea96b988012a48e804c82394f021116a8933` |
| Encoded video | H.264 High, 1920×1080, 30fps, yuv420p, faststart, BT.709 primaries/transfer/matrix |
| Full frame/audio decode | 2,880 frames, zero reported errors |
| Rendered vs muxed picture | Decoded hashes match: `d967fd8c6fd1e1c1d1e14110e068b02a1b2d6442a9f82bbac858b313fdf463dd` |
| Encoded audio | AAC stereo, 48kHz; **−14.03 LUFS**, **−1.41 dBTP**, LRA 2.9 LU |
| New closing speech | 90.400–94.958s spoken words; source file tail ends 95.378s, before 96s cut |
| Exact speech captions | 166 words, 27 cues, minimum 1.278s, at most two 32-character lines, maximum 19.562 characters/s |
| Automated product ROI | All 2,880 frames; longest dark transition two frames, allowed six |
| Showtime finished-file QA | PASS, **0 FAIL / 0 WARN / 1 INFO**; phone type/UI-zone review remains partial |

The original score and eleven speech cues remain unchanged sources. The new complete audio programme was remastered for the revised closing line; the first 90s encoded audio is not asserted to be bit-identical. Music uses the existing −3dB baseline plus 10dB speech ducking, with 200ms attack and 300ms recovery.

## Readback, visual and privacy limits

Existing local Whisper `small.en` checked only the changed 90–96s encoded outro. Raw output says “Cursor validation is found or reported. These are local source observations.” The documented phonetic word split `found or reported → founder-reported` is the only normalization required. Raw ASR is preserved. This is a bounded recognition audit, not verbatim ASR spelling, pronunciation approval or subjective human listening. The unchanged earlier source voice clips are checked against the previously reviewed r5 files rather than re-recognized.

Actual encoded frames at 90.5s, 93s and 95.3s were inspected for legibility, source qualification and privacy. The headline identifies the report's basis, the footer says no new Cursor recording, and the provenance label identifies the older synthetic background. No account/authentication window, credentials, private account URL, new personal capture or fabricated Cursor interface was added. The original product mark and actual UI remain intact. All-frame checks above are automated; no manual review of every frame or physical-phone test is claimed.

Independent final review: **APPROVED as a qualified dated product demo**, with no material changed-ending blocker and no further encode requested. The reviewer checked the actual 90.5/93/95.3s frames, immutable final hash, stable QA and original eight clip hashes. Its findings are retained at `.local/submission/review-2026-10-22/FINAL-ASSET-REVIEW.md`. A peripheral background crop at 95.3s was judged cosmetic; the founder-report and synthetic-background qualifications remain clear.

The film, exact transcript/SRT, source pins and review pack are local ignored artifacts. Reproducible helpers and documentation are separate reviewable sources. There was no new dependency/model download, paid service, hosted inference, upload, publication or submission.
