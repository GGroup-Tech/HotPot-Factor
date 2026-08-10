import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminCupones() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: cupones } = await supabase
    .from('cupones')
    .select('*, uso_cupones(id)')
    .order('creado_en', { ascending: false })

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ borderBottom: '1px solid var(--color-line)', paddingBottom: 20, marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-cream)', fontWeight: 600 }}>Cupones</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>{cupones?.length ?? 0} cupones</p>
        </div>
        <Link href="/admin/cupones/nuevo"
          style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500 }}>
          + Nuevo cupón
        </Link>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
        {cupones && cupones.length > 0 ? (
          <div className="flex flex-col">
            <div className="flex gap-4" style={{ paddingBottom: 12, borderBottom: '1px solid var(--color-line)', marginBottom: 4 }}>
              {['CÓDIGO', 'TIPO', 'VALOR', 'USOS', 'ESTADO'].map(h => (
                <p key={h} style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', flex: 1 }}>{h}</p>
              ))}
            </div>
            {cupones.map((c: any) => {
              const usos = c.uso_cupones?.length ?? 0
              const vencido = c.fecha_fin && new Date(c.fecha_fin) < new Date()
              const agotado = c.usos_max && usos >= c.usos_max
              const estado = !c.activo ? 'Inactivo' : vencido ? 'Vencido' : agotado ? 'Agotado' : 'Activo'
              const estadoColor = estado === 'Activo' ? 'var(--color-success)' : 'var(--color-muted)'
              return (
                <div key={c.id} className="flex gap-4 items-center" style={{ padding: '14px 0', borderBottom: '1px solid var(--color-line)' }}>
                  <p style={{ color: 'var(--color-gold)', fontSize: 14, fontWeight: 500, flex: 1, fontFamily: 'monospace' }}>{c.codigo}</p>
                  <p style={{ color: 'var(--color-muted)', fontSize: 13, flex: 1 }}>{c.tipo === 'porcentaje' ? 'Porcentaje' : 'Monto fijo'}</p>
                  <p style={{ color: 'var(--color-cream)', fontSize: 14, flex: 1 }}>
                    {c.tipo === 'porcentaje' ? `${c.valor}%` : `$${c.valor}`}
                  </p>
                  <p style={{ color: 'var(--color-muted)', fontSize: 13, flex: 1 }}>
                    {usos}{c.usos_max ? ` / ${c.usos_max}` : ' / ∞'}
                  </p>
                  <span style={{ color: estadoColor, fontSize: 12, fontWeight: 500, flex: 1 }}>{estado}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>No hay cupones creados.</p>
        )}
      </div>
    </div>
  )
}
