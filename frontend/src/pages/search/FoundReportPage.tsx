import { useState } from "react";
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
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await apiClient.post("/found-reports", {
        reporter_name: name || null,
        reporter_email: email || null,
        reporter_phone: phone || null,
        description,
        species: species || null,
        breed: breed || null,
        color: color || null,
        lat: centerLat,
        lng: centerLng
      });
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
      <section className="form-page">
        <h1>Report a Found Pet</h1>
        <p style={{ color: "#6b7280", marginBottom: "1.5rem", marginTop: 0 }}>
          No account needed. Fill in what you know — every detail helps.
        </p>

        {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <label>
            Your name <span style={{ fontWeight: 400, color: "#6b7280" }}>(optional)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Your email <span style={{ fontWeight: 400, color: "#6b7280" }}>(optional)</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </label>
          <label>
            Your phone <span style={{ fontWeight: 400, color: "#6b7280" }}>(optional)</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
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
              Breed
              <input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="e.g. Labrador" />
            </label>
            <label>
              Color
              <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. golden" />
            </label>
          </div>

          <label>
            Where was the pet found? <span style={{ fontWeight: 400, color: "#dc2626" }}>*</span>
            <button type="button" onClick={autoFillGPS} disabled={locating}
              style={{ background: "#e0f2f1", color: "#0f766e", border: "none", marginBottom: "0.5rem" }}>
              {locating ? "Getting location…" : "Use my GPS location"}
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" required />
              <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" required />
            </div>
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Report"}
          </button>
        </form>
      </section>
    </div>
  );
}
