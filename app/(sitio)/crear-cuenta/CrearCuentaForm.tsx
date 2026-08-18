"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, SelectField, TextareaField } from "@/app/components/ui/Field";
import { Button } from "@/app/components/ui/Button";
import { crearCuenta, type CrearCuentaState } from "./actions";

const ESTADO_INICIAL: CrearCuentaState = { ok: false };

export function CrearCuentaForm({ paqueteId }: { paqueteId: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(crearCuenta, ESTADO_INICIAL);
  const [colonia, setColonia] = useState("");
  const [cobertura, setCobertura] = useState<"idle" | "checking" | "ok" | "fuera">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (state.ok) {
      router.push(`/pago?paquete=${state.paqueteId ?? paqueteId}`);
    }
  }, [state.ok, state.paqueteId, paqueteId, router]);

  function onColoniaChange(value: string) {
    setColonia(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setCobertura("idle");
      return;
    }
    setCobertura("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cobertura?colonia=${encodeURIComponent(value)}`);
        const data = await res.json();
        setCobertura(data.cubierta ? "ok" : "fuera");
      } catch {
        setCobertura("idle");
      }
    }, 450);
  }

  return (
    <form action={formAction} className="flex flex-1 flex-col items-start gap-[26px]">
      <h1 className="text-display-m text-cream">Crea tu cuenta</h1>
      <input type="hidden" name="paquete_id" value={paqueteId} />

      <div className="flex w-full gap-4">
        <Field label="Nombre" name="nombre" placeholder="Juan Pablo" required />
        <Field label="Apellido" name="apellido" placeholder="Flores" required />
      </div>
      <Field label="Correo electrónico" name="email" type="email" placeholder="juanpablo@correo.com" required />
      <div className="flex w-full gap-4">
        <Field label="Teléfono" name="telefono" placeholder="81 1234 5678" />
        <Field label="Contraseña" name="password" type="password" placeholder="••••••••" required minLength={8} />
      </div>
      <Field label="Fecha de nacimiento" name="fecha_nac" type="date" />
      <SelectField label="¿Cómo te enteraste de nosotros?" name="como_nos_conocio" defaultValue="">
        <option value="">Prefiero no decir</option>
        <option value="Instagram">Instagram</option>
        <option value="Facebook">Facebook</option>
        <option value="TikTok">TikTok</option>
        <option value="Google">Google / búsqueda</option>
        <option value="Recomendación">Recomendación de un amigo</option>
        <option value="Otro">Otro</option>
      </SelectField>

      <div className="h-px w-full bg-line" />
      <p className="text-[19px] font-medium text-cream">Dirección de entrega</p>
      <Field label="Calle y número" name="calle" placeholder="Av. Vasconcelos 1500" required />
      <div className="flex w-full gap-4">
        <Field
          label="Colonia"
          name="colonia"
          placeholder="Del Valle"
          required
          value={colonia}
          onChange={(e) => onColoniaChange(e.target.value)}
        />
        <Field label="Código postal" name="codigo_postal" placeholder="66220" />
      </div>
      <TextareaField
        label="Referencias para el repartidor"
        name="referencias"
        placeholder="Portón negro, timbre 2"
        rows={2}
      />

      {cobertura === "ok" && (
        <div className="flex w-full items-center gap-3 rounded-card-sm border border-success bg-surface px-5 py-4">
          <span className="size-2 rounded-full bg-success" />
          <p className="flex-1 text-[15px] text-cream">Tu dirección está dentro de nuestra zona de cobertura.</p>
        </div>
      )}
      {cobertura === "fuera" && (
        <div className="flex w-full items-center gap-3 rounded-card-sm border border-warning bg-surface px-5 py-4">
          <span className="size-2 rounded-full bg-warning" />
          <p className="flex-1 text-[15px] text-cream">
            Todavía no llegamos a esa zona. Al continuar te anotamos en la lista de espera.
          </p>
        </div>
      )}

      {state.enListaEspera && (
        <div className="w-full rounded-card-sm border border-warning bg-warning/10 px-5 py-4 text-[15px] text-warning">
          Te agregamos a la lista de espera — te avisamos por correo en cuanto lleguemos a tu zona.
        </div>
      )}
      {state.requiereConfirmacion && (
        <div className="w-full rounded-card-sm border border-gold bg-gold/10 px-5 py-4 text-[15px] text-gold">
          Te mandamos un correo de confirmación. Ábrelo y confirma tu cuenta, luego inicia sesión para continuar
          con tu compra.
        </div>
      )}
      {state.error && (
        <div className="w-full rounded-card-sm border border-danger bg-danger/10 px-5 py-4 text-[15px] text-danger">
          {state.error}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Creando cuenta…" : "Continuar al pago"}
      </Button>
    </form>
  );
}
