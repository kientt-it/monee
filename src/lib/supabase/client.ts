import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/env";

export function createClient() {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) throw new Error("SUPABASE_NOT_CONFIGURED");
  return createBrowserClient(url, key);
}
