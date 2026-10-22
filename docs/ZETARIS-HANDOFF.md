# Developer evidence source

The bundled adapter reads one fixed developer source: the latest `packet_base64` value from `QARINAH.handoffs`, ordered by `captured_at`. It preserves the captured revision, check results and original observation times. It does not refresh old evidence merely by querying it again.

Prepare one or two actual local capture packets after reviewing their detail fields:

```powershell
node --import tsx scripts/export-zetaris-handoff.ts "D:\absolute\capture\packet.json"
```

The helper validates the existing handoff schema and bounds, then writes an ignored CSV and hash manifest under `.local/zetaris-source/`. It performs no provider action. Base64 avoids CSV quoting ambiguities; it is not encryption and adds approximately 33% to the packet size. No credentials or private verification material belongs in these packets.

After the approved local Zetaris runtime is healthy, copy the reviewed CSV into its existing customer-data shared volume at `/home/zetaris/customer-data/shared/qarinah-evidence-desk/handoffs.csv`. Register it through the bundled platform's file-source SQL, verifying the shipped syntax before execution. No additional host mount, remote database or paid provider is needed.

The intended workflow is **Investigate handoff → Zetaris source read → strict packet validation → Meterless memory → cited release assessment**. An old actual capture should be withheld once its original observations expire. A fresh clean capture with passing required checks and an explicit ready recommendation can support readiness within those supplied observations. Neither result authorizes deployment or independently authenticates CI.

Static inspection established the bundled login and SQL response models and SQL open/close routes. Live authentication, UI proxy mapping, source registration, query response and query cleanup must still pass before this integration is described as verified.

Bundled-version local configuration uses `ZETARIS_UI_URL`, `ZETARIS_USERNAME` and `ZETARIS_PASSWORD` in ignored `.env.local`. Do not put these values into frontend environment variables, screenshots, receipts or Git. The existing modern API mode remains separate.
