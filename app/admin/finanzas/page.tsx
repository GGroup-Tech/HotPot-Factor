import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FinanzasHeader } from './FinanzasHeader'

export default async function AdminFinanzas() {
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
    { data: consumos },
    { data: saldos },
    { data: gastos },
  ] = await Promise.all([
    supabase.from('compras').select('monto_mxn').gte('creado_en', inicio).lt('creado_en', fin),
    supabase.from('credito_movimientos').select('cantidad').eq('tipo', 'consumo').gte('creado_en', inicio).lt('creado_en', fin),
    supabase.from('saldo_creditos').select('saldo'),
    supabase.from('gastos').select('monto_mxn, categorias_gasto(nombre)').eq('anio_contable', anio).eq('mes_contable', mes),
  ])

  const efectivo = compras?.reduce((s, c) => s + Number(c.monto_mxn), 0) ?? 0
  const creditosConsumidos = Math.abs(consumos?.reduce((s, c) => s + Number(c.cantidad), 0) ?? 0)
  const ingresoRealizado = creditosConsumidos * 139
  const totalGastos = gastos?.reduce((s, g) => s + Number(g.monto_mxn), 0) ?? 0
  const pasivo = (saldos?.reduce((s, c) => s + Number(c.saldo), 0) ?? 0)
  const pasivoMxn = pasivo * 139
  const utilidad = ingresoRealizado - totalGastos
  const margen = efectivo > 0 ? ((utilidad / efectivo) * 100).toFixed(1) : '0'

  const gastosMap: Record<string, number> = {}
  for (const g of gastos ?? []) {
    const cat = (g as any).categorias_gasto?.nombre ?? 'Otros'
    gastosMap[cat] = (gastosMap[cat] ?? 0) + Number(g.monto_mxn)
  }

  const distGastos = Object.entries(gastosMap).sort((a, b) => b[1] - a[1])

  return (
    <div style={{ padding: '32px' }}>
      <FinanzasHeader mes={mes} anio={anio} />

      {/* KPIs principales — fila 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'EFECTIVO COBRADO', value: `$${efectivo.toLocaleString('es-MX')}`, sub: 'total ingresado', hot: true },
          { label: 'INGRESO REALIZADO', value: `$${ingresoRealizado.toLocaleString('es-MX')}`, sub: `${creditosConsumidos} créditos consumidos` },
          { label: 'COSTO DE PRODUCCIÓN', value: `$${totalGastos.toLocaleString('es-MX')}`, sub: 'gastos registrados' },
          { label: 'MARGEN NETO', value: `${margen}%`, sub: 'utilidad / efectivo cobrado' },
        ].map(({ label, value, sub, hot }) => (
          <div key={label} style={{ background: hot ? 'var(--color-raised)' : 'var(--color-surface)', border: `${hot ? 1.5 : 1}px solid ${hot ? 'var(--color-gold)' : 'var(--color-line)'}`, borderRadius: 12, padding: '20px' }}>
            <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>{label}</p>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: 'var(--color-cream)', fontWeight: 600 }}>{value}</p>
            <p style={{ color: 'var(--color-muted)', fontSize: 12, marginTop: 6 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* KPIs fila 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'COSTO PRODUCCIÓN', value: `$${(gastosMap['Producción'] ?? 0).toLocaleString('es-MX')}`, sub: 'insumos y cocina' },
          { label: 'GASTO OPERATIVO', value: `$${((gastosMap['Reparto'] ?? 0) + (gastosMap['Marketing'] ?? 0) + (gastosMap['Plataformas'] ?? 0)).toLocaleString('es-MX')}`, sub: 'reparto, mkt, plataformas' },
          { label: 'PASIVO CRÉDITOS', value: `$${pasivoMxn.toLocaleString('es-MX')}`, sub: `${pasivo} créditos diferidos` },
          { label: 'UTILIDAD BRUTA', value: `$${(ingresoRealizado - (gastosMap['Producción'] ?? 0)).toLocaleString('es-MX')}`, sub: 'ingreso – costo producción' },
          { label: 'CLIENTES CON SALDO', value: saldos?.filter(s => s.saldo > 0).length ?? 0, sub: 'clientes activos' },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 10, padding: '16px' }}>
            <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 6 }}>{label}</p>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: 'var(--color-cream)', fontWeight: 600 }}>{String(value)}</p>
            <p style={{ color: 'var(--color-muted)', fontSize: 11, marginTop: 4 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Distribución de costos + gastos recientes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em' }}>DISTRIBUCIÓN DE COSTOS</p>
            <p style={{ color: 'var(--color-cream)', fontSize: 13, fontWeight: 600, fontFamily: 'Georgia, serif' }}>${totalGastos.toLocaleString('es-MX')}</p>
          </div>
          {distGastos.map(([cat, val]) => (
            <div key={cat}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <p style={{ color: 'var(--color-cream)', fontSize: 13 }}>{cat}</p>
                <p style={{ color: 'var(--color-muted)', fontSize: 12 }}>${val.toLocaleString('es-MX')} · {totalGastos > 0 ? ((val/totalGastos)*100).toFixed(0) : 0}%</p>
              </div>
              <div style={{ height: 6, background: 'var(--color-raised)', borderRadius: 100, marginBottom: 12 }}>
                <div style={{ height: 6, background: 'var(--color-gold)', borderRadius: 100, width: `${totalGastos > 0 ? (val/totalGastos)*100 : 0}%` }} />
              </div>
            </div>
          ))}
          {distGastos.length === 0 && <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>Sin gastos registrados</p>}
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em' }}>GASTOS DEL MES</p>
            <Link href="/admin/finanzas/gastos/nuevo" style={{ color: 'var(--color-gold)', fontSize: 12, textDecoration: 'none' }}>+ Registrar</Link>
          </div>
          {gastos && gastos.length > 0 ? gastos.slice(0, 6).map((g: any, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--color-line)' }}>
              <div>
                <p style={{ color: 'var(--color-cream)', fontSize: 13 }}>{g.descripcion}</p>
                <p style={{ color: 'var(--color-muted)', fontSize: 11 }}>{g.categorias_gasto?.nombre}</p>
              </div>
              <p style={{ color: 'var(--color-danger)', fontSize: 13, fontWeight: 500 }}>–${Number(g.monto_mxn).toLocaleString('es-MX')}</p>
            </div>
          )) : (
            <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>Sin gastos registrados. <Link href="/admin/finanzas/gastos/nuevo" style={{ color: 'var(--color-gold)' }}>Agregar</Link></p>
          )}
        </div>
      </div>
    </div>
  )
}
