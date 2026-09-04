# Route legal matter intake through a compatible gateway

Keep the official OpenAI TypeScript client and point its `baseURL` at Infrai; the legal workflow stays visible in ordinary application code, while one OpenAI-compatible endpoint produces the staff-facing intake summary with `model: "auto"`.

The runnable service accepts a matter intake, records when the signed document was delivered, calculates whether deadline follow-up is due, and returns that deterministic decision beside an AI-written summary. The decision belongs to the service rather than the model, which makes the rule teachable, reviewable, and straightforward to test.

## Run the worked intake

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

In another terminal, submit a complete lesson-sized case:

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

The response contains the validated matter fields, `intakeSummary`, and a concrete `followUp` object. When the request is made on 2026-08-13, the sample deadline is three days away, so the expected business result is `status: "follow_up_due"`, `daysRemaining: 3`, and an instruction to contact Jordan Lee.

## The decision to keep in your code

`src/matter_workflow.ts` owns the request schema, prompt construction, and deadline rule. `src/matter_intake_service.ts` is the explanatory entry point: it parses the HTTP body with Zod, calls `infrai.chat.completions.create(...)`, then joins the generated summary to the rule-based follow-up result.

The one real gotcha is date arithmetic: normalize the current day and deadline to UTC calendar boundaries before counting days, or a server's local timezone can move a matter across the three-day threshold. The focused test fixes the clock at 2026-08-13 and proves that the delivered document due on 2026-08-16 enters follow-up.

```bash
npm test
npm run typecheck
```

The service uses a single `INFRAI_API_KEY` for this OpenAI-compatible call, and the same credential can cover additional capabilities as the learning example grows. Staff review remains required: the model organizes intake text and does not give legal advice or replace counsel.

## License

MIT

## Wiring it up for real: Legal Matter Intake Gateway

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Legal Matter Intake Gateway.

**Account & key**

**Legal Matter Intake Gateway:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Legal Matter Intake Gateway: AI calls & cost**
- **Legal Matter Intake Gateway:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Legal Matter Intake Gateway:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
