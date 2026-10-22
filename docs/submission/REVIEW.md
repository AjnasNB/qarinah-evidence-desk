# Local submission package review

This package is blocked for competition submission. The entry draft and metadata distinguish actual local evidence from pending sponsor use and public links.

## Deck deliverables

- Current editable PowerPoint, r2: `.local/submission/output/evidence-desk-review-r2.pptx`
- Current viewing PDF, r2: `.local/submission/output/evidence-desk-review-r2.pdf`
- Editable copy: `docs/submission/SLIDES.json`
- Builder: `scripts/build-submission-deck.mjs`
- Private screenshot and source-only provenance ledger: `.local/submission/assets/product-review.png`, `docs/submission/ASSETS.json`

The r2 PPTX has seven slides, four native tables, 20 native text shapes and seven notes pages. The finalizer passed package, geometry and declared Arial font checks with no findings or warnings. Artifact Tool reopened the final PPTX successfully. The original seven slide renders were inspected at 1280×720. For r2, only changed slides 5 and 7 received another visual review, with final import/native counts checked across the deck. The actual product screenshot and sponsor-status slide remain unchanged. The screenshot retains its authority disclaimer and four citations, and its source file remains a byte-for-byte copy.

Slide 5 now shows the concrete local architecture and stack. Slide 7 shows proposed authenticated CI, Zetaris developer observations and held-out workflow/provider measurements, while retaining the blocked-submission footer and team. The synthetic byte benchmark remains in the entry, metadata and speaker notes rather than a visible slide.

No PowerPoint or Google Slides application test was performed. The supplied runtime's native PDF export failed because its `#standard-fonts/Helvetica` module was unavailable. The delivered seven-page PDF therefore embeds the inspected slide renders. Use the PPTX to edit text and tables. No new dependency was installed.

Current r2 PPTX SHA-256: `5a122a79ca002dfe931599635812d2a357c18c7da6d4f02f58c4df9a2fecbb84`

Current r2 PDF SHA-256: `86c26ac88b9929690da5e116582763cbd2149fe346b2a8a5d86d110d441d4506`

The current private validation receipt and output inventory are under `.local/submission/build-r2/`, with renders under `.local/submission/rendered-r2/`. Generated decks, screenshot, renders and private build directories remain ignored. The original r1 PowerPoint remains at `.local/submission/output/evidence-desk-review.pptx`; its original hash `9a14e1707b781803008abe9e6b31930816a808089fec124e64e314d8420ecea5` was rechecked unchanged. Its historical screenshot path is mapped by `ASSETS.json`; current r2 notes use the private path. No source staging or commit was performed by this reviewer.

## Reproduction

The optional builder needs the supplied Codex Node/Artifact Tool runtime and Presentations skill. It installs nothing and makes no provider request. Runtime locations can be overridden with `RUNTIME_NODE_MODULES`, `RUNTIME_PYTHON` and `PRESENTATIONS_SKILL_DIR`. The product screenshot stays outside Git. Provide an authorized, auth-free 1600×900 PNG via `SCREENSHOT_PATH`, or place it at the documented private screenshot path. The source app does not depend on this optional renderer.

Use an unused revision name to preserve existing outputs, for example `node scripts/build-submission-deck.mjs --revision=r3` with the supplied runtime. To regenerate derived renders/PDF for the current r2, use `--revision=r2 --resume-export`. Resume verifies the PPTX hash against its private receipt before reopening it. It does not change the validated PowerPoint.

## Current boundary

The committed local product receipt records 30 passing tests, a passing build/typecheck and the actual four-citation review with zero provider attempts. The main task also reports a completed 108-second local video draft using actual footage. Live Zetaris, actual Cursor use, final sponsor footage and approved public video/source links remain pending. Optional NVIDIA generation remains disabled. This review records no publication, submission, award or winning probability.
