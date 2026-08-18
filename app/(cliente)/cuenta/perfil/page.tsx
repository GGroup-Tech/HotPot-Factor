import { requireUsuario } from "@/lib/supabase/staff";
import { PerfilForm } from "./PerfilForm";

/** 10 — Mi perfil. */
export default async function PerfilPage() {
  const { user, usuario } = await requireUsuario();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-eyebrow text-gold">MI PERFIL</p>
        <h1 className="text-display-m text-cream">Datos de tu cuenta</h1>
        <p className="text-[14px] text-muted">
          Tu dirección y colonia se usan para calcular la cobertura de entrega.
        </p>
      </div>

      <PerfilForm
        usuario={{
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          telefono: usuario.telefono,
          fechaNac: usuario.fecha_nac,
          colonia: usuario.colonia,
          calleNumero: usuario.calle_numero,
          codigoPostal: usuario.codigo_postal,
        }}
        email={user.email ?? ""}
      />
    </div>
  );
}
