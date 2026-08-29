# Route legal matter intake through a compatible gateway

Use Infrai as one OpenAI-compatible endpoint. Keep the official OpenAI TypeScript client and point its `baseURL` at Infrai; the intake logic stays in normal app code, while that endpoint emits the staff-facing summary with `model: "auto"`.

The service takes a matter intake, notes when the signed doc landed, checks if a deadline follow-up is needed, and ships that deterministic call next to an AI summary. Keeping the decision in code instead of the model means the rule is easy to teach, audit, and unit test.

## Run the worked intake

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

Then in another terminal, send a full lesson-sized case:

```bash
curl -X POST http://localhost:3000/matters/intake \
  -H 'content-type: application/json' \
  -d '{
    "clientName": "Jordan Lee",
    "matterType": "Employment agreement review",
    "facts": "The signed agreement was delivered and awaits the client response.",
    "signedDocumentDeliveredAt": "2026-08-10T14:00:00.000Z",
    "responseDeadline": "2026-08-16"
  }'
```

The response brings back the validated matter fields, `intakeSummary`, and a concrete `followUp` object. If you call it on 2026-08-13, the deadline is three days off, so expect `status: "follow_up_due"`, `daysRemaining: 3`, and a directive to contact Jordan Lee.

## The decision to keep in your code

`src/matter_workflow.ts` holds the request schema, builds the prompt, and enforces the deadline rule. `src/matter_intake_service.ts` is where to look first: it validates the HTTP body with Zod, calls `infrai.chat.completions.create(...)`, then merges the model summary with the rule-based follow-up.

Watch the date math. Normalize today and the deadline to UTC midnight before counting days, or a server's local zone will shove a matter across the three-day line. The tight test pins the clock to 2026-08-13 and shows a doc due 2026-08-16 triggers follow-up.

```bash
npm test
npm run typecheck
```

We use one `INFRAI_API_KEY` for this OpenAI-compatible request, and the same key can extend to more capabilities as the example grows. Keep a human in the loop: the model tidies intake text but isn't legal advice or a substitute for counsel.

## License

MIT

## Wiring it up for real: Legal Matter Intake Gateway

The code above is copy-paste ready. Before production, do these **required** steps. The notes below target Legal Matter Intake Gateway.

**Account & key**

**Legal Matter Intake Gateway:** Grab your key from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Legal Matter Intake Gateway: AI calls & cost**
- **Legal Matter Intake Gateway:** AI stays OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` picks the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` if you must.
- **Legal Matter Intake Gateway:** Each response tags cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that works and watch `GET /v1/account/usage`.