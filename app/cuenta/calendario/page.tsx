import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarioActions } from './actions'

export default async function CalendarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth() + 1

  const { data: saldo } = await supabase
    .from('saldo_creditos')
    .select('saldo')
    .eq('usuario_id', user.id)
    .single()

  const { data: menu } = await supabase
    .from('menu_mes')
    .select('dia_semana, platillos(id, nombre, calorias, proteina_g, carbs_g, grasa_g)')
    .eq('anio', anio)
    .eq('mes', mes)
    .eq('publicado', true)

  const { data: comodines } = await supabase
    .from('comodines_mes')
    .select('platillos(id, nombre)')
    .eq('anio', anio)
    .eq('mes', mes)

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id, fecha_entrega, estado, corte_edicion, platillos(id, nombre)')
    .eq('usuario_id', user.id)
    .gte('fecha_entrega', `${anio}-${String(mes).padStart(2,'0')}-01`)
    .lte('fecha_entrega', `${anio}-${String(mes).padStart(2,'0')}-31`)
    .neq('estado', 'cancelado')

  const creditos = saldo?.saldo ?? 0
  const menuMap = Object.fromEntries((menu ?? []).map(m => [(m as any).dia_semana, (m as any).platillos]))
  const comodinList = (comodines ?? []).map((c: any) => c.platillos).filter(Boolean)
  const pedidoMap = Object.fromEntries((pedidos ?? []).map(p => [p.fecha_entrega, p]))

  const diasDelMes: Date[] = []
  const ultimoDia = new Date(anio, mes, 0)
  for (let d = new Date(anio, mes - 1, 1); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
    if (d.getDay() >= 1 && d.getDay() <= 5) diasDelMes.push(new Date(d))
  }

  function diaSemana(fecha: Date) { const d = fecha.getDay(); return d === 0 ? 7 : d }
  function isEditable(corte: string) { return new Date() < new Date(corte) }
  function corteDate(fecha: Date) { const c = new Date(fecha); c.setHours(c.getHours() - 48); return c.toISOString() }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: 'var(--color-cream)', fontWeight: 600, marginBottom: 6 }}>Mi calendario</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 15 }}>
            {hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ background: 'var(--color-raised)', border: '1.5px solid var(--color-gold)', borderRadius: 10, padding: '14px 20px', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 4 }}>CRÉDITOS</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 32, color: 'var(--color-cream)', fontWeight: 600 }}>{creditos}</p>
        </div>
      </div>

      {!menu || menu.length === 0 ? (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '32px', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-muted)', fontSize: 15 }}>El menú de este mes aún no ha sido publicado.</p>
          <p style={{ color: 'var(--color-disabled)', fontSize: 13, marginTop: 8 }}>Se publica el día 20 de cada mes.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {diasDelMes.map(fecha => {
            const fechaStr = fecha.toISOString().split('T')[0]
            const ds = diaSemana(fecha)
            const platilloFijo = menuMap[ds]
            const pedido = pedidoMap[fechaStr]
            const corte = pedido ? pedido.corte_edicion : corteDate(fecha)
            const editable = isEditable(corte)
            const pasado = fecha < hoy && fecha.toDateString() !== hoy.toDateString()

            return (
              <div key={fechaStr} style={{
                background: pedido ? 'var(--color-raised)' : 'var(--color-surface)',
                border: pedido ? '1.5px solid var(--color-gold)' : '1px solid var(--color-line)',
                borderRadius: 12, padding: '18px 22px',
                opacity: pasado && !pedido ? 0.4 : 1
              }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div style={{ minWidth: 80 }}>
                      <p style={{ color: 'var(--color-gold)', fontSize: 10, fontWeight: 500, letterSpacing: '0.08em' }}>
                        {fecha.toLocaleDateString('es-MX', { weekday: 'short' }).toUpperCase()}
                      </p>
                      <p style={{ color: 'var(--color-cream)', fontSize: 16, fontWeight: 600 }}>
                        {fecha.getDate()} {fecha.toLocaleDateString('es-MX', { month: 'short' })}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--color-cream)', fontSize: 15, fontWeight: 500 }}>
                        {pedido ? (pedido.platillos as any)?.nombre : platilloFijo?.nombre ?? '—'}
                      </p>
                      <p style={{ color: pedido ? 'var(--color-success)' : 'var(--color-muted)', fontSize: 12, marginTop: 3 }}>
                        {pedido
                          ? editable ? `Editable hasta ${new Date(corte).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}` : 'Corte cerrado'
                          : pasado ? 'Fecha pasada' : editable ? 'Disponible' : 'Corte cerrado'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    {!pedido && !pasado && editable && creditos > 0 && (
                      <form action="/api/cliente/asignar" method="POST" style={{ display: 'flex' }}>
                        <input type="hidden" name="fecha_entrega" value={fechaStr} />
                        <input type="hidden" name="platillo_id" value={platilloFijo?.id} />
                        <button type="submit" style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                          Asignar
                        </button>
                      </form>
                    )}
                    {pedido && editable && (
                      <CalendarioActions
                        pedidoId={pedido.id}
                        platilloActual={(pedido.platillos as any)?.nombre}
                        comodines={comodinList}
                        platilloFijo={platilloFijo}
                      />
                    )}
                    {!pedido && !pasado && creditos === 0 && (
                      <Link href="/paquetes" style={{ color: 'var(--color-gold)', fontSize: 13 }}>Sin créditos</Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
