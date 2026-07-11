import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../../../services/api-client";
import type { SourceOption } from "./constants";
import type { ExternalSource, Pet, PetQr, TrackingDevice, Vet } from "./types";

export function usePetProfile() {
  const { id } = useParams<{ id: string }>();
  const [pet, setPet] = useState<Pet | null>(null);
  const [vet, setVet] = useState<Vet | null>(null);
  const [qr, setQr] = useState<PetQr | null>(null);
  const [devices, setDevices] = useState<TrackingDevice[]>([]);
  const [sources, setSources] = useState<ExternalSource[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showMarkLost, setShowMarkLost] = useState(false);
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);

  function loadSecondary() {
    if (!id) return;
    const onSectionError = () => setSectionsError(
      "Some profile details (vet, QR code, tracking devices, or external sources) failed to load — try refreshing."
    );

    apiClient
      .get(`/pets/${id}/vet`)
      .then(({ data }) => setVet(data.vet))
      .catch(onSectionError);
    apiClient
      .get(`/pets/${id}/qr`)
      .then(({ data }) => setQr({ png_data_url: data.png_data_url, profile_url: data.profile_url }))
      .catch(onSectionError);
    apiClient
      .get(`/pets/${id}/active-search`)
      .then(({ data }) => setActiveSearchId(data.search?.id ?? null))
      .catch(() => setActiveSearchId(null));
    apiClient
      .get(`/pets/${id}/tracking-devices`)
      .then(({ data }) => setDevices(data.tracking_devices ?? []))
      .catch(onSectionError);
    apiClient
      .get(`/pets/${id}/external-sources`)
      .then(({ data }) => setSources(data.external_sources ?? []))
      .catch(onSectionError);
  }

  useEffect(() => {
    if (!id) return;
    setPet(null);
    setVet(null);
    setQr(null);
    setLoadError(null);
    setSectionsError(null);

    apiClient
      .get(`/pets/${id}`)
      .then(({ data }) => setPet(data.pet))
      .catch(() => setLoadError("Could not load pet profile"));
    loadSecondary();
  }, [id]);

  async function rotateQr() {
    setActionMsg(null);
    setActionError(null);
    try {
      await apiClient.post(`/pets/${id}/rotate-qr`);
      const { data } = await apiClient.get(`/pets/${id}/qr`);
      setQr({ png_data_url: data.png_data_url, profile_url: data.profile_url });
      setActionMsg("QR code regenerated. The previous code no longer works.");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setActionError(e.response?.data?.error ?? "Failed to regenerate QR code");
    }
  }

  async function linkDevice(deviceType: string, shareUrl: string): Promise<boolean> {
    setActionMsg(null);
    setActionError(null);
    try {
      const { data } = await apiClient.post(`/pets/${id}/tracking-devices`, {
        device_type: deviceType,
        share_url: shareUrl
      });
      setDevices((prev) => [...prev, data.tracking_device]);
      setActionMsg("Tracking device linked.");
      return true;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setActionError(e.response?.data?.error ?? "Failed to link device");
      return false;
    }
  }

  async function linkSource(option: SourceOption, url: string): Promise<boolean> {
    setActionMsg(null);
    setActionError(null);
    try {
      const { data } = await apiClient.post(`/pets/${id}/external-sources`, {
        source_type: option.db_source_type,
        source_name: option.label,
        source_url: url
      });
      setSources((prev) => [...prev, data.external_source]);
      setActionMsg(`${option.label} linked.`);
      return true;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setActionError(e.response?.data?.error ?? "Failed to link source");
      return false;
    }
  }

  return {
    pet,
    vet,
    qr,
    devices,
    sources,
    loadError,
    sectionsError,
    actionMsg,
    actionError,
    showMarkLost,
    activeSearchId,
    setShowMarkLost,
    rotateQr,
    linkDevice,
    linkSource,
    retrySections: () => {
      setSectionsError(null);
      loadSecondary();
    }
  };
}

export type PetProfileState = ReturnType<typeof usePetProfile>;
