import { useEffect, useState } from "react";
import { apiClient } from "../../services/api-client";

export function FoundReportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [color, setColor] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  function autoFillGPS() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setError("Could not get GPS. Enter coordinates manually.");
        setLocating(false);
      }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const centerLat = parseFloat(lat);
    const centerLng = parseFloat(lng);
    if (isNaN(centerLat) || isNaN(centerLng)) {
      setError("Enter valid latitude and longitude.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      if (name) formData.append("reporter_name", name);
      if (email) formData.append("reporter_email", email);
      if (phone) formData.append("reporter_phone", phone);
      formData.append("description", description);
      if (species) formData.append("species", species);
      if (breed) formData.append("breed", breed);
      if (color) formData.append("color", color);
      formData.append("lat", String(centerLat));
      formData.append("lng", String(centerLng));
      if (photoFile) formData.append("photo", photoFile);

      await apiClient.post("/found-reports", formData);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="form-page-wrapper">
        <section className="form-page" style={{ textAlign: "center" }}>
          <h1 style={{ color: "#0f766e" }}>Report submitted!</h1>
          <p>Thank you for helping reunite a pet with its owner. Your report has been sent to nearby active searches.</p>
          <button type="button" onClick={() => setSuccess(false)}>Submit another report</button>
        </section>
      </div>
    );
  }

  return (
    <div className="form-page-wrapper">
      <section className="form-page" style={{ maxWidth: 560 }}>
        <h1>🐾 Report a Found Pet</h1>
        <p style={{ color: "#6b7280", marginBottom: "1.25rem", marginTop: 0 }}>
          No account needed. Fill in what you know — every detail helps.
        </p>

        <div className="info-banner-green" style={{ marginBottom: "1.25rem" }}>
          ✅ <div>Reports are matched against active searches in real time. If yours matches a lost pet nearby, the owner is notified immediately.</div>
        </div>

        {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-section-title">Pet Description</div>

          <div className="form-row-2">
            <label>
              Species
              <select value={species} onChange={(e) => setSpecies(e.target.value)}>
                <option value="">Unknown</option>
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="bird">Bird</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Color
              <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. golden" />
            </label>
          </div>

          <label>
            Breed <span style={{ fontWeight: 400, color: "#6b7280" }}>(if known)</span>
            <input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="e.g. Labrador mix" />
          </label>

          <label>
            Description <span style={{ fontWeight: 400, color: "#dc2626" }}>*</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              placeholder="Where you found the pet, its condition, any distinctive markings…"
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", font: "inherit", resize: "vertical" }}
            />
          </label>

          <div>
            <span style={{ fontWeight: 700 }}>Photo <span style={{ fontWeight: 400, color: "#6b7280" }}>(optional)</span></span>
            <label className="photo-dropzone" style={{ marginTop: 6 }}>
              <div className="icon">📷</div>
              <p>Click to upload a photo</p>
              <small>JPG or PNG · Max 5MB</small>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {photoPreviewUrl && (
              <div className="photo-preview-thumb">
                <img src={photoPreviewUrl} alt="Selected photo preview" />
              </div>
            )}
          </div>

          <hr className="form-section-divider" />
          <div className="form-section-title">Where It Was Found</div>

          <label>
            Location <span style={{ fontWeight: 400, color: "#dc2626" }}>*</span>
            <button type="button" onClick={autoFillGPS} disabled={locating} className="btn-outline" style={{ marginBottom: "0.5rem" }}>
              {locating ? "Getting location…" : "📍 Use my GPS location"}
            </button>
            <div className="form-row-2">
              <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" required />
              <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" required />
            </div>
          </label>

          <hr className="form-section-divider" />
          <div className="form-section-title">Your Contact Info</div>

          <div className="form-row-2">
            <label>
              Your name <span style={{ fontWeight: 400, color: "#6b7280" }}>(optional)</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Your phone <span style={{ fontWeight: 400, color: "#6b7280" }}>(optional)</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
            </label>
          </div>
          <label>
            Your email <span style={{ fontWeight: 400, color: "#6b7280" }}>(optional)</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </label>
          <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: "-8px 0 4px" }}>
            Shared only with the owner if their pet matches your report.
          </p>

          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Found Pet Report →"}
          </button>
        </form>
      </section>
    </div>
  );
}
