import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(missing)";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "(missing)";
    const keyPrefix = key ? key.slice(0, 8) : "(missing)";
    
    // Try to get the admin client
    let admin;
    try {
      admin = getSupabaseAdmin();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ step: "getSupabaseAdmin", error: msg }, { status: 500 });
    }
    
    // Try a simple query
    try {
      const { data, error } = await admin.from("opportunities").select("id", { count: "exact", limit: 1 });
      return NextResponse.json({ 
        step: "query", 
        supabaseUrl: url,
        supabaseKeyPrefix: keyPrefix,
        data,
        error: error ? error.message : null
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ step: "query_error", error: msg }, { status: 500 });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ step: "outer", error: msg }, { status: 500 });
  }
}
