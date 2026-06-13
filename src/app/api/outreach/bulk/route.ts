import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getUserId } from "@/lib/supabase/server";
import { buildOutreachMessage } from "@/lib/batch/processor";

// ─── POST /api/outreach/bulk ─────────────────────────────────────────────────────
// Regenerate outreach messages for all opportunities matching filter criteria.
// Used when you want to refresh outreach messages after updating the template.
export async function POST(req: NextRequest) {
  const userId = getUserId(req);

  let body: { status?: string; batchId?: string; category?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (getSupabaseAdmin().from("opportunities") as any)
    .select("id, name, category, audit_score, audit_weaknesses")
    .eq("user_id", userId)
    .eq("status", body.status ?? "new");

  if (body.batchId) {
    query = query.eq("batch_id", body.batchId);
  }
  if (body.category) {
    query = query.eq("category", body.category);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data as Array<{
    id: string;
    name: string;
    category: string;
    audit_score: number | null;
    audit_weaknesses: string[] | null;
  }>;

  // Build update payloads
  const updates = rows.map((row) => ({
    id: row.id,
    outreach_message: buildOutreachMessage(
      row.name,
      row.audit_score ?? 0,
      (row.audit_weaknesses as string[] | null) ?? [],
      row.category,
    ),
  }));

  // Batch update in groups of 50
  for (let i = 0; i < updates.length; i += 50) {
    const batch = updates.slice(i, i + 50);
    await Promise.all(
      batch.map(({ id, outreach_message }) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (getSupabaseAdmin().from("opportunities") as any)
          .update({ outreach_message })
          .eq("id", id),
      ),
    );
  }

  return NextResponse.json({
    updated: updates.length,
    message: `Regenerated outreach messages for ${updates.length} opportunities.`,
  });
}
