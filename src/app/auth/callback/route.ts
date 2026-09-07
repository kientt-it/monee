import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url); const code = url.searchParams.get("code"); const next = url.searchParams.get("next") ?? "/app";
  if (code) await (await createClient()).auth.exchangeCodeForSession(code);
  const nextPath = next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  return NextResponse.redirect(new URL(nextPath, url.origin));
}
