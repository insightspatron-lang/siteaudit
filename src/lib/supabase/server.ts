import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Admin client — lazily initialized so missing env vars only cause errors at
// runtime, not during build. API routes guard against missing config with try/catch.
let _admin: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!_admin) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local, " +
        "then run the migration: npx supabase db push"
      );
    }
    _admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}

// Extract stable user_id from the request (derived from anon key prefix in Phase 2)
export function getUserId(req: Request): string {
  const header = req.headers.get("x-user-id");
  if (header) return header;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "anon";
  return anonKey.slice(0, 8);
}
