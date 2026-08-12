"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "¿Los créditos expiran?",
    a: "No. Una vez que compras un paquete, tus créditos se quedan en tu cuenta hasta que los uses.",
  },
  {
    q: "¿Puedo cambiar mi selección?",
    a: "Sí, hasta la fecha límite del domingo. Después se cierra el menú para producir.",
  },
  {
    q: "¿Qué pasa si no elijo a tiempo?",
    a: "Te mandamos recordatorios antes del cierre. Si no eliges, te contactamos directamente.",
  },
  {
    q: "¿A dónde entregan?",
    a: "Entregamos en Valle Oriente y Santa María Corporativo. Al registrarte validamos tu dirección.",
  },
];

/**
 * Preguntas — Figma node 244:171. Acordeón: solo se ven las preguntas,
 * el click expande la respuesta. Un solo item abierto a la vez.
 */
export function FAQSection() {
  const [abierta, setAbierta] = useState<number | null>(null);

  return (
    <section id="preguntas" className="flex flex-col items-start gap-12 px-[100px] py-[100px]">
      <div className="flex flex-col gap-4">
        <p className="text-[12px] font-medium tracking-[1.2px] text-gold">PREGUNTAS FRECUENTES</p>
        <h2 className="text-display-m text-cream">Lo que casi siempre nos preguntan</h2>
      </div>
      <div className="grid w-full grid-cols-1 gap-[22px] md:grid-cols-2">
        {FAQS.map((item, i) => {
          const expandida = abierta === i;
          return (
            <button
              key={item.q}
              type="button"
              onClick={() => setAbierta(expandida ? null : i)}
              aria-expanded={expandida}
              className="flex flex-col items-start gap-3 rounded-card border border-line bg-surface px-8 py-[30px] text-left transition-colors hover:border-gold/40"
            >
              <div className="flex w-full items-center justify-between">
                <p className="text-[19px] font-medium text-cream">{item.q}</p>
                <span
                  className={`text-[20px] text-gold transition-transform ${expandida ? "rotate-45" : ""}`}
                >
                  +
                </span>
              </div>
              {expandida && (
                <p className="text-[16px] leading-[26px] text-muted">{item.a}</p>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
