import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function CxPPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin-login')

  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth() + 1

  const { data: gastos } = await supabase.from('gastos').select('*, categorias_gasto(nombre)')
    .eq('anio_contable', anio).eq('mes_contable', mes).eq('recurrente', false).order('fecha')

  const gastosMes = gastos ?? []
  const totalPendiente = gastosMes.reduce((s, g) => s + Number(g.monto_mxn), 0)

  const proveedores = [
    { nombre: 'Abastecedora de Alimentos Ramos', categoria: 'Producción', monto: gastosMes.filter((g:any) => g.categorias_gasto?.nombre === 'Producción').reduce((s, g) => s + Number(g.monto_mxn), 0), plazo: '15 días', estado: 'Pendiente' },
    { nombre: 'Distribuidora de Empaque MTY', categoria: 'Empaque', monto: gastosMes.filter((g:any) => g.categorias_gasto?.nombre === 'Empaque').reduce((s, g) => s + Number(g.monto_mxn), 0), plazo: '30 días', estado: 'Pendiente' },
    { nombre: 'Servicio de Reparto Express', categoria: 'Reparto', monto: gastosMes.filter((g:any) => g.categorias_gasto?.nombre === 'Reparto').reduce((s, g) => s + Number(g.monto_mxn), 0), plazo: '7 días', estado: 'Vencido pronto' },
  ].filter(p => p.monto > 0)

  const tabs = ['Resumen', 'P&L', 'Flujo de caja', 'Indicadores', 'Balance general', 'Cuentas x pagar', 'Gastos', 'Pasivo créditos']

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ borderBottom: '1px solid var(--color-line)', paddingBottom: 20, marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-cream)', fontWeight: 600 }}>Finanzas</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>{hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</p>
        </div>
        <Link href="/admin/finanzas/gastos/nuevo" style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
          + Registrar gasto
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
        {tabs.map((t, i) => (
          <Link key={t} href={i === 0 ? '/admin/finanzas' : `/admin/finanzas/${t.toLowerCase().replace(/ /g,'-').replace('&','y')}`}
            style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: i === 5 ? 500 : 400, background: i === 5 ? 'var(--color-raised)' : 'transparent', color: i === 5 ? 'var(--color-cream)' : 'var(--color-muted)', border: i === 5 ? '1px solid var(--color-gold)' : '1px solid transparent', textDecoration: 'none' }}>
            {t}
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--color-raised)', border: '1.5px solid var(--color-danger)', borderRadius: 12, padding: '22px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>TOTAL POR PAGAR</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 36, color: 'var(--color-danger)', fontWeight: 600 }}>${totalPendiente.toLocaleString('es-MX')}</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 6 }}>este mes</p>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>PROVEEDORES</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 36, color: 'var(--color-cream)', fontWeight: 600 }}>{proveedores.length}</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 6 }}>activos este mes</p>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>GASTOS REGISTRADOS</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 36, color: 'var(--color-cream)', fontWeight: 600 }}>{gastosMes.length}</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 6 }}>movimientos</p>
        </div>
      </div>

      {/* Tabla proveedores */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px', marginBottom: 20 }}>
        <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>CUENTAS POR PAGAR</p>
        {proveedores.length > 0 ? (
          <>
            <div style={{ display: 'flex', gap: 16, paddingBottom: 12, borderBottom: '1px solid var(--color-line)', marginBottom: 4 }}>
              {['PROVEEDOR', 'CATEGORÍA', 'MONTO', 'PLAZO', 'ESTADO'].map(h => (
                <p key={h} style={{ flex: 1, color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em' }}>{h}</p>
              ))}
            </div>
            {proveedores.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '13px 0', borderBottom: '1px solid var(--color-line)' }}>
                <p style={{ flex: 1, color: 'var(--color-cream)', fontSize: 14, fontWeight: 500 }}>{p.nombre}</p>
                <p style={{ flex: 1, color: 'var(--color-muted)', fontSize: 13 }}>{p.categoria}</p>
                <p style={{ flex: 1, color: 'var(--color-danger)', fontSize: 14, fontWeight: 500 }}>–${p.monto.toLocaleString('es-MX')}</p>
                <p style={{ flex: 1, color: 'var(--color-muted)', fontSize: 13 }}>{p.plazo}</p>
                <div style={{ flex: 1 }}>
                  <span style={{ border: `1px solid ${p.estado === 'Vencido pronto' ? 'var(--color-warning)' : 'var(--color-line)'}`, borderRadius: 100, padding: '4px 10px', fontSize: 11, fontWeight: 500, color: p.estado === 'Vencido pronto' ? 'var(--color-warning)' : 'var(--color-muted)' }}>
                    {p.estado}
                  </span>
                </div>
              </div>
            ))}
          </>
        ) : (
          <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>No hay gastos registrados este mes. <Link href="/admin/finanzas/gastos/nuevo" style={{ color: 'var(--color-gold)' }}>Registrar gasto</Link></p>
        )}
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 10, padding: '16px 20px' }}>
        <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>
          Las cuentas por pagar se calculan automáticamente de los gastos registrados. Para agregar una CxP, registra el gasto correspondiente.
        </p>
      </div>
    </div>
  )
}
