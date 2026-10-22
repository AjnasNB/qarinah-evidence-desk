# Assets and credits

All third-party resources were fetched read-only from primary sources. No paid service, card, cloud generation or attribution-restricted music was used.

| Asset | Source / license | Local provenance |
| --- | --- | --- |
| IBM Plex Sans Regular | [IBM/plex, pinned TTF](https://raw.githubusercontent.com/IBM/plex/71f558992315a12ca1f06a2215d57962a1992162/packages/plex-sans/fonts/complete/ttf/IBMPlexSans-Regular.ttf) · SIL OFL 1.1 | Unmodified, 200,500 bytes; SHA-256 `975dcda37d80f038dcd143c22e33ca2d97a0cc5a929aace1c749153b0fe1afa5` |
| IBM Plex Sans Bold | [IBM/plex, pinned TTF](https://raw.githubusercontent.com/IBM/plex/71f558992315a12ca1f06a2215d57962a1992162/packages/plex-sans/fonts/complete/ttf/IBMPlexSans-Bold.ttf) · SIL OFL 1.1 | Unmodified, 200,872 bytes; SHA-256 `9e6c74a889a700d707613d24548fe4ffa6bc59559a0689d2cf9e133bdcdafb2f` |
| IBM font license | [Primary license text](https://raw.githubusercontent.com/IBM/plex/71f558992315a12ca1f06a2215d57962a1992162/LICENSE.txt) | Retained as `LICENSE-IBM-PLEX.txt`; SHA-256 `7e6b2818edbd8f6a01ae80641cc8f16a51080d08fb4e532be3a0b6f74adb07da` |
| “Evidence / 120” instrumental | Original local composition/synthesis in `scripts/video-r3/compose.py` | Seed 221026; D-minor voicings, 120 BPM, 48 kHz stereo, 96 seconds; no external recording, loops or samples |
| Forest rail grain | Original local procedural texture | Seeded sub-one-level luminance noise; only the editorial ground, never applied to the app picture |
| Motion diagrams / cues | Original local vector/type composition in `scripts/video-r3/edit.mjs` | Editorial map and rule-result emphasis; not shipped app UI or a simulated sponsor call |
| Product picture | Actual prior localhost browser capture | Original `.local/video/20261022T073821010Z/raw.webm` and provenance manifest retained; no replacement UI imagery |
| Qarinah mark | Original owner-provided [official SVG](https://qarinah.io/assets/qarinah-mark.svg), already preserved in `public/brand/qarinah-mark.svg` | Unchanged SVG SHA-256 `2a822527d0a41a2bdc24625cf78641f6caf7206ea5007bbfb20bb2214cd9d84b`; native localhost-only Chromium rasterization at 96×96, transparent PNG SHA-256 `29d47683da59a031f23284d056cabf3a200fe9c9aca4d99d4ed10c575c2b594c`. No path, color, title or description edits; no generated/redrawn substitute. |

Font credit: IBM Plex, copyright 2017 IBM Corp., with Reserved Font Name “Plex”; used unmodified under the SIL Open Font License 1.1. The font copyright/license remains attached to the copied font assets. These credits acknowledge typography; IBM endorsement is not claimed.

The original composition is generated for this local project. No third-party music license or found-music claim is attached to it. No new external publication or rights transfer is performed here.

Technical measurement reference: [official FFmpeg filter documentation](https://ffmpeg.org/ffmpeg-filters.html), including `loudnorm`, `blackdetect`, `signalstats`, `subtitles` and waveform filters. FFmpeg is an installed tool, not an embedded media asset.

Final color signaling uses the official [H.264 metadata bitstream filter](https://ffmpeg.org/ffmpeg-bitstream-filters.html#h264_005fmetadata) to preserve BT.709 primaries, transfer and matrix in the encoded stream. It changes signaling without a second picture encode; stream metadata is checked again after muxing.

Original generated-file hashes: score WAV `290719ea5625da95800d29d96feb382460da42a2130d3e7411af78f114674f06`; rail texture PNG `766efbc640f087fe516e218be5d139745faf2043a41c6a4d4bd0bc99f7907a23`. The exact sizes/hashes and original raw picture hash are retained in the ignored final output's `original-asset-hashes.json`.
