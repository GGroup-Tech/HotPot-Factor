import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: 'var(--color-cream)', fontWeight: 600, marginBottom: 6 }}>Mi perfil</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 15 }}>Tu información personal y dirección de entrega</p>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '28px' }}>
        <p style={{ color: 'var(--color-gold)', fontSize: 10, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 20 }}>INFORMACIÓN PERSONAL</p>
        <div className="grid grid-cols-2 gap-6">
          {[
            { label: 'Nombre', value: usuario?.nombre },
            { label: 'Apellido', value: usuario?.apellido },
            { label: 'Correo', value: user.email },
            { label: 'Teléfono', value: usuario?.telefono },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ color: 'var(--color-muted)', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{label}</p>
              <p style={{ color: value ? 'var(--color-cream)' : 'var(--color-disabled)', fontSize: 15 }}>
                {value ?? 'No registrado'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '28px' }}>
        <p style={{ color: 'var(--color-gold)', fontSize: 10, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 20 }}>DIRECCIÓN DE ENTREGA</p>
        <div className="grid grid-cols-2 gap-6">
          {[
            { label: 'Calle y número', value: usuario?.calle_numero },
            { label: 'Colonia', value: usuario?.colonia },
            { label: 'Código postal', value: usuario?.codigo_postal },
            { label: 'Referencias', value: usuario?.referencias },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ color: 'var(--color-muted)', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{label}</p>
              <p style={{ color: value ? 'var(--color-cream)' : 'var(--color-disabled)', fontSize: 15 }}>
                {value ?? 'No registrado'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '20px 28px' }}>
        <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>
          Para modificar tu información o dirección de entrega escríbenos a{' '}
          <span style={{ color: 'var(--color-gold)' }}>hola@hotpotfactor.mx</span>
        </p>
      </div>
    </div>
  )
}
