import crypto from "node:crypto";
import http2 from "node:http2";
import { env } from "../config/env.js";

export interface SendApnsInput {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const APNS_TOKEN_TTL_MS = 45 * 60 * 1000;
let cachedProviderToken: { token: string; expiresAt: number } | null = null;

function isConfigured(): boolean {
  return Boolean(env.APNS_KEY_ID && env.APNS_TEAM_ID && env.APNS_BUNDLE_ID && env.APNS_PRIVATE_KEY);
}

function base64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function providerToken(): string {
  if (cachedProviderToken && cachedProviderToken.expiresAt > Date.now()) {
    return cachedProviderToken.token;
  }

  const header = base64Url(JSON.stringify({ alg: "ES256", kid: env.APNS_KEY_ID }));
  const claims = base64Url(JSON.stringify({ iss: env.APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }));
  const unsigned = `${header}.${claims}`;
  const privateKey = env.APNS_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const signature = crypto.sign("sha256", Buffer.from(unsigned), {
    key: privateKey,
    dsaEncoding: "ieee-p1363"
  });
  const token = `${unsigned}.${base64Url(signature)}`;
  cachedProviderToken = { token, expiresAt: Date.now() + APNS_TOKEN_TTL_MS };
  return token;
}

export async function sendApns(input: SendApnsInput): Promise<void> {
  if (!isConfigured()) {
    console.log("[apns disabled] device_token_present=true");
    return;
  }

  const host =
    env.APNS_ENVIRONMENT === "production"
      ? "https://api.push.apple.com"
      : "https://api.sandbox.push.apple.com";

  await new Promise<void>((resolve, reject) => {
    const client = http2.connect(host);
    const body = JSON.stringify({
      aps: {
        alert: {
          title: input.title,
          body: input.body
        },
        sound: "default"
      },
      data: input.data ?? {}
    });

    client.on("error", reject);

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${input.deviceToken}`,
      authorization: `bearer ${providerToken()}`,
      "apns-topic": env.APNS_BUNDLE_ID!,
      "content-type": "application/json"
    });

    let responseBody = "";
    let status = 0;

    req.setEncoding("utf8");
    req.on("response", (headers) => {
      status = Number(headers[":status"] ?? 0);
    });
    req.on("data", (chunk) => {
      responseBody += chunk;
    });
    req.on("end", () => {
      client.close();
      if (status >= 200 && status < 300) {
        resolve();
        return;
      }
      reject(new Error(`APNs request failed with ${status}: ${responseBody}`));
    });
    req.on("error", (err) => {
      client.close();
      reject(err);
    });
    req.end(body);
  });
}
