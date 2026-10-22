# R7 published entry update

Published entry film: `showtime-out/qed-receipt-proof-20261022-193800/final-r7-ready.mp4`, **148 seconds**, 1920 × 1080, 30 fps. Its exact file identity is in [asset.json](asset.json). After the user's exact approval, it replaced R6 on the existing HackOS entry; the changed link and description persist after reload. The submitted R6 archive is preserved. See [the upgrade receipt](../../submission/UPGRADE-RECEIPT-2026-10-22.json) for hosted playback status.

The hosted stream subsequently loaded at 1920×1080 and played muted, with readyState 4, positive playback time and no media error. Its transcoded duration was 148.010666 seconds. An earlier first load returned HLS errors before preparation completed; the later reload/playback succeeded. This is a playback-start check, not a full remote viewing or human listening review.

The first 90 seconds retain the prior real repair/source demonstration and explicitly labeled synthetic cases, with corrected result crops and a headline visible from frame zero. A new 52-second chapter shows the real receipt form: an actual saved local review reproduces, an edited copy is rejected, and a labeled synthetic expired case separates historical consistency from present abstention. A new six-second closing connects receipt inspection and the qualified Cursor founder report, over the actual saved receipt result.

The new chapter uses actual Chrome recordings, native camera movement over those pixels, generic local Kokoro `af_heart` narration (Apache-2.0), the existing original 120 BPM score and burned captions. It reconstructs no interface and uses no CSS video or generated product behavior. The first 0.24 seconds of blank recording are trimmed; a 0.4-second final-frame hold pads the remaining footage to the 52-second edit window. The closing uses the same actual footage without inherited captions. R6 and raw footage are preserved.

Final native ASS overlays enlarge the opening proposition, signpost the next expiry test during a quiet interval, and show the existing public repository in the closing. A separate line qualifies the Cursor founder report and the synthetic-expiry background. Original speech timings and the 148-second timeline remain intact; these are editorial overlays, not invented product states.

The new footage's actual observations refer to clean `79ace48`, which passed 80 tests and build. A later browser-navigation fix passes the full 81-test suite, typecheck, build and vendor integrity. The earlier 46-test source capture is preserved separately. None is relabeled as another revision or authenticated CI.

## Evidence

- [Product replay evidence](../../validation/2026-10-22-receipt-replay.json)
- [Refinement and assumptions](../../IDEA-REFINEMENT-2026-10-22.md)
- [Replay guide and trust limits](../../RECEIPT-REPLAY.md)
- [Proposed entry copy](../../submission/HACKOS-DESCRIPTION-R7.txt), 1,959 characters

## Measured media QA

The encoded film contains 4,440 frames over 148.000 seconds. Showtime's render report measures approximately **−14.0 LUFS / −2.0 dBTP**. The 42-cue sidecar follows the complete edit and ends at 146.154 seconds. Burned captions remain in the corresponding source clips. Final QA and independent review outcomes are recorded in [asset.json](asset.json).

The new 68-word narration matches local `small.en` readback of both the dry voice and the earlier mixed chapter after case, punctuation and whitespace normalization; no phonetic aliases were needed. The new eight-word closing also matches its separate dry readback. The revised picture treatment does not change the chapter's audio. Previous R6 speech qualifications remain in its own QA. Human listening and physical phone playback are not claimed.

The current automated verdict is **WARN: zero failures, two warnings**, for a 2.9-second picture hold at 136.07–138.97 seconds while the dated result and provenance remain available to inspect, and the six-second closing card that holds the repository and qualifications for reading. These are explicit inspection/closing holds. The earlier cut's four loudness-change warnings coincided with speech after quieter pauses; the first critic rejected those as proof of an unexplained gain jump. Exact hearing measurements and subsequent pairwise findings remain in the ignored Showtime review folder. The automated phone check is partial; desktop product labels and the actual 390-pixel responsive form were visually checked separately.

## Independent final review

Across three rounds, five independent media critics inspected the supplied frames, text crops, story and measured audio. Both final blind comparisons prefer this cut over the previous version, and both reviewers would post it. They establish no blocker. The user explicitly accepted the desktop-demo limitation in the publication approval: detailed result text is small on phones. That finding is now waived with the actual approval. The retained polish items are brief dark source-panel transitions and two short introductory narration spans measured at 235/201 wpm within slower contiguous sentences. No human listening or full mobile-video suitability is claimed. A working responsive product form does not prove phone readability of this video.

## Reproduce

The recording script needs the installed Chrome browser and an available Playwright module. It launches a separate headless browser and isolated loopback application; it does not drive the Windows desktop or reuse a private login profile.

```text
node --import tsx scripts/record-receipt-workflow.ts .local/handoff/CAPTURE/packet.json
showtime voice script scripts/receipt-video/narration.json -o JOB/voice
node scripts/receipt-video/prepare.mjs JOB
node scripts/receipt-video/motion.mjs JOB
showtime edit render JOB/edit/motion-edl.json -o JOB/receipt-proof-reviewed.mp4
node scripts/receipt-video/repair-frames.mjs JOB
showtime voice script scripts/receipt-video/closing.json -o JOB/closing-voice
node scripts/receipt-video/reviewed-cut.mjs JOB
showtime edit render JOB/edit/closing-edl.json -o JOB/closing-reviewed-v2.mp4
showtime edit render JOB/edit/reviewed-edl.json -o JOB/final-r7-reviewed.mp4
node scripts/receipt-video/finish-overlays.mjs JOB
showtime edit render JOB/edit/ready-edl.json -o JOB/final-r7-ready.mp4
```

Use an approved, genuine clean source capture and the retained R6 master. Source archives, credentials, recordings, generated voices, runtime ledgers and exports remain outside Git. Publication and any existing-entry update require the user's separate approval.
