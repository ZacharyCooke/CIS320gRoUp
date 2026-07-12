import { useState } from "react";

interface AdCreative {
  id: string;
  headline: string;
  body: string;
  href: string;
}

// Static house-ad content — this app has no real ad-network integration (out of
// scope per FR-032, which only requires that free accounts see contextual
// banner ads that Premium removes, not a real ad-serving pipeline).
const AD_CREATIVES: AdCreative[] = [
  {
    id: "waggle-insurance",
    headline: "Waggle Pet Insurance",
    body: "Get 2 months free when you sign up through PetRecovery.",
    href: "#"
  },
  {
    id: "chewy-supplies",
    headline: "20% off your first order",
    body: "Stock up on food, toys, and safety gear for your pet.",
    href: "#"
  }
];

interface AdProps {
  isPremium: boolean;
  adIndex?: number;
}

export function SidebarAd({ isPremium, adIndex = 1 }: AdProps) {
  const [dismissed, setDismissed] = useState(false);
  if (isPremium || dismissed) return null;

  const ad = AD_CREATIVES[adIndex % AD_CREATIVES.length];

  return (
    <div className="sidebar-ad">
      <div className="sidebar-ad-header">
        <span className="ad-label">Ad</span>
        <button type="button" className="ad-close" onClick={() => setDismissed(true)} aria-label="Dismiss ad">
          ✕
        </button>
      </div>
      <div className="sidebar-ad-headline">{ad.headline}</div>
      <p className="sidebar-ad-body">{ad.body}</p>
      <a href={ad.href} onClick={(e) => e.preventDefault()}>Learn more →</a>
    </div>
  );
}
