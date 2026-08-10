import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function EntregasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const hoy = new Date().toISOString().split('T')[0]

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id, fecha_entrega, estado, corte_edicion, platillos(nombre)')
    .eq('usuario_id', user.id)
    .gte('fecha_entrega', hoy)
    .neq('estado', 'cancelado')
    .order('fecha_entrega')

  const estadoColor: Record<string, string> = {
    programado: 'var(--color-gold)',
    cerrado: 'var(--color-muted)',
    en_produccion: 'var(--color-warning)',
    entregado: 'var(--color-success)',
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: 'var(--color-cream)', fontWeight: 600, marginBottom: 6 }}>
          Próximas entregas
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 15 }}>
          {pedidos?.length ?? 0} entregas programadas
        </p>
      </div>

      {pedidos && pedidos.length > 0 ? (
        <div className="flex flex-col gap-3">
          {pedidos.map((p: any) => {
            const editable = new Date() < new Date(p.corte_edicion)
            return (
              <div key={p.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '20px 24px' }}>
                <div className="flex items-center justify-between">
                  <div className="flex gap-5 items-center">
                    <div style={{ minWidth: 90 }}>
                      <p style={{ color: 'var(--color-gold)', fontSize: 10, fontWeight: 500, letterSpacing: '0.08em' }}>
                        {new Date(p.fecha_entrega).toLocaleDateString('es-MX', { weekday: 'short' }).toUpperCase()}
                      </p>
                      <p style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: 'var(--color-cream)', fontWeight: 600 }}>
                        {new Date(p.fecha_entrega).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--color-cream)', fontSize: 16, fontWeight: 500 }}>
                        {p.platillos?.nombre}
                      </p>
                      <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>
                        {editable
                          ? `Editable hasta ${new Date(p.corte_edicion).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} a las ${new Date(p.corte_edicion).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
                          : 'Corte cerrado'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span style={{ color: estadoColor[p.estado] ?? 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>
                      {p.estado.charAt(0).toUpperCase() + p.estado.slice(1).replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-muted)', fontSize: 15, marginBottom: 16 }}>No tienes entregas programadas</p>
          <a href="/cuenta/calendario" style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 8, padding: '13px 24px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
            Ir al calendario
          </a>
        </div>
      )}
    </div>
  )
}
