import { z } from "zod";

export const matterIntakeSchema = z.object({
  clientName: z.string().trim().min(1),
  matterType: z.string().trim().min(1),
  facts: z.string().trim().min(20),
  signedDocumentDeliveredAt: z.string().datetime(),
  responseDeadline: z.string().date(),
});

export type MatterIntake = z.infer<typeof matterIntakeSchema>;

export type FollowUpDecision = {
  status: "follow_up_due" | "monitor";
  daysRemaining: number;
  nextAction: string;
};

const MS_PER_DAY = 86_400_000;

export function decideDeadlineFollowUp(
  matter: MatterIntake,
  asOf: Date,
): FollowUpDecision {
  const deadline = new Date(`${matter.responseDeadline}T00:00:00.000Z`);
  const today = Date.UTC(
    asOf.getUTCFullYear(),
    asOf.getUTCMonth(),
    asOf.getUTCDate(),
  );
  const daysRemaining = Math.ceil((deadline.getTime() - today) / MS_PER_DAY);
  const followUpDue = daysRemaining <= 3;

  return {
    status: followUpDue ? "follow_up_due" : "monitor",
    daysRemaining,
    nextAction: followUpDue
      ? `Contact ${matter.clientName} and confirm the signed-document response.`
      : `Review ${matter.clientName}'s matter three days before the deadline.`,
  };
}

export function buildIntakePrompt(
  matter: MatterIntake,
  decision: FollowUpDecision,
): string {
  return [
    "Prepare a concise legal matter intake summary for staff review.",
    `Client: ${matter.clientName}`,
    `Matter type: ${matter.matterType}`,
    `Facts: ${matter.facts}`,
    `Signed document delivered: ${matter.signedDocumentDeliveredAt}`,
    `Response deadline: ${matter.responseDeadline}`,
    `Follow-up status: ${decision.status}`,
    `Next action: ${decision.nextAction}`,
    "Separate stated facts from open questions. Do not provide legal advice.",
  ].join("\n");
}
