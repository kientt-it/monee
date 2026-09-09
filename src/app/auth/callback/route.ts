import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url); const code = url.searchParams.get("code"); const next = url.searchParams.get("next") ?? "/app/onboarding";
  if (code) {
    const { error } = await (await createClient()).auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/login?error=callback", url.origin));
  }
  const nextPath = next.startsWith("/") && !next.startsWith("//") ? next : "/app/onboarding";
  return NextResponse.redirect(new URL(nextPath, url.origin));
}
