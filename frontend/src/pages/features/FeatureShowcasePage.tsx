import type { ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Footer } from "../../components/Footer";
import { NavBar } from "../../components/NavBar";
import { PublicTopBar } from "../../components/PublicTopBar";
import { isAuthenticated } from "../../services/auth";

type Phase = "before" | "during" | "community" | "recovery";

interface PhaseContent {
  kicker: string;
  title: string;
  description: string;
  mock: ReactNode;
}

const CONTENT: Record<Phase, PhaseContent> = {
  before: {
    kicker: "Before",
    title: "Register each pet once",
    description:
      "Build a complete profile before anything goes wrong: photos, identifying details, medical " +
      "conditions with per-item sharing control, temperament guidance for anyone who approaches, your " +
      "primary vet's contact info, and a scannable QR tag linking to a public profile page.",
    mock: <BeforeMock />
  },
  during: {
    kicker: "During",
    title: "Launch a focused search",
    description:
      "Mark a pet lost and PetRecovery queries every linked source at once — nearby vet clinics get an " +
      "automatic BOLO email, found-pet reports in the area are matched in real time, and any linked " +
      "tracking device's last ping shows up on the same map as everything else.",
    mock: <DuringMock />
  },
  community: {
    kicker: "Community",
    title: "Let anyone help safely",
    description:
      "A finder doesn't need an account to help — they submit species, color, location, and a photo, " +
      "and nearby vets, shelters, and rescues are notified automatically. Scanning a lost pet's QR tag " +
      "shows only what the owner chose to share: no app, no login, no exposed personal data beyond that.",
    mock: <CommunityMock />
  },
  recovery: {
    kicker: "Recovery",
    title: "Verify reunions carefully",
    description:
      "For pets with a funded reward, funds stay in escrow until three independent checks all pass: the " +
      "finder is within 50 feet of the owner (GPS-verified server-side), the pet's identity is confirmed " +
      "by QR scan or microchip read, and the owner confirms in the app. A partial pass never releases funds.",
    mock: <RecoveryMock />
  }
};

function isPhase(value: string | undefined): value is Phase {
  return !!value && value in CONTENT;
}

export function FeatureShowcasePage() {
  const { phase } = useParams<{ phase: string }>();

  if (!isPhase(phase)) {
    return <Navigate to="/" replace />;
  }

  const content = CONTENT[phase];
  const authed = isAuthenticated();

  return (
    <main style={{ minHeight: "100vh", background: "#eef7f4" }}>
      {authed ? <NavBar /> : <PublicTopBar />}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px 56px" }}>
        <div style={{ marginBottom: 38, marginTop: 28 }}>
          <Link to="/">← Back to home</Link>
        </div>

        <span className="info-kicker">{content.kicker}</span>
        <h1 style={{ marginTop: 4 }}>{content.title}</h1>
        <p style={{ color: "#475569", fontSize: "1.05rem", lineHeight: 1.65, maxWidth: 620 }}>
          {content.description}
        </p>

        <div style={{ margin: "32px 0" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", color: "#94a3b8", marginBottom: 12 }}>
            What this looks like
          </p>
          {content.mock}
        </div>

        <section className="home-callout" style={{ marginTop: 40 }}>
          <div>
            <h2>Ready to get started?</h2>
            <p>Create a free account and register your first pet in a few minutes.</p>
          </div>
          {authed ? (
            <Link to="/dashboard"><button type="button">Go to Dashboard</button></Link>
          ) : (
            <Link to="/register"><button type="button">Create an account</button></Link>
          )}
        </section>
      </div>
      <Footer />
    </main>
  );
}

function BeforeMock() {
  return (
    <div className="section-card" style={{ display: "flex", gap: 18 }}>
      <div
        style={{
          width: 72, height: 72, borderRadius: 12, background: "#f0fdfa",
          display: "grid", placeItems: "center", fontSize: "2rem", flexShrink: 0
        }}
      >
        🐕
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <strong style={{ fontSize: "1.1rem" }}>Biscuit</strong>
          <span className="badge badge-safe">✓ Safe</span>
        </div>
        <p style={{ color: "#5f6f89", fontSize: "0.9rem", margin: "0 0 10px" }}>
          Dog · Labrador mix · Golden · Medium · Chip 985-000-001234
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <span className="tag tag-teal">Friendly — approach freely</span>
          <span className="tag">Diabetes — shared publicly</span>
        </div>
        <p style={{ fontSize: "0.85rem", color: "#5f6f89", margin: "0 0 4px" }}>
          <strong>Emergency note:</strong> Requires insulin injection twice daily
        </p>
        <p style={{ fontSize: "0.85rem", color: "#5f6f89", margin: 0 }}>
          <strong>Primary vet:</strong> Sunny Paws Vet · (512) 555-0134
        </p>
        <p style={{ fontSize: "0.8rem", color: "#0f766e", marginTop: 10, fontWeight: 700 }}>
          🔗 QR tag generated — links to a public profile page
        </p>
      </div>
    </div>
  );
}

function DuringMock() {
  const events = [
    { icon: "📡", text: "BOLO email sent to 4 nearby vet clinics", time: "2 min ago" },
    { icon: "🔍", text: "PetFinder match found, 0.8 mi away", time: "6 min ago" },
    { icon: "📍", text: "AirTag last ping received", time: "12 min ago" }
  ];
  return (
    <div className="section-card">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <strong style={{ fontSize: "1.1rem" }}>Max</strong>
        <span className="badge badge-lost">⚠ Lost</span>
        <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>10 mi search radius</span>
      </div>
      <p style={{ color: "#5f6f89", fontSize: "0.85rem", margin: "0 0 14px" }}>
        Search started 14 minutes ago · streaming results live
      </p>
      {events.map((e) => (
        <div key={e.text} className="list-row" style={{ padding: "8px 0" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: "1.1rem" }}>{e.icon}</span>
            <span style={{ fontSize: "0.9rem" }}>{e.text}</span>
          </div>
          <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>{e.time}</span>
        </div>
      ))}
    </div>
  );
}

function CommunityMock() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="section-card">
        <div className="section-title">👀 Found-pet report submitted</div>
        <p style={{ margin: "0 0 8px", fontSize: "0.9rem" }}>
          Golden retriever, no collar, found near Zilker Park trail entrance.
        </p>
        <span className="tag tag-teal">3 nearby vet clinics, shelters &amp; rescues notified</span>
      </div>
      <div className="section-card">
        <div className="section-title">🔗 Public QR profile (scanned, no login)</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <strong>Luna</strong>
          <span className="badge badge-lost">⚠ Lost</span>
        </div>
        <p style={{ fontSize: "0.85rem", color: "#5f6f89", margin: "0 0 4px" }}>
          <strong>Owner contact:</strong> (512) ***-4821
        </p>
        <p style={{ fontSize: "0.85rem", color: "#5f6f89", margin: 0 }}>
          <strong>Emergency note:</strong> Allergic to bee stings — carries an EpiPen
        </p>
      </div>
    </div>
  );
}

function RecoveryMock() {
  const checks = [
    { label: "Proximity", detail: "32 ft — within the 50 ft threshold", done: true },
    { label: "Pet identity", detail: "Confirmed via QR scan", done: true },
    { label: "Owner identity", detail: "Confirmed in app", done: true }
  ];
  return (
    <div className="section-card">
      <div className="section-title">✅ Verification checklist</div>
      {checks.map((c) => (
        <div key={c.label} className="list-row" style={{ padding: "8px 0" }}>
          <div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{c.detail}</div>
          </div>
          <span style={{ color: "#15803d", fontSize: "1.2rem" }}>✓</span>
        </div>
      ))}
      <div
        style={{
          marginTop: 14, padding: "12px 16px", borderRadius: 8,
          background: "#f0fdf4", border: "1.5px solid #86efac", color: "#15803d",
          fontWeight: 700, textAlign: "center"
        }}
      >
        All checks passed — reward released: $150
      </div>
    </div>
  );
}
