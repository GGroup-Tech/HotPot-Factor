const PASOS = [
  { n: "01", t: "Elige tu paquete", d: "Compras créditos. Sin permanencia." },
  { n: "02", t: "Arma tu menú", d: "1 platillo = 1 crédito. Eliges antes del corte." },
  { n: "03", t: "Cocinamos fresco", d: "Producimos solo lo pedido, sin desperdicios." },
  { n: "04", t: "Te llega a casa", d: "Una entrega semanal a tu puerta." },
];

/** Cómo funciona — Figma node 244:36. */
export function ComoFunciona() {
  return (
    <section id="como-funciona" className="flex flex-col gap-12 bg-surface px-6 py-16 md:px-10 lg:px-[100px] lg:py-[100px]">
      <div className="flex flex-col gap-4">
        <p className="text-[12px] font-medium tracking-[1.2px] text-gold">CÓMO FUNCIONA</p>
        <h2 className="text-display-l text-cream">Cuatro pasos y ya</h2>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PASOS.map((p) => (
          <div key={p.n} className="flex flex-1 flex-col gap-[14px] rounded-card border border-line bg-ink px-[30px] pb-9 pt-8">
            <p className="font-display text-[30px] font-semibold text-gold">{p.n}</p>
            <p className="text-[19px] font-medium text-cream">{p.t}</p>
            <p className="text-[15px] leading-[25px] text-muted">{p.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
