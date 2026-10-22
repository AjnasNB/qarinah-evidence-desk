# Entry deck review — r5

The seven-slide entry deck now records the founder's report that the project validation task ran in Cursor during development. It distinguishes that report from the earlier Codex terminal receipt. Most implementation used Codex, and no Cursor AI session is claimed. This disclosure adds no independent screenshot, code-change or AI-use requirement to the literal event rules.

## Deliverables

- Editable deck: `.local/submission/output/evidence-desk-review-r5.pptx`
- Viewing PDF: `.local/submission/output/evidence-desk-review-r5.pdf`
- Exact source copy: `docs/submission/SLIDES.json`
- Focused native editor: `scripts/update-entry-deck.mjs`

Only slides **1, 6 and 7** changed. Slide 1 updates the disclosure. Slide 6 updates the Cursor table cells and explains Codex's implementation role. Slide 7 removes the outdated Cursor blocker and retains a generic 96-second narrated demonstration reference. The entry media ledger, owned separately, identifies the final film. The deck preserves the filmed 46-test capture at `968764a` separately from the later 51-test verifier suite at `289c624`.

The editor imports preserved r4 and changes native text/table cells only. No image is replaced. All seven element frames, image crops and table geometries match r4. Embedded media bytes are identical. Slides 2–5 have identical text and rendered pixels.

The final deck retains seven slides, four editable native tables, 20 text shapes and seven notes pages. Package, geometry, reference Arial font and Artifact Tool reimport checks passed with zero layout findings or warnings. Changed slides 1, 6 and 7 received visual inspection through the actual PDF rendered with bundled Poppler at 1280×720. No clipping, overlap or missing disclosure was observed. No PowerPoint or Google Slides application test was performed.

The PDF uses image pages from the deck renders because the supplied native exporter still lacks its standard-font module. Edit native content in the PPTX. Private validation and geometry receipts are in `.local/submission/build-r5-final/`, slide renders in `.local/submission/rendered-r5/`, and PDF previews in `.local/submission/pdf-r5/`. Intermediate passes remain ignored.

PPTX SHA-256: `39a23770ac4a285037e61a7081ff0879c4c8d89081f59773f2a22856c04c5226`

PDF SHA-256: `7d5dc3f117414d4b4a5430fdcee083fd6b74dc84690fe33a365b0d384cab24b0`

Preserved r4 SHA-256: `ff5678a7098e59ae32220c5d68f7b4918f1e0e2f87a9539a776db7d610163310`. Earlier editions remain unchanged.

The optional editor uses the supplied Codex artifact runtime, installs nothing and makes no network request. It pins the r4 source hash and refuses to overwrite final r5 files. This subtask modified only that new editor, `SLIDES.json` and this review. It performed no staging, commit, metadata/asset-ledger edit, publication or submission.
