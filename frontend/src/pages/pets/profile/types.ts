export interface MedicalCondition {
  condition: string;
  share_publicly: boolean;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  color: string;
  size: string;
  status: string;
  temperament: string;
  temperament_custom: string | null;
  approach_notes: string | null;
  medical_conditions: MedicalCondition[];
  medical_emergency_notes: string | null;
  share_emergency_notes: boolean;
  photo_urls: string[];
}

export interface Vet {
  clinic_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export interface TrackingDevice {
  id: string;
  device_type: string;
  share_url: string;
  last_updated_at: string | null;
}

export interface ExternalSource {
  id: string;
  source_name: string;
  source_type: string;
  is_active: boolean;
}

export interface PetQr {
  png_data_url: string;
  profile_url: string;
}
