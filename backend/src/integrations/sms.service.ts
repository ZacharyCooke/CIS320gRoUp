import twilio from "twilio";
import { env } from "../config/env.js";

export interface SendSmsInput {
  to: string;
  body: string;
}

export async function sendSms(input: SendSmsInput): Promise<void> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
    console.log(`[sms disabled] body_length=${input.body.length} recipient_present=${Boolean(input.to)}`);
    return;
  }

  const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    to: input.to,
    from: env.TWILIO_FROM_NUMBER,
    body: input.body
  });
}

export async function sendOtpSms(to: string, code: string): Promise<void> {
  await sendSms({
    to,
    body: `Your PetRecovery verification code is ${code}. It expires in 10 minutes.`
  });
}
