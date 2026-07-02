import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api-client";

export function PetFormPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("dog");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("medium");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.post("/pets", { name, species, color, size });
      navigate(`/pets/${data.pet.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error ?? "Failed to create pet");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="form-page">
      <h1>Add pet profile</h1>
      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>
          Pet name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Species
          <select value={species} onChange={(e) => setSpecies(e.target.value)}>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="bird">Bird</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Color
          <input value={color} onChange={(e) => setColor(e.target.value)} required />
        </label>
        <label>
          Size
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
        <label>
          Photo
          <input type="file" accept="image/png,image/jpeg" />
        </label>
        <button type="submit" disabled={loading}>{loading ? "Saving…" : "Save pet"}</button>
      </form>
    </section>
  );
}
