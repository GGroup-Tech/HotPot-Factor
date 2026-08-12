"use client";

import { useCallback, useState } from "react";
import { PagoForm } from "./PagoForm";
import { ResumenPago } from "./ResumenPago";

interface Paquete {
  id: string;
  nombre: string;
  creditos: number;
  precio_mxn: number;
}

const currency = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

export function PagoClientShell({ paquete }: { paquete: Paquete }) {
  const [totalLabel, setTotalLabel] = useState(`$${currency.format(paquete.precio_mxn)} MXN`);
  const onTotalChange = useCallback((label: string) => setTotalLabel(label), []);

  return (
    <>
      <div className="flex flex-1 flex-col items-start gap-6">
        <h1 className="text-display-m text-cream">Método de pago</h1>
        <div className="flex w-full items-center gap-[10px] rounded-card-sm border border-line bg-surface px-[18px] py-[14px]">
          <span className="size-[6px] rounded-full bg-muted" />
          <p className="flex-1 text-[14px] text-muted">
            Pago procesado por Stripe. No almacenamos datos de tu tarjeta.
          </p>
        </div>
        <PagoForm paqueteId={paquete.id} totalLabel={totalLabel} />
      </div>
      <ResumenPago paquete={paquete} onTotalChange={onTotalChange} />
    </>
  );
}
