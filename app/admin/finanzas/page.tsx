import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminFinanzas() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth() + 1

  // Efectivo cobrado — suma de compras del mes
  const { data: compras } = await supabase
    .from('compras')
    .select('monto_mxn, creado_en')
    .gte('creado_en', `${anio}-${String(mes).padStart(2,'0')}-01`)
    .lt('creado_en', `${anio}-${String(mes+1).padStart(2,'0')}-01`)

  const efectivoCobrado = compras?.reduce((s, c) => s + Number(c.monto_mxn), 0) ?? 0

  // Créditos consumidos — pedidos entregados o programados del mes
  const { count: creditosConsumidos } = await supabase
    .from('credito_movimientos')
    .select('*', { count: 'exact', head: true })
    .eq('tipo', 'consumo')
    .gte('creado_en', `${anio}-${String(mes).padStart(2,'0')}-01`)

  // Pasivo — créditos disponibles de todos los clientes
  const { data: saldos } = await supabase
    .from('saldo_creditos')
    .select('saldo')
  const pasivo = saldos?.reduce((s, c) => s + Number(c.saldo), 0) ?? 0
  const pasivoMxn = pasivo * 139 // precio promedio por crédito

  // Gastos del mes
  const { data: gastos } = await supabase
    .from('gastos')
    .select('monto_mxn, categorias_gasto(nombre)')
    .eq('anio_contable', anio)
    .eq('mes_contable', mes)

  const totalGastos = gastos?.reduce((s, g) => s + Number(g.monto_mxn), 0) ?? 0
  const ingresoRealizado = (creditosConsumidos ?? 0) * 139
  const utilidadBruta = ingresoRealizado - totalGastos
  const margenNeto = efectivoCobrado > 0 ? ((utilidadBruta / efectivoCobrado) * 100).toFixed(1) : '0'

  const tabs = ['Resumen', 'P&L', 'Flujo de caja', 'Gastos', 'Pasivo créditos']

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ borderBottom: '1px solid var(--color-line)', paddingBottom: 20, marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-cream)', fontWeight: 600 }}>Finanzas</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>
            {hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link href="/admin/finanzas/gastos/nuevo"
          style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500 }}>
          + Registrar gasto
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {tabs.map((t, i) => (
          <Link key={t} href={i === 0 ? '/admin/finanzas' : `/admin/finanzas/${t.toLowerCase().replace(/ /g,'-').replace('&','y')}`}
            style={{ padding: '9px 14px', borderRadius: 8, fontSize: 12, fontWeight: i === 0 ? 500 : 400, background: i === 0 ? 'var(--color-raised)' : 'transparent', color: i === 0 ? 'var(--color-cream)' : 'var(--color-muted)', border: i === 0 ? '1px solid var(--color-line)' : 'none' }}>
            {t}
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'EFECTIVO COBRADO', value: `$${efectivoCobrado.toLocaleString('es-MX')}`, sub: 'total ingresado' },
          { label: 'INGRESO REALIZADO', value: `$${ingresoRealizado.toLocaleString('es-MX')}`, sub: `${creditosConsumidos ?? 0} créditos consumidos` },
          { label: 'TOTAL GASTOS', value: `$${totalGastos.toLocaleString('es-MX')}`, sub: 'gastos registrados' },
          { label: 'MARGEN NETO', value: `${margenNeto}%`, sub: 'utilidad / efectivo' },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '20px' }}>
            <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>{label}</p>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: 'var(--color-cream)', fontWeight: 600 }}>{value}</p>
            <p style={{ color: 'var(--color-muted)', fontSize: 12, marginTop: 6 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Pasivo */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px', marginBottom: 24 }}>
        <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>PASIVO DE CRÉDITOS</p>
        <div className="flex items-center gap-8">
          <div>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 36, color: 'var(--color-cream)', fontWeight: 600 }}>{pasivo}</p>
            <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>créditos sin consumir</p>
          </div>
          <div>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 36, color: 'var(--color-warning)', fontWeight: 600 }}>${pasivoMxn.toLocaleString('es-MX')}</p>
            <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>valor estimado en MXN</p>
          </div>
        </div>
      </div>

      {/* Gastos recientes */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em' }}>GASTOS DEL MES</p>
          <Link href="/admin/finanzas/gastos" style={{ color: 'var(--color-muted)', fontSize: 12 }}>Ver todos</Link>
        </div>
        {gastos && gastos.length > 0 ? (
          <div className="flex flex-col">
            {gastos.slice(0, 8).map((g: any, i) => (
              <div key={i} className="flex items-center justify-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--color-line)' }}>
                <div>
                  <p style={{ color: 'var(--color-cream)', fontSize: 14 }}>{g.descripcion ?? g.categorias_gasto?.nombre}</p>
                  <p style={{ color: 'var(--color-muted)', fontSize: 12 }}>{g.categorias_gasto?.nombre}</p>
                </div>
                <p style={{ color: 'var(--color-danger)', fontSize: 14, fontWeight: 500 }}>
                  –${Number(g.monto_mxn).toLocaleString('es-MX')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>No hay gastos registrados este mes.</p>
        )}
      </div>
    </div>
  )
}
