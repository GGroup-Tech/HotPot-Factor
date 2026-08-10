import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminClientes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: clientes } = await supabase
    .from('usuarios')
    .select('*, zonas_cobertura(nombre_zona)')
    .order('creado_en', { ascending: false })

  const { data: saldos } = await supabase
    .from('saldo_creditos')
    .select('usuario_id, saldo')

  const saldoMap = Object.fromEntries(saldos?.map(s => [s.usuario_id, s.saldo]) ?? [])

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ borderBottom: '1px solid var(--color-line)', paddingBottom: 20, marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-cream)', fontWeight: 600 }}>Clientes</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>{clientes?.length ?? 0} registrados</p>
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
        <div className="flex flex-col">
          <div className="flex gap-4" style={{ paddingBottom: 12, borderBottom: '1px solid var(--color-line)', marginBottom: 4 }}>
            {['CLIENTE', 'CORREO', 'ZONA', 'CRÉDITOS', 'REGISTRO'].map(h => (
              <p key={h} style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', flex: 1 }}>{h}</p>
            ))}
          </div>
          {clientes?.map((c: any) => (
            <div key={c.id} className="flex gap-4" style={{ padding: '14px 0', borderBottom: '1px solid var(--color-line)', alignItems: 'center' }}>
              <p style={{ color: 'var(--color-cream)', fontSize: 14, fontWeight: 500, flex: 1 }}>{c.nombre} {c.apellido}</p>
              <p style={{ color: 'var(--color-muted)', fontSize: 13, flex: 1 }}>{c.id}</p>
              <p style={{ color: 'var(--color-muted)', fontSize: 13, flex: 1 }}>{c.zonas_cobertura?.nombre_zona ?? '—'}</p>
              <p style={{ color: (saldoMap[c.id] ?? 0) > 0 ? 'var(--color-gold)' : 'var(--color-muted)', fontSize: 14, fontWeight: 600, flex: 1 }}>{saldoMap[c.id] ?? 0}</p>
              <p style={{ color: 'var(--color-muted)', fontSize: 12, flex: 1 }}>{new Date(c.creado_en).toLocaleDateString('es-MX')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
