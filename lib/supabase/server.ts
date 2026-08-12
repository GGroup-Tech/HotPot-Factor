import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Server client for Server Components / Route Handlers / Server Actions.
 * Uses the anon key + the caller's session cookie, so RLS is enforced
 * as the signed-in user (or as `anon` when logged out). Never use this
 * client to bypass RLS — use `createAdminClient` for that, and only
 * after verifying the caller's role server-side.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component that can't set cookies —
            // safe to ignore as long as middleware.ts is refreshing
            // the session on every request.
          }
        },
      },
    },
  );
}
