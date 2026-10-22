# r3 final QA

Final local file: `.local/video/r3-20261022/revision-2/qarinah-evidence-r3.mp4`.

| Evidence | Observed result |
| --- | --- |
| Duration / picture | Exactly 96.000 seconds; H.264/yuv420p, 1920×1080, 30 fps, 2,880 frames |
| Audio | Original local 120 BPM instrumental; stereo AAC, 48 kHz; no narration |
| Final file | 32,756,111 bytes; SHA-256 `e44724db42a06d3a3f5f0df07cafb41ad0a425c52dc75d361e028e2b642b2ef1` |
| Color / delivery | Limited-range BT.709 primaries, transfer and matrix verified after final metadata mux; fast-start MP4 |
| Complete decode | All frames decoded without errors; no full-frame black interval ≥0.25 seconds |
| Product coverage | All 2,880 frames checked in the central product ROI; longest low-luma run two frames, inside deliberate 0.14-second transition allowance |
| FFmpeg final audio measurement | −18.09 LUFS integrated, −1.36 dBTP, 2.40 LU range |
| Showtime independent meter | Approximately −18.01 LUFS, −1.36 dBTP; no clipping samples/runs, silent gaps, level jumps or abrupt ending |
| Showtime final verdict | **PASS — 0 FAIL, 0 WARN, 1 informational note**; no frozen stretch >2.5 seconds; longest still approximately 1.4 seconds |
| Informational note | Automated phone type/zone check is partial because this is an external FFmpeg edit without a Showtime project-check layout report. Desktop/full-screen main text and captions are reviewed separately; no mobile-readability guarantee is made. |
| Original picture | Actual localhost recording; raw WebM SHA-256 `27a95ab6bcf2491aade57fef9fa14ce9dd2680297129108236bd17fc79f0d016` |
| Original local packet | Unmodified packet SHA-256 `f05fe05042de026dc2885821a5bbabba08f247e71d351138058612e0a908735b`; recorded at clean d0c2bce, not later changes |

The full machine reports are `qa.json`, `showtime-qa-final/qa.json`, `original-asset-hashes.json` and `assets/logo-provenance.json` beside the MP4. Scene-local ASS and an edited-timeline SRT provide editable text; the SRT describes on-screen editorial cues, not a transcript of speech. `edl.json`, source helpers, original/mastered WAV stems and the composed beat grid support reproduction. Earlier raw, 108-second draft, initial r3 and pre-tag replacement remain preserved.

The first r3 quality pass identified eight overlong reading holds and missing color tags. Independent review also caught premature READY/citation cues and loss of the synthetic label on the retained ending background. Those findings led to four-second camera changes plus eased footage movement, delayed outcome cues, a persistent ending replay tag, clean initial framing, the unchanged official mark and verified BT.709 signaling. Two r3 picture versions were rendered; the final color correction was a metadata-only mux using cached picture clips, not another picture encode.

Representative first looks, motion states, result/citation/audit frames and the synthetic ending were visually inspected. The separate independent critic findings are retained in the ignored review folders. Automated whole-stream decoding/luma checks do not mean every frame was manually reviewed, OCR-verified or semantically verified. Metering/waveform analysis does not establish that a human listened or approved the musical taste.

Independent final verdict: **SHIP as a dated local demo**. The critic independently verified the final SHA-256 and confirmed that timing, motion, synthetic ending, original logo and full release qualifications pass. One cosmetic item was waived: a clipped sidebar fragment remains during the import transition at approximately 6.3 seconds. It does not mask the handoff, result or provenance. No blocker or required fix remains. The detailed final findings are `.local/video/r3-20261022/revision-2/review/FINDINGS.md`.

There is no invented application UI, CSS slideshow, synthetic cursor, account footage, paid generation or live sponsor claim. The source/memory/citation graphics are labeled editorial. The two replay cases are invented; their application responses are actual recorded behavior. The ending explicitly keeps the synthetic background label and says Zetaris live-query and actual Cursor-use evidence remain pending. The film does not prove sponsor eligibility, authorize deployment or submit/publish anything.

Local tool versions: Node 24.15.0; FFmpeg/FFprobe 7.1 Gyan essentials; NumPy 2.2.6; Pillow 12.3.0; Playwright 1.64.0 for one-time native SVG rasterization; Showtime 0.4.2 for the final quality gate. No new runtime/model install or cloud inference was required.
