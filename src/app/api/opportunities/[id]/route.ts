import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getUserId, setUserId } from "@/lib/supabase/server";
import type { OpportunityStatus } from "@/types";

// ─── GET /api/opportunities/[id] ────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = getUserId(_req);
  await setUserId(userId);
  const { id } = params;

  const { data, error } = await getSupabaseAdmin().from("opportunities")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(mapDbToOpportunity(data));
}

// ─── PATCH /api/opportunities/[id] ──────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = getUserId(req);
  await setUserId(userId);
  const { id } = params;

  type UpdateBody = Partial<{
    status: OpportunityStatus;
    notes: string;
    outreach_message: string;
    name: string;
    email: string;
    phone: string;
    website: string;
    outcome: string;
  }>;

  let body: UpdateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Build update row with timestamp transitions
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {};

  if (body.status) {
    update.status = body.status;
    // Set transition timestamps
    if (body.status === "contacted" && !("contacted_at" in body)) {
      update.contacted_at = now;
    }
    if (body.status === "replied" && !("replied_at" in body)) {
      update.replied_at = now;
    }
    if (body.status === "meeting_booked" && !("meeting_at" in body)) {
      update.meeting_at = now;
    }
  }

  if (body.notes !== undefined) update.notes = body.notes;
  if (body.outreach_message !== undefined) update.outreach_message = body.outreach_message;
  if (body.name !== undefined) update.name = body.name;
  if (body.email !== undefined) update.email = body.email;
  if (body.phone !== undefined) update.phone = body.phone;
  if (body.website !== undefined) update.website = body.website;
  if (body.outcome !== undefined) update.outcome = body.outcome;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (getSupabaseAdmin().from("opportunities") as any)
    .update(update)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  }

  return NextResponse.json(mapDbToOpportunity(data));
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

interface DbOpp {
  id: string; name: string; website: string | null; email: string | null;
  phone: string | null; address: string | null; city: string | null;
  country: string; category: string; source: string;
  audit_score: number | null; audit_strengths: string[] | null;
  audit_weaknesses: string[] | null; website_available: boolean | null;
  opportunity_score: number | null; outreach_message: string | null;
  status: string; notes: string | null; contacted_at: string | null;
  replied_at: string | null; meeting_at: string | null; outcome: string | null;
  batch_id: string | null; user_id: string; created_at: string; updated_at: string;
}

function mapDbToOpportunity(row: DbOpp) {
  return {
    id: row.id,
    name: row.name,
    website: row.website,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    country: row.country,
    category: row.category,
    source: row.source as "osm" | "manual" | "csv",
    auditScore: row.audit_score,
    auditStrengths: row.audit_strengths,
    auditWeaknesses: row.audit_weaknesses,
    websiteAvailable: row.website_available,
    opportunityScore: row.opportunity_score,
    outreachMessage: row.outreach_message,
    status: row.status as OpportunityStatus,
    notes: row.notes,
    contactedAt: row.contacted_at,
    repliedAt: row.replied_at,
    meetingAt: row.meeting_at,
    outcome: row.outcome,
    batchId: row.batch_id,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
