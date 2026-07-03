import QRCode from "qrcode";
import { env } from "../config/env.js";

/**
 * Builds the public-facing profile URL that a QR code resolves to.
 * This is the web page (React route) a finder lands on after scanning —
 * no app or account required (FR-009, FR-017).
 */
export function publicProfileUrl(token: string): string {
  return `${env.PUBLIC_WEB_URL.replace(/\/$/, "")}/p/${token}`;
}

/** Render the QR code for a pet's public profile as an inline SVG string. */
export async function generateSVG(token: string): Promise<string> {
  return QRCode.toString(publicProfileUrl(token), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1
  });
}

/**
 * Render the QR code as a PNG data URL (base64) suitable for <img src> or
 * download. `size` is the edge length in pixels (default 512).
 */
export async function generatePNG(token: string, size = 512): Promise<string> {
  return QRCode.toDataURL(publicProfileUrl(token), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: size
  });
}
