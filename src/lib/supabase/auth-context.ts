import { cache } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type SupabaseAuthContext = {
  configured: boolean;
  supabase: SupabaseClient | null;
  user: User | null;
};

export const getSupabaseAuthContext = cache(async (): Promise<SupabaseAuthContext> => {
  if (!getSupabaseConfig().configured) return { configured: false, supabase: null, user: null };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { configured: true, supabase, user };
});
