import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SOFIA_SYSTEM_PROMPT = `Eres Sofía, la asistente de HotPot Factor, una plataforma de catering D2C en Monterrey.
Ayudas a clientes con dudas sobre paquetes, créditos, entregas, el menú semanal y su cuenta.
Tono cálido, directo, en español de México. Si no tienes el dato (p.ej. saldo exacto), dilo y sugiere revisar "Mis créditos".`;

/**
 * Backing endpoint for the Sofía FAB in the client area. Fully wired —
 * only missing ANTHROPIC_API_KEY, which the client will provide.
 */
export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Sofía no está disponible todavía. Falta configurar ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { messages } = (await request.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system: SOFIA_SYSTEM_PROMPT,
    messages,
  });

  const text = response.content.find((block) => block.type === "text");

  return NextResponse.json({ reply: text?.type === "text" ? text.text : "" });
}
