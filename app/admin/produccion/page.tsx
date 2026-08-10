import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminProduccion() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const hoy = new Date().toISOString().split('T')[0]

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id, es_comodin, platillos(id, nombre, calorias, proteina_g, carbs_g, grasa_g), usuarios(nombre, apellido, colonia, zona_id, zonas_cobertura(nombre_zona))')
    .eq('fecha_entrega', hoy)
    .neq('estado', 'cancelado')

  const resumen: Record<string, { nombre: string, cantidad: number, es_comodin: boolean, calorias: number, proteina_g: number, carbs_g: number, grasa_g: number }> = {}
  for (const p of pedidos ?? []) {
    const pl = p.platillos as any
    if (!pl) continue
    if (!resumen[pl.id]) {
      resumen[pl.id] = { nombre: pl.nombre, cantidad: 0, es_comodin: p.es_comodin, calorias: pl.calorias, proteina_g: pl.proteina_g, carbs_g: pl.carbs_g, grasa_g: pl.grasa_g }
    }
    resumen[pl.id].cantidad++
  }

  const porZona: Record<string, number> = {}
  for (const p of pedidos ?? []) {
    const zona = (p.usuarios as any)?.zonas_cobertura?.nombre_zona ?? 'Sin zona'
    porZona[zona] = (porZona[zona] ?? 0) + 1
  }

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ borderBottom: '1px solid var(--color-line)', paddingBottom: 20, marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-cream)', fontWeight: 600 }}>Producción del día</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 10, padding: '14px 20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em' }}>TOTAL</p>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 32, color: 'var(--color-cream)', fontWeight: 600 }}>{pedidos?.length ?? 0}</p>
            <p style={{ color: 'var(--color-muted)', fontSize: 11 }}>porciones</p>
          </div>
          {Object.entries(porZona).map(([zona, qty]) => (
            <div key={zona} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 10, padding: '14px 20px', textAlign: 'center' }}>
              <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em' }}>{zona.toUpperCase().slice(0, 12)}</p>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 32, color: 'var(--color-cream)', fontWeight: 600 }}>{qty}</p>
              <p style={{ color: 'var(--color-muted)', fontSize: 11 }}>porciones</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px', marginBottom: 24 }}>
        <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>PLATILLOS A PRODUCIR</p>
        {Object.values(resumen).length > 0 ? (
          <div className="flex flex-col">
            {Object.values(resumen).map(({ nombre, cantidad, es_comodin, calorias, proteina_g, carbs_g, grasa_g }) => (
              <div key={nombre} className="flex items-center justify-between" style={{ padding: '16px 0', borderBottom: '1px solid var(--color-line)' }}>
                <div className="flex items-center gap-4">
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: 36, color: 'var(--color-gold)', fontWeight: 600, minWidth: 60 }}>{cantidad}</p>
                  <div>
                    <div className="flex items-center gap-2">
                      <p style={{ color: 'var(--color-cream)', fontSize: 16, fontWeight: 500 }}>{nombre}</p>
                      {es_comodin && <span style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 4, padding: '3px 8px', fontSize: 9, fontWeight: 500 }}>COMODÍN</span>}
                    </div>
                    <p style={{ color: 'var(--color-muted)', fontSize: 12, marginTop: 3 }}>porciones</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  {[['Cal', calorias], ['Prot', proteina_g ? proteina_g + 'g' : '—'], ['Carbs', carbs_g ? carbs_g + 'g' : '—'], ['Grasa', grasa_g ? grasa_g + 'g' : '—']].map(([l, v]) => (
                    <div key={l as string} className="text-center">
                      <p style={{ color: 'var(--color-muted)', fontSize: 10 }}>{l}</p>
                      <p style={{ color: 'var(--color-cream)', fontSize: 13, fontWeight: 500 }}>{v ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>No hay pedidos para hoy.</p>
        )}
      </div>
    </div>
  )
}
