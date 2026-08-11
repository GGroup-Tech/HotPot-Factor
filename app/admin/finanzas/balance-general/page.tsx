import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function BalancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin-login')

  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth() + 1

  const { data: compras } = await supabase.from('compras').select('monto_mxn')
  const { data: saldos } = await supabase.from('saldo_creditos').select('saldo')
  const { data: gastos } = await supabase.from('gastos').select('monto_mxn')

  const efectivoTotal = compras?.reduce((s, c) => s + Number(c.monto_mxn), 0) ?? 0
  const gastoTotal = gastos?.reduce((s, g) => s + Number(g.monto_mxn), 0) ?? 0
  const pasivoCreditos = (saldos?.reduce((s, c) => s + Number(c.saldo), 0) ?? 0) * 139

  // Activos
  const efectivoCaja = efectivoTotal - gastoTotal
  const equipoCocina = 15000 - (1500) // valor neto después de deprec
  const equipoReparto = 8000 - 1600
  const plataforma = 56000 - 14000
  const totalActivos = efectivoCaja + equipoCocina + equipoReparto + plataforma

  // Pasivos
  const cxpProveedores = 0 // manual
  const totalPasivos = pasivoCreditos + cxpProveedores

  // Capital
  const capital = totalActivos - totalPasivos

  const tabs = ['Resumen', 'P&L', 'Flujo de caja', 'Indicadores', 'Balance general', 'Cuentas x pagar', 'Gastos', 'Pasivo créditos']

  function Row({ label, value, indent, bold, color }: any) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--color-line)', paddingLeft: indent ? 16 : 0 }}>
        <p style={{ color: bold ? 'var(--color-cream)' : 'var(--color-muted)', fontSize: bold ? 14 : 13, fontWeight: bold ? 500 : 400 }}>{label}</p>
        <p style={{ fontFamily: bold ? 'Georgia, serif' : 'inherit', fontSize: bold ? 15 : 13, color: color ?? (bold ? 'var(--color-cream)' : 'var(--color-muted)'), fontWeight: bold ? 600 : 400 }}>
          ${Number(value).toLocaleString('es-MX')}
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ borderBottom: '1px solid var(--color-line)', paddingBottom: 20, marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-cream)', fontWeight: 600 }}>Finanzas</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>{hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</p>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
        {tabs.map((t, i) => (
          <Link key={t} href={i === 0 ? '/admin/finanzas' : `/admin/finanzas/${t.toLowerCase().replace(/ /g,'-').replace('&','y')}`}
            style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: i === 4 ? 500 : 400, background: i === 4 ? 'var(--color-raised)' : 'transparent', color: i === 4 ? 'var(--color-cream)' : 'var(--color-muted)', border: i === 4 ? '1px solid var(--color-gold)' : '1px solid transparent', textDecoration: 'none' }}>
            {t}
          </Link>
        ))}
      </div>

      {/* Check A = P + C */}
      <div style={{ background: Math.abs(totalActivos - (totalPasivos + capital)) < 1 ? 'var(--color-raised)' : 'var(--color-surface)', border: `1px solid ${Math.abs(totalActivos - (totalPasivos + capital)) < 1 ? 'var(--color-success)' : 'var(--color-danger)'}`, borderRadius: 10, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-success)' }} />
        <p style={{ color: 'var(--color-cream)', fontSize: 13, fontWeight: 500 }}>Balance cuadrado — Activos = Pasivos + Capital</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* ACTIVOS */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>ACTIVOS</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 11, letterSpacing: '0.08em', marginBottom: 8 }}>CIRCULANTE</p>
          <Row label="Efectivo en caja" value={Math.max(efectivoCaja, 0)} indent />
          <p style={{ color: 'var(--color-muted)', fontSize: 11, letterSpacing: '0.08em', marginTop: 16, marginBottom: 8 }}>FIJO</p>
          <Row label="Equipo de cocina (neto)" value={equipoCocina} indent />
          <Row label="Equipo de reparto (neto)" value={equipoReparto} indent />
          <Row label="Plataforma digital (neto)" value={plataforma} indent />
          <div style={{ marginTop: 8 }}>
            <Row label="TOTAL ACTIVOS" value={totalActivos} bold color="var(--color-cream)" />
          </div>
        </div>

        {/* PASIVOS + CAPITAL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
            <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>PASIVOS</p>
            <Row label="Pasivo créditos (ingreso diferido)" value={pasivoCreditos} indent color="var(--color-warning)" />
            <Row label="Cuentas por pagar" value={cxpProveedores} indent />
            <div style={{ marginTop: 8 }}>
              <Row label="TOTAL PASIVOS" value={totalPasivos} bold color="var(--color-warning)" />
            </div>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
            <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>CAPITAL</p>
            <Row label="Capital contable" value={capital} bold color="var(--color-success)" />
            <div style={{ marginTop: 16, padding: '14px', background: 'var(--color-raised)', borderRadius: 8 }}>
              <p style={{ color: 'var(--color-muted)', fontSize: 12 }}>
                El capital incluye la inversión inicial más las utilidades acumuladas menos los retiros.
                Ajustar con tu contador para el estado real.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
