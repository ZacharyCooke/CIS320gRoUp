import crypto from "node:crypto";
import type { NearbyVetClinic } from "../integrations/google-places.client.js";
import { sendEmail } from "../integrations/email.service.js";
import {
  createFoundReportBolo,
  findFoundReportBoloForProvider,
  type FoundReportBolo
} from "../models/found-report-bolo.model.js";
import type { FoundReport } from "../models/found-report.model.js";

export async function dispatchFoundReportBolos(
  report: FoundReport,
  providers: NearbyVetClinic[]
): Promise<FoundReportBolo[]> {
  // One trace ID per dispatch batch so every provider's outcome for this
  // found-report submission can be correlated back to the same request in logs.
  const traceId = crypto.randomUUID();
  console.log(
    `[found-report-bolo] trace=${traceId} report=${report.id} dispatching to ${providers.length} provider(s)`
  );

  const dispatched: FoundReportBolo[] = [];

  for (const provider of providers) {
    const providerLabel = provider.provider_category ?? "provider";
    const existing = await findFoundReportBoloForProvider(report.id, provider.clinic_name, provider.clinic_address);
    if (existing) {
      console.log(`[found-report-bolo] trace=${traceId} ${providerLabel}="${provider.clinic_name}" skipped (already dispatched)`);
      dispatched.push(existing);
      continue;
    }

    const emailStatus = provider.clinic_email
      ? await sendFoundReportEmail(provider.clinic_email, report).then(
          () => {
            console.log(`[found-report-bolo] trace=${traceId} ${providerLabel}="${provider.clinic_name}" email_status=sent`);
            return "sent" as const;
          },
          (err) => {
            console.error(`[found-report-bolo] trace=${traceId} ${providerLabel}="${provider.clinic_name}" SendGrid dispatch error:`, err);
            return "failed" as const;
          }
        )
      : (() => {
          console.log(`[found-report-bolo] trace=${traceId} ${providerLabel}="${provider.clinic_name}" email_status=failed (no email on file)`);
          return "failed" as const;
        })();

    const bolo = await createFoundReportBolo({
      found_report_id: report.id,
      provider_category: provider.provider_category ?? "vet",
      clinic_name: provider.clinic_name,
      clinic_address: provider.clinic_address,
      clinic_email: provider.clinic_email,
      latitude: provider.latitude,
      longitude: provider.longitude,
      distance_miles: provider.distance_miles,
      email_status: emailStatus
    });

    dispatched.push(bolo);
  }

  return dispatched;
}

async function sendFoundReportEmail(to: string, report: FoundReport): Promise<void> {
  const finderContact =
    [report.reporter_name, report.reporter_email, report.reporter_phone].filter(Boolean).join(" / ") ||
    "no contact info provided";

  const lines = [
    `An animal was found near your location — you may be able to help reunite it with its owner.`,
    ``,
    `Species: ${report.species ?? "Unknown"}`,
    `Breed: ${report.breed ?? "Unknown"}`,
    `Color: ${report.color ?? "Unknown"}`,
    `Description: ${report.description}`,
    ``,
    `Found near: ${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}`,
    `Finder: ${finderContact}`,
    report.photo_urls[0] ? `Photo: ${report.photo_urls[0]}` : null
  ].filter((line): line is string => line !== null);

  await sendEmail({
    to,
    subject: `Found ${report.species ?? "animal"} reported near your area`,
    text: lines.join("\n")
  });
}
