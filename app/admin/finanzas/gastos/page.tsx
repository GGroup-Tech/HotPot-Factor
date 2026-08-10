import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function GastosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth() + 1

  const { data: gastos } = await supabase
    .from('gastos')
    .select('*, categorias_gasto(nombre)')
    .eq('anio_contable', anio)
    .eq('mes_contable', mes)
    .order('fecha', { ascending: false })

  const total = gastos?.reduce((s, g) => s + Number(g.monto_mxn), 0) ?? 0

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ borderBottom: '1px solid var(--color-line)', paddingBottom: 20, marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link href="/admin/finanzas" style={{ color: 'var(--color-muted)', fontSize: 13 }}>← Finanzas</Link>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-cream)', fontWeight: 600, marginTop: 8 }}>Gastos</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>
            {hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })} · Total: ${total.toLocaleString('es-MX')} MXN
          </p>
        </div>
        <Link href="/admin/finanzas/gastos/nuevo"
          style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500 }}>
          + Registrar gasto
        </Link>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
        {gastos && gastos.length > 0 ? (
          <div className="flex flex-col">
            <div className="flex gap-4" style={{ paddingBottom: 12, borderBottom: '1px solid var(--color-line)', marginBottom: 4 }}>
              {['FECHA', 'DESCRIPCIÓN', 'CATEGORÍA', 'MONTO'].map(h => (
                <p key={h} style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', flex: 1 }}>{h}</p>
              ))}
            </div>
            {gastos.map((g: any) => (
              <div key={g.id} className="flex gap-4 items-center" style={{ padding: '14px 0', borderBottom: '1px solid var(--color-line)' }}>
                <p style={{ color: 'var(--color-muted)', fontSize: 13, flex: 1 }}>
                  {new Date(g.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </p>
                <p style={{ color: 'var(--color-cream)', fontSize: 14, flex: 1 }}>{g.descripcion}</p>
                <p style={{ color: 'var(--color-muted)', fontSize: 13, flex: 1 }}>{g.categorias_gasto?.nombre}</p>
                <p style={{ color: 'var(--color-danger)', fontSize: 14, fontWeight: 500, flex: 1 }}>
                  –${Number(g.monto_mxn).toLocaleString('es-MX')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>No hay gastos registrados.</p>
        )}
      </div>
    </div>
  )
}
