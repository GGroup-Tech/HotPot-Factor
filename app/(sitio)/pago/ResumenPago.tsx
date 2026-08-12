"use client";

import { useEffect, useMemo, useState } from "react";

const currency = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

interface Paquete {
  nombre: string;
  creditos: number;
  precio_mxn: number;
}

export function ResumenPago({
  paquete,
  onTotalChange,
}: {
  paquete: Paquete;
  onTotalChange: (totalLabel: string) => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [cupon, setCupon] = useState<
    { descuentoPct: number | null; descuentoMxn: number | null } | null | "invalido"
  >(null);
  const [checking, setChecking] = useState(false);

  const descuento = useMemo(() => {
    if (!cupon || cupon === "invalido") return 0;
    if (cupon.descuentoPct) return Math.round((paquete.precio_mxn * cupon.descuentoPct) / 100);
    return cupon.descuentoMxn ?? 0;
  }, [cupon, paquete.precio_mxn]);

  const total = paquete.precio_mxn - descuento;

  useEffect(() => {
    onTotalChange(`$${currency.format(total)} MXN`);
  }, [total, onTotalChange]);

  async function aplicar() {
    if (!codigo.trim()) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/cupones/validar?codigo=${encodeURIComponent(codigo)}`);
      const data = await res.json();
      setCupon(data.valido ? { descuentoPct: data.descuentoPct, descuentoMxn: data.descuentoMxn } : "invalido");
    } finally {
      setChecking(false);
    }
  }

  return (
    <aside className="order-first w-full rounded-card-lg border border-line bg-surface p-7 lg:order-last lg:w-[380px] lg:shrink-0">
      <p className="text-eyebrow text-gold">RESUMEN</p>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[18px] font-medium text-cream">Paquete {paquete.nombre}</p>
        <p className="text-[14px] text-muted">{paquete.creditos} créditos</p>
      </div>

      <div className="mt-4 flex items-center gap-[10px]">
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="Código de cupón"
          className="input flex-1 tracking-[0.6px]"
        />
        <button type="button" onClick={aplicar} disabled={checking} className="btn-secondary rounded-control px-[18px] py-3 text-[14px]">
          {checking ? "…" : "Aplicar"}
        </button>
      </div>
      {cupon === "invalido" && <p className="mt-2 text-[13px] text-danger">Cupón inválido o expirado.</p>}
      {cupon && cupon !== "invalido" && (
        <p className="mt-2 text-[13px] text-success">
          Cupón aplicado: {cupon.descuentoPct ? `${cupon.descuentoPct}% de descuento` : `$${currency.format(cupon.descuentoMxn ?? 0)} de descuento`}
        </p>
      )}

      <div className="my-4 h-px w-full bg-line" />
      <div className="flex items-center justify-between text-[15px]">
        <p className="text-muted">Subtotal</p>
        <p className="text-cream">${currency.format(paquete.precio_mxn)}</p>
      </div>
      {descuento > 0 && (
        <div className="mt-2 flex items-center justify-between text-[15px]">
          <p className="text-muted">Descuento</p>
          <p className="text-success">– ${currency.format(descuento)}</p>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between text-[15px]">
        <p className="text-muted">Envío</p>
        <p className="text-cream">Incluido</p>
      </div>
      <div className="my-4 h-px w-full bg-line" />
      <div className="flex items-center justify-between text-[20px] font-semibold">
        <p className="text-cream">Total</p>
        <p className="font-display text-gold">${currency.format(total)} MXN</p>
      </div>
    </aside>
  );
}
