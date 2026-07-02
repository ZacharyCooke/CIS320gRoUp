import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../../services/api-client";

interface Pet {
  id: string;
  name: string;
  species: string;
  color: string;
  status: string;
}

export function PetProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deviceUrl, setDeviceUrl] = useState("");
  const [deviceType, setDeviceType] = useState("airtag");
  const [sourceType, setSourceType] = useState("petfinder_api");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiClient
      .get(`/pets/${id}`)
      .then(({ data }) => setPet(data.pet))
      .catch(() => setLoadError("Could not load pet profile"));
  }, [id]);

  async function linkDevice(event: React.FormEvent) {
    event.preventDefault();
    setActionMsg(null);
    setActionError(null);
    try {
      await apiClient.post(`/pets/${id}/tracking-devices`, {
        device_type: deviceType,
        share_url: deviceUrl
      });
      setActionMsg("Tracking device linked.");
      setDeviceUrl("");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setActionError(e.response?.data?.error ?? "Failed to link device");
    }
  }

  async function linkSource(event: React.FormEvent) {
    event.preventDefault();
    setActionMsg(null);
    setActionError(null);
    const sourceNames: Record<string, string> = {
      petfinder_api: "PetFinder",
      petfbi_scrape: "PetFBI",
      manual_link: "Manual link",
      facebook_groups: "Facebook Groups"
    };
    const sourceUrls: Record<string, string> = {
      petfinder_api: "https://www.petfinder.com",
      petfbi_scrape: "https://www.petfbi.org",
      manual_link: "https://petrecovery.app",
      facebook_groups: "https://www.facebook.com"
    };
    try {
      await apiClient.post(`/pets/${id}/external-sources`, {
        source_type: sourceType,
        source_name: sourceNames[sourceType] ?? sourceType,
        source_url: sourceUrls[sourceType] ?? "https://petrecovery.app"
      });
      setActionMsg(`${sourceNames[sourceType] ?? sourceType} linked.`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setActionError(e.response?.data?.error ?? "Failed to link source");
    }
  }

  if (loadError) return <p role="alert" style={{ color: "red" }}>{loadError}</p>;
  if (!pet) return <p>Loading…</p>;

  return (
    <section>
      <Link to="/dashboard">← Dashboard</Link>
      <h1>{pet.name}</h1>
      <p>{pet.species} · {pet.color} · {pet.status}</p>

      {actionMsg && <p style={{ color: "green" }}>{actionMsg}</p>}
      {actionError && <p role="alert" style={{ color: "red" }}>{actionError}</p>}

      <h2>Link Tracking Device</h2>
      <form onSubmit={linkDevice}>
        <label>
          Device type
          <select value={deviceType} onChange={(e) => setDeviceType(e.target.value)}>
            <option value="airtag">AirTag</option>
            <option value="amazon_tag">Amazon Tag</option>
          </select>
        </label>
        <label>
          Share URL
          <input
            value={deviceUrl}
            onChange={(e) => setDeviceUrl(e.target.value)}
            type="url"
            placeholder="https://findmy.apple.com/…"
            required
          />
        </label>
        <button type="submit">Link device</button>
      </form>

      <h2>Link External Source</h2>
      <form onSubmit={linkSource}>
        <label>
          Source
          <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
            <option value="petfinder_api">PetFinder</option>
            <option value="petfbi_scrape">PetFBI</option>
            <option value="facebook_groups">Facebook Groups</option>
            <option value="manual_link">Manual link</option>
          </select>
        </label>
        <button type="submit">Link source</button>
      </form>
    </section>
  );
}
