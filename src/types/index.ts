// ─── Audit Result ─────────────────────────────────────────────────────────────

export interface AuditResult {
  url: string;
  score: number;
  opportunityLevel: "High" | "Medium" | "Low";
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  outreachMessage: string;
}

// ─── API ───────────────────────────────────────────────────────────────────────

export interface AuditRequest {
  url: string;
}

export interface AuditResponse {
  audit: AuditResult;
}

// ─── Phase 1: Discovery + Batch Audit Types ─────────────────────────────────────

/** A business found via OSM or entered manually */
export interface DiscoveredBusiness {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  website: string | null;
  phone: string | null;
  source: "osm" | "manual" | "csv";
}

/** A discovered business after the audit pass */
export interface AuditedBusiness extends DiscoveredBusiness {
  auditScore: number;        // 0–95 from SiteAudit engine
  auditStrengths: string[];
  auditWeaknesses: string[];
  websiteAvailable: boolean; // true if we could scrape it
  opportunityScore: number;  // 0–100, computed rank score
  outreachMessage: string;
}

/** A batch job tracking audit progress */
export interface BatchJob {
  id: string;
  status: "queued" | "processing" | "complete" | "error";
  businesses: DiscoveredBusiness[];
  results: AuditedBusiness[];
  createdAt: string;
  error?: string;
}

/** Discovery query parameters */
export interface DiscoveryQuery {
  category: string;
  city: string;
  country: string;
  limit: number;
}

/** OSM Overpass raw response shape */
export interface OsmElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Opportunity level derived from audit score */
export type OpportunityLevel = "High" | "Medium" | "Low";
