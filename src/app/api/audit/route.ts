import { NextRequest, NextResponse } from "next/server";
import { runWebsiteAudit } from "@/lib/scraper/website";
import { scoreLabel } from "@/lib/scoring";

// POST /api/audit — body: { url: string }
export async function POST(req: NextRequest) {
  let url: string;

  try {
    const body = await req.json();
    if (typeof body.url !== "string" || !body.url.trim()) {
      return NextResponse.json({ error: "A valid URL is required" }, { status: 400 });
    }
    url = body.url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    new URL(url); // validate
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const result = await runWebsiteAudit(url);
    return NextResponse.json({
      audit: {
        url,
        score: result.score,
        opportunityLevel: scoreLabel(result.score),
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        recommendations: result.recommendations,
        outreachMessage: result.outreach_message,
      },
    });
  } catch (err) {
    console.error("[/api/audit]", err);
    return NextResponse.json(
      { error: "Audit failed. The site may be unreachable or block automated requests." },
      { status: 500 }
    );
  }
}
