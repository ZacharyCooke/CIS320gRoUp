import { useEffect, useState } from "react";
import { apiClient } from "../services/api-client";

const AD_COPY: Record<string, { title: string; body: string }[]> = {
  banner: [
    { title: "PetRecovery Premium", body: "Remove ads and unlock unlimited pet profiles — try Premium." },
    { title: "GPS Tracker Collars", body: "Never lose track of your pet again. Shop trackers in the store." }
  ],
  sidebar: [
    { title: "Pet First Aid Kits", body: "Be ready for anything. Vet-recommended kits in the store." },
    { title: "Engraved ID Tags", body: "A backup for the backup — durable engraved tags, ships in 2 days." }
  ]
};

let premiumCache: boolean | null = null;

async function fetchIsPremium(): Promise<boolean> {
  if (premiumCache != null) return premiumCache;
  try {
    const { data } = await apiClient.get("/auth/me");
    premiumCache = Boolean(data.user?.is_premium);
  } catch {
    premiumCache = false;
  }
  return premiumCache;
}

export function AdBanner({ slot }: { slot: "banner" | "sidebar" }) {
  const [isPremium, setIsPremium] = useState(true); // assume premium until confirmed — avoids ad flash
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchIsPremium().then(setIsPremium);
  }, []);

  if (isPremium) return null;

  const ads = AD_COPY[slot];
  const visible = ads.filter((_, i) => !dismissed.has(i));
  if (visible.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: slot === "banner" ? "row" : "column", gap: 8 }}>
      {ads.map((ad, i) =>
        dismissed.has(i) ? null : (
          <div
            key={ad.title}
            style={{
              position: "relative", background: "#f8fafc", border: "1px solid #e2e8f0",
              borderRadius: 8, padding: "10px 32px 10px 14px", fontSize: "0.85rem", flex: slot === "banner" ? 1 : undefined
            }}
          >
            <button
              type="button"
              aria-label="Dismiss ad"
              onClick={() => setDismissed((prev) => new Set(prev).add(i))}
              style={{
                position: "absolute", top: 4, right: 6, background: "none", border: "none",
                cursor: "pointer", color: "#94a3b8", fontSize: "0.9rem"
              }}
            >
              ✕
            </button>
            <strong>{ad.title}</strong>
            <div style={{ color: "#64748b" }}>{ad.body}</div>
          </div>
        )
      )}
    </div>
  );
}
