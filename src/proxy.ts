import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/env";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const isProtected = pathname.startsWith("/app");
  const isOnboarding = pathname === "/app/onboarding";
  const isAuth = ["/login", "/register", "/forgot-password"].includes(pathname);
  const { url, key, configured } = getSupabaseConfig();
  if (!configured || !url || !key) {
    if (isProtected) return NextResponse.redirect(new URL("/login", request.url));
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const redirectWithCookies = (path: string) => {
    const redirectResponse = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  };

  if (isProtected && !user) return redirectWithCookies("/login");
  if (!user) return response;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  const onboardingCompleted = profileError ? true : profile?.onboarding_completed === true;

  if (isAuth) return redirectWithCookies(onboardingCompleted ? "/app" : "/app/onboarding");
  if (isOnboarding && onboardingCompleted) return redirectWithCookies("/app");
  if (isProtected && !isOnboarding && !onboardingCompleted) return redirectWithCookies("/app/onboarding");
  return response;
}

export const config = { matcher: ["/app/:path*", "/login", "/register", "/forgot-password"] };
