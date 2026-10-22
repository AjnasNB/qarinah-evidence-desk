# Repair guidance UI check

No actionable defect was found in this focused localhost check on 22 October 2026. This was an existing React developer evidence dashboard; the check focused on the trust boundary between release evidence, repair guidance and explicit user actions.

Seven browser checks passed against the running application, without fabricated HTTP responses:

- Explicitly importing the actual older local observation packet produced an abstention with four stale repair items. Each evidence button resolved to an ID in that snapshot. The answer had no supporting citations and made no model attempt.
- The stale imported packet offered **Import updated evidence**, without a live-source reread button. The link focused the JSON import field.
- Keyboard Enter on a repair evidence button opened its matching source details.
- Editing the question, importing another packet and loading a support replay cleared the previous repair plan.
- A separately labeled synthetic failed-tests packet produced a blocked plan and a hold decision, with four citations. Its action required fixing the source issue, running real tests and capturing their actual outcome.
- At a 390 px viewport, document width remained 390 px; repair controls stayed within the viewport and measured at least 25 px high.

The actual stale desktop plan and synthetic failed mobile plan were visually inspected. Copy remained readable, evidence IDs wrapped within bounds, and the import boundary explained that importing does not run CI or deploy. The read-only static scan of `src` reported zero findings. There were no browser page errors or unexpected requests.

Private evidence is in `.local/repair-ui/20261022T095634414Z/`: `qa.json`, four PNG screenshots with recorded SHA-256 hashes, and `static-scan.md`. The browser allowed localhost requests only and blocked source-query/public-provider routes; none were attempted. No production source changes were made for this check.

This verifies the tested imported-evidence flows. It does not verify live Zetaris reads, CI repair, deployment, the model provider, every screen size, or full accessibility/performance compliance. Keyboard activation was checked; a complete keyboard and focus-visibility audit was outside this pass. Synthetic failure evidence is not a real CI failure.
