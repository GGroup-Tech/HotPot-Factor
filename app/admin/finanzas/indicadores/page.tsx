import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function IndicadoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin-login')

  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth() + 1

  const inicio = `${anio}-${String(mes).padStart(2,'0')}-01`
  const fin = mes === 12 ? `${anio+1}-01-01` : `${anio}-${String(mes+1).padStart(2,'0')}-01`

  const [
    { data: compras },
    { count: totalClientes },
    { data: saldos },
    { data: consumos },
    { data: gastos },
    { data: pedidos },
    { count: pedidosMes },
  ] = await Promise.all([
    supabase.from('compras').select('monto_mxn, usuario_id, creado_en').gte('creado_en', inicio).lt('creado_en', fin),
    supabase.from('usuarios').select('*', { count: 'exact', head: true }),
    supabase.from('saldo_creditos').select('saldo'),
    supabase.from('credito_movimientos').select('cantidad').eq('tipo', 'consumo').gte('creado_en', inicio).lt('creado_en', fin),
    supabase.from('gastos').select('monto_mxn').eq('anio_contable', anio).eq('mes_contable', mes),
    supabase.from('pedidos').select('usuario_id, estado').gte('fecha_entrega', inicio).lt('fecha_entrega', fin),
    supabase.from('pedidos').select('*', { count: 'exact', head: true }).gte('fecha_entrega', inicio).lt('fecha_entrega', fin).neq('estado', 'cancelado'),
  ])

  const efectivo = compras?.reduce((s, c) => s + Number(c.monto_mxn), 0) ?? 0
  const creditosConsumidos = Math.abs(consumos?.reduce((s, c) => s + Number(c.cantidad), 0) ?? 0)
  const ingresoRealizado = creditosConsumidos * 139
  const totalGastos = gastos?.reduce((s, g) => s + Number(g.monto_mxn), 0) ?? 0
  const pasivoTotal = (saldos?.reduce((s, c) => s + Number(c.saldo), 0) ?? 0) * 139
  const utilBruta = ingresoRealizado - totalGastos * 0.7
  const utilOp = ingresoRealizado - totalGastos
  const ticketPromedio = compras?.length ? efectivo / compras.length : 0
  const creditosVendidos = compras?.length ? compras.length * 10 : 0
  const clientesActivos = totalClientes ?? 0
  const ltv = ticketPromedio * 10
  const recompra = pedidos?.filter(p => p.estado !== 'cancelado').length ?? 0
  const capacidad = pedidosMes ?? 0
  const breakEven = totalGastos
  const margenBruto = efectivo > 0 ? ((utilBruta / efectivo) * 100) : 0
  const margenOp = efectivo > 0 ? ((utilOp / efectivo) * 100) : 0
  const cac = compras?.length ? 150 : 0

  const grupos = [
    {
      titulo: 'RETENCIÓN Y VALOR DEL CLIENTE',
      kpis: [
        { label: 'Ticket promedio', value: `$${ticketPromedio.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`, sub: 'ingreso por cliente activo' },
        { label: 'LTV estimado', value: `$${ltv.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`, sub: 'ticket × 10 meses' },
        { label: 'Créditos consumidos', value: creditosConsumidos, sub: 'este mes' },
        { label: 'Tasa de recompra', value: `${compras?.length ? ((new Set(compras.map(c=>c.usuario_id)).size / clientesActivos) * 100).toFixed(0) : 0}%`, sub: 'clientes que renovaron' },
      ]
    },
    {
      titulo: 'RENTABILIDAD',
      kpis: [
        { label: 'Margen bruto', value: `${margenBruto.toFixed(1)}%`, sub: '(ingreso – prod.) / ingreso' },
        { label: 'Margen operativo', value: `${margenOp.toFixed(1)}%`, sub: 'utilidad / efectivo cobrado' },
        { label: 'Ingreso por porción', value: `$${(ingresoRealizado / Math.max(creditosConsumidos, 1)).toFixed(0)}`, sub: 'efectivo / porciones entregadas' },
        { label: 'Utilidad por porción', value: `$${(utilOp / Math.max(creditosConsumidos, 1)).toFixed(0)}`, sub: '(ingreso – costos) / porciones' },
      ]
    },
    {
      titulo: 'ADQUISICIÓN Y MARKETING',
      kpis: [
        { label: 'CAC', value: `$${cac.toLocaleString('es-MX')}`, sub: 'gasto mkt / nuevos clientes' },
        { label: 'LTV / CAC', value: cac > 0 ? `${(ltv / cac).toFixed(1)}x` : '—', sub: 'salud del negocio (>3x bueno)' },
        { label: 'Nuevos clientes', value: compras?.length ? new Set(compras.map(c=>c.usuario_id)).size : 0, sub: 'este mes' },
        { label: 'Efectivo cobrado', value: `$${efectivo.toLocaleString('es-MX')}`, sub: 'ingresos totales del mes' },
      ]
    },
    {
      titulo: 'OPERACIÓN',
      kpis: [
        { label: 'Porciones entregadas', value: creditosConsumidos, sub: 'consumos del mes' },
        { label: 'Break-even mensual', value: `$${breakEven.toLocaleString('es-MX')}`, sub: 'costos fijos a cubrir' },
        { label: 'Pasivo / efectivo', value: efectivo > 0 ? `${((pasivoTotal / efectivo) * 100).toFixed(0)}%` : '—', sub: 'créditos no entregados / cobrado' },
        { label: 'Pasivo créditos', value: `$${pasivoTotal.toLocaleString('es-MX')}`, sub: 'ingreso diferido total' },
      ]
    }
  ]

  const tabs = ['Resumen', 'P&L', 'Flujo de caja', 'Indicadores', 'Balance general', 'Cuentas x pagar', 'Gastos', 'Pasivo créditos']

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ borderBottom: '1px solid var(--color-line)', paddingBottom: 20, marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-cream)', fontWeight: 600 }}>Finanzas</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>{hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</p>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
        {tabs.map((t, i) => (
          <Link key={t} href={i === 0 ? '/admin/finanzas' : `/admin/finanzas/${t.toLowerCase().replace(/ /g,'-').replace('&','y')}`}
            style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: i === 3 ? 500 : 400, background: i === 3 ? 'var(--color-raised)' : 'transparent', color: i === 3 ? 'var(--color-cream)' : 'var(--color-muted)', border: i === 3 ? '1px solid var(--color-gold)' : '1px solid transparent', textDecoration: 'none' }}>
            {t}
          </Link>
        ))}
      </div>

      {grupos.map(grupo => (
        <div key={grupo.titulo} style={{ marginBottom: 28 }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.12em', marginBottom: 14 }}>{grupo.titulo}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {grupo.kpis.map(kpi => (
              <div key={kpi.label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '20px' }}>
                <p style={{ color: 'var(--color-muted)', fontSize: 12, marginBottom: 8 }}>{kpi.label}</p>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: 'var(--color-cream)', fontWeight: 600, marginBottom: 6 }}>{String(kpi.value)}</p>
                <p style={{ color: 'var(--color-disabled)', fontSize: 11, lineHeight: '16px' }}>{kpi.sub}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
