import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PYLPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin-login')

  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth() + 1
  const mesPrev = mes === 1 ? 12 : mes - 1
  const anioPrev = mes === 1 ? anio - 1 : anio

  async function getMetrics(a: number, m: number) {
    const inicio = `${a}-${String(m).padStart(2,'0')}-01`
    const fin = m === 12 ? `${a+1}-01-01` : `${a}-${String(m+1).padStart(2,'0')}-01`

    const { data: compras } = await supabase.from('compras').select('monto_mxn').gte('creado_en', inicio).lt('creado_en', fin)
    const { data: consumos } = await supabase.from('credito_movimientos').select('cantidad').eq('tipo', 'consumo').gte('creado_en', inicio).lt('creado_en', fin)
    const { data: gastos } = await supabase.from('gastos').select('monto_mxn, categorias_gasto(nombre)').eq('anio_contable', a).eq('mes_contable', m)

    const efectivo = compras?.reduce((s, c) => s + Number(c.monto_mxn), 0) ?? 0
    const creditosConsumidos = Math.abs(consumos?.reduce((s, c) => s + Number(c.cantidad), 0) ?? 0)
    const ingresoRealizado = creditosConsumidos * 139
    const totalGastos = gastos?.reduce((s, g) => s + Number(g.monto_mxn), 0) ?? 0

    const gastosMap: Record<string, number> = {}
    for (const g of gastos ?? []) {
      const cat = (g as any).categorias_gasto?.nombre ?? 'Otros'
      gastosMap[cat] = (gastosMap[cat] ?? 0) + Number(g.monto_mxn)
    }

    const costo = (gastosMap['Producción'] ?? 0) + (gastosMap['Nómina'] ?? 0) + (gastosMap['Empaque'] ?? 0)
    const gastosOp = (gastosMap['Reparto'] ?? 0) + (gastosMap['Marketing'] ?? 0) + (gastosMap['Plataformas'] ?? 0)
    const utilBruta = ingresoRealizado - costo
    const ebit = utilBruta - gastosOp
    const depreciacion = 1300
    const ebitda = ebit + depreciacion
    const isr = Math.max(ebit * 0.30, 0)
    const utilNeta = ebit - isr

    return { efectivo, ingresoRealizado, creditosConsumidos, costo, gastosMap, gastosOp, utilBruta, ebit, ebitda, depreciacion, isr, utilNeta }
  }

  const curr = await getMetrics(anio, mes)
  const prev = await getMetrics(anioPrev, mesPrev)

  function fmt(n: number) { return `$${Math.abs(n).toLocaleString('es-MX')}` }
  function delta(c: number, p: number) {
    if (p === 0) return '—'
    const pct = ((c - p) / Math.abs(p) * 100).toFixed(0)
    return `${Number(pct) > 0 ? '+' : ''}${pct}%`
  }

  const tabs = ['Resumen', 'P&L', 'Flujo de caja', 'Indicadores', 'Balance general', 'Cuentas x pagar', 'Gastos', 'Pasivo créditos']

  const rows = [
    { label: 'INGRESOS', bold: true, head: true },
    { label: 'Efectivo cobrado', curr: curr.efectivo, prev: prev.efectivo },
    { label: 'Ingreso realizado', curr: curr.ingresoRealizado, prev: prev.ingresoRealizado, note: `${curr.creditosConsumidos} créditos consumidos` },
    { label: 'SEP', sep: true },
    { label: 'COSTO DE PRODUCCIÓN', bold: true, head: true },
    { label: 'Insumos y cocina', curr: -(curr.gastosMap['Producción'] ?? 0), prev: -(prev.gastosMap['Producción'] ?? 0) },
    { label: 'Nómina', curr: -(curr.gastosMap['Nómina'] ?? 0), prev: -(prev.gastosMap['Nómina'] ?? 0) },
    { label: 'Empaque', curr: -(curr.gastosMap['Empaque'] ?? 0), prev: -(prev.gastosMap['Empaque'] ?? 0) },
    { label: 'SEP', sep: true },
    { label: 'Utilidad bruta', curr: curr.utilBruta, prev: prev.utilBruta, bold: true, total: true, color: 'var(--color-success)' },
    { label: 'SEP', sep: true },
    { label: 'GASTOS OPERATIVOS', bold: true, head: true },
    { label: 'Reparto', curr: -(curr.gastosMap['Reparto'] ?? 0), prev: -(prev.gastosMap['Reparto'] ?? 0) },
    { label: 'Marketing', curr: -(curr.gastosMap['Marketing'] ?? 0), prev: -(prev.gastosMap['Marketing'] ?? 0) },
    { label: 'Plataformas', curr: -(curr.gastosMap['Plataformas'] ?? 0), prev: -(prev.gastosMap['Plataformas'] ?? 0) },
    { label: 'SEP', sep: true },
    { label: 'EBIT', curr: curr.ebit, prev: prev.ebit, bold: true, total: true, color: 'var(--color-gold)' },
    { label: 'SEP', sep: true },
    { label: 'Depreciación y amortización', curr: -curr.depreciacion, prev: -prev.depreciacion, note: 'Cocina $125 · Reparto $133 · Plataforma $1,042' },
    { label: 'SEP', sep: true },
    { label: 'EBITDA', curr: curr.ebitda, prev: prev.ebitda, bold: true, total: true, color: 'var(--color-gold)' },
    { label: 'SEP', sep: true },
    { label: 'Intereses', curr: 0, prev: 0, note: 'Sin deuda financiera' },
    { label: 'SEP', sep: true },
    { label: 'EBT', curr: curr.ebit, prev: prev.ebit, bold: true },
    { label: 'ISR 30%', curr: -curr.isr, prev: -prev.isr, color: 'var(--color-warning)' },
    { label: 'SEP', sep: true },
    { label: 'UTILIDAD NETA', curr: curr.utilNeta, prev: prev.utilNeta, bold: true, total: true, color: 'var(--color-success)' },
    { label: 'Margen neto', curr: curr.efectivo > 0 ? curr.utilNeta / curr.efectivo : 0, prev: prev.efectivo > 0 ? prev.utilNeta / prev.efectivo : 0, pct: true, bold: true, color: 'var(--color-gold)' },
  ]

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ borderBottom: '1px solid var(--color-line)', paddingBottom: 20, marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-cream)', fontWeight: 600 }}>Finanzas</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>{hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
        {tabs.map((t, i) => (
          <Link key={t} href={i === 0 ? '/admin/finanzas' : `/admin/finanzas/${t.toLowerCase().replace(/ /g,'-').replace('&','y')}`}
            style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: i === 1 ? 500 : 400, background: i === 1 ? 'var(--color-raised)' : 'transparent', color: i === 1 ? 'var(--color-cream)' : 'var(--color-muted)', border: i === 1 ? '1px solid var(--color-gold)' : '1px solid transparent', textDecoration: 'none' }}>
            {t}
          </Link>
        ))}
      </div>

      {/* Nav mes */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-line)', borderRadius: 100, padding: '10px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ color: 'var(--color-gold)', cursor: 'pointer' }}>‹</span>
          <span style={{ color: 'var(--color-cream)', fontSize: 15, fontWeight: 500 }}>
            {hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).charAt(0).toUpperCase() +
             hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).slice(1)}
          </span>
          <span style={{ color: 'var(--color-gold)', cursor: 'pointer' }}>›</span>
        </div>
        <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>Comparando con: <span style={{ color: 'var(--color-gold)' }}>mes anterior</span></p>
      </div>

      {/* Tabla P&L */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '0 28px' }}>
        {/* Header */}
        <div style={{ display: 'flex', padding: '14px 0', borderBottom: '1px solid var(--color-line)' }}>
          <p style={{ flex: 1, color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em' }}>ESTADO DE RESULTADOS</p>
          {[hoy.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }), `${new Date(anioPrev, mesPrev-1).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}`, 'Δ'].map(h => (
            <p key={h} style={{ width: 120, textAlign: 'right', color: h === 'Δ' ? 'var(--color-disabled)' : 'var(--color-muted)', fontSize: 9, fontWeight: 500, letterSpacing: '0.06em' }}>{h.toUpperCase()}</p>
          ))}
        </div>

        {rows.map((row, i) => {
          if ((row as any).sep) return <div key={i} style={{ height: 1, background: 'var(--color-line)' }} />
          if ((row as any).head) return (
            <div key={i} style={{ padding: '12px 0 4px' }}>
              <p style={{ color: 'var(--color-cream)', fontSize: 13, fontWeight: 500 }}>{row.label}</p>
            </div>
          )
          const isTotal = (row as any).total
          const isPct = (row as any).pct
          const cVal = (row as any).curr ?? 0
          const pVal = (row as any).prev ?? 0
          const col = (row as any).color ?? ((row as any).bold ? 'var(--color-cream)' : 'var(--color-muted)')
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', padding: isTotal ? '12px 6px' : '11px 0',
              background: isTotal ? 'var(--color-raised)' : 'transparent',
              borderRadius: isTotal ? 8 : 0,
              marginLeft: isTotal ? -6 : 0, marginRight: isTotal ? -6 : 0,
              borderBottom: isTotal ? 'none' : '1px solid var(--color-line)'
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: (row as any).bold ? 'var(--color-cream)' : 'var(--color-muted)', fontSize: (row as any).bold ? 14 : 13, fontWeight: (row as any).bold ? 500 : 400 }}>{row.label}</p>
                {(row as any).note && <p style={{ color: 'var(--color-disabled)', fontSize: 11, marginTop: 2 }}>{(row as any).note}</p>}
              </div>
              <p style={{ width: 120, textAlign: 'right', fontFamily: (row as any).bold ? 'Georgia, serif' : 'inherit', fontSize: (row as any).bold ? 16 : 13, color: col, fontWeight: (row as any).bold ? 600 : 400 }}>
                {isPct ? `${(cVal * 100).toFixed(1)}%` : cVal < 0 ? `– ${fmt(cVal)}` : fmt(cVal)}
              </p>
              <p style={{ width: 120, textAlign: 'right', fontSize: 12, color: 'var(--color-disabled)' }}>
                {isPct ? `${(pVal * 100).toFixed(1)}%` : pVal < 0 ? `– ${fmt(pVal)}` : fmt(pVal)}
              </p>
              <p style={{ width: 60, textAlign: 'right', fontSize: 11, fontWeight: 500, color: (() => { const d = delta(cVal, pVal); return d.startsWith('+') ? 'var(--color-success)' : d.startsWith('-') ? 'var(--color-danger)' : 'var(--color-disabled)' })() }}>
                {delta(cVal, pVal)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
