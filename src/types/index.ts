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

// ─── API ─────────────────────────────────────────────────────────────────────

export interface AuditRequest {
  url: string;
}

export interface AuditResponse {
  audit: AuditResult;
}

// ─── Phase 1: Discovery + Batch Audit Types ─────────────────────────────────

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
  email: string | null;
  phone: string | null;
  source: "osm" | "manual" | "csv";
}

/** A discovered business after the audit pass */
export interface AuditedBusiness extends DiscoveredBusiness {
  auditScore: number;
  auditStrengths: string[];
  auditWeaknesses: string[];
  websiteAvailable: boolean;
  opportunityScore: number;
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

// ─── Phase 2: CRM + Persistence Types ───────────────────────────────────────

/** CRM pipeline statuses */
export type OpportunityStatus =
  | "new"
  | "contacted"
  | "replied"
  | "meeting_booked"
  | "won"
  | "lost";

export const OPPORTUNITY_STATUSES: OpportunityStatus[] = [
  "new",
  "contacted",
  "replied",
  "meeting_booked",
  "won",
  "lost",
];

export const STATUS_LABELS: Record<OpportunityStatus, string> = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  meeting_booked: "Meeting Booked",
  won: "Won",
  lost: "Lost",
};

export const STATUS_COLORS: Record<OpportunityStatus, string> = {
  new: "bg-slate-600 text-slate-200",
  contacted: "bg-blue-600 text-blue-100",
  replied: "bg-amber-600 text-amber-100",
  meeting_booked: "bg-purple-600 text-purple-100",
  won: "bg-emerald-600 text-emerald-100",
  lost: "bg-red-600 text-red-100",
};

/** The canonical Opportunity — stored in Supabase */
export interface Opportunity {
  id: string;
  name: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  category: string;
  source: "osm" | "manual" | "csv";

  // Audit data
  auditScore: number | null;
  auditStrengths: string[] | null;
  auditWeaknesses: string[] | null;
  websiteAvailable: boolean | null;
  opportunityScore: number | null;
  outreachMessage: string | null;

  // CRM pipeline
  status: OpportunityStatus;
  notes: string | null;
  contactedAt: string | null;
  repliedAt: string | null;
  meetingAt: string | null;
  outcome: string | null;

  // Batch tracking
  batchId: string | null;

  // Metadata
  userId: string;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating/updating an opportunity (subset of Opportunity) */
export type OpportunityUpsert = Pick<
  Opportunity,
  | "name" | "website" | "email" | "phone" | "address" | "city" | "country"
  | "category" | "source" | "auditScore" | "auditStrengths" | "auditWeaknesses"
  | "websiteAvailable" | "opportunityScore" | "outreachMessage" | "batchId"
>;

/** CRM dashboard statistics */
export interface OpportunityStats {
  total: number;
  byStatus: Record<OpportunityStatus, number>;
  avgScore: number | null;
  hotLeads: number; // score >= 70 AND status = 'new'
  thisWeek: number;
  pipelineVelocity: number; // % in contacted+replied+meeting_booked
  winRate: number; // won / (won + lost)
}

/** Pagination params for list queries */
export interface ListParams {
  status?: OpportunityStatus;
  search?: string;
  sort?: "opportunityScore" | "createdAt" | "name";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/** Paginated list response */
export interface ListResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
