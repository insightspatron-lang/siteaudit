import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getUserId, setUserId } from "@/lib/supabase/server";
import type { DiscoveredBusiness, AuditedBusiness } from "@/types";
import { auditBusiness } from "@/lib/batch/processor";

const BATCH_TIMEOUT_MS = 12_000; // 12s — safely under Vercel free tier 10s

// ─── POST /api/batch ──────────────────────────────────────────────────────────────
// Replaced in-memory Map with Supabase persistence.
// Strategy:
//   1. Upsert businesses to DB immediately (user sees them even if audit fails)
//   2. Attempt synchronous audit for up to 12s total
//   3. Return partial results — un-audited rows stay in DB for later processing
// Phase 3: Supabase Edge Function handles the long tail asynchronously.
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  await setUserId(userId);

  let businesses: DiscoveredBusiness[];
  try {
    const body = await req.json();
    if (!Array.isArray(body.businesses)) {
      return NextResponse.json({ error: "businesses must be an array" }, { status: 400 });
    }
    businesses = body.businesses.slice(0, 50);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (businesses.length === 0) {
    return NextResponse.json({ error: "At least one business is required" }, { status: 400 });
  }

  const batchId = `batch_${Date.now()}`;

  // 1. Upsert all businesses to DB first (persistence before processing)
  const upsertRows = businesses.map((b) => ({
    name: b.name,
    website: b.website ?? null,
    email: b.email ?? null,
    phone: b.phone ?? null,
    address: b.address ?? null,
    city: b.city ?? null,
    country: b.country ?? "US",
    category: b.category ?? "business",
    source: b.source ?? "manual",
    batch_id: batchId,
    user_id: userId,
    status: "new" as const,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: upserted, error: upsertError } = await (getSupabaseAdmin()
    .from("opportunities") as any)
    .upsert(upsertRows, { onConflict: "name,user_id" })
    .select("id, name, website, email, phone, address, city, country, category, source");

  if (upsertError) {
    return NextResponse.json({ error: `DB error: ${upsertError.message}` }, { status: 500 });
  }

  // 2. Synchronous audit pass — limited time to avoid Vercel timeout
  const results: (AuditedBusiness & { id: string })[] = [];
  const deadline = Date.now() + BATCH_TIMEOUT_MS;

  for (let i = 0; i < (upserted?.length ?? 0); i++) {
    if (Date.now() >= deadline) break; // stop before Vercel kills us

    const row = upserted![i];
    const business: DiscoveredBusiness = {
      id: row.id,
      name: row.name,
      category: row.category,
      address: row.address ?? "",
      city: row.city ?? "",
      country: row.country,
      lat: 0,
      lon: 0,
      website: row.website ?? null,
      email: row.email ?? null,
      phone: row.phone ?? null,
      source: row.source,
    };

    try {
      const audited = await auditBusiness(business);
      // Update DB with audit results
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (getSupabaseAdmin().from("opportunities") as any)
        .update({
          audit_score: audited.auditScore,
          audit_strengths: audited.auditStrengths,
          audit_weaknesses: audited.auditWeaknesses,
          website_available: audited.websiteAvailable,
          opportunity_score: audited.opportunityScore,
          outreach_message: audited.outreachMessage,
        })
        .eq("id", row.id);

      results.push({ ...audited, id: row.id });
    } catch {
      // Individual failure — row remains in DB with null audit fields
      results.push({
        ...business,
        auditScore: 0,
        auditStrengths: [],
        auditWeaknesses: ["Audit error"],
        websiteAvailable: false,
        opportunityScore: 0,
        outreachMessage: `Hi ${business.name.split(" ")[0] || "there"}, I ran a quick audit on your website but couldn't access it. Please check that your site is publicly accessible.`,
        id: row.id,
      });
    }
  }

  return NextResponse.json({
    batchId,
    total: businesses.length,
    audited: results.length,
    results,
    message:
      results.length < businesses.length
        ? `Only ${results.length} of ${businesses.length} were audited synchronously. Remaining rows are saved and will not show audit data until the batch processor runs.`
        : undefined,
  }, { status: 200 });
}
