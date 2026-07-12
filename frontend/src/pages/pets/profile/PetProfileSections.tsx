import { useState } from "react";
import { DEVICE_LABELS, DEVICE_TYPE_OPTIONS, SOURCE_OPTIONS, TEMPERAMENT_LABELS, type SourceOption } from "./constants";
import type { PetProfileState } from "./usePetProfile";
import { EmptyState } from "../../../components/EmptyState";
import { LinkPopover } from "./LinkPopover";

interface Props {
  profile: PetProfileState;
}

export function PetTemperamentCard({ profile }: Props) {
  const { pet } = profile;
  if (!pet) return null;

  const temperamentInfo = pet.temperament === "custom"
    ? { label: pet.temperament_custom ?? "Custom", color: "#6b7280" }
    : TEMPERAMENT_LABELS[pet.temperament] ?? { label: pet.temperament, color: "#6b7280" };

  return (
    <div className="section-card">
      <div className="section-title">Temperament &amp; Approach</div>
      <span className="badge" style={{ background: temperamentInfo.color, color: "#fff" }}>
        {temperamentInfo.label}
      </span>
      {pet.approach_notes && (
        <p style={{ marginTop: 10, fontStyle: "italic", color: "#475569" }}>{pet.approach_notes}</p>
      )}
    </div>
  );
}

export function PetProfileSections({ profile }: Props) {
  const { pet } = profile;
  if (!pet) return null;

  const publicConditions = pet.medical_conditions.filter((c) => c.share_publicly);
  const activeSources = profile.sources.filter((s) => s.is_active);
  const hasMedical = publicConditions.length > 0;
  const hasVet = Boolean(profile.vet);

  return (
    <>
      {(hasMedical || hasVet) && (
        <div className="section-grid">
          {hasMedical && (
            <div className="section-card">
              <div className="section-title">Medical Information</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {publicConditions.map((condition, index) => <li key={index}>{condition.condition}</li>)}
              </ul>
              {pet.medical_emergency_notes && pet.share_emergency_notes && (
                <p style={{
                  background: "#fef2f2",
                  border: "1px solid #fca5a5",
                  padding: "8px 10px",
                  borderRadius: 8,
                  marginTop: 12,
                  fontSize: "0.85rem"
                }}>
                  <strong>Emergency note:</strong> {pet.medical_emergency_notes}
                </p>
              )}
            </div>
          )}

          {profile.vet && (
            <div className="section-card">
              <div className="section-title">Primary Veterinarian</div>
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", padding: "10px 14px", borderRadius: 8 }}>
                <strong>{profile.vet.clinic_name}</strong>
                {profile.vet.address && <div style={{ fontSize: "0.85rem", marginTop: 4 }}>{profile.vet.address}</div>}
                {profile.vet.phone && <div style={{ fontSize: "0.85rem" }}>Phone: {profile.vet.phone}</div>}
                {profile.vet.email && <div style={{ fontSize: "0.85rem" }}>Email: {profile.vet.email}</div>}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="section-stack">
        <TrackingDevicesSection profile={profile} />
        <ExternalSourcesSection profile={profile} activeSources={activeSources} />
        {profile.qr && <QrCodeSection profile={profile} />}
      </div>
    </>
  );
}

function TrackingDevicesSection({ profile }: Props) {
  const [openType, setOpenType] = useState<string | null>(null);

  return (
    <div className="section-card">
      <div className="section-title">Tracking Devices</div>
      {profile.devices.map((device) => {
        const info = DEVICE_LABELS[device.device_type] ?? { label: device.device_type, icon: "Tracker" };
        return (
          <div className="list-row" key={device.id}>
            <div className="list-row-left">
              <span className="list-row-icon">{info.icon}</span>
              <div>
                <div className="list-row-name">{info.label}</div>
                <div className="list-row-sub">
                  {device.last_updated_at
                    ? `Updated ${new Date(device.last_updated_at).toLocaleDateString()}`
                    : "Share URL linked"}
                </div>
              </div>
            </div>
            <span className="status-pill">Active</span>
          </div>
        );
      })}

      {profile.devices.length === 0 && <EmptyState compact message="No tracking devices linked yet." />}

      <div className="option-btn-grid">
        {DEVICE_TYPE_OPTIONS.map((option) => {
          const linked = profile.devices.some((d) => d.device_type === option.value);
          return (
            <div key={option.value} style={{ position: "relative" }}>
              <button
                type="button"
                className={linked ? "option-btn option-btn-linked" : "option-btn"}
                onClick={() => setOpenType(openType === option.value ? null : option.value)}
              >
                {linked ? "✓ " : ""}{option.label}
              </button>
              {openType === option.value && (
                <LinkPopover
                  label={option.label}
                  defaultUrl=""
                  onClose={() => setOpenType(null)}
                  onSubmit={(url) => profile.linkDevice(option.value, url)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExternalSourcesSection({
  profile,
  activeSources
}: Props & { activeSources: PetProfileState["sources"] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="section-card">
      <div className="section-title">External Sources</div>

      <SearchTipsPanel />

      <div className="option-btn-grid">
        {SOURCE_OPTIONS.map((option: SourceOption) => {
          const linked = activeSources.some((s) => s.source_name === option.label);
          return (
            <div key={option.key} style={{ position: "relative" }}>
              <button
                type="button"
                className={linked ? "option-btn option-btn-linked" : "option-btn"}
                onClick={() => setOpenKey(openKey === option.key ? null : option.key)}
              >
                {linked ? "✓ " : ""}{option.label}
              </button>
              {openKey === option.key && (
                <LinkPopover
                  label={option.label}
                  defaultUrl={option.default_url}
                  onClose={() => setOpenKey(null)}
                  onSubmit={(url) => profile.linkSource(option, url)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QrCodeSection({ profile }: Props) {
  const { pet, qr } = profile;
  if (!pet || !qr) return null;

  return (
    <div className="section-card full">
      <div className="section-title">QR Code &amp; Smart Tag</div>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <img
          src={qr.png_data_url}
          alt={`QR code for ${pet.name}`}
          style={{ width: 140, height: 140, border: "1px solid #e5e7eb", borderRadius: 12, flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 220 }}>
          <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 10 }}>
            Print this on a collar tag. Anyone who scans it sees {pet.name}&apos;s public profile, no app or login required.
          </p>
          <p style={{ fontSize: "0.8rem", wordBreak: "break-all", marginBottom: 12 }}>
            <a href={qr.profile_url} target="_blank" rel="noopener noreferrer">{qr.profile_url}</a>
          </p>
          <div className="action-row">
            <a href={qr.png_data_url} download={`${pet.name}-qr.png`}>
              <button type="button">Download PNG</button>
            </a>
            <button
              type="button"
              style={{ background: "#fff", color: "#0f766e", border: "1.5px solid #99f6e4" }}
              onClick={profile.rotateQr}
            >
              Regenerate code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchTipsPanel() {
  return (
    <details className="tips-panel">
      <summary>🔎 How to search for a lost pet</summary>

      <h4>Important local resources</h4>
      <p>
        Your city or county animal shelter&apos;s website — check every day, including shelters outside your
        immediate city. Shelter databases may update several times daily, and animals can be transported across
        jurisdictional boundaries.
      </p>
      <p className="tips-example-label">Example (San Diego County):</p>
      <ul>
        <li>
          <strong>San Diego Humane Society Lost &amp; Found</strong> — for much of San Diego County, this should be
          checked immediately. Its online stray-animal database updates in real time. You can also text LOST to
          858-SAN-LOST for instructions.
        </li>
        <li>
          <strong>San Diego County Department of Animal Services</strong> — important for animals taken to the
          county shelters serving areas such as Bonita and Carlsbad. The county also directs lost-pet reports
          through PawBoost.
        </li>
        <li>
          <strong>Chula Vista Animal Care Facility</strong> — check separately when the pet was lost in Chula
          Vista, National City, or Lemon Grove. Its animals are posted through 24Petconnect and the listings are
          updated regularly.
        </li>
      </ul>

      <h4>Additional places worth posting</h4>
      <ul>
        <li>
          <strong>Facebook lost-and-found pet groups</strong> — search for groups using the city, ZIP code,
          neighborhood and county name, such as &quot;Lost and Found Pets San Diego County.&quot;
        </li>
        <li>
          <strong>Craigslist Lost &amp; Found and Pets sections</strong> — less organized than the dedicated
          databases, but people still post found dogs, cats and birds there. Search multiple nearby areas and
          alternate descriptions.
        </li>
        <li>
          <strong>Ring Neighbors</strong> — useful for requesting doorbell-camera footage and reaching people
          within a small geographic radius, especially when the animal was recently seen.
        </li>
      </ul>

      <h4>Best order to use them</h4>
      <p>
        Post immediately on Petco Love Lost, PawBoost and Pet FBI, then search 24Petconnect and every local
        shelter database. Next, post on Nextdoor, Facebook, Ring Neighbors and Craigslist. Repeat shelter searches
        at least daily because descriptions, breeds, colors and photos are frequently entered incorrectly.
      </p>
    </details>
  );
}
