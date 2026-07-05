import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../../../services/api-client";
import { SOURCE_NAMES, SOURCE_URLS } from "./constants";
import type { ExternalSource, Pet, PetQr, TrackingDevice, Vet } from "./types";

export function usePetProfile() {
  const { id } = useParams<{ id: string }>();
  const [pet, setPet] = useState<Pet | null>(null);
  const [vet, setVet] = useState<Vet | null>(null);
  const [qr, setQr] = useState<PetQr | null>(null);
  const [devices, setDevices] = useState<TrackingDevice[]>([]);
  const [sources, setSources] = useState<ExternalSource[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deviceUrl, setDeviceUrl] = useState("");
  const [deviceType, setDeviceType] = useState("airtag");
  const [sourceType, setSourceType] = useState("petfinder_api");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showMarkLost, setShowMarkLost] = useState(false);
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setPet(null);
    setVet(null);
    setQr(null);
    setLoadError(null);

    apiClient
      .get(`/pets/${id}`)
      .then(({ data }) => setPet(data.pet))
      .catch(() => setLoadError("Could not load pet profile"));
    apiClient
      .get(`/pets/${id}/vet`)
      .then(({ data }) => setVet(data.vet))
      .catch(() => {});
    apiClient
      .get(`/pets/${id}/qr`)
      .then(({ data }) => setQr({ png_data_url: data.png_data_url, profile_url: data.profile_url }))
      .catch(() => {});
    apiClient
      .get(`/pets/${id}/active-search`)
      .then(({ data }) => setActiveSearchId(data.search?.id ?? null))
      .catch(() => setActiveSearchId(null));
    apiClient
      .get(`/pets/${id}/tracking-devices`)
      .then(({ data }) => setDevices(data.tracking_devices ?? []))
      .catch(() => {});
    apiClient
      .get(`/pets/${id}/external-sources`)
      .then(({ data }) => setSources(data.external_sources ?? []))
      .catch(() => {});
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

  async function linkDevice(event: FormEvent) {
    event.preventDefault();
    setActionMsg(null);
    setActionError(null);
    try {
      const { data } = await apiClient.post(`/pets/${id}/tracking-devices`, {
        device_type: deviceType,
        share_url: deviceUrl
      });
      setDevices((prev) => [...prev, data.tracking_device]);
      setActionMsg("Tracking device linked.");
      setDeviceUrl("");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setActionError(e.response?.data?.error ?? "Failed to link device");
    }
  }

  async function linkSource(event: FormEvent) {
    event.preventDefault();
    setActionMsg(null);
    setActionError(null);
    try {
      const { data } = await apiClient.post(`/pets/${id}/external-sources`, {
        source_type: sourceType,
        source_name: SOURCE_NAMES[sourceType] ?? sourceType,
        source_url: SOURCE_URLS[sourceType] ?? "https://petrecovery.app"
      });
      setSources((prev) => [...prev, data.external_source]);
      setActionMsg(`${SOURCE_NAMES[sourceType] ?? sourceType} linked.`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setActionError(e.response?.data?.error ?? "Failed to link source");
    }
  }

  return {
    pet,
    vet,
    qr,
    devices,
    sources,
    loadError,
    deviceUrl,
    deviceType,
    sourceType,
    actionMsg,
    actionError,
    showMarkLost,
    activeSearchId,
    setDeviceUrl,
    setDeviceType,
    setSourceType,
    setShowMarkLost,
    rotateQr,
    linkDevice,
    linkSource
  };
}

export type PetProfileState = ReturnType<typeof usePetProfile>;
