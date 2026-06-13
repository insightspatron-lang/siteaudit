import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getUserId } from "@/lib/supabase/server";
import type { Opportunity, OpportunityStatus, ListParams } from "@/types";

// ─── GET /api/opportunities ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status") as OpportunityStatus | null;
  const search = searchParams.get("search");
  const sort = (searchParams.get("sort") ?? "created_at") as
    | "opportunity_score"
    | "created_at"
    | "name";
  const order = (searchParams.get("order") ?? "desc") as "asc" | "desc";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  type DbOpp = {
    id: string;
    name: string;
    website: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    country: string;
    category: string;
    source: string;
    audit_score: number | null;
    audit_strengths: string[] | null;
    audit_weaknesses: string[] | null;
    website_available: boolean | null;
    opportunity_score: number | null;
    outreach_message: string | null;
    status: string;
    notes: string | null;
    contacted_at: string | null;
    replied_at: string | null;
    meeting_at: string | null;
    outcome: string | null;
    batch_id: string | null;
    user_id: string;
    created_at: string;
    updated_at: string;
  };

  let query = getSupabaseAdmin().from("opportunities")
    .select("*", { count: "exact" })
    .eq("user_id", userId);

  if (status) query = query.eq("status", status);
  if (search) {
    query = query.or(`name.ilike.%${search}%,website.ilike.%${search}%,city.ilike.%${search}%`);
  }

  // Map sort param to DB column
  const sortCol =
    sort === "opportunity_score"
      ? "opportunity_score"
      : sort === "name"
      ? "name"
      : "created_at";
  query = query.order(sortCol as "opportunity_score" | "created_at" | "name", {
    ascending: order === "asc",
  });

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const opportunities = (data as DbOpp[] | null)?.map(mapDbToOpportunity) ?? [];

  return NextResponse.json({
    data: opportunities,
    total: count ?? 0,
    limit,
    offset,
  });
}

// ─── POST /api/opportunities ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const userId = getUserId(req);

  let body: Partial<{
    name: string;
    website: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    country: string;
    category: string;
    source: string;
    status: OpportunityStatus;
    notes: string | null;
  }>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const row = {
    name: body.name.trim(),
    website: body.website ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    address: body.address ?? null,
    city: body.city ?? null,
    country: body.country ?? "US",
    category: body.category ?? "business",
    source: body.source ?? "manual",
    status: body.status ?? "new",
    notes: body.notes ?? null,
    user_id: userId,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (getSupabaseAdmin().from("opportunities") as any)
    .insert(row)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapDbToOpportunity(data as DbOpp), { status: 201 });
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

function mapDbToOpportunity(row: DbOpp): Opportunity {
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
