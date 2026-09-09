/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const schedulerSecret = Deno.env.get("SCHEDULER_SECRET");

Deno.serve(async (request) => {
  if (!schedulerSecret || request.headers.get("x-scheduler-secret") !== schedulerSecret) {
    return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), { status: 401, headers: { "content-type": "application/json" } });
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ ok: false, error: "SCHEDULER_NOT_CONFIGURED" }), { status: 500, headers: { "content-type": "application/json" } });
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await admin.rpc("process_due_recurring_transactions", { p_limit: 100 });
  if (error) return new Response(JSON.stringify({ ok: false, error: "SCHEDULER_FAILED" }), { status: 500, headers: { "content-type": "application/json" } });
  return new Response(JSON.stringify({ ok: true, processed: data?.length ?? 0, results: data ?? [] }), { headers: { "content-type": "application/json" } });
});
