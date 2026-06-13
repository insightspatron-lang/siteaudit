import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getUserId } from "@/lib/supabase/server";
import { buildOutreachMessage } from "@/lib/batch/processor";

// ─── POST /api/outreach ───────────────────────────────────────────────────────────
// Regenerate a single opportunity's outreach message from its audit data
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id query parameter is required" }, { status: 400 });
  }

  // Fetch the opportunity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (getSupabaseAdmin().from("opportunities") as any)
    .select("id, name, category, audit_score, audit_weaknesses")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const weaknesses = (data.audit_weaknesses as string[] | null) ?? [];
  const score = data.audit_score ?? 0;

  const outreachMessage = buildOutreachMessage(
    data.name,
    score,
    weaknesses,
    data.category,
  );

  // Update in place
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (getSupabaseAdmin().from("opportunities") as any)
    .update({ outreach_message: outreachMessage })
    .eq("id", id);

  return NextResponse.json({ outreachMessage });
}
