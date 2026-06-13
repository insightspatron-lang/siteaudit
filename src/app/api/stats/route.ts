import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getUserId, setUserId } from "@/lib/supabase/server";
import type { OpportunityStatus } from "@/types";

const STATUSES: OpportunityStatus[] = [
  "new", "contacted", "replied", "meeting_booked", "won", "lost",
];

// ─── GET /api/stats ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    await setUserId(userId);

    // Fetch all opportunities for this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (getSupabaseAdmin().from("opportunities") as any)
      .select("status, opportunity_score, audit_score, created_at")
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

  const rows = data ?? [];

  // Count by status
  const byStatus: Record<OpportunityStatus, number> = {
    new: 0, contacted: 0, replied: 0,
    meeting_booked: 0, won: 0, lost: 0,
  };
  let totalScore = 0;
  let scoreCount = 0;
  let hotLeads = 0;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  let thisWeek = 0;

  for (const row of rows) {
    const status = row.status as OpportunityStatus;
    if (status in byStatus) byStatus[status]++;

    if (row.opportunity_score != null) {
      totalScore += row.opportunity_score;
      scoreCount++;
      if (status === "new" && row.opportunity_score >= 70) hotLeads++;
    }

    const createdAt = new Date(row.created_at).getTime();
    if (createdAt >= weekAgo) thisWeek++;
  }

  const total = rows.length;
  const avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : null;

  const active = byStatus.contacted + byStatus.replied + byStatus.meeting_booked;
  const pipelineVelocity = total > 0
    ? Math.round((active / total) * 100)
    : 0;

  const wonCount = byStatus.won;
  const lostCount = byStatus.lost;
  const winRate = wonCount + lostCount > 0
    ? Math.round((wonCount / (wonCount + lostCount)) * 100)
    : 0;

  return NextResponse.json({
    total,
    byStatus,
    avgScore,
    hotLeads,
    thisWeek,
    pipelineVelocity,
    winRate,
  });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `outer: ${msg}` }, { status: 500 });
  }
}
