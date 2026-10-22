# Real product recording

This is a browser recording of the working local product. It does not reconstruct the interface with slides, CSS or generated images. Browser actions use a fresh, ephemeral headless Playwright context; no desktop, existing Chrome profile, account or authentication page is accessed. HTTP and WebSocket traffic is restricted to `127.0.0.1` ports 5183 and 4318. No sponsor query or model call is requested.

## Reproduce

Keep the local app and API running with `npm run dev`. Requirements: Node 22.12 or newer, FFmpeg/FFprobe with libx264/libass, and a separately installed Playwright package with its matching Chromium browser. The helper resolves `playwright` normally; an explicit `PLAYWRIGHT_MODULE` environment variable can select an existing installation elsewhere without changing that installation. It is not an API key. No dependency download is performed by either helper, and no other private project's path is required.

The 22 October capture used Node 24.15.0, Playwright 1.64.0 with its installed Chromium browser, and FFmpeg/FFprobe 7.1 (Windows Gyan essentials build). Playwright was supplied through an explicit existing-module override; this repository does not require that installation's location or add it to package dependencies.

1. Create a real local evidence packet using the existing `npm run evidence -- --recommendation=ready` workflow, only when that recommendation is warranted. Preserve its output and logs. The default recording input is `.local/handoff/20261022T072947054Z/packet.json`, which records the clean revision `d0c2bce75d8eba29a83fcfa2d1f9518a727cec94`. That packet is historical evidence for that commit, not a claim that later recording-helper edits were included in its CI run. Evidence older than the product's one-hour freshness bound will abstain. Do not change timestamps or outcomes to make a real packet pass.
2. Optional selector/behavior rehearsal: `node scripts/record-product.mjs --probe --packet=.local/handoff/<capture>/packet.json`. This runs real local imports/reviews quickly and stores screenshots and a manifest, without recording video. It writes bounded observations into the product's normal local H-MEM store.
3. Record: `node scripts/record-product.mjs --packet=.local/handoff/<capture>/packet.json`. The default run records about 108 seconds. It asserts four real citations, no provider attempt, inspectable H-MEM audit, hold for synthetic failed tests and abstention for synthetic missing build evidence. A failed assertion leaves a diagnostic screenshot and manifest; do not deliver a failed capture.
4. Render: `node scripts/render-product.mjs .local/video/<capture>`. This uses only the recorded WebM picture. It trims initial browser loading, applies gentle 6%/8% eased punch-ins to the real result/citation beats, returns wide before audit/context, scales into a 1920×1080 canvas and adds a separate fixed caption footer. It encodes H.264/yuv420p MP4 at 30 fps and removes audio. It performs a complete video decode, scans for full-frame black intervals and extracts representative and peak-motion keyframes. Review those keyframes before delivery.

All generated recordings, screenshots, synthetic packet copies, captions and reports belong under ignored `.local/video/`. Source helpers and this recipe may be committed; generated output and local memory must not enter Git. The input packet is read without modification and its SHA-256 is recorded in the manifest.

## Deliverables per capture

- `raw.webm`: actual browser picture, including navigation and interaction.
- `qarinah-product-draft.mp4`: captioned silent draft, with no synthetic cursor, fabricated interface, voiceover or music.
- `captions.srt` and `captions.ass`: editable captions; timings derive from measured capture beats.
- `manifest.json`: original packet hash/commit, measured beat timings, API status/outcome assertions, blocked origins and page errors.
- `validation.json` and `keyframes/`: encoding/count/decode checks, output hash and representative visual review material. Automated checks cover the video stream; keyframe inspection does not establish manual review of every frame.

## Truth boundaries

The real segment imports caller-declared local observations of actual tests and build. The UI explains that these are not independently authenticated CI or permission to release. The original packet is not rewritten. Failure and missing-build demonstrations are **synthetic replay** copies: project names, provenance and captions explicitly identify them; real output hashes and real-CI prose are removed; an invented commit is used. Those cases demonstrate application behavior, not actual failed/missing CI.

The byte panel measures serialized UTF-8 bytes including overhead. Its full-context comparison is counterfactual. No provider receipt exists for this flow, so tokens remain unknown. No percentage saving, answer-quality equivalence, sponsor verification, release authorization or competition submission is claimed.

The current draft ends with Zetaris query and Cursor development evidence still pending. Add a real sponsor clip later only after independently recording the actual successful query or development action with its proper provenance. A configuration badge or login alone is not evidence of successful integration. Do not relabel these local handoff clips as sponsor execution.

The mandatory HyperFrames entry guidance and installed digital-samba video-toolkit skill were reviewed. The user explicitly selected real footage plus FFmpeg/Remotion edits, so this workflow uses FFmpeg rather than generated HTML scenes or cloud GPU assets. HyperFrames usage was unknown: the no-install CLI probe reported the package absent. No toolkit GPU, TTS, image, music, cloud or paid generation was invoked.
