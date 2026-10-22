# Release challenge — synthetic regression measurement

**False-ready results: 0 / 18 non-ready challenges.** This finite challenge set does not establish a real-world false-ready rate.

Expected classification matches: **20/20**. Production source unchanged during run: **true**. Provider calls/model attempts: **0/0**; actual provider tokens **unknown**.

The 20 cases were hand-authored from the documented strict handoff policy before execution. They are synthetic regression cases, not a blind held-out benchmark, user study or authenticated CI evidence. The runner uses real loopback HTTP import, review and memory-audit routes with the actual pinned Meterless H-MEM reference. It requests generation but the handoff workflow remains deterministic. No production logic is modified.

Measured 2026-10-22T09:51:45.318Z; source commit `fbf9e727fa3eabacf9bc8d7a200d866f0216be18`; working tree dirty at run: true. The fixture/runner and production-source SHA-256 identities are recorded in [the result](validation/release-challenge.json). A fixed synthetic evidence clock is used; these timestamps are not fresh real developer observations.

| Case | Expected | Actual | Match | Workflow ms | Request body B | Response body B |
| --- | --- | --- | --- | ---: | ---: | ---: |
| clean-control | ready | ready | yes | 50.539 | 1027 | 14485 |
| failed-current-tests | hold | hold | yes | 16.763 | 1027 | 14451 |
| dirty-current-revision | hold | hold | yes | 15.929 | 1026 | 14473 |
| explicit-hold | hold | hold | yes | 15.319 | 1026 | 14485 |
| missing-build | abstain | abstain | yes | 16.048 | 841 | 11179 |
| old-passing-build-wrong-revision | abstain | abstain | yes | 21.816 | 1140 | 12550 |
| stale-current-revision | abstain | abstain | yes | 12.834 | 1027 | 5174 |
| stale-build | abstain | abstain | yes | 13.302 | 1027 | 11972 |
| future-observation | rejected | rejected | yes | 3.345 | 907 | 116 |
| conflicting-tests | abstain | abstain | yes | 13.365 | 1217 | 8157 |
| explicitly-superseded-failure | ready | ready | yes | 20.337 | 1235 | 15927 |
| conflicting-recommendations | abstain | abstain | yes | 21.765 | 1257 | 8306 |
| hold-supersedes-ready | hold | hold | yes | 19.535 | 1305 | 16108 |
| unknown-build-outcome | abstain | abstain | yes | 16.627 | 1028 | 14016 |
| cancelled-build | abstain | abstain | yes | 17.517 | 1030 | 14034 |
| unknown-ci-reference | rejected | rejected | yes | 3.132 | 920 | 123 |
| array-instead-of-enum | rejected | rejected | yes | 2.828 | 909 | 122 |
| cyclic-supersession | rejected | rejected | yes | 4.364 | 1145 | 90 |
| hostile-detail-is-inert | hold | hold | yes | 23.071 | 1158 | 15109 |
| snapshot-expires-before-review | abstain | abstain | yes | 13.091 | 1027 | 5917 |

Totals: **83 HTTP requests; 21,279 request-body bytes + 196,794 response-body bytes = 218,073 bytes**. Median workflow 15.929 ms; p95 23.071 ms; maximum 50.539 ms. These machine-specific single-run latencies are descriptive, not a performance guarantee.

## Measurement boundaries

- Expected labels were hand-authored before execution from the documented policy; the author could inspect production source. These are synthetic regression cases, not blind held-out data or independent CI facts.
- One sequential run, one fresh desk per case. Initialization is reported separately; workflow latency starts before import and includes review, required source-resolution audit requests and local harness checks. It is not a user-task completion time.
- Body bytes are measured from the complete actual serialized HTTP request/response bodies, including JSON wrappers, citations, metadata, measurements and queried memory audits. HTTP headers, TCP framing, UI assets, process startup, memory disk I/O and benchmark output files are excluded. This is not total workflow storage or network cost.
- Internal prompt/evidence counters are not substituted for complete body measurements. No baseline, provider token count, token savings, cost savings, model quality or sponsor execution is established.
- Raw synthetic packets/responses, runtime ledgers and harness diagnostics remain under ignored .local/release-challenge/. Only sanitized fixture definitions and aggregate/per-case measurements are public-safe source artifacts.

## Reproduce

```text
npm ci --ignore-scripts
node --import tsx scripts/benchmark-release.ts
```

Only an ephemeral 127.0.0.1 server is opened. The script does not load .env.local, configure credentials, contact sponsors or execute evidence text. It retains runtime records under ignored .local/. It exits nonzero for classification/integrity failures, unexpected provider calls or a production-source change during the run. New repairs require rerunning the challenge; this report does not validate any later code.
