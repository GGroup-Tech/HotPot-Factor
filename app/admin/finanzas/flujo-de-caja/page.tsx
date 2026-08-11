import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function FlujoCajaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin-login')

  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth() + 1

  // Entradas del mes
  const { data: compras } = await supabase.from('compras').select('monto_mxn, creado_en')
    .gte('creado_en', `${anio}-${String(mes).padStart(2,'0')}-01`)
    .lt('creado_en', mes === 12 ? `${anio+1}-01-01` : `${anio}-${String(mes+1).padStart(2,'0')}-01`)

  // Salidas del mes
  const { data: gastos } = await supabase.from('gastos').select('monto_mxn, descripcion, categorias_gasto(nombre), fecha')
    .eq('anio_contable', anio).eq('mes_contable', mes).order('fecha')

  const totalEntradas = compras?.reduce((s, c) => s + Number(c.monto_mxn), 0) ?? 0
  const totalSalidas = gastos?.reduce((s, g) => s + Number(g.monto_mxn), 0) ?? 0
  const flujoNeto = totalEntradas - totalSalidas

  // Agrupar compras por semana
  const comprasSemana: Record<string, number> = {}
  for (const c of compras ?? []) {
    const fecha = new Date(c.creado_en)
    const semana = `Semana ${Math.ceil(fecha.getDate() / 7)}`
    comprasSemana[semana] = (comprasSemana[semana] ?? 0) + Number(c.monto_mxn)
  }

  // Agrupar gastos por categoría
  const gastosCat: Record<string, number> = {}
  for (const g of gastos ?? []) {
    const cat = (g as any).categorias_gasto?.nombre ?? 'Otros'
    gastosCat[cat] = (gastosCat[cat] ?? 0) + Number(g.monto_mxn)
  }

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
            style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: i === 2 ? 500 : 400, background: i === 2 ? 'var(--color-raised)' : 'transparent', color: i === 2 ? 'var(--color-cream)' : 'var(--color-muted)', border: i === 2 ? '1px solid var(--color-gold)' : '1px solid transparent', textDecoration: 'none' }}>
            {t}
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--color-raised)', border: '1.5px solid var(--color-success)', borderRadius: 12, padding: '22px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>ENTRADAS DE EFECTIVO</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 36, color: 'var(--color-success)', fontWeight: 600 }}>${totalEntradas.toLocaleString('es-MX')}</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 6 }}>{compras?.length ?? 0} compras este mes</p>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>SALIDAS DE EFECTIVO</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 36, color: 'var(--color-danger)', fontWeight: 600 }}>–${totalSalidas.toLocaleString('es-MX')}</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 6 }}>gastos registrados</p>
        </div>
        <div style={{ background: 'var(--color-surface)', border: `1px solid ${flujoNeto >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}`, borderRadius: 12, padding: '22px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>FLUJO NETO DEL MES</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 36, color: flujoNeto >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
            {flujoNeto < 0 ? '–' : ''}${Math.abs(flujoNeto).toLocaleString('es-MX')}
          </p>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 6 }}>entradas – salidas</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Entradas por semana */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>ENTRADAS DE EFECTIVO</p>
          {Object.entries(comprasSemana).map(([sem, val]) => (
            <div key={sem} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--color-line)' }}>
              <p style={{ color: 'var(--color-cream)', fontSize: 14 }}>{sem}</p>
              <p style={{ color: 'var(--color-success)', fontSize: 14, fontWeight: 500 }}>+${val.toLocaleString('es-MX')}</p>
            </div>
          ))}
          {compras?.length === 0 && <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>Sin compras este mes</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', marginTop: 4 }}>
            <p style={{ color: 'var(--color-cream)', fontSize: 14, fontWeight: 500 }}>Total</p>
            <p style={{ color: 'var(--color-success)', fontSize: 15, fontWeight: 600, fontFamily: 'Georgia, serif' }}>+${totalEntradas.toLocaleString('es-MX')}</p>
          </div>
        </div>

        {/* Salidas por categoría */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>SALIDAS DE EFECTIVO</p>
          {Object.entries(gastosCat).map(([cat, val]) => (
            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--color-line)' }}>
              <p style={{ color: 'var(--color-cream)', fontSize: 14 }}>{cat}</p>
              <p style={{ color: 'var(--color-danger)', fontSize: 14, fontWeight: 500 }}>–${val.toLocaleString('es-MX')}</p>
            </div>
          ))}
          {gastos?.length === 0 && <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>Sin gastos registrados</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', marginTop: 4 }}>
            <p style={{ color: 'var(--color-cream)', fontSize: 14, fontWeight: 500 }}>Total</p>
            <p style={{ color: 'var(--color-danger)', fontSize: 15, fontWeight: 600, fontFamily: 'Georgia, serif' }}>–${totalSalidas.toLocaleString('es-MX')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
