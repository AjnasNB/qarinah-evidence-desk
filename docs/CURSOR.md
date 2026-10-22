# Develop and test in Cursor

Cursor is the event's development editor requirement. It is not a service, server dependency or runtime requirement for Evidence Desk. The product still runs locally with Node and the approved Zetaris installation. Opening a folder alone does not demonstrate development use or confirm competition eligibility.

## Open this project

Open `qarinah-evidence-desk.code-workspace` in Cursor, or run this from the project root:

```text
cursor --classic --new-window "qarinah-evidence-desk.code-workspace"
```

Review any workspace trust prompt yourself. No task runs on folder open. No extension installation, global setting change, account login or new MCP permission is configured by this repository. Node 22.12+ must be on the editor's PATH; restart the editor after installing Node if a task cannot find it. Existing dependencies are needed; for a fresh checkout use `npm ci --ignore-scripts`.

The installed 3.17.19 CLI supports `--classic` to request the editor for this launch without changing your default window preference. If an Agents window appears instead, choose **Ctrl+Shift+P → Open IDE**, then open this workspace. [Cursor's editor/Agents window guidance](https://cursor.com/docs/agent/agents-window).

The installed editor was identified as Cursor 3.17.19 on 22 October 2026. Its existing user-level Qarinah MCP entry points to the installed Node runtime and `qarinah.mjs mcp --auto-init`, without environment credentials. That configuration was inspected without changing it; it does not establish a successful Cursor-side MCP session. Do not copy the user's global configuration into this repository.

## Run the real checks

1. In Cursor, press **Ctrl+Shift+B** to run **Qarinah: validate**. Alternatively choose **Terminal → Run Task → Qarinah: validate**.
2. The task sequentially runs the existing test suite, TypeScript check, production build and vendor integrity check. It stops at the first failure and returns a nonzero exit code. Task commands use Node directly, avoiding PowerShell's `npm.ps1` execution-policy issue and shell quoting of the workspace path.
3. Inspect the terminal result and the new `.local/editor-validation/<run>/receipt.json`. Each completed check has a bounded private output log and its full output hash. The receipt records the starting Git revision, whether the working tree was dirty, and whether revision/status changed during validation. It does not detect edits that preserve the same Git status.
4. Open `server/repair.ts` and `tests/backend-repair.test.ts`. Review a real behavior and its regression together; use breakpoints or a small justified change if needed. Do not make a cosmetic edit solely to create eligibility evidence.

The same checks are available from any terminal with `npm run validate`. A passing receipt establishes local execution, **not which editor launched it**, authenticated CI, source immutability or competition qualification. Keep a real Cursor session/terminal screenshot or recording with the relevant revision if documenting editor use; inspect it for private data before sharing. Never mark the submission's Cursor evidence verified based only on this setup or a shell run.

The ordinary editor and local tasks can be used independently of AI chat access. The previous closed-account support ticket remains unresolved unless a later authenticated check or support response establishes otherwise. Do not create another account to bypass that state. If AI chat is unavailable, use local editing/testing and request official guidance about the event requirement.

## Preview and debug

If the existing localhost preview is running, reuse it at `http://127.0.0.1:5183/`. Otherwise run **Qarinah: dev** from Run Task. It starts UI and API on 5183/4318. Stop that task before launching **Qarinah: debug API (stop dev first)** with F5, because both API processes need port 4318. The debugger serves the built frontend on `http://127.0.0.1:4318/`; run validation first to create it. The backend reads the existing ignored `.env.local` itself; never attach that file to chat. No debugger session has been claimed by providing a launch configuration.

For a quick product check, load the visibly labeled **Clean evidence** replay case, ask **What is the Atlas upload limit?**, and inspect the answer and exact citations. This is a synthetic support example. To exercise the release reviewer, capture and explicitly import a developer handoff as described in the README, then ask **What is the current release decision?** For a real Zetaris handoff use [the live verification runbook](runtime/LOCAL-ZETARIS-VERIFICATION.md). Observations expire after one hour: recapture real checks when necessary, preserving timestamps. A reread alone does not refresh old evidence. Do not restart or replace the existing Docker services just to use Cursor.

## Keep context small and private

The short project rule routes work to the relevant source and the existing AGENTS.md. Use focused Qarinah summary recall before opening old history; select exact cited detail only when needed. Prefer a bounded test output or source excerpt over another full browser tree, screenshot or chat replay. No measured token-saving percentage is claimed.

`.cursorignore` excludes private configuration, local memory, dependencies, caches and generated media from Cursor's code context. The workspace also limits search and file watchers. **These are not security boundaries:** Cursor's terminal and MCP tools can still access ignored files. Never ask an agent to read credentials or private runtime files. [Cursor ignore-file documentation](https://cursor.com/docs/reference/ignore-file), [project rules](https://cursor.com/docs/rules), [task configuration](https://code.visualstudio.com/docs/debugtest/tasks).

If Cursor AI is available, a bounded first review prompt is:

> Follow AGENTS.md and the project rule. Recall this exact project's latest relevant summary with maxChars 2000. Inspect only server/repair.ts and tests/backend-repair.test.ts for one concrete stale-evidence or citation bug. Report a real issue before editing. If none is found, say so. For a justified fix, add a meaningful regression, run npm run validate once, review the diff and commit locally. Do not read .env.local, upload data, push or submit.

No push, public recording, public source link or submission is authorized by opening or testing this workspace. Ask the user for the specific external action after preparing the reviewable result.
