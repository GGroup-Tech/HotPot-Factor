import { createAdminClient } from "@/lib/supabase/admin";
import { ConfirmarEntregaBoton } from "./ConfirmarEntregaBoton";

/**
 * Página pública (sin login) para que el repartidor confirme las
 * entregas del día desde su celular — Fase 1 del proyecto de ruteo
 * óptimo + WhatsApp al repartidor (backlog #55). El token es la única
 * autorización (ver `generarLinkConfirmacionDia` en
 * `(admin)/actions.ts` y `confirmarEntregaGrupo` en
 * `confirmar-entrega/actions.ts`).
 *
 * Rediseñado 2026-08-19 (a petición del usuario): antes era un link
 * por pedido; ahora es UN link para todo el día, que agrupa por
 * dirección — dos clientes distintos (roomies con cuentas separadas)
 * pueden compartir domicilio y aparecer en el mismo grupo, cada uno
 * con su propio pedido/platillo. Agrupar por `usuario_id` NO
 * funcionaría para eso (cada cuenta es un usuario distinto); agrupar
 * por dirección de texto sí. Es un match exacto de texto (sin
 * normalizar mayúsculas/espacios de más) — si una dirección está
 * capturada de forma inconsistente entre dos cuentas, puede aparecer
 * como dos grupos separados en vez de uno.
 *
 * Vive fuera de todos los grupos de rutas ((admin)/(cliente)/(sitio))
 * a propósito, para no heredar sidebar/nav de ninguno.
 */
export default async function ConfirmarEntregaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: pedidosRaw } = await admin
    .from("pedidos")
    .select("id, estado, token_expira_en, platillos(nombre), usuarios(nombre, colonia, calle_numero, codigo_postal)")
    .eq("token_confirmacion", token)
    .neq("estado", "cancelado");

  type Fila = {
    id: string;
    estado: string;
    token_expira_en: string | null;
    platillos: { nombre: string } | null;
    usuarios: { nombre: string; colonia: string | null; calle_numero: string | null; codigo_postal: string | null } | null;
  };
  const pedidos = (pedidosRaw ?? []) as unknown as Fila[];
  const vigentes = pedidos.filter((p) => p.token_expira_en && new Date(p.token_expira_en) > new Date());

  // Agrupa por dirección (calle + colonia + CP) — no por cliente, ver
  // nota arriba.
  const grupos = new Map<string, Fila[]>();
  for (const p of vigentes) {
    const key = [p.usuarios?.calle_numero, p.usuarios?.colonia, p.usuarios?.codigo_postal]
      .map((s) => (s ?? "").trim().toLowerCase())
      .join("|");
    const lista = grupos.get(key) ?? [];
    lista.push(p);
    grupos.set(key, lista);
  }
  const gruposOrdenados = [...grupos.entries()].sort(([, a], [, b]) => {
    const colA = a[0]?.usuarios?.colonia ?? "";
    const colB = b[0]?.usuarios?.colonia ?? "";
    return colA.localeCompare(colB);
  });

  return (
    <div className="flex min-h-screen justify-center bg-[#0F0B08] px-5 py-10">
      <div className="flex w-full max-w-[480px] flex-col items-center gap-6">
        <p className="font-display text-[22px] font-semibold text-cream">HotPot Factor</p>

        {gruposOrdenados.length === 0 ? (
          <div className="w-full rounded-card border border-line bg-surface px-6 py-8 text-center">
            <p className="text-[15px] text-cream">Este link no es válido o ya venció.</p>
            <p className="mt-2 text-[13px] text-muted">Pide que te compartan uno nuevo.</p>
          </div>
        ) : (
          <>
            <p className="text-[13px] text-muted">
              {vigentes.length} {vigentes.length === 1 ? "entrega" : "entregas"} en {gruposOrdenados.length}{" "}
              {gruposOrdenados.length === 1 ? "parada" : "paradas"}
            </p>

            <div className="flex w-full flex-col gap-4">
              {gruposOrdenados.map(([key, filas]) => {
                const direccion =
                  [filas[0]?.usuarios?.calle_numero, filas[0]?.usuarios?.colonia].filter(Boolean).join(", ") ||
                  "Sin dirección capturada";
                const todosEntregados = filas.every((f) => f.estado === "entregado");
                return (
                  <div key={key} className="flex w-full flex-col gap-3 rounded-card border border-line bg-surface px-5 py-4">
                    <p className="text-[15px] font-medium text-cream">{direccion}</p>
                    <div className="flex flex-col gap-1.5">
                      {filas.map((f) => (
                        <div key={f.id} className="flex items-center justify-between gap-3 text-[13px]">
                          <p className="text-cream">{f.usuarios?.nombre ?? "Cliente"}</p>
                          <p className="text-muted">{f.platillos?.nombre ?? "Platillo"}</p>
                        </div>
                      ))}
                    </div>
                    <ConfirmarEntregaBoton
                      token={token}
                      pedidoIds={filas.map((f) => f.id)}
                      entregadoInicial={todosEntregados}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
