"use client";

import { useState } from "react";

interface Mensaje {
  role: "user" | "assistant";
  content: string;
}

/**
 * FAB Blanca para la landing (sin sesión). Antes esto era solo un
 * tooltip que mandaba a crear cuenta, porque el endpoint exigía
 * usuario autenticado. Ahora /api/blanca ya no requiere sesión, así
 * que aquí Blanca platica de verdad con visitantes: responde dudas
 * generales sobre cómo funciona el servicio, paquetes, cobertura,
 * etc. — nunca datos de cuenta (eso solo aplica cuando hay sesión,
 * ver BlancaChat en el área cliente).
 */
export function BlancaFabGuest() {
  const [open, setOpen] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      role: "assistant",
      content: "Hola, soy Blanca. Pregúntame cómo funciona HotPot Factor, qué paquetes tenemos o si llegamos a tu colonia.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    const texto = input.trim();
    if (!texto || pending) return;

    const nuevos: Mensaje[] = [...mensajes, { role: "user", content: texto }];
    setMensajes(nuevos);
    setInput("");
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/blanca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nuevos }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Blanca no pudo responder. Intenta de nuevo.");
        return;
      }
      setMensajes((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setError("No se pudo conectar con Blanca. Revisa tu conexión.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[420px] w-[calc(100vw-64px)] max-w-[340px] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[14px] font-medium text-cream">Blanca</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
              className="text-[13px] text-muted hover:text-cream"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
            {mensajes.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-card-sm px-3 py-2 text-[13px] leading-[19px] ${
                  m.role === "user"
                    ? "self-end bg-gold text-ink"
                    : "self-start bg-raised text-cream"
                }`}
              >
                {m.content}
              </div>
            ))}
            {pending && <p className="text-[12px] text-muted">Blanca está escribiendo…</p>}
            {error && <p className="text-[12px] text-danger">{error}</p>}
          </div>

          <div className="flex items-center gap-2 border-t border-line p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviar()}
              placeholder="Escribe tu pregunta…"
              className="flex-1 rounded-control border border-line bg-ink px-3 py-2 text-[13px] text-cream placeholder:text-muted/70 focus:outline-none focus:border-gold/70"
            />
            <button
              type="button"
              onClick={enviar}
              disabled={pending}
              className="btn-primary rounded-control px-3 py-2 text-[13px] disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Pregúntale a Blanca"
        className="flex size-14 items-center justify-center rounded-full bg-gold text-[24px] font-semibold text-ink font-display shadow-lg transition-transform hover:scale-105"
      >
        B
      </button>
    </div>
  );
}
