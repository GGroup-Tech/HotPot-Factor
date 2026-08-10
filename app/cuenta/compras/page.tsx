import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ComprasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: saldo } = await supabase
    .from('saldo_creditos')
    .select('saldo')
    .eq('usuario_id', user.id)
    .single()

  const { data: compras } = await supabase
    .from('compras')
    .select('*, paquetes(nombre, creditos)')
    .eq('usuario_id', user.id)
    .order('creado_en', { ascending: false })

  const creditos = saldo?.saldo ?? 0

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: 'var(--color-cream)', fontWeight: 600, marginBottom: 6 }}>Mis compras</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 15 }}>Historial de paquetes comprados</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div style={{ background: 'var(--color-raised)', border: '1.5px solid var(--color-gold)', borderRadius: 12, padding: '22px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 10, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>CRÉDITOS DISPONIBLES</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 42, color: 'var(--color-cream)', fontWeight: 600 }}>{creditos}</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 6 }}>Sin vencimiento</p>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 10, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>PAQUETES COMPRADOS</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 42, color: 'var(--color-cream)', fontWeight: 600 }}>{compras?.length ?? 0}</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 6 }}>Total histórico</p>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 10, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>TOTAL INVERTIDO</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 32, color: 'var(--color-cream)', fontWeight: 600 }}>
            ${compras?.reduce((s, c) => s + Number(c.monto_mxn), 0).toLocaleString('es-MX') ?? 0}
          </p>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 6 }}>MXN</p>
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
        <div className="flex items-center justify-between mb-6">
          <p style={{ color: 'var(--color-gold)', fontSize: 10, fontWeight: 500, letterSpacing: '0.10em' }}>HISTORIAL DE COMPRAS</p>
          <Link href="/paquetes" style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500 }}>
            Comprar otro paquete
          </Link>
        </div>
        {compras && compras.length > 0 ? (
          <div className="flex flex-col">
            {compras.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between" style={{ padding: '16px 0', borderBottom: '1px solid var(--color-line)' }}>
                <div>
                  <p style={{ color: 'var(--color-cream)', fontSize: 15, fontWeight: 500 }}>{c.paquetes?.nombre ?? 'Paquete'}</p>
                  <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>
                    {new Date(c.creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {' · '}{c.paquetes?.creditos} créditos
                  </p>
                </div>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: 'var(--color-cream)', fontWeight: 600 }}>
                  ${Number(c.monto_mxn).toLocaleString('es-MX')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p style={{ color: 'var(--color-muted)', fontSize: 15, marginBottom: 16 }}>No has comprado ningún paquete todavía</p>
            <Link href="/paquetes" style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 8, padding: '14px 28px', fontSize: 15, fontWeight: 500 }}>
              Ver paquetes
            </Link>
          </div>
        )}
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '24px' }}>
        <p style={{ color: 'var(--color-gold)', fontSize: 10, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>¿CÓMO FUNCIONAN LOS CRÉDITOS?</p>
        <div className="grid grid-cols-3 gap-6">
          {[
            { t: 'Sin vencimiento', d: 'Tus créditos no expiran. Los conservas hasta que los uses.' },
            { t: 'Sin reembolso', d: 'Los créditos comprados no son reembolsables en efectivo.' },
            { t: 'Acumulables', d: 'Si compras otro paquete, los créditos se suman a los que ya tienes.' },
          ].map(({ t, d }) => (
            <div key={t} style={{ background: 'var(--color-ink)', border: '1px solid var(--color-line)', borderRadius: 10, padding: '18px' }}>
              <p style={{ color: 'var(--color-cream)', fontSize: 15, fontWeight: 500, marginBottom: 8 }}>{t}</p>
              <p style={{ color: 'var(--color-muted)', fontSize: 13, lineHeight: '20px' }}>{d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
