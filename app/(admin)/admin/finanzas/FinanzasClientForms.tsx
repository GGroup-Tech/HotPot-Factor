"use client";

import { useState, useTransition } from "react";
import {
  registrarGasto,
  eliminarGasto,
  alternarGastoPagado,
  cerrarMesContable,
  reabrirMesContable,
  guardarConfiguracionFinanciera,
  guardarMetaMensual,
  crearActivoFijo,
  alternarActivoFijo,
  crearCuentaBancaria,
  actualizarSaldoCuenta,
  eliminarCuentaBancaria,
  crearMovimientoCapital,
  eliminarMovimientoCapital,
} from "../../actions";

/**
 * Componentes cliente para Finanzas — mismo patrón (useTransition +
 * error visible) que `admin/menu/MenuClientForms.tsx` y
 * `admin/platillos/PlatilloForms.tsx`. Reemplaza también los
 * `<form action={async () => {"use server";...}}>` inline que ya
 * existían en esta página (Registrar gasto, Eliminar gasto, Cerrar/
 * reabrir mes) — el mismo patrón que causó "no hace nada" en Menú del
 * mes (2026-08-13), para no dejar la misma trampa aquí.
 */

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

// ---------- Gastos ----------

export function GastoForm({ categorias, hoyISO }: { categorias: { id: string; nombre: string }[]; hoyISO: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pagado, setPagado] = useState(true);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const res = await registrarGasto(formData);
      if (!res.ok) setError(res.error ?? "No se pudo registrar el gasto.");
      else form.reset();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-[700px] flex-col gap-4 rounded-card border border-line bg-surface p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Descripción">
          <input name="descripcion" required placeholder="Meta Ads — campaña septiembre" className="input" />
        </Campo>
        <Campo label="Monto (MXN)">
          <input name="monto_mxn" type="number" min="0" step="0.01" required placeholder="1200" className="input" />
        </Campo>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Categoría">
          <select name="categoria_id" className="input">
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Fecha">
          <input name="fecha" type="date" required defaultValue={hoyISO} className="input" />
        </Campo>
      </div>
      <Campo label="Proveedor / plataforma (opcional)">
        <input name="proveedor" placeholder="Meta Platforms" className="input" />
      </Campo>
      <label className="flex items-center gap-2.5 text-[14px] text-cream">
        <input type="checkbox" name="recurrente" className="size-[16px]" />
        Gasto recurrente mensual
      </label>
      <label className="flex items-center gap-2.5 text-[14px] text-cream">
        <input
          type="checkbox"
          name="pagado"
          defaultChecked
          className="size-[16px]"
          onChange={(e) => setPagado(e.target.checked)}
        />
        Ya está pagado
      </label>
      {!pagado && (
        <Campo label="Fecha de vencimiento">
          <input name="fecha_vencimiento" type="date" className="input" />
        </Campo>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full rounded-control py-3 text-[14px] disabled:opacity-40">
        {pending ? "Guardando…" : "Guardar gasto"}
      </button>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </form>
  );
}

export function GastoEliminarBoton({ gastoId }: { gastoId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await eliminarGasto(gastoId);
            if (!res.ok) setError(res.error ?? "No se pudo eliminar.");
          })
        }
        className="text-[12px] text-muted hover:text-danger disabled:opacity-40"
      >
        {pending ? "…" : "Eliminar"}
      </button>
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
}

export function GastoPagadoBoton({ gastoId, pagado }: { gastoId: string; pagado: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await alternarGastoPagado(gastoId, !pagado);
            if (!res.ok) setError(res.error ?? "No se pudo actualizar.");
          })
        }
        className={`pill border ${pagado ? "border-success text-success" : "border-warning text-warning"}`}
      >
        {pending ? "…" : pagado ? "Pagado" : "Marcar pagado"}
      </button>
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
}

// ---------- Cierre mensual ----------

export function CierreMesBoton({ anio, mes, cerrado }: { anio: number; mes: number; cerrado: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = cerrado ? await reabrirMesContable(anio, mes) : await cerrarMesContable(anio, mes);
            if (!res.ok) setError(res.error ?? "Ocurrió un error.");
          })
        }
        className={`w-fit rounded-control px-6 py-3 text-[14px] disabled:opacity-40 ${cerrado ? "btn-secondary" : "btn-primary"}`}
      >
        {pending ? "Procesando…" : cerrado ? "Reabrir mes" : "Cerrar mes"}
      </button>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}

// ---------- Configuración financiera ----------

export function ConfiguracionForm({ isrActual, capacidadActual }: { isrActual: number | null; capacidadActual: number | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setGuardado(false);
    startTransition(async () => {
      const res = await guardarConfiguracionFinanciera(formData);
      if (!res.ok) setError(res.error ?? "No se pudo guardar.");
      else setGuardado(true);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-[500px] flex-col gap-4 rounded-card border border-line bg-surface p-6">
      <p className="text-[13px] font-medium text-cream">Configuración financiera</p>
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Tasa de ISR (%)">
          <input name="isr_tasa_pct" type="number" min="0" max="100" step="0.1" defaultValue={isrActual ?? ""} placeholder="30" className="input" />
        </Campo>
        <Campo label="Capacidad de producción diaria (porciones)">
          <input name="capacidad_produccion_diaria" type="number" min="0" defaultValue={capacidadActual ?? ""} placeholder="150" className="input" />
        </Campo>
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full rounded-control py-2.5 text-[13px] disabled:opacity-40">
        {pending ? "Guardando…" : "Guardar configuración"}
      </button>
      {error && <p className="text-[12px] text-danger">{error}</p>}
      {guardado && !error && <p className="text-[12px] text-success">Guardado.</p>}
    </form>
  );
}

// ---------- Metas del mes ----------

export function MetaMensualForm({
  anio,
  mes,
  ingresoMetaActual,
  margenMetaActual,
  gastoMaxActual,
}: {
  anio: number;
  mes: number;
  ingresoMetaActual: number | null;
  margenMetaActual: number | null;
  gastoMaxActual: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setGuardado(false);
    startTransition(async () => {
      const res = await guardarMetaMensual(anio, mes, formData);
      if (!res.ok) setError(res.error ?? "No se pudo guardar.");
      else setGuardado(true);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4 rounded-card border border-line bg-surface p-5">
      <p className="text-[13px] font-medium text-cream">Meta de este mes</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Campo label="Ingreso meta (MXN)">
          <input name="ingreso_meta_mxn" type="number" min="0" step="1" defaultValue={ingresoMetaActual ?? ""} placeholder="80000" className="input" />
        </Campo>
        <Campo label="Margen meta (%)">
          <input name="margen_meta_pct" type="number" min="0" max="100" step="0.1" defaultValue={margenMetaActual ?? ""} placeholder="35" className="input" />
        </Campo>
        <Campo label="Gasto operativo máx. (MXN)">
          <input name="gasto_operativo_max_mxn" type="number" min="0" step="1" defaultValue={gastoMaxActual ?? ""} placeholder="20000" className="input" />
        </Campo>
      </div>
      <button type="submit" disabled={pending} className="btn-secondary w-fit rounded-control px-5 py-2.5 text-[13px] disabled:opacity-40">
        {pending ? "Guardando…" : "Guardar meta"}
      </button>
      {error && <p className="text-[12px] text-danger">{error}</p>}
      {guardado && !error && <p className="text-[12px] text-success">Guardado.</p>}
    </form>
  );
}

// ---------- Activos fijos ----------

export function ActivoFijoForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const res = await crearActivoFijo(formData);
      if (!res.ok) setError(res.error ?? "No se pudo registrar.");
      else form.reset();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-[600px] flex-col gap-4 rounded-card border border-line bg-surface p-5">
      <p className="text-[13px] font-medium text-cream">Agregar activo fijo</p>
      <Campo label="Nombre">
        <input name="nombre" required placeholder="Refrigerador industrial" className="input" />
      </Campo>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Campo label="Valor de compra (MXN)">
          <input name="valor_compra_mxn" type="number" min="0" step="0.01" required placeholder="45000" className="input" />
        </Campo>
        <Campo label="Fecha de compra">
          <input name="fecha_compra" type="date" required className="input" />
        </Campo>
        <Campo label="Vida útil (meses)">
          <input name="vida_util_meses" type="number" min="1" required placeholder="60" className="input" />
        </Campo>
      </div>
      <button type="submit" disabled={pending} className="btn-secondary w-fit rounded-control px-5 py-2.5 text-[13px] disabled:opacity-40">
        {pending ? "Guardando…" : "Agregar activo"}
      </button>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </form>
  );
}

export function ActivoFijoActivoBoton({ activoId, activo }: { activoId: string; activo: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await alternarActivoFijo(activoId, !activo);
            if (!res.ok) setError(res.error ?? "No se pudo actualizar.");
          })
        }
        className="text-[12px] text-muted hover:text-cream disabled:opacity-40"
      >
        {pending ? "…" : activo ? "Dar de baja" : "Reactivar"}
      </button>
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
}

// ---------- Cuentas bancarias ----------

export function CuentaBancariaForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const res = await crearCuentaBancaria(formData);
      if (!res.ok) setError(res.error ?? "No se pudo registrar.");
      else form.reset();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-[500px] flex-col gap-4 rounded-card border border-line bg-surface p-5">
      <p className="text-[13px] font-medium text-cream">Agregar cuenta bancaria</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Nombre">
          <input name="nombre" required placeholder="BBVA Cuenta Operativa" className="input" />
        </Campo>
        <Campo label="Saldo actual (MXN)">
          <input name="saldo_mxn" type="number" step="0.01" required placeholder="52000" className="input" />
        </Campo>
      </div>
      <button type="submit" disabled={pending} className="btn-secondary w-fit rounded-control px-5 py-2.5 text-[13px] disabled:opacity-40">
        {pending ? "Guardando…" : "Agregar cuenta"}
      </button>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </form>
  );
}

export function CuentaBancariaFila({ cuenta }: { cuenta: { id: string; nombre: string; saldo_mxn: number } }) {
  const [editando, setEditando] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await actualizarSaldoCuenta(cuenta.id, formData);
      if (!res.ok) setError(res.error ?? "No se pudo actualizar.");
      else setEditando(false);
    });
  }

  return (
    <tr className="border-b border-line text-[13px] text-cream last:border-b-0">
      <td className="px-5 py-3.5 font-medium">{cuenta.nombre}</td>
      <td className="px-5 py-3.5">
        {editando ? (
          <form onSubmit={onSubmit} className="flex items-center gap-2">
            <input name="saldo_mxn" type="number" step="0.01" defaultValue={cuenta.saldo_mxn} className="input w-[140px]" />
            <button type="submit" disabled={pending} className="text-[12px] text-gold disabled:opacity-40">
              {pending ? "…" : "Guardar"}
            </button>
            <button type="button" onClick={() => setEditando(false)} className="text-[12px] text-muted">
              Cancelar
            </button>
          </form>
        ) : (
          <span>${cuenta.saldo_mxn.toLocaleString("es-MX")}</span>
        )}
        {error && <p className="text-[11px] text-danger">{error}</p>}
      </td>
      <td className="px-5 py-3.5 text-right">
        {!editando && (
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setEditando(true)} className="text-[12px] text-muted hover:text-cream">
              Editar saldo
            </button>
            <EliminarCuentaBoton cuentaId={cuenta.id} />
          </div>
        )}
      </td>
    </tr>
  );
}

function EliminarCuentaBoton({ cuentaId }: { cuentaId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => { await eliminarCuentaBancaria(cuentaId); })}
      className="text-[12px] text-muted hover:text-danger disabled:opacity-40"
    >
      {pending ? "…" : "Eliminar"}
    </button>
  );
}

// ---------- Capital ----------

export function MovimientoCapitalForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const res = await crearMovimientoCapital(formData);
      if (!res.ok) setError(res.error ?? "No se pudo registrar.");
      else form.reset();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-[600px] flex-col gap-4 rounded-card border border-line bg-surface p-5">
      <p className="text-[13px] font-medium text-cream">Registrar movimiento de capital</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Campo label="Tipo">
          <select name="tipo" className="input">
            <option value="aportacion">Aportación de socio</option>
            <option value="retiro">Retiro de socio</option>
          </select>
        </Campo>
        <Campo label="Monto (MXN)">
          <input name="monto_mxn" type="number" min="0" step="0.01" required placeholder="50000" className="input" />
        </Campo>
        <Campo label="Fecha">
          <input name="fecha" type="date" required className="input" />
        </Campo>
      </div>
      <Campo label="Nota (opcional)">
        <input name="nota" placeholder="Aportación inicial socio Juan Pablo" className="input" />
      </Campo>
      <button type="submit" disabled={pending} className="btn-secondary w-fit rounded-control px-5 py-2.5 text-[13px] disabled:opacity-40">
        {pending ? "Guardando…" : "Registrar movimiento"}
      </button>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </form>
  );
}

export function MovimientoCapitalEliminarBoton({ movimientoId }: { movimientoId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => { await eliminarMovimientoCapital(movimientoId); })}
      className="text-[12px] text-muted hover:text-danger disabled:opacity-40"
    >
      {pending ? "…" : "Eliminar"}
    </button>
  );
}
