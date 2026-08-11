import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminClientes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin-login')

  const { data: clientes } = await supabase
    .from('usuarios')
    .select('*, zonas_cobertura(nombre_zona)')
    .order('creado_en', { ascending: false })

  const { data: saldos } = await supabase
    .from('saldo_creditos')
    .select('usuario_id, saldo')

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('usuario_id, fecha_entrega, platillos(nombre)')
    .gte('fecha_entrega', new Date().toISOString().split('T')[0])
    .eq('estado', 'programado')
    .order('fecha_entrega')

  const saldoMap = Object.fromEntries(saldos?.map(s => [s.usuario_id, s.saldo]) ?? [])
  const proximaMap: Record<string, any> = {}
  for (const p of pedidos ?? []) {
    if (!proximaMap[p.usuario_id]) proximaMap[p.usuario_id] = p
  }

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ borderBottom: '1px solid var(--color-line)', paddingBottom: 20, marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-cream)', fontWeight: 600 }}>Clientes</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>{clientes?.length ?? 0} activos</p>
      </div>

      {/* Stats fila 1 */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {[
          { label: 'CLIENTES ACTIVOS', value: clientes?.length ?? 0, sub: '+3 esta semana' },
          { label: 'CRÉDITOS DISPONIBLES', value: saldos?.reduce((s,c) => s + Number(c.saldo), 0) ?? 0, sub: 'sin consumir' },
          { label: 'TICKET PROMEDIO', value: '$1,390', sub: 'por compra de paquete' },
          { label: 'ENTREGAS HOY', value: pedidos?.filter(p => p.fecha_entrega === new Date().toISOString().split('T')[0]).length ?? 0, sub: 'Valle Oriente y Santa María' },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '20px' }}>
            <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>{label}</p>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 32, color: 'var(--color-cream)', fontWeight: 600 }}>{value}</p>
            <p style={{ color: 'var(--color-muted)', fontSize: 12, marginTop: 6 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['Lista', 'Estadísticas'].map((t, i) => (
          <div key={t} style={{ padding: '9px 18px', borderRadius: 8, background: i === 0 ? 'var(--color-raised)' : 'transparent', border: i === 0 ? '1px solid var(--color-gold)' : 'none', cursor: 'pointer' }}>
            <p style={{ color: i === 0 ? 'var(--color-gold)' : 'var(--color-muted)', fontSize: 14, fontWeight: i === 0 ? 500 : 400 }}>{t}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
        <div className="flex gap-4" style={{ paddingBottom: 12, borderBottom: '1px solid var(--color-line)', marginBottom: 4 }}>
          {['CLIENTE', 'CONTACTO', 'PAQUETE', 'CRÉDITOS', 'PRÓX. ENTREGA', 'ESTADO'].map(h => (
            <p key={h} style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', flex: 1 }}>{h}</p>
          ))}
        </div>
        {clientes?.map((c: any) => {
          const saldo = saldoMap[c.id] ?? 0
          const proxima = proximaMap[c.id]
          return (
            <Link key={c.id} href={`/admin/clientes/${c.id}`}
              style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--color-line)', textDecoration: 'none', cursor: 'pointer' }}>
              <p style={{ color: 'var(--color-cream)', fontSize: 14, fontWeight: 500, flex: 1 }}>{c.nombre} {c.apellido}</p>
              <p style={{ color: 'var(--color-muted)', fontSize: 13, flex: 1 }}>{c.colonia ?? '—'}</p>
              <p style={{ color: 'var(--color-muted)', fontSize: 13, flex: 1 }}>{c.zonas_cobertura?.nombre_zona ?? '—'}</p>
              <p style={{ color: saldo > 0 ? 'var(--color-gold)' : 'var(--color-muted)', fontSize: 14, fontWeight: 600, flex: 1 }}>{saldo}</p>
              <p style={{ color: 'var(--color-muted)', fontSize: 13, flex: 1 }}>
                {proxima ? new Date(proxima.fecha_entrega).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—'}
              </p>
              <div style={{ flex: 1 }}>
                <span style={{ border: `1px solid ${saldo > 0 ? 'var(--color-success)' : 'var(--color-warning)'}`, borderRadius: 100, padding: '4px 10px', fontSize: 11, fontWeight: 500, color: saldo > 0 ? 'var(--color-success)' : 'var(--color-warning)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: saldo > 0 ? 'var(--color-success)' : 'var(--color-warning)', display: 'inline-block' }} />
                  {saldo > 0 ? 'Activo' : 'Sin créditos'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
