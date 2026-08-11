import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PasivoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin-login')

  const { data: saldos } = await supabase.from('saldo_creditos').select('usuario_id, saldo')
  const { data: usuarios } = await supabase.from('usuarios').select('id, nombre, apellido, creado_en')

  const usuarioMap = Object.fromEntries((usuarios ?? []).map(u => [u.id, u]))
  const conSaldo = (saldos ?? []).filter(s => s.saldo > 0).map(s => ({ ...s, usuario: usuarioMap[s.usuario_id] }))

  const totalCreditos = conSaldo.reduce((s, c) => s + Number(c.saldo), 0)
  const pasivoMxn = totalCreditos * 139
  const totalClientes = conSaldo.length

  const tabs = ['Resumen', 'P&L', 'Flujo de caja', 'Indicadores', 'Balance general', 'Cuentas x pagar', 'Gastos', 'Pasivo créditos']

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ borderBottom: '1px solid var(--color-line)', paddingBottom: 20, marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-cream)', fontWeight: 600 }}>Finanzas</h1>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
        {tabs.map((t, i) => (
          <Link key={t} href={i === 0 ? '/admin/finanzas' : `/admin/finanzas/${t.toLowerCase().replace(/ /g,'-').replace('&','y')}`}
            style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: i === 7 ? 500 : 400, background: i === 7 ? 'var(--color-raised)' : 'transparent', color: i === 7 ? 'var(--color-cream)' : 'var(--color-muted)', border: i === 7 ? '1px solid var(--color-gold)' : '1px solid transparent', textDecoration: 'none' }}>
            {t}
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--color-raised)', border: '1.5px solid var(--color-warning)', borderRadius: 12, padding: '22px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>PASIVO TOTAL</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 36, color: 'var(--color-warning)', fontWeight: 600 }}>${pasivoMxn.toLocaleString('es-MX')}</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 6 }}>ingreso diferido en MXN</p>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>CRÉDITOS SIN CONSUMIR</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 36, color: 'var(--color-cream)', fontWeight: 600 }}>{totalCreditos}</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 6 }}>a $139 promedio por crédito</p>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>CLIENTES CON SALDO</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 36, color: 'var(--color-cream)', fontWeight: 600 }}>{totalClientes}</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 6 }}>de {usuarios?.length ?? 0} registrados</p>
        </div>
      </div>

      {/* Tabla por cliente */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
        <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>DESGLOSE POR CLIENTE</p>
        <div style={{ display: 'flex', gap: 16, paddingBottom: 12, borderBottom: '1px solid var(--color-line)', marginBottom: 4 }}>
          {['CLIENTE', 'CRÉDITOS', 'VALOR ESTIMADO', 'CLIENTE DESDE'].map(h => (
            <p key={h} style={{ flex: 1, color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em' }}>{h}</p>
          ))}
        </div>
        {conSaldo.sort((a,b) => Number(b.saldo) - Number(a.saldo)).map((s: any) => (
          <div key={s.usuario_id} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '13px 0', borderBottom: '1px solid var(--color-line)' }}>
            <p style={{ flex: 1, color: 'var(--color-cream)', fontSize: 14, fontWeight: 500 }}>
              {s.usuario?.nombre} {s.usuario?.apellido}
            </p>
            <p style={{ flex: 1, color: 'var(--color-warning)', fontSize: 14, fontWeight: 600, fontFamily: 'Georgia, serif' }}>{s.saldo}</p>
            <p style={{ flex: 1, color: 'var(--color-muted)', fontSize: 13 }}>${(s.saldo * 139).toLocaleString('es-MX')}</p>
            <p style={{ flex: 1, color: 'var(--color-disabled)', fontSize: 12 }}>
              {s.usuario?.creado_en ? new Date(s.usuario.creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
