import { NextRequest, NextResponse } from "next/server";
import type { DiscoveredBusiness, AuditedBusiness } from "@/types";
import { analyseWebsite } from "@/lib/scraper/website";
import { calculateScore } from "@/lib/scoring";
import { getNiche } from "@/lib/discovery/categories";

// ─── Opportunity Score ───────────────────────────────────────────────────────────

function computeOpportunityScore(
  auditScore: number,
  websiteAvailable: boolean,
  hasEmail: boolean,
  hasPhone: boolean,
  categoryKey: string,
): number {
  // Weighted composite — normalised to 0–100
  const auditNorm  = auditScore / 95;                                  // 0–1
  const websiteBonus = websiteAvailable ? 1 : 0;                         // 0 or 1
  const contactBonus = (hasEmail ? 1 : 0) + (hasPhone ? 0.5 : 0);       // 0–1.5, capped at 1
  const niche = getNiche(categoryKey);
  const catBonus = niche?.highOpportunity ? 1 : 0;                       // 0 or 1

  const raw =
    auditNorm  * 0.70 +
    websiteBonus * 0.15 +
    Math.min(contactBonus, 1) * 0.10 +
    catBonus    * 0.05;

  return Math.round(Math.min(raw * 100, 100));
}

function buildOutreachMessage(
  name: string,
  score: number,
  weaknesses: string[],
): string {
  const firstName = name.split(" ")[0] || "there";
  const topWeaknesses = weaknesses.slice(0, 2).join(" and ").toLowerCase();
  const msg =
    score < 40
      ? `Hi ${firstName}, I ran a quick audit on ${name}'s website and the biggest gap I see is: ${topWeaknesses}. Most local businesses in your space lose leads to competitors because CTAs are buried, contact info is hard to find, or there's no lead form. Happy to share exactly what I found — it takes 2 minutes.`
      : `Hi ${firstName}, I looked at ${name}'s site and it's actually in decent shape. A few targeted tweaks could push conversion rates noticeably higher. Worth a quick 5-minute call if you're open to it.`;
  return msg;
}

// ─── Audit a single business ───────────────────────────────────────────────────

async function auditBusiness(
  business: DiscoveredBusiness,
): Promise<AuditedBusiness> {
  const website = business.website ?? `https://${extractDomain(business.address)}.com`;

  let websiteAvailable = false;
  let auditScore = 0;
  let strengths: string[] = [];
  let weaknesses: string[] = [];

  try {
    const analysis = await analyseWebsite(website);
    auditScore = calculateScore(analysis);
    websiteAvailable = analysis.title_text !== "" || analysis.cta_count > 0;

    // Reconstruct strengths/weaknesses from analysis (same logic as scraper/website.ts)
    const contact_channels = analysis.contact_channels;
    if (analysis.cta_count >= 1)
      strengths.push(`${analysis.cta_count} CTA element${analysis.cta_count > 1 ? "s" : ""} detected`);
    if (analysis.cta_above_fold) strengths.push("CTA above the fold");
    if (analysis.cta_action_word) strengths.push("CTA uses clear action language");
    if (contact_channels.includes("email")) strengths.push("Email address visible");
    if (contact_channels.includes("phone")) strengths.push("Phone number visible");
    if (analysis.has_address) strengths.push("Physical address listed");
    if (analysis.trustSignals.length >= 2) strengths.push(`${analysis.trustSignals.length} trust signals`);

    if (analysis.cta_count === 0) weaknesses.push("No CTA element detected");
    else if (!analysis.cta_above_fold) weaknesses.push("CTA not above the fold");
    if (!contact_channels.includes("email") && !contact_channels.includes("phone"))
      weaknesses.push("No email or phone found");
    else if (!contact_channels.includes("phone")) weaknesses.push("No phone number");
    if (analysis.trustSignals.length === 0) weaknesses.push("No trust signals");
    if (!analysis.has_meta_desc) weaknesses.push("No meta description");
    if (analysis.form_quality === 0) weaknesses.push("No contact form");
    if (!analysis.has_viewport) weaknesses.push("No mobile viewport");
  } catch {
    // site unreachable — auditScore stays 0, websiteAvailable stays false
    weaknesses.push("Website unreachable or blocked");
  }

  const hasEmail = business.phone !== null;
  const hasPhone = business.phone !== null;

  const opportunityScore = computeOpportunityScore(
    auditScore,
    websiteAvailable,
    hasEmail,
    hasPhone,
    business.category,
  );

  return {
    ...business,
    auditScore,
    auditStrengths: strengths,
    auditWeaknesses: weaknesses,
    websiteAvailable,
    opportunityScore,
    outreachMessage: buildOutreachMessage(business.name, auditScore, weaknesses),
  };
}

function extractDomain(address: string): string {
  // Very rough: strip common address suffixes to get a plausible domain guess
  return address
    .replace(/\d+\s+/g, "")
    .replace(/\b(st|ave|road|blvd|suite|ste)\b/gi, "")
    .replace(/[^a-z0-9\s]/gi, "")
    .trim()
    .split(/\s+/)
    .slice(-2)
    .join("")
    .toLowerCase();
}

// ─── Batch processor (inline for Phase 1 — no server-side job storage) ─────────
// Phase 2 will use Supabase to persist jobs across requests.

const BATCH_TIMEOUT_PER_ITEM = 15000; // 15s per business max

// ─── API ───────────────────────────────────────────────────────────────────────

// In-memory store (per-instance; resets on cold start — Phase 1 limitation)
const jobs = new Map<string, {
  id: string;
  status: "queued" | "processing" | "complete" | "error";
  businesses: DiscoveredBusiness[];
  results: AuditedBusiness[];
  createdAt: string;
  error?: string;
}>();

// POST /api/batch — enqueue a batch job
export async function POST(req: NextRequest) {
  let businesses: DiscoveredBusiness[];

  try {
    const body = await req.json();
    if (!Array.isArray(body.businesses)) {
      return NextResponse.json({ error: "businesses must be an array" }, { status: 400 });
    }
    businesses = body.businesses.slice(0, 20); // cap at 20
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (businesses.length === 0) {
    return NextResponse.json({ error: "At least one business is required" }, { status: 400 });
  }

  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  jobs.set(jobId, {
    id: jobId,
    status: "queued",
    businesses,
    results: [],
    createdAt: new Date().toISOString(),
  });

  // Process asynchronously (fire-and-forget for Phase 1)
  // Next.js API routes are short-lived; this may not complete on free-tier cold starts.
  // Phase 2: replace with Supabase background jobs or a queue.
  processJob(jobId, businesses).catch((err) => {
    const job = jobs.get(jobId);
    if (job) {
      job.status = "error";
      job.error = String(err);
    }
  });

  return NextResponse.json({ jobId, status: "queued", count: businesses.length }, { status: 202 });
}

// GET /api/batch?id=jobId — poll for job status
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("id");

  if (!jobId) {
    return NextResponse.json({ error: "id query parameter is required" }, { status: 400 });
  }

  const job = jobs.get(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    count: job.businesses.length,
    completed: job.results.length,
    results: job.status === "complete" ? job.results : undefined,
    error: job.error,
    createdAt: job.createdAt,
  });
}

// ─── Batch processor ──────────────────────────────────────────────────────────

async function processJob(jobId: string, businesses: DiscoveredBusiness[]) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = "processing";

  const results: AuditedBusiness[] = [];

  for (let i = 0; i < businesses.length; i++) {
    try {
      const result = await Promise.race([
        auditBusiness(businesses[i]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), BATCH_TIMEOUT_PER_ITEM),
        ),
      ]);
      results.push(result);
    } catch (err) {
      // Push a failed entry so the table can show it
      results.push({
        ...businesses[i],
        auditScore: 0,
        auditStrengths: [],
        auditWeaknesses: [`Audit error: ${(err as Error).message}`],
        websiteAvailable: false,
        opportunityScore: 0,
        outreachMessage: `Hi ${businesses[i].name.split(" ")[0] || "there"}, I ran a quick audit on your website but couldn't access it. Check that your site is live and publicly accessible.`,
      });
    }

    // Update progress (job object is mutated in-place for GET polling)
    job.results = [...results];
  }

  job.status = "complete";
  job.results = results;
}
