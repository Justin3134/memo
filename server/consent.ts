import express from "express";
import dotenv from "dotenv";
import * as plivo from "plivo";
import { ConvexHttpClient } from "convex/browser";

dotenv.config();

const client = new (plivo as unknown as {
  Client: new (
    authId: string,
    authToken: string
  ) => { messages: { create: (message: Record<string, string>) => Promise<unknown> } };
})(process.env.PLIVO_AUTH_ID ?? "", process.env.PLIVO_AUTH_TOKEN ?? "");

const convex = new ConvexHttpClient(process.env.CONVEX_DEPLOYMENT ?? "");
const app = express();
app.use(express.json());

export async function sendConsentSms(
  patientPhone: string,
  patientName: string,
  patientId: string
) {
  await client.messages.create({
    src: process.env.PLIVO_NUMBER ?? "",
    dst: patientPhone,
    text: `Hi ${patientName}! Your family has set up Memo, a friendly daily companion that will call you each morning for a chat. Reply YES to agree, or STOP to decline.`,
  });

  return { patientId };
}

export async function handleInboundSms(req: express.Request, res: express.Response) {
  const { Text, From } = req.body ?? {};
  if (typeof From === "string" && String(Text ?? "").trim().toUpperCase() === "YES") {
    await convex.mutation("patients:giveConsent", { phoneNumber: From });
  }

  res.sendStatus(200);
}

app.post("/plivo-consent", handleInboundSms);

export { app };

const consentPort = Number(process.env.CONSENT_WEBHOOK_PORT ?? 3002);
app.listen(consentPort, () => {
  console.log(`Consent SMS webhook server running on port ${consentPort}`);
});
