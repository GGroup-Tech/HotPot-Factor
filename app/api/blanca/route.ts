import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_MENSAJES = 20;
const MAX_CARACTERES_MENSAJE = 4000;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Info pública del negocio — misma para invitados en la landing y
 * para clientes logueados. Nunca incluye nada confidencial (sin datos
 * de otros clientes, sin cifras financieras internas, sin costos de
 * producción). Paquetes y zonas de cobertura se leen en vivo de la
 * base para que nunca queden desactualizados si cambian precios.
 */
async function construirContextoEmpresa(supabase: SupabaseServerClient) {
  const [{ data: paquetes }, { data: zonas }] = await Promise.all([
    supabase.from("paquetes").select("nombre, creditos, precio_mxn").eq("activo", true).order("precio_mxn"),
    supabase.from("zonas_cobertura").select("colonia").eq("activa", true),
  ]);

  const paquetesTexto =
    (paquetes ?? []).map((p) => `- ${p.nombre}: ${p.creditos} créditos por $${p.precio_mxn} MXN`).join("\n") ||
    "No hay paquetes activos en este momento.";

  const zonasTexto = (zonas ?? []).map((z) => z.colonia).join(", ") || "Consulta con soporte.";

  return `
INFORMACIÓN DEL NEGOCIO (HotPot Factor):

Cómo funciona:
1. El cliente elige un paquete de créditos (1 crédito = 1 platillo).
2. Crea su cuenta con su dirección de entrega.
3. Paga con tarjeta (Stripe — no guardamos datos de tarjeta).
4. Elige en qué día quiere recibir cada uno de sus platillos, según el menú semanal publicado. Ojo con el nombre de esta sección — es distinto según el momento: antes de tener cuenta (durante la compra) se llama "Arma tu mes"; una vez que ya tiene cuenta y quiere ver o cambiar su calendario, la sección dentro de su panel se llama "Mi calendario" (NO "Arma tu mes" — ese nombre no existe dentro del panel de cliente, solo en la compra inicial).
5. Recibe sus entregas en la fecha elegida.

Reglas importantes:
- Los créditos NO vencen — si no se usan todos en el mes, se acumulan para el siguiente.
- Cualquier entrega se puede mover o cancelar SIN costo hasta 48 horas antes de la fecha. Dentro de esas 48 horas ya no se puede editar ni cancelar.
- Cada mes hay hasta 2 "comodines" disponibles: platillos fuera del menú fijo semanal que se pueden elegir en su lugar (sujeto a disponibilidad ese mes).
- El menú de cada mes se publica el día 20 del mes anterior.

Paquetes activos:
${paquetesTexto}

Zonas de cobertura actuales: ${zonasTexto}

Si preguntan algo fuera de esta información (facturación fiscal, un problema de pago puntual, una queja, un cambio que el sistema no te deja hacer a ti), sé honesta: di que no tienes ese dato o que no puedes resolverlo tú misma, y sugiere contactar a soporte directamente.
`.trim();
}

const DIAS_SEMANA_LARGO = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES"];

/**
 * Qué hay de comer este mes — antes Blanca no tenía esto y solo podía
 * hablar en abstracto ("consulta el menú") en vez de decir los
 * platillos reales. `menu_mes`/`platillos` ya son de lectura pública
 * (la landing los muestra sin sesión en MenuSemanalSection), así que
 * se lee con el cliente normal, sin necesidad de admin.
 */
async function construirContextoMenu(supabase: SupabaseServerClient) {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mesNum = hoy.getMonth() + 1;

  const [{ data: menuFijo }, { data: comodinesRows }] = await Promise.all([
    supabase
      .from("menu_mes")
      .select("dia_semana, publicado, platillos(nombre, descripcion)")
      .eq("anio", anio)
      .eq("mes", mesNum),
    supabase
      .from("comodines_mes")
      .select("platillos(nombre)")
      .eq("anio", anio)
      .eq("mes", mesNum),
  ]);

  const publicado = (menuFijo ?? []).some((f) => f.publicado);
  if (!publicado) {
    return `MENÚ DE ESTE MES: todavía no se publica (se publica el día 20 del mes anterior). No inventes platillos — si preguntan qué hay de comer, di que el menú de este mes se publica el día 20 y que por ahora no está disponible.`;
  }

  const porDia = new Map<number, string>();
  for (const fila of menuFijo ?? []) {
    if (!fila.publicado || !fila.dia_semana) continue;
    const p = fila.platillos as unknown as { nombre: string; descripcion: string | null } | null;
    if (p) porDia.set(fila.dia_semana, p.descripcion ? `${p.nombre} — ${p.descripcion}` : p.nombre);
  }
  const menuTexto = DIAS_SEMANA_LARGO.map((dia, i) => `- ${dia}: ${porDia.get(i + 1) ?? "sin asignar"}`).join("\n");

  const comodines = (comodinesRows ?? [])
    .map((f) => (f.platillos as unknown as { nombre: string } | null)?.nombre)
    .filter((n): n is string => Boolean(n));
  const comodinesTexto = comodines.length > 0 ? comodines.join(", ") : "ninguno configurado este mes";

  return `
MENÚ FIJO DE ESTE MES (se repite cada semana del mes, lunes a viernes):
${menuTexto}

Platillos disponibles como comodín este mes (hasta 2 por cliente, en vez del platillo fijo del día): ${comodinesTexto}
`.trim();
}

/** Contexto específico de ESTE cliente — solo se agrega si hay sesión activa. */
async function construirContextoCliente(supabase: SupabaseServerClient, usuarioId: string) {
  const hoy = new Date();
  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

  const [{ data: usuario }, { data: saldoRow }, { data: proximaEntrega }, { data: ultimaCompra }] = await Promise.all([
    supabase.from("usuarios").select("nombre, apellido, colonia").eq("id", usuarioId).maybeSingle(),
    supabase.from("saldo_creditos").select("saldo").eq("usuario_id", usuarioId).maybeSingle(),
    supabase
      .from("pedidos")
      .select("fecha_entrega, platillos(nombre)")
      .eq("usuario_id", usuarioId)
      .neq("estado", "cancelado")
      .gte("fecha_entrega", hoyISO)
      .order("fecha_entrega", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("compras")
      .select("monto_mxn, created_at, paquetes(nombre, creditos)")
      .eq("usuario_id", usuarioId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const platillo = proximaEntrega?.platillos as unknown as { nombre: string } | null;
  const paquete = ultimaCompra?.paquetes as unknown as { nombre: string; creditos: number } | null;

  const nombrePila = (usuario?.nombre ?? "").trim().split(/\s+/)[0] || null;

  return `
DATOS DE ESTE CLIENTE (solo de la persona con la que estás hablando ahora — nunca los presentes como información general del negocio):
- Nombre: ${usuario?.nombre ?? "—"} ${usuario?.apellido ?? ""}
- Colonia registrada: ${usuario?.colonia ?? "—"}
- Créditos disponibles ahora mismo: ${saldoRow?.saldo ?? 0}
- Próxima entrega: ${
    proximaEntrega
      ? `${proximaEntrega.fecha_entrega} — ${platillo?.nombre ?? "platillo por confirmar"}`
      : "no tiene entregas próximas asignadas"
  }
- Último paquete comprado: ${paquete ? `${paquete.nombre} (${paquete.creditos} créditos)` : "—"}

${nombrePila ? `Llámalo/a por su nombre de pila ("${nombrePila}") de forma natural — al saludar o en algún punto de la conversación, no en cada mensaje ni de forma forzada.` : ""}

Usa estos datos para resolver preguntas sobre SU cuenta (créditos, próxima entrega, etc.) sin que tenga que ir a buscarlo. Si pregunta algo que no está aquí (ej. historial completo de movimientos), sugiere la pantalla correspondiente ("Mis créditos", "Mis entregas", "Mi calendario").
`.trim();
}

const BLANCA_IDENTIDAD = `Eres Blanca, la asistente de HotPot Factor, una plataforma de catering D2C en Monterrey.
Tono cálido, directo, en español de México. Respuestas breves (máximo 4-5 líneas, salvo que te pidan más detalle).
Puedes actuar como servicio al cliente: ayuda a resolver dudas y problemas comunes. Nunca inventes datos que no tengas — si no sabes algo, dilo con naturalidad.
No uses formato markdown (nada de **negritas**, guiones de lista, encabezados con #, etc.) — el chat solo muestra texto plano, así que cualquier símbolo de formato se ve literal. Escribe en párrafos normales.`;

/**
 * Endpoint único para Blanca, usado tanto por el FAB de la landing
 * (invitados, sin sesión) como por el chat del panel cliente
 * (logueados). Ya NO requiere autenticación — si hay sesión, se le
 * agrega el contexto específico de ese cliente; si no, responde solo
 * con la información general del negocio.
 */
export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Blanca no está disponible todavía. Falta configurar ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }

  const { messages } = (await request.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Mensaje vacío." }, { status: 400 });
  }
  if (messages.length > MAX_MENSAJES) {
    return NextResponse.json({ error: "La conversación ya está muy larga — recarga el chat." }, { status: 400 });
  }
  if (messages.some((m) => typeof m.content !== "string" || m.content.length > MAX_CARACTERES_MENSAJE)) {
    return NextResponse.json({ error: "Ese mensaje es demasiado largo." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [contextoEmpresa, contextoMenu] = await Promise.all([
    construirContextoEmpresa(supabase),
    construirContextoMenu(supabase),
  ]);
  const contextoCliente = user ? await construirContextoCliente(supabase, user.id) : "";

  const systemPrompt = [BLANCA_IDENTIDAD, contextoEmpresa, contextoMenu, contextoCliente]
    .filter(Boolean)
    .join("\n\n");

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const text = response.content.find((block) => block.type === "text");

  return NextResponse.json({ reply: text?.type === "text" ? text.text : "" });
}
