export const TEMPERAMENT_LABELS: Record<string, { label: string; color: string }> = {
  friendly: { label: "Friendly", color: "#16a34a" },
  cautious: { label: "Cautious", color: "#d97706" },
  report_only: { label: "Report Only - Do Not Approach", color: "#dc2626" }
};

export const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐕",
  cat: "🐈",
  bird: "🐦"
};

export const DEVICE_LABELS: Record<string, { label: string; icon: string }> = {
  airtag: { label: "Apple AirTag", icon: "Pin" },
  amazon_tag: { label: "Amazon Smart Tag", icon: "Tag" }
};

export interface DeviceTypeOption {
  value: string;
  label: string;
}

export const DEVICE_TYPE_OPTIONS: DeviceTypeOption[] = [
  { value: "airtag", label: "AirTag" },
  { value: "amazon_tag", label: "Amazon Tag" }
];

export interface SourceOption {
  // Stable UI key, distinct from db_source_type since several of these
  // (the four site-specific ones with no real backend integration) share
  // the same underlying "manual_link" enum value but need their own
  // identity for the linked/not-linked button state and source_name.
  key: string;
  label: string;
  db_source_type: "petfinder_api" | "petfbi_scrape" | "manual_link" | "facebook_groups";
  default_url: string;
}

export const SOURCE_OPTIONS: SourceOption[] = [
  { key: "petfinder_api", label: "PetFinder", db_source_type: "petfinder_api", default_url: "https://www.petfinder.com" },
  { key: "petfbi_scrape", label: "PetFBI", db_source_type: "petfbi_scrape", default_url: "https://www.petfbi.org" },
  { key: "facebook_groups", label: "Facebook Groups", db_source_type: "facebook_groups", default_url: "https://www.facebook.com" },
  { key: "24petconnect", label: "24PetConnect.com", db_source_type: "manual_link", default_url: "https://www.24petconnect.com" },
  { key: "petco_love_lost", label: "Petco Love Lost", db_source_type: "manual_link", default_url: "https://lost.petcolove.org" },
  { key: "pawboost", label: "PawBoost", db_source_type: "manual_link", default_url: "https://www.pawboost.com" },
  { key: "nextdoor", label: "Nextdoor", db_source_type: "manual_link", default_url: "https://nextdoor.com" },
  { key: "manual_link", label: "Manual Link", db_source_type: "manual_link", default_url: "" }
];
