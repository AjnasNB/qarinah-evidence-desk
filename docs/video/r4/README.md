# Narrated edition, r4

The r4 edition adds a generic synthetic narration to the existing 96-second r3 revision-2 film. It preserves the picture, original music, source labels, and previous outputs. It does not add live sponsor footage or claim that Zetaris or Cursor evidence is complete.

Voice: installed local Kokoro-82M v1.0, `af_heart`, speed 1.0. No cloning, hosted synthesis, account, paid service, or model download was used. The [Kokoro weights](https://huggingface.co/hexgrad/Kokoro-82M) are Apache-2.0, [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) is MIT, and the runtime uses installed espeak-ng (GPL-3.0); none of those dependencies or weights are copied into this repository. Reproduction requires an existing suitable installation; this helper does not fetch missing runtimes or models.

The checked-in script is `scripts/audio-r4/narration.json`, with a pronunciation lexicon alongside it. Twelve pinned cues explain the nine-scene EDL. Outcome narration starts after the corresponding result appears: READY at 20.8s, synthetic HOLD at 65s, synthetic ABSTAIN at 79s. The final cue starts at 88.5s and must finish before 95.5s. Exact speech durations and caption timings come from the generated audio and model word timings, not the word-count estimate.

Generated media and receipts live under ignored `.local/video/r4-narrated/`. This is a synthetic voice edition; the original score was composed locally for r3, with no external music samples.

## Reproduce

Requirements: Showtime with its installed local Kokoro voice model, FFmpeg/FFprobe (tested 7.1), Node.js (tested 24.15.0). Use an existing installation; the scripts do not install dependencies or download models. Set `SHOWTIME_CMD` if Showtime is not on PATH, and `FFMPEG`/`FFPROBE` for explicit executable paths.

Run commands from the repository root. Preserve the original r3 revision-2 MP4 and `original-score-master.wav`; generated source captures are intentionally not committed. First estimate, then synthesize with Showtime's local engine:

```powershell
showtime voice script scripts/audio-r4/narration.json --fit 96 --estimate
showtime voice script scripts/audio-r4/narration.json -o .local/video/r4-narrated/voice
node scripts/audio-r4/mix.mjs
node scripts/audio-r4/verify.mjs
```

The estimate is informational. The actual generation uses pinned starts without global fitting, so it cannot retime the fixed picture. The mixer checks measured speech endings against each slot, fails on overlap or late endings, and preserves the existing video stream. It ducks the original beat under each narration cue, then masters the combined track. Speech captions are a separate SRT; the existing editorial captions remain in the picture.

Final measurements, exact hashes, review findings, and any remaining limitations are recorded in `QA.md` after generation. No manual listening, sponsor verification, or phone review should be inferred from an automated pass.

## Optional local ASR audit

The verified machine already has Whisper `small.en`. No 490MB Parakeet model was installed. When this local model is available, the following commands reproduce the audit without source separation or new model downloads. Do not use a model name that is not already installed.

```powershell
showtime transcribe .local/video/r4-narrated/voice/vo.wav --model small.en --language en --separate off --no-events --no-gap-scan --threads 4 -o .local/video/r4-narrated/voice/whisper-readback.json
showtime transcribe .local/video/r4-narrated/qarinah-evidence-r4-narrated.mp4 --model small.en --language en --no-stem --separate off --no-events --no-gap-scan --threads 4 -o .local/video/r4-narrated/mix-whisper-readback.json
showtime transcribe .local/video/r4-narrated/qarinah-evidence-r4-narrated.mp4 --model small.en --language en --no-stem --separate off --no-vad --no-events --no-gap-scan --threads 4 --from 0 --to 6 -o .local/video/r4-narrated/intro-mix-whisper-readback.json
node scripts/audio-r4/readback.mjs
showtime qa .local/video/r4-narrated/qarinah-evidence-r4-narrated.mp4 --lufs -14 --captions .local/video/r4-narrated/qarinah-evidence-r4-narrated.srt --no-sheet -o .local/video/r4-narrated/showtime-qa
```

ASR is a diagnostic, not approval of pronunciation. The saved audit explicitly records the brand-name respelling and the full-mix recognizer's intro omission; a separate no-VAD intro audit recovers that speech. The original ASR outputs remain available unchanged.
