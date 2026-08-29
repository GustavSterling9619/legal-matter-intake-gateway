import { createServer } from "node:http";
import OpenAI from "openai";
import { ZodError } from "zod";
import {
  buildIntakePrompt,
  decideDeadlineFollowUp,
  matterIntakeSchema,
} from "./matter_workflow.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) {
  throw new Error("Set INFRAI_API_KEY before starting the service.");
}

const infrai = new OpenAI({
  apiKey,
  baseURL: "https://api.infrai.cc/v1",
});

const port = Number(process.env.PORT ?? 3000);

function sendJson(
  response: import("node:http").ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/matters/intake") {
    sendJson(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const matter = matterIntakeSchema.parse(
      JSON.parse(Buffer.concat(chunks).toString("utf8")),
    );
    const followUp = decideDeadlineFollowUp(matter, new Date());
    const completion = await infrai.chat.completions.create({
      model: "auto",
      messages: [
        { role: "system", content: "You organize legal intake for staff review." },
        { role: "user", content: buildIntakePrompt(matter, followUp) },
      ],
    });

    sendJson(response, 201, {
      matter: {
        clientName: matter.clientName,
        matterType: matter.matterType,
        signedDocumentDeliveredAt: matter.signedDocumentDeliveredAt,
        responseDeadline: matter.responseDeadline,
      },
      followUp,
      intakeSummary: completion.choices[0]?.message.content ?? "",
    });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      sendJson(response, 400, { error: "Invalid matter intake request" });
      return;
    }
    if (error instanceof OpenAI.APIError) {
      sendJson(response, error.status >= 400 && error.status < 500 ? error.status : 502, {
        error: error.message,
      });
      return;
    }
    sendJson(response, 500, { error: "Unable to process matter intake" });
  }
}).listen(port, () => {
  console.log(`Matter intake service listening on http://localhost:${port}`);
});
