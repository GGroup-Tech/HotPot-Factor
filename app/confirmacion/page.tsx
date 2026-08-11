import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ConfirmacionPage({
  searchParams
}: {
  searchParams: { compra_id?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: compra } = await supabase
    .from('compras')
    .select('*, paquetes(nombre, creditos)')
    .eq('id', searchParams.compra_id ?? '')
    .eq('usuario_id', user.id)
    .single()

  const { data: saldo } = await supabase
    .from('saldo_creditos')
    .select('saldo')
    .eq('usuario_id', user.id)
    .single()

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-ink)' }}>
      <div style={{ maxWidth: 560, width: '100%', padding: '48px', textAlign: 'center' }}>
        {/* Check */}
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
          <p style={{ color: 'var(--color-ink)', fontSize: 32 }}>✓</p>
        </div>

        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 36, color: 'var(--color-cream)', fontWeight: 600, marginBottom: 12 }}>
          ¡Compra exitosa!
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 17, lineHeight: '28px', marginBottom: 36 }}>
          Tu paquete {compra?.paquetes?.nombre ?? ''} está listo.
          Ya tienes {saldo?.saldo ?? compra?.paquetes?.creditos ?? 0} créditos disponibles.
        </p>

        {compra && (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '24px', marginBottom: 32, textAlign: 'left' }}>
            <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>RESUMEN DE COMPRA</p>
            {[
              { l: 'Paquete', v: compra.paquetes?.nombre },
              { l: 'Créditos', v: `${compra.paquetes?.creditos} créditos` },
              { l: 'Total pagado', v: `$${Number(compra.monto_mxn).toLocaleString('es-MX')} MXN` },
            ].map(({ l, v }) => (
              <div key={l} className="flex justify-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--color-line)' }}>
                <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>{l}</p>
                <p style={{ color: 'var(--color-cream)', fontSize: 14, fontWeight: 500 }}>{v}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link href="/cuenta/calendario" style={{ display: 'block', background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 8, padding: '15px', fontSize: 16, fontWeight: 500, textDecoration: 'none', textAlign: 'center' }}>
            Armar mi menú del mes
          </Link>
          <Link href="/cuenta" style={{ display: 'block', background: 'transparent', border: '1px solid var(--color-line)', color: 'var(--color-cream)', borderRadius: 8, padding: '15px', fontSize: 16, textDecoration: 'none', textAlign: 'center' }}>
            Ir a mi cuenta
          </Link>
        </div>

        <p style={{ color: 'var(--color-disabled)', fontSize: 13, marginTop: 24 }}>
          Recibirás un correo de confirmación en breve
        </p>
      </div>
    </div>
  )
}
