import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifies the current session belongs to a row in `staff`.
 * Redirects to /admin-login when there's no session or no staff record.
 * Call this at the top of every (admin) layout/page and every
 * /api/admin/* route handler before touching the admin client.
 */
export async function requireStaff() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin-login");
  }

  const { data: staff } = await supabase
    .from("staff")
    .select("id, nombre, rol")
    .eq("id", user.id)
    .maybeSingle();

  if (!staff) {
    redirect("/admin-login");
  }

  return { user, staff };
}

/**
 * Verifies the current session belongs to a signed-in customer
 * (`usuarios`). Redirects to /iniciar-sesion otherwise. Use in every
 * (cliente)/cuenta/* page as defense-in-depth alongside middleware.ts.
 */
export async function requireUsuario() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/iniciar-sesion");
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!usuario) {
    redirect("/iniciar-sesion");
  }

  return { user, usuario };
}
