import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ClienteDetallePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin-login')

  const admin = createAdminClient()

  const { data: cliente } = await admin
    .from('usuarios')
    .select('*, zonas_cobertura(nombre_zona)')
    .eq('id', params.id)
    .single()

  if (!cliente) redirect('/admin/clientes')

  const { data: saldo } = await admin
    .from('saldo_creditos')
    .select('saldo')
    .eq('usuario_id', params.id)
    .single()

  const { data: movimientos } = await admin
    .from('credito_movimientos')
    .select('*')
    .eq('usuario_id', params.id)
    .order('creado_en', { ascending: false })
    .limit(10)

  const { data: compras } = await admin
    .from('compras')
    .select('*, paquetes(nombre, creditos)')
    .eq('usuario_id', params.id)
    .order('creado_en', { ascending: false })

  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth() + 1

  const { data: pedidos } = await admin
    .from('pedidos')
    .select('id, fecha_entrega, estado, platillos(nombre)')
    .eq('usuario_id', params.id)
    .gte('fecha_entrega', `${anio}-${String(mes).padStart(2,'0')}-01`)
    .order('fecha_entrega')

  const creditos = saldo?.saldo ?? 0
  const totalComprado = compras?.reduce((s, c) => s + Number(c.monto_mxn), 0) ?? 0

  const tipoLabel: Record<string, string> = {
    compra: 'Compra de paquete',
    consumo: 'Entrega asignada',
    cancelacion: 'Cancelación',
    ajuste_admin: 'Ajuste manual',
  }

  const estadoColor: Record<string, string> = {
    programado: 'var(--color-gold)',
    cerrado: 'var(--color-muted)',
    entregado: 'var(--color-success)',
    cancelado: 'var(--color-danger)',
  }

  return (
    <div style={{ padding: '32px' }}>
      {/* Topbar */}
      <div style={{ borderBottom: '1px solid var(--color-line)', paddingBottom: 20, marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="flex items-center gap-3">
          <Link href="/admin/clientes" style={{ color: 'var(--color-muted)', fontSize: 13 }}>‹ Clientes</Link>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-cream)', fontWeight: 600 }}>
            {cliente.nombre} {cliente.apellido}
          </h1>
          <span style={{ border: '1px solid var(--color-success)', color: 'var(--color-success)', borderRadius: 100, padding: '4px 12px', fontSize: 11, fontWeight: 500 }}>
            Activo
          </span>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Columna izquierda */}
        <div className="flex flex-col gap-5" style={{ flex: 1 }}>
          {/* Info personal */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
            <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>INFORMACIÓN</p>
            {[
              { l: 'Correo', v: cliente.id },
              { l: 'Teléfono', v: cliente.telefono ?? '—' },
              { l: 'Dirección', v: cliente.calle_numero ? `${cliente.calle_numero}, ${cliente.colonia}` : '—' },
              { l: 'Zona', v: (cliente as any).zonas_cobertura?.nombre_zona ?? '—', gold: true },
              { l: 'Cliente desde', v: new Date(cliente.creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) },
              { l: 'Total comprado', v: `$${totalComprado.toLocaleString('es-MX')} MXN` },
            ].map(({ l, v, gold }) => (
              <div key={l} className="flex justify-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--color-line)' }}>
                <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>{l}</p>
                <p style={{ color: gold ? 'var(--color-success)' : 'var(--color-cream)', fontSize: 13, fontWeight: 500 }}>{v}</p>
              </div>
            ))}
          </div>

          {/* Créditos */}
          <div style={{ background: 'var(--color-raised)', border: '1.5px solid var(--color-gold)', borderRadius: 12, padding: '22px' }}>
            <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 12 }}>CRÉDITOS</p>
            <div className="flex items-end justify-between">
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 52, color: 'var(--color-cream)', fontWeight: 600 }}>{creditos}</p>
              <div className="flex flex-col gap-1" style={{ textAlign: 'right' }}>
                <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>{compras?.reduce((s,c)=>s+c.paquetes?.creditos,0) ?? 0} comprados</p>
                <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>{(compras?.reduce((s,c)=>s+c.paquetes?.creditos,0) ?? 0) - creditos} consumidos</p>
                <p style={{ color: 'var(--color-gold)', fontSize: 13, fontWeight: 500 }}>{creditos} disponibles</p>
              </div>
            </div>
          </div>

          {/* Movimientos */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
            <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>MOVIMIENTOS DE CRÉDITOS</p>
            {movimientos?.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--color-line)' }}>
                <div>
                  <p style={{ color: 'var(--color-cream)', fontSize: 13, fontWeight: 500 }}>{tipoLabel[m.tipo] ?? m.tipo}</p>
                  <p style={{ color: 'var(--color-muted)', fontSize: 11, marginTop: 2 }}>
                    {new Date(m.creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 600, color: m.cantidad > 0 ? 'var(--color-success)' : 'var(--color-muted)' }}>
                  {m.cantidad > 0 ? '+' : ''}{m.cantidad}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Columna derecha */}
        <div className="flex flex-col gap-5" style={{ width: 380 }}>
          {/* Entregas del mes */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
            <div className="flex justify-between items-center mb-4">
              <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em' }}>
                ENTREGAS DE {hoy.toLocaleDateString('es-MX', { month: 'long' }).toUpperCase()}
              </p>
              <p style={{ color: 'var(--color-cream)', fontSize: 13, fontWeight: 500 }}>
                {pedidos?.filter(p => p.estado !== 'cancelado').length ?? 0} pedidos
              </p>
            </div>
            {pedidos?.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between" style={{ padding: '11px 0', borderBottom: '1px solid var(--color-line)' }}>
                <div className="flex gap-3 items-center">
                  <p style={{ color: estadoColor[p.estado] ?? 'var(--color-muted)', fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', width: 48 }}>
                    {new Date(p.fecha_entrega).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }).toUpperCase()}
                  </p>
                  <p style={{ color: 'var(--color-cream)', fontSize: 13 }}>{p.platillos?.nombre}</p>
                </div>
                <p style={{ color: estadoColor[p.estado] ?? 'var(--color-muted)', fontSize: 11, fontWeight: 500 }}>
                  {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                </p>
              </div>
            ))}
          </div>

          {/* Acciones */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
            <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>ACCIONES</p>
            <div className="flex flex-col gap-3">
              <button style={{ width: '100%', padding: '13px', borderRadius: 8, background: 'transparent', border: '1px solid var(--color-line)', color: 'var(--color-cream)', fontSize: 14, cursor: 'pointer' }}>
                Asignar créditos manualmente
              </button>
              <button style={{ width: '100%', padding: '13px', borderRadius: 8, background: 'transparent', border: '1px solid var(--color-line)', color: 'var(--color-cream)', fontSize: 14, cursor: 'pointer' }}>
                Editar información del cliente
              </button>
              <button style={{ width: '100%', padding: '13px', borderRadius: 8, background: 'transparent', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', fontSize: 14, cursor: 'pointer' }}>
                Desactivar cuenta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
