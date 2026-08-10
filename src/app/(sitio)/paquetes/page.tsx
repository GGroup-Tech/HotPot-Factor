import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function PaquetesPage() {
  const supabase = await createClient()
  const { data: paquetes } = await supabase
    .from('paquetes')
    .select('*')
    .eq('activo', true)
    .order('creditos')

  return (
    <main className="px-24 py-16">
      <div className="flex flex-col gap-4 mb-16">
        <Link href="/" style={{ color: 'var(--color-muted)', fontSize: 14 }}>← Inicio</Link>
        <span style={{ color: 'var(--color-gold)', fontSize: 12, fontWeight: 500, letterSpacing: '0.10em' }}>PAQUETES</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 44, lineHeight: '52px', color: 'var(--color-cream)', fontWeight: 600 }}>
          Elige cuánto quieres comer
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 17, lineHeight: '28px', maxWidth: 560 }}>
          Compras una vez, recibes créditos. Sin permanencia. Sin vencimiento.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-16">
        {paquetes?.map((paquete, i) => {
          const hot = i === 1
          const unitPrice = (paquete.precio_mxn / paquete.creditos).toFixed(0)
          return (
            <div key={paquete.id} style={{
              background: hot ? 'var(--color-raised)' : 'var(--color-surface)',
              border: `${hot ? 1.5 : 1}px solid ${hot ? 'var(--color-gold)' : 'var(--color-line)'}`,
              borderRadius: 14, padding: hot ? '40px 36px' : '36px'
            }}>
              <div className="flex items-center justify-between mb-5">
                <span style={{ fontSize: 20, color: 'var(--color-cream)', fontWeight: 500 }}>{paquete.nombre}</span>
                {hot &&
cat > "src/app/(sitio)/paquetes/page.tsx" << 'ENDOFFILE'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function PaquetesPage() {
  const supabase = await createClient()
  const { data: paquetes } = await supabase
    .from('paquetes')
    .select('*')
    .eq('activo', true)
    .order('creditos')

  return (
    <main className="px-24 py-16">
      <div className="flex flex-col gap-4 mb-16">
        <Link href="/" style={{ color: 'var(--color-muted)', fontSize: 14 }}>← Inicio</Link>
        <span style={{ color: 'var(--color-gold)', fontSize: 12, fontWeight: 500, letterSpacing: '0.10em' }}>PAQUETES</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 44, lineHeight: '52px', color: 'var(--color-cream)', fontWeight: 600 }}>
          Elige cuánto quieres comer
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 17, lineHeight: '28px', maxWidth: 560 }}>
          Compras una vez, recibes créditos. Sin permanencia. Sin vencimiento.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-16">
        {paquetes?.map((paquete, i) => {
          const hot = i === 1
          const unitPrice = (paquete.precio_mxn / paquete.creditos).toFixed(0)
          return (
            <div key={paquete.id} style={{
              background: hot ? 'var(--color-raised)' : 'var(--color-surface)',
              border: `${hot ? 1.5 : 1}px solid ${hot ? 'var(--color-gold)' : 'var(--color-line)'}`,
              borderRadius: 14, padding: hot ? '40px 36px' : '36px'
            }}>
              <div className="flex items-center justify-between mb-5">
                <span style={{ fontSize: 20, color: 'var(--color-cream)', fontWeight: 500 }}>{paquete.nombre}</span>
                {hot && <span style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 100, padding: '6px 12px', fontSize: 10, fontWeight: 500, letterSpacing: '0.08em' }}>MÁS PEDIDO</span>}
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 46, color: hot ? 'var(--color-gold)' : 'var(--color-cream)', fontWeight: 600 }}>
                  ${Number(paquete.precio_mxn).toLocaleString('es-MX')}
                </span>
                <span style={{ color: 'var(--color-muted)', fontSize: 14 }}>MXN</span>
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: 15, marginBottom: 20 }}>
                {paquete.creditos} créditos  ·  ${unitPrice} por platillo
              </p>
              <div style={{ borderTop: '1px solid var(--color-line)', paddingTop: 20, marginBottom: 20 }}>
                {['Entrega incluida', 'Créditos sin vencimiento', 'Sin permanencia'].map(b => (
                  <div key={b} className="flex items-center gap-2 mb-3">
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-gold)' }} />
                    <span style={{ fontSize: 15, color: 'var(--color-cream)' }}>{b}</span>
                  </div>
                ))}
              </div>
              <Link href={`/crear-cuenta?paquete=${paquete.id}`} className="block text-center"
                style={{ background: hot ? 'var(--color-gold)' : 'transparent', color: hot ? 'var(--color-ink)' : 'var(--color-cream)', border: hot ? 'none' : '1px solid var(--color-line)', borderRadius: 8, padding: '15px 0', fontSize: 16, fontWeight: 500 }}>
                Comprar paquete
              </Link>
            </div>
          )
        })}
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '28px 32px' }}
        className="grid grid-cols-3 gap-8">
        {[
          { t: '¿Los créditos vencen?', d: 'No. Una vez que compras un paquete, tus créditos se quedan en tu cuenta hasta que los uses.' },
          { t: '¿Puedo cambiar mi selección?', d: 'Sí, hasta 48 horas antes de cada entrega. Después se cierra el menú para producir.' },
          { t: '¿A dónde entregan?', d: 'Entregamos en Valle Oriente y Santa María Corporativo. Validamos tu dirección al registrarte.' },
        ].map(({ t, d }) => (
          <div key={t}>
            <p style={{ fontSize: 17, color: 'var(--color-cream)', fontWeight: 500, marginBottom: 10 }}>{t}</p>
            <p style={{ fontSize: 14, color: 'var(--color-muted)', lineHeight: '22px' }}>{d}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
