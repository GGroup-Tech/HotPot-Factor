import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminReparto() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const hoy = new Date().toISOString().split('T')[0]

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id, estado, platillos(nombre), usuarios(nombre, apellido, calle_numero, colonia, referencias, telefono, zonas_cobertura(nombre_zona))')
    .eq('fecha_entrega', hoy)
    .neq('estado', 'cancelado')
    .order('creado_en')

  const porZona: Record<string, any[]> = {}
  for (const p of pedidos ?? []) {
    const zona = (p.usuarios as any)?.zonas_cobertura?.nombre_zona ?? 'Sin zona'
    if (!porZona[zona]) porZona[zona] = []
    porZona[zona].push(p)
  }

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ borderBottom: '1px solid var(--color-line)', paddingBottom: 20, marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-cream)', fontWeight: 600 }}>Reparto</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} · {pedidos?.length ?? 0} entregas
          </p>
        </div>
      </div>

      {Object.entries(porZona).map(([zona, pedidosZona]) => (
        <div key={zona} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px', marginBottom: 20 }}>
          <div className="flex items-center justify-between mb-4">
            <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em' }}>{zona.toUpperCase()}</p>
            <span style={{ background: 'var(--color-raised)', color: 'var(--color-cream)', borderRadius: 100, padding: '4px 12px', fontSize: 12, fontWeight: 500 }}>
              {pedidosZona.length} entregas
            </span>
          </div>
          <div className="flex flex-col">
            {pedidosZona.map((p: any, i) => (
              <div key={p.id} className="flex items-start justify-between" style={{ padding: '14px 0', borderBottom: i < pedidosZona.length - 1 ? '1px solid var(--color-line)' : 'none' }}>
                <div className="flex gap-4">
                  <span style={{ color: 'var(--color-disabled)', fontSize: 13, minWidth: 24 }}>{i + 1}</span>
                  <div>
                    <p style={{ color: 'var(--color-cream)', fontSize: 15, fontWeight: 500 }}>
                      {p.usuarios?.nombre} {p.usuarios?.apellido}
                    </p>
                    <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 3 }}>
                      {p.usuarios?.calle_numero}, {p.usuarios?.colonia}
                    </p>
                    {p.usuarios?.referencias && (
                      <p style={{ color: 'var(--color-disabled)', fontSize: 12, marginTop: 2 }}>
                        Ref: {p.usuarios.referencias}
                      </p>
                    )}
                    {p.usuarios?.telefono && (
                      <p style={{ color: 'var(--color-gold)', fontSize: 12, marginTop: 2 }}>
                        {p.usuarios.telefono}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p style={{ color: 'var(--color-cream)', fontSize: 14 }}>{p.platillos?.nombre}</p>
                  <span style={{ background: p.estado === 'entregado' ? 'var(--color-success)' : 'var(--color-raised)', color: p.estado === 'entregado' ? 'var(--color-ink)' : 'var(--color-muted)', borderRadius: 100, padding: '3px 10px', fontSize: 11, fontWeight: 500, marginTop: 4, display: 'inline-block' }}>
                    {p.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {Object.keys(porZona).length === 0 && (
        <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>No hay entregas para hoy.</p>
      )}
    </div>
  )
}
