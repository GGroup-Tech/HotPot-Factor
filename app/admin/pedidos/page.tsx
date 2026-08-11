import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminPedidos() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin-login')

  const hoy = new Date().toISOString().split('T')[0]

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id, fecha_entrega, estado, creado_en, usuarios(nombre, apellido, colonia), platillos(nombre), zonas:usuarios(zonas_cobertura(nombre_zona))')
    .order('fecha_entrega', { ascending: false })
    .limit(100)

  const estados: Record<string, string> = {
    programado: 'var(--color-gold)',
    cerrado: 'var(--color-muted)',
    en_produccion: 'var(--color-warning)',
    entregado: 'var(--color-success)',
    cancelado: 'var(--color-danger)',
  }

  const todayCount = pedidos?.filter(p => p.fecha_entrega === hoy && p.estado !== 'cancelado').length ?? 0

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ borderBottom: '1px solid var(--color-line)', paddingBottom: 20, marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-cream)', fontWeight: 600 }}>Pedidos</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>
            {todayCount} entregas hoy · {pedidos?.length ?? 0} total
          </p>
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-3 mb-6">
        {[['Todos', ''], ['Hoy', hoy], ['Programados', 'programado'], ['Entregados', 'entregado']].map(([label]) => (
          <div key={label} style={{ padding: '8px 16px', borderRadius: 8, background: label === 'Todos' ? 'var(--color-raised)' : 'transparent', border: '1px solid var(--color-line)', cursor: 'pointer' }}>
            <p style={{ color: label === 'Todos' ? 'var(--color-cream)' : 'var(--color-muted)', fontSize: 13, fontWeight: label === 'Todos' ? 500 : 400 }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
        <div className="flex gap-4" style={{ paddingBottom: 12, borderBottom: '1px solid var(--color-line)', marginBottom: 4 }}>
          {['FECHA', 'CLIENTE', 'PLATILLO', 'ZONA', 'ESTADO'].map(h => (
            <p key={h} style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', flex: 1 }}>{h}</p>
          ))}
        </div>
        {pedidos?.map((p: any) => (
          <div key={p.id} className="flex gap-4 items-center" style={{ padding: '14px 0', borderBottom: '1px solid var(--color-line)' }}>
            <p style={{ color: p.fecha_entrega === hoy ? 'var(--color-gold)' : 'var(--color-muted)', fontSize: 13, flex: 1 }}>
              {new Date(p.fecha_entrega).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
              {p.fecha_entrega === hoy && ' · Hoy'}
            </p>
            <p style={{ color: 'var(--color-cream)', fontSize: 14, fontWeight: 500, flex: 1 }}>
              {p.usuarios?.nombre} {p.usuarios?.apellido}
            </p>
            <p style={{ color: 'var(--color-muted)', fontSize: 13, flex: 1 }}>{p.platillos?.nombre}</p>
            <p style={{ color: 'var(--color-muted)', fontSize: 13, flex: 1 }}>{p.usuarios?.colonia ?? '—'}</p>
            <div style={{ flex: 1 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                border: `1px solid ${estados[p.estado] ?? 'var(--color-muted)'}`,
                borderRadius: 100, padding: '4px 10px', fontSize: 11, fontWeight: 500,
                color: estados[p.estado] ?? 'var(--color-muted)'
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: estados[p.estado], display: 'inline-block' }} />
                {p.estado.charAt(0).toUpperCase() + p.estado.slice(1).replace('_', ' ')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
