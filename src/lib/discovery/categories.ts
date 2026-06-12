// ─── Niche → OSM Tag Mapping ───────────────────────────────────────────────────
// Maps human-readable niche names to Overpass QL queries.

export interface NicheDefinition {
  label: string;
  osmTags: Array<{ key: string; value: string }>;
  /** OSM amenity/shop values that map to this niche */
  osmValues: string[];
  /** Business categories that earn the category bonus in opportunity scoring */
  highOpportunity: boolean;
}

export const NICHES: Record<string, NicheDefinition> = {
  restaurant: {
    label: "Restaurants",
    osmTags: [
      { key: "amenity", value: "restaurant" },
      { key: "amenity", value: "fast_food" },
    ],
    osmValues: ["restaurant", "fast_food"],
    highOpportunity: true,
  },
  cafe: {
    label: "Cafes & Coffee Shops",
    osmTags: [{ key: "amenity", value: "cafe" }],
    osmValues: ["cafe"],
    highOpportunity: true,
  },
  bar: {
    label: "Bars & Pubs",
    osmTags: [{ key: "amenity", value: "bar" }],
    osmValues: ["bar"],
    highOpportunity: false,
  },
  hotel: {
    label: "Hotels & Accommodation",
    osmTags: [
      { key: "tourism", value: "hotel" },
      { key: "tourism", value: "guest_house" },
    ],
    osmValues: ["hotel", "guest_house"],
    highOpportunity: false,
  },
  plumber: {
    label: "Plumbers",
    osmTags: [
      { key: "craft", value: "plumber" },
      { key: "service", value: "plumbing" },
    ],
    osmValues: ["plumber"],
    highOpportunity: true,
  },
  electrician: {
    label: "Electricians",
    osmTags: [{ key: "craft", value: "electrician" }],
    osmValues: ["electrician"],
    highOpportunity: true,
  },
  lawyer: {
    label: "Lawyers & Legal Services",
    osmTags: [
      { key: "office", value: "lawyer" },
      { key: "office", value: "legal_service" },
    ],
    osmValues: ["lawyer", "legal_service"],
    highOpportunity: true,
  },
  dentist: {
    label: "Dentists",
    osmTags: [{ key: "amenity", value: "dentist" }],
    osmValues: ["dentist"],
    highOpportunity: true,
  },
  doctor: {
    label: "Doctors & Clinics",
    osmTags: [
      { key: "amenity", value: "doctors" },
      { key: "amenity", value: "clinic" },
      { key: "amenity", value: "hospital" },
    ],
    osmValues: ["doctors", "clinic"],
    highOpportunity: true,
  },
  accountant: {
    label: "Accountants & Bookkeepers",
    osmTags: [
      { key: "office", value: "accountant" },
      { key: "office", value: "financial_advisor" },
    ],
    osmValues: ["accountant", "financial_advisor"],
    highOpportunity: true,
  },
  real_estate: {
    label: "Real Estate Agents",
    osmTags: [{ key: "office", value: "estate_agent" }],
    osmValues: ["estate_agent"],
    highOpportunity: true,
  },
  salon: {
    label: "Hair & Beauty Salons",
    osmTags: [{ key: "shop", value: "hairdresser" }],
    osmValues: ["hairdresser"],
    highOpportunity: false,
  },
  gym: {
    label: "Gyms & Fitness Studios",
    osmTags: [
      { key: "leisure", value: "fitness_station" },
      { key: "sport", value: "gym" },
    ],
    osmValues: ["gym"],
    highOpportunity: false,
  },
  mechanic: {
    label: "Mechanics & Auto Repair",
    osmTags: [{ key: "shop", value: "car_repair" }],
    osmValues: ["car_repair"],
    highOpportunity: true,
  },
  cleaner: {
    label: "Cleaning Services",
    osmTags: [
      { key: "service", value: "cleaning" },
      { key: "office", value: "cleaning_service" },
    ],
    osmValues: ["cleaning"],
    highOpportunity: false,
  },
  photographer: {
    label: "Photographers",
    osmTags: [{ key: "shop", value: "photo" }],
    osmValues: ["photo"],
    highOpportunity: false,
  },
  "web_design": {
    label: "Web Designers & Agencies",
    osmTags: [{ key: "office", value: "web_design" }],
    osmValues: ["web_design"],
    highOpportunity: false,
  },
  florist: {
    label: "Florists",
    osmTags: [{ key: "shop", value: "florist" }],
    osmValues: ["florist"],
    highOpportunity: false,
  },
  bakery: {
    label: "Bakeries",
    osmTags: [{ key: "shop", value: "bakery" }],
    osmValues: ["bakery"],
    highOpportunity: false,
  },
  pharmacy: {
    label: "Pharmacies",
    osmTags: [{ key: "amenity", value: "pharmacy" }],
    osmValues: ["pharmacy"],
    highOpportunity: false,
  },
};

export const NICHE_KEYS = Object.keys(NICHES);

export function getNicheKeys(): string[] {
  return NICHE_KEYS;
}

export function getNiche(key: string): NicheDefinition | null {
  return NICHES[key] ?? null;
}
