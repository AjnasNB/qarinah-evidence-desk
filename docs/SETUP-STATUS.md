# Local setup checkpoint — 22 October 2026

The product, edited local demo and seven-slide review deck are available. This is not a submitted competition entry.

## Verified

- Clean revision `d0c2bce` passed all 30 tests, build and typecheck. Chrome imported the actual capture and returned four citations with zero provider attempts. The receipt is in `validation/2026-10-22-local.json`.
- The captioned silent product film is 108.07 seconds at 1080p/30 fps. Full stream decode, black-interval scan and representative framing checks passed. See `video/QA-20261022.md`.
- The current r2 deck has seven slides, native editable text and four native tables. It includes architecture, current integration status and proposed enhancements. See `submission/REVIEW.md`.
- Docker's old 23 containers, 12 volumes, images and cache were removed with explicit authorization. Docker reported 24.91 GB reclaimed internally. Its Windows virtual disk remains; deleting that disk was rejected by automatic approval review, and no equivalent deletion was attempted.
- WSL's memory limit is 8 GB, with four processors and 2 GB swap preserved. The former configuration was backed up privately. Docker Engine was verified running with about 8 GB available. Ubuntu and project source folders remain intact.
- The approved Zetaris registry login succeeded. PostgreSQL and the exact vendor API image downloaded successfully. API image digest: `sha256:b54d8469b1fef1e2a2126fa8aeb10827af5a2ee0f493f3de2f1efc9749c76b91`.
- Cursor's native headless CLI is installed. Its account could not authenticate; an approved account-review request was sent to official support, with Gmail confirming `SENT`. No actual Cursor development use is claimed.

## Still running or unverified

At this checkpoint, the approved Compose startup process is downloading the remaining vendor images before starting and health-checking the stack. A checksum-verified native regctl client is fetching the same approved UI image into a private archive for Docker loading. Native transfer speed has not been established. These processes are not proof of a healthy Zetaris runtime or successful query.

Runtime files, registry authentication, image archives, recordings and build exports are private or ignored. No card, paid service, public source push, video publication or competition submission has occurred for this project.

## Next verification

1. Inspect the owned startup/export process results and Docker service health. Keep the loopback-only override and disabled telemetry. Do not run destructive volume commands against the new stack.
2. Inspect this shipped API version's local OpenAPI. The vendor verifier uses UI login and a SQL proxy returning object rows, while the initial adapter targets the documented modern API and array rows. Verify the real contract before configuring the app. Keep login credentials and ephemeral tokens private, and derive the organisation ID from the actual authenticated response.
3. Run one bounded fixed read query, verify its response and cleanup contract, and record an authentic receipt before claiming Zetaris integration. Complete a meaningful developer source workflow through it.
4. Resolve Cursor access through official support. Development can continue in Codex; a genuine Cursor review can contribute development evidence once authorized access works. The product does not need Cursor on its server.
5. Add actual sponsor footage, finish any chosen narration, publish reviewed source/video only with the applicable approval, and review the final competition entry before submission.

Official rule 5.1 requires Zetaris and Meterless integration and Cursor development use. The event accepts a 1–4 minute demo, deck and GitHub source with setup documentation. The current deadline is 27 October 2026 at 23:45 UTC, or 28 October at 05:15 IST. [Official rules](https://hackathon.genai.works/event/open-agent-hackathon-2026#rules)
