'use client'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'

const PERIODOS = [
  { label: 'Este mes', value: 'mes' },
  { label: 'Trimestre', value: 'trimestre' },
  { label: 'Semestre', value: 'semestre' },
  { label: 'Este año', value: 'anio' },
]

const TABS = [
  { label: 'Resumen', href: '/admin/finanzas' },
  { label: 'P&L', href: '/admin/finanzas/pyl' },
  { label: 'Flujo de caja', href: '/admin/finanzas/flujo-de-caja' },
  { label: 'Indicadores', href: '/admin/finanzas/indicadores' },
  { label: 'Balance general', href: '/admin/finanzas/balance-general' },
  { label: 'Cuentas x pagar', href: '/admin/finanzas/cuentas-x-pagar' },
  { label: 'Gastos', href: '/admin/finanzas/gastos' },
  { label: 'Pasivo', href: '/admin/finanzas/pasivo-creditos' },
]

export function FinanzasHeader({
  mes, anio, onPrevMes, onNextMes
}: {
  mes: number
  anio: number
  onPrevMes?: () => void
  onNextMes?: () => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const periodo = searchParams.get('periodo') ?? 'mes'
  const router = useRouter()

  function setPeriodo(p: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('periodo', p)
    router.push(`${pathname}?${params.toString()}`)
  }

  const nombreMes = new Date(anio, mes - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

  return (
    <div style={{ borderBottom: '1px solid var(--color-line)', paddingBottom: 0, marginBottom: 24 }}>
      {/* Título */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-cream)', fontWeight: 600 }}>Finanzas</h1>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-raised)', border: '1px solid var(--color-line)' }} />
      </div>

      {/* Períodos + Tabs en una fila */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 0, flexWrap: 'wrap', paddingBottom: 0 }}>
        {/* Períodos */}
        {PERIODOS.map(p => (
          <button key={p.value} onClick={() => setPeriodo(p.value)}
            style={{
              padding: '8px 16px', borderRadius: 100, fontSize: 13, fontWeight: 500,
              background: periodo === p.value ? 'var(--color-gold)' : 'transparent',
              color: periodo === p.value ? 'var(--color-ink)' : 'var(--color-muted)',
              border: periodo === p.value ? 'none' : '1px solid var(--color-line)',
              cursor: 'pointer', whiteSpace: 'nowrap'
            }}>
            {p.label}
          </button>
        ))}

        {/* Separador visual */}
        <div style={{ width: 1, height: 24, background: 'var(--color-line)', margin: '0 4px' }} />

        {/* Tabs */}
        {TABS.map(t => {
          const active = pathname === t.href
          return (
            <Link key={t.href} href={t.href}
              style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: active ? 500 : 400,
                background: active ? 'var(--color-raised)' : 'transparent',
                color: active ? 'var(--color-cream)' : 'var(--color-muted)',
                border: active ? '1px solid var(--color-line)' : '1px solid transparent',
                textDecoration: 'none', whiteSpace: 'nowrap'
              }}>
              {t.label}
            </Link>
          )
        })}

        {/* Exportar */}
        <button style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 8, fontSize: 12, background: 'transparent', border: '1px solid var(--color-line)', color: 'var(--color-cream)', cursor: 'pointer' }}>
          Exportar
        </button>
      </div>

      {/* Nav mes + comparador */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderTop: '1px solid var(--color-line)', marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 100, padding: '9px 18px', cursor: 'pointer' }}>
          <span style={{ color: 'var(--color-gold)', fontSize: 16 }}>‹</span>
          <span style={{ color: 'var(--color-cream)', fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>{nombreMes}</span>
          <span style={{ color: 'var(--color-gold)', fontSize: 16 }}>›</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'var(--color-muted)', fontSize: 13 }}>Comparar con:</span>
          {['Mes anterior', 'Mismo mes año pasado'].map((opt, i) => (
            <button key={opt} style={{ padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: i === 0 ? 500 : 400, background: i === 0 ? 'var(--color-gold)' : 'transparent', color: i === 0 ? 'var(--color-ink)' : 'var(--color-muted)', border: i === 0 ? 'none' : '1px solid var(--color-line)', cursor: 'pointer' }}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
