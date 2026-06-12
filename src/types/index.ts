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
