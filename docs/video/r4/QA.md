# R4 narrated edition — 22 October 2026

Candidate: `.local/video/r4-narrated/qarinah-evidence-r4-narrated.mp4`, 32,687,240 bytes.

SHA-256: `1cf7545f5096677dbb4f8986614ceb97e2b08df531c8500c630b3447dfaba73b`.

## Picture and timing

The output is exactly 96.000 seconds, 1920×1080, 30 fps, H.264/yuv420p, with 2,880 decoded frames and BT.709 primaries, transfer, and matrix. The original r3 revision-2 picture was stream-copied. The complete decoded-video SHA-256 is identical in source and result: `bf46f85a9ef89fbcd2968f26f8b9e7d1a91344a43b1b48c5b5f7960bba19fdfb`. A complete final frame/audio decode reported zero errors. No pixel rerender or replacement UI was used.

Twelve cues explain nine scenes at normal voice speed. READY narration begins at 20.8s, after the real result; the synthetic HOLD and ABSTAIN explanations begin at 65s and 79s. The last word ends at 94.21s. Each spoken line and its generated silence tail fits the corresponding window. The tightest spoken-word clearance is 0.462s before the next scene; its full waveform includes another 0.4s of silence. No word tail is cut to reach 96s. All prior films remain preserved.

## Voice, music, and captions

The installed local Kokoro `af_heart` generic synthetic voice reads 181 words at speed 1.0. Voice synthesis used no hosted request, cloning, paid account, installation, or model download. The original locally composed r3 beat plays continuously, reduced 3dB between cues and another 10dB under speech, with 200ms attack and 300ms recovery. The final AAC stereo/48kHz mix measures **−14.05 LUFS integrated, −1.48 dBTP true peak**, LRA 2.7 LU. These measurements are from the encoded output, rather than the target settings.

The separate speech SRT has 39 cues, matching the script's words and actual model-derived word timings. It is not burned over the existing editorial captions. Showtime found readable caption lengths/times (maximum 32 characters per line, maximum 20 characters/s, shortest cue 1.03s), no black stretches, no still stretch beyond 2.5s, no silent gap, and no abrupt ending. Its verdict was PASS with 0 failures, 0 warnings, and one information note: the automated phone typography/UI-zone check remains partial because this is an external FFmpeg edit. Original full-size visual qualifications were already independently reviewed in r3; unchanged decoded pixels establish that they survive.

## Independent ASR check

Existing local faster-whisper `small.en` transcribed the dry voice and encoded mix. The complete dry transcript agrees with the script after explicit phonetic spelling aliases (`Carina`/`Karina` → `Qarinah`, `time stamp` → `timestamp`). The full-mix VAD omitted the opening phrase; a separate 0–6s no-VAD transcription recovered it. The combined mixed transcripts then agree under those same explicit aliases. The unmodified ASR outputs and `readback-audit.json` preserve these limitations; this is not a claim of exact ASR spelling, subjective naturalness, or human pronunciation approval. No extra recognition model was downloaded.

## Receipts and limits

Ignored generated receipts: `receipt.json`, `qa.json`, `readback-audit.json`, `voice/timeline.json`, original ASR JSON files, FFmpeg logs, and `showtime-qa/qa.json` under `.local/video/r4-narrated/`. The transcript and SRT are alongside the MP4. The helpers fail on a changed source hash, stale speech, moved cue, overrun, invalid timing, caption mismatch, changed decoded picture, duration mismatch, decode error, or out-of-bounds loudness/peak.

The picture remains a dated demonstration of clean revision `d0c2bce`. It does not show later repair-interface work, independently authenticate CI, prove provider token savings, or supply live Zetaris/Cursor evidence. Synthetic cases remain visibly labeled, including the ending background. No eligibility, sponsor completion, deployment permission, or competition submission is claimed. No human listening or phone review is claimed by this automated report.

Independent review cleared this candidate as a dated local demo in `.local/video/r4-narrated/review/FINDINGS.md`, independently verifying the final file hash. It found the script, timing, ASR qualifications, and objective QA materially consistent, with no rerender requested. Short SRT cue WPM flags were not a full-line rush finding; the complete narration stays at normal speed. Its programme/SRT voice-over-bed estimates are not isolated-stem measurements. Subjective human listening remains unclaimed. Reproduction sources are in `scripts/audio-r4/`; generated media and private receipts remain outside Git.
