import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Browser client — lazily initialized to avoid build-time errors when env vars are absent.
// Usage: const { data } = await supabase.from(...).select()
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseAnonKey || "placeholder", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

// Backward-compatible named export
export const supabase = { get supabase() { return getSupabase(); } };

// Derive a stable user_id from the anon key prefix — used by Phase 2 to isolate
// this installation's data from other installations using the same project.
export function getUserId(): string {
  return (supabaseAnonKey || "anon").slice(0, 8);
}
