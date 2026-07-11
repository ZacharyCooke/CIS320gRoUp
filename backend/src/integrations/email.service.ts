import sendgrid from "@sendgrid/mail";
import { env } from "../config/env.js";

let configured = false;

function ensureConfigured(): boolean {
  if (!env.SENDGRID_API_KEY || !env.SENDGRID_FROM_EMAIL) {
    return false;
  }

  if (!configured) {
    sendgrid.setApiKey(env.SENDGRID_API_KEY);
    configured = true;
  }

  return true;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!ensureConfigured()) {
    console.log(`[email disabled] subject="${input.subject}" recipient_present=${Boolean(input.to)}`);
    return;
  }

  await sendgrid.send({
    to: input.to,
    from: env.SENDGRID_FROM_EMAIL!,
    subject: input.subject,
    text: input.text,
    html: input.html
  });
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Your PetRecovery verification code",
    text: `Your PetRecovery verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your PetRecovery verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Reset your PetRecovery password",
    text: `We received a request to reset your PetRecovery password. Reset it here: ${resetUrl}\n\nThis link expires in 30 minutes. If you didn't request this, you can ignore this email.`,
    html: `<p>We received a request to reset your PetRecovery password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 30 minutes. If you didn't request this, you can ignore this email.</p>`
  });
}
