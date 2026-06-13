// ─── OSM Discovery Client ───────────────────────────────────────────────────────
// Proxies Overpass API calls server-side to avoid CORS and hide from client.

import type { DiscoveredBusiness, OsmElement } from "@/types";
import type { NicheDefinition } from "./categories";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
];

const OVERPASS_TIMEOUT = 30000; // 30s

/**
 * Build an Overpass QL query for businesses matching a niche in a city.
 * Uses Nominatim to geocode the city first, then searches within a ~10km radius.
 */
export async function discoverBusinesses(
  niche: NicheDefinition,
  city: string,
  country: string,
  limit = 50,
): Promise<DiscoveredBusiness[]> {
  // Step 1: Geocode city → lat/lon + bounding box
  const geo = await geocodeCity(city, country);
  if (!geo) return [];

  // Step 2: Build Overpass query for the OSM tags
  const query = buildOverpassQuery(niche, geo.bounds, limit);
  const results = await runOverpassQuery(query);
  return mapOsmToBusinesses(results, geo.city, geo.country);
}

// ─── Geocoding ───────────────────────────────────────────────────────────────

interface GeoResult {
  city: string;
  country: string;
  lat: number;
  lon: number;
  bounds: [number, number, number, number]; // [south, west, north, east]
}

async function geocodeCity(city: string, country: string): Promise<GeoResult | null> {
  const q = encodeURIComponent(`${city}, ${country}`);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "SiteAudit-Opportunity-Engine/1.0",
        },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.[0]) return null;

    const first = data[0] as {
      display_name: string;
      lat: string;
      lon: string;
      boundingbox?: string[];
    };

    const countryFromName = first.display_name
      .split(", ")
      .pop()
      ?.split(",")[0]
      ?? country;

    // boundingbox: [south, north, west, east]
    const bb = first.boundingbox ?? ["0", "0", "0", "0"];

    return {
      city,
      country: countryFromName,
      lat: parseFloat(first.lat),
      lon: parseFloat(first.lon),
      bounds: [
        parseFloat(bb[0]),
        parseFloat(bb[2]),
        parseFloat(bb[1]),
        parseFloat(bb[3]),
      ],
    };
  } catch {
    return null;
  }
}

// ─── Overpass Query Builder ─────────────────────────────────────────────────

function buildOverpassQuery(
  niche: NicheDefinition,
  bounds: [number, number, number, number],
  limit: number,
): string {
  // Build tag clauses: (key="value1" OR key="value2" ...)
  const tagClauses = niche.osmTags
    .map(({ key, value }) => `["${key}"="${value}"]`)
    .join("");

  const [south, west, north, east] = bounds;

  return `
[out:json][timeout:${Math.floor(OVERPASS_TIMEOUT / 1000)}];
(
  node${tagClauses}(${south},${west},${north},${east});
  way${tagClauses}(${south},${west},${north},${east});
);
out center;
head ${limit};
`.trim();
}

// ─── Overpass Runner ─────────────────────────────────────────────────────────

async function runOverpassQuery(query: string): Promise<OsmElement[]> {
  let lastError: Error | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(OVERPASS_TIMEOUT),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (res.status === 429 || res.status === 504) {
          // Rate limit or gateway timeout — try next endpoint
          lastError = new Error(`Overpass ${endpoint} returned ${res.status}: ${text}`);
          continue;
        }
        throw new Error(`Overpass ${endpoint} returned ${res.status}`);
      }

      const json = await res.json();
      return (json.elements ?? []) as OsmElement[];
    } catch (e) {
      lastError = e as Error;
      // Try next endpoint
    }
  }

  throw lastError ?? new Error("All Overpass endpoints failed");
}

// ─── OSM → Business Mapping ─────────────────────────────────────────────────

function mapOsmToBusinesses(
  elements: OsmElement[],
  city: string,
  country: string,
): DiscoveredBusiness[] {
  return elements
    .filter((el) => el.tags?.name) // must have a name
    .map((el) => {
      const tags = el.tags ?? {};
      const lat = el.lat ?? el.center?.lat ?? 0;
      const lon = el.lon ?? el.center?.lon ?? 0;

      // Extract website — OSM stores it as "website" or "contact:website"
      const website = normalizeUrl(tags.website ?? tags["contact:website"] ?? null);

      // Phone — OSM stores as "phone" or "contact:phone"
      const phone = tags.phone ?? tags["contact:phone"] ?? null;

      // Address components from OSM tags
      const street = [tags["addr:street"], tags["addr:housenumber"]]
        .filter(Boolean)
        .join(" ")
        .trim();
      const postcode = tags["addr:postcode"] ?? "";
      const addrCity = tags["addr:city"] ?? city;
      const addressParts = [street, postcode, addrCity].filter(Boolean);

      return {
        id: `osm-${el.id}`,
        name: tags.name,
        category: tags.amenity ?? tags.shop ?? tags.craft ?? tags.office ?? tags.tourism ?? "business",
        address: addressParts.join(", ") || "",
        city: addrCity,
        country,
        lat,
        lon,
        website,
        email: null, // OSM does not store email; enrichment happens at scrape time
        phone: phone ? normalizePhone(phone) : null,
        source: "osm" as const,
      };
    });
}

// ─── Normalizers ────────────────────────────────────────────────────────────

function normalizeUrl(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Add protocol if missing
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function normalizePhone(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}
