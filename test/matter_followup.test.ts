import assert from "node:assert/strict";
import test from "node:test";
import {
  decideDeadlineFollowUp,
  matterIntakeSchema,
} from "../src/matter_workflow.js";

test("marks a delivered document for follow-up three days before its deadline", () => {
  const matter = matterIntakeSchema.parse({
    clientName: "Jordan Lee",
    matterType: "Employment agreement review",
    facts: "The signed agreement was delivered and awaits the client's response.",
    signedDocumentDeliveredAt: "2026-08-10T14:00:00.000Z",
    responseDeadline: "2026-08-16",
  });

  assert.deepEqual(
    decideDeadlineFollowUp(matter, new Date("2026-08-13T09:00:00.000Z")),
    {
      status: "follow_up_due",
      daysRemaining: 3,
      nextAction: "Contact Jordan Lee and confirm the signed-document response.",
    },
  );
});
