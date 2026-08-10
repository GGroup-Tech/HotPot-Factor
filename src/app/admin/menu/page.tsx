import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminMenu() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth() + 1

  const { data: menu } = await supabase
    .from('menu_mes')
    .select('*, platillos(nombre, calorias, proteina_g, carbs_g, grasa_g)')
    .eq('anio', anio)
    .eq('mes', mes)
    .order('dia_semana')

  const { data: comodines } = await supabase
    .from('comodines_mes')
    .select('*, platillos(nombre)')
    .eq('anio', anio)
    .eq('mes', mes)

  const dias = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ borderBottom: '1px solid var(--color-line)', paddingBottom: 20, marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-cream)', fontWeight: 600 }}>Menú del mes</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>
            {hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px', marginBottom: 24 }}>
        <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>PLATILLOS FIJOS</p>
        {menu && menu.length > 0 ? (
          <div className="flex flex-col gap-3">
            {menu.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between" style={{ padding: '14px 0', borderBottom: '1px solid var(--color-line)' }}>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-gold)', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', width: 80 }}>{dias[m.dia_semana]}</span>
                  <p style={{ color: 'var(--color-cream)', fontSize: 15, fontWeight: 500 }}>{m.platillos?.nombre}</p>
                </div>
                <div className="flex gap-6">
                  {[
                    { l: 'Cal', v: m.platillos?.calorias },
                    { l: 'Prot', v: m.platillos?.proteina_g ? m.platillos.proteina_g + 'g' : '—' },
                    { l: 'Carbs', v: m.platillos?.carbs_g ? m.platillos.carbs_g + 'g' : '—' },
                    { l: 'Grasa', v: m.platillos?.grasa_g ? m.platillos.grasa_g + 'g' : '—' },
                  ].map(({ l, v }) => (
                    <div key={l} className="text-center">
                      <p style={{ color: 'var(--color-muted)', fontSize: 10 }}>{l}</p>
                      <p style={{ color: 'var(--color-cream)', fontSize: 13, fontWeight: 500 }}>{v ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>No hay menú publicado para este mes.</p>
        )}
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
        <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>COMODINES</p>
        {comodines && comodines.length > 0 ? (
          <div className="flex flex-col gap-2">
            {comodines.map((c: any) => (
              <p key={c.id} style={{ color: 'var(--color-cream)', fontSize: 15, padding: '12px 0', borderBottom: '1px solid var(--color-line)' }}>
                {c.platillos?.nombre}
              </p>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>No hay comodines registrados.</p>
        )}
      </div>
    </div>
  )
}
