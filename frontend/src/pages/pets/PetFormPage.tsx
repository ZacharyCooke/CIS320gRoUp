import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api-client";

interface MedicalCondition {
  condition: string;
  share_publicly: boolean;
}

export function PetFormPage() {
  const navigate = useNavigate();

  // Basic
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("dog");
  const [breed, setBreed] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("medium");
  const [microchip, setMicrochip] = useState("");
  const [licenseTag, setLicenseTag] = useState("");

  // Medical
  const [conditions, setConditions] = useState<MedicalCondition[]>([]);
  const [conditionInput, setConditionInput] = useState("");
  const [emergencyNotes, setEmergencyNotes] = useState("");
  const [shareEmergencyNotes, setShareEmergencyNotes] = useState(true);

  // Temperament
  const [temperament, setTemperament] = useState("friendly");
  const [approachNotes, setApproachNotes] = useState("");

  // Vet
  const [vetName, setVetName] = useState("");
  const [vetAddress, setVetAddress] = useState("");
  const [vetPhone, setVetPhone] = useState("");
  const [vetEmail, setVetEmail] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function addCondition() {
    const trimmed = conditionInput.trim();
    if (!trimmed) return;
    setConditions((prev) => [...prev, { condition: trimmed, share_publicly: true }]);
    setConditionInput("");
  }

  function toggleShare(index: number) {
    setConditions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, share_publicly: !c.share_publicly } : c))
    );
  }

  function removeCondition(index: number) {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.post("/pets", {
        name,
        species,
        breed: breed || undefined,
        color,
        size,
        microchip_number: microchip || undefined,
        license_tag: licenseTag || undefined,
        temperament,
        approach_notes: approachNotes || undefined
      });
      const petId: string = data.pet.id;

      if (conditions.length > 0 || emergencyNotes) {
        await apiClient.patch(`/pets/${petId}/medical`, {
          medical_conditions: conditions,
          medical_emergency_notes: emergencyNotes || null,
          share_emergency_notes: shareEmergencyNotes
        });
      }

      if (vetName) {
        await apiClient.put(`/pets/${petId}/vet`, {
          clinic_name: vetName,
          address: vetAddress || null,
          phone: vetPhone || null,
          email: vetEmail || null
        });
      }

      navigate(`/pets/${petId}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error ?? "Failed to create pet");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ maxWidth: 640, margin: "0 auto", padding: "1.5rem" }}>
      <h1>Add pet profile</h1>
      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>

        <fieldset>
          <legend>Basic Info</legend>
          <label>
            Pet name *
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Species *
            <select value={species} onChange={(e) => setSpecies(e.target.value)}>
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
            Color *
            <input value={color} onChange={(e) => setColor(e.target.value)} required />
          </label>
          <label>
            Size *
            <select value={size} onChange={(e) => setSize(e.target.value)}>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </label>
          <label>
            Microchip number
            <input value={microchip} onChange={(e) => setMicrochip(e.target.value)} placeholder="15-digit number" />
          </label>
          <label>
            License tag
            <input value={licenseTag} onChange={(e) => setLicenseTag(e.target.value)} />
          </label>
          <label>
            Photo
            <input type="file" accept="image/png,image/jpeg" />
          </label>
        </fieldset>

        <fieldset>
          <legend>Temperament</legend>
          <label>
            Approach behavior
            <select value={temperament} onChange={(e) => setTemperament(e.target.value)}>
              <option value="friendly">Friendly — approach freely</option>
              <option value="cautious">Cautious — approach carefully</option>
              <option value="report_only">Report Only — do not approach</option>
            </select>
          </label>
          {temperament !== "friendly" && (
            <label>
              Approach notes
              <textarea
                value={approachNotes}
                onChange={(e) => setApproachNotes(e.target.value)}
                placeholder="e.g. May bite if startled; use treats"
                rows={3}
              />
            </label>
          )}
        </fieldset>

        <fieldset>
          <legend>Medical Conditions</legend>
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <input
              value={conditionInput}
              onChange={(e) => setConditionInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCondition(); } }}
              placeholder="e.g. Diabetes"
            />
            <button type="button" onClick={addCondition}>Add</button>
          </div>
          {conditions.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {conditions.map((c, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ flex: 1 }}>{c.condition}</span>
                  <label style={{ fontSize: "0.85em" }}>
                    <input
                      type="checkbox"
                      checked={c.share_publicly}
                      onChange={() => toggleShare(i)}
                    />
                    {" "}Share publicly
                  </label>
                  <button type="button" onClick={() => removeCondition(i)} aria-label="Remove">✕</button>
                </li>
              ))}
            </ul>
          )}
          <label>
            Emergency medical notes
            <textarea
              value={emergencyNotes}
              onChange={(e) => setEmergencyNotes(e.target.value)}
              placeholder="e.g. Requires insulin injection twice daily"
              rows={3}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
            <input
              type="checkbox"
              checked={shareEmergencyNotes}
              onChange={(e) => setShareEmergencyNotes(e.target.checked)}
            />
            Share emergency notes on public profile
          </label>
        </fieldset>

        <fieldset>
          <legend>Primary Veterinarian</legend>
          <label>
            Clinic name
            <input value={vetName} onChange={(e) => setVetName(e.target.value)} placeholder="e.g. Sunny Paws Vet" />
          </label>
          <label>
            Address
            <input value={vetAddress} onChange={(e) => setVetAddress(e.target.value)} />
          </label>
          <label>
            Phone
            <input value={vetPhone} onChange={(e) => setVetPhone(e.target.value)} type="tel" />
          </label>
          <label>
            Email
            <input value={vetEmail} onChange={(e) => setVetEmail(e.target.value)} type="email" />
          </label>
        </fieldset>

        <button type="submit" disabled={loading}>{loading ? "Saving…" : "Save pet"}</button>
      </form>
    </section>
  );
}
