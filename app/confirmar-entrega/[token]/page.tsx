import { createAdminClient } from "@/lib/supabase/admin";
import { ConfirmarEntregaBoton } from "./ConfirmarEntregaBoton";

const fechaLarga = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" });

/**
 * Página pública (sin login) para que el repartidor confirme una
 * entrega desde su celular — Fase 1 del proyecto de ruteo óptimo +
 * WhatsApp al repartidor (backlog #55). El token es la única
 * autorización (ver `generarLinkConfirmacionPedido` en
 * `(admin)/actions.ts` y `confirmarEntregaPorToken` en
 * `confirmar-entrega/actions.ts`).
 *
 * Vive fuera de todos los grupos de rutas ((admin)/(cliente)/(sitio))
 * a propósito, para no heredar sidebar/nav de ninguno — es una
 * pantalla de un solo botón, pensada para abrirse desde un link de
 * WhatsApp en un teléfono, no para navegarse dentro del sitio.
 */
export default async function ConfirmarEntregaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: pedido } = await admin
    .from("pedidos")
    .select("id, estado, fecha_entrega, token_expira_en, platillos(nombre), usuarios(nombre, colonia, calle_numero)")
    .eq("token_confirmacion", token)
    .maybeSingle();

  const vencido = pedido?.token_expira_en ? new Date(pedido.token_expira_en) < new Date() : false;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F0B08] px-5 py-10">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-6">
        <p className="font-display text-[22px] font-semibold text-cream">HotPot Factor</p>

        {!pedido ? (
          <div className="w-full rounded-card border border-line bg-surface px-6 py-8 text-center">
            <p className="text-[15px] text-cream">Este link no es válido.</p>
            <p className="mt-2 text-[13px] text-muted">Pide que te compartan uno nuevo.</p>
          </div>
        ) : vencido ? (
          <div className="w-full rounded-card border border-line bg-surface px-6 py-8 text-center">
            <p className="text-[15px] text-cream">Este link ya venció.</p>
            <p className="mt-2 text-[13px] text-muted">Pide que generen uno nuevo desde el panel.</p>
          </div>
        ) : (
          <>
            <div className="flex w-full flex-col gap-2 rounded-card border border-line bg-surface px-6 py-5">
              <p className="text-[11px] font-medium uppercase tracking-[1px] text-gold">
                {fechaLarga.format(new Date(`${pedido.fecha_entrega}T00:00:00`))}
              </p>
              <p className="text-[18px] font-medium text-cream">
                {(pedido.usuarios as unknown as { nombre: string } | null)?.nombre ?? "Cliente"}
              </p>
              <p className="text-[13px] text-muted">
                {[
                  (pedido.usuarios as unknown as { calle_numero: string | null } | null)?.calle_numero,
                  (pedido.usuarios as unknown as { colonia: string | null } | null)?.colonia,
                ]
                  .filter(Boolean)
                  .join(", ") || "Sin dirección capturada"}
              </p>
              <div className="mt-1 h-px w-full bg-line" />
              <p className="text-[13px] text-cream">
                {(pedido.platillos as unknown as { nombre: string } | null)?.nombre ?? "Platillo"}
              </p>
            </div>

            <ConfirmarEntregaBoton token={token} />
          </>
        )}
      </div>
    </div>
  );
}
