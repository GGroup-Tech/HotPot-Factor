import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminPanel() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const hoy = new Date().toISOString().split('T')[0]

  const [{ count: totalClientes }, { count: pedidosHoy }, { data: pedidos }] = await Promise.all([
    supabase.from('usuarios').select('*', { count: 'exact', head: true }),
    supabase.from('pedidos').select('*', { count: 'exact', head: true }).eq('fecha_entrega', hoy),
    supabase.from('pedidos')
      .select('id, estado, usuarios(nombre, apellido), platillos(nombre)')
      .eq('fecha_entrega', hoy)
      .limit(10)
  ])

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ borderBottom: '1px solid var(--color-line)', paddingBottom: 20, marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-cream)', fontWeight: 600 }}>Panel</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '20px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>CLIENTES ACTIVOS</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 36, color: 'var(--color-cream)', fontWeight: 600 }}>{totalClientes ?? 0}</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 12, marginTop: 6 }}>registrados</p>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '20px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>ENTREGAS HOY</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 36, color: 'var(--color-cream)', fontWeight: 600 }}>{pedidosHoy ?? 0}</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 12, marginTop: 6 }}>pedidos programados</p>
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
        <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>PEDIDOS DE HOY</p>
        {pedidos && pedidos.length > 0 ? (
          <div className="flex flex-col">
            {pedidos.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between" style={{ padding: '14px 0', borderBottom: '1px solid var(--color-line)' }}>
                <p style={{ color: 'var(--color-cream)', fontSize: 14 }}>{p.usuarios?.nombre} {p.usuarios?.apellido}</p>
                <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>{p.platillos?.nombre}</p>
                <span style={{ background: 'var(--color-success)', color: 'var(--color-ink)', borderRadius: 100, padding: '4px 10px', fontSize: 11, fontWeight: 500 }}>{p.estado}</span>
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
