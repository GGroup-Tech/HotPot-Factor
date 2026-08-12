import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Route protection:
 *  - /cuenta/*  -> requires an active Supabase Auth session
 *  - /admin/*   -> requires an active session AND a matching row in `staff`
 *                  (checked with the anon key + RLS, never service_role)
 *  - /admin-login is intentionally excluded so staff can reach the
 *    separate login screen.
 *
 * This also refreshes the Supabase session cookie on every request per
 * the @supabase/ssr middleware contract — skipping this silently breaks
 * server-side auth after the access token expires.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/cuenta")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/iniciar-sesion";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin-login")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin-login";
      return NextResponse.redirect(url);
    }

    const { data: staff } = await supabase
      .from("staff")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!staff) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin-login";
      url.searchParams.set("error", "no-autorizado");
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every request except static assets, so the session cookie
     * stays fresh app-wide, while the redirect logic above only fires
     * for /cuenta and /admin.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
