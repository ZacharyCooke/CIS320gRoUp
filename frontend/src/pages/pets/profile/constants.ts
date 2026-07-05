export const TEMPERAMENT_LABELS: Record<string, { label: string; color: string }> = {
  friendly: { label: "Friendly", color: "#16a34a" },
  cautious: { label: "Cautious", color: "#d97706" },
  report_only: { label: "Report Only - Do Not Approach", color: "#dc2626" }
};

export const SPECIES_LABELS: Record<string, string> = {
  dog: "Dog",
  cat: "Cat",
  bird: "Bird"
};

export const DEVICE_LABELS: Record<string, { label: string; icon: string }> = {
  airtag: { label: "Apple AirTag", icon: "Pin" },
  amazon_tag: { label: "Amazon Smart Tag", icon: "Tag" }
};

export const SOURCE_NAMES: Record<string, string> = {
  petfinder_api: "PetFinder",
  petfbi_scrape: "PetFBI",
  manual_link: "Manual link",
  facebook_groups: "Facebook Groups"
};

export const SOURCE_URLS: Record<string, string> = {
  petfinder_api: "https://www.petfinder.com",
  petfbi_scrape: "https://www.petfbi.org",
  manual_link: "https://petrecovery.app",
  facebook_groups: "https://www.facebook.com"
};
