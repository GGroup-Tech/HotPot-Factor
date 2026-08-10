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
        <Link href="/" style={{ color: 'var(--color-muted)', fontSize: 14 }}>
          Inicio
        </Link>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 44, color: 'var(--color-cream)', fontWeight: 600 }}>
          Elige cuanto quieres comer
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 17, maxWidth: 560 }}>
          Compras una vez, recibes creditos. Sin permanencia. Sin vencimiento.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-6">
        {paquetes?.map((paquete, i) => {
          const hot = i === 1
          return (
            <div key={paquete.id} style={{
              background: hot ? 'var(--color-raised)' : 'var(--color-surface)',
              border: hot ? '1.5px solid var(--color-gold)' : '1px solid var(--color-line)',
              borderRadius: 14,
              padding: hot ? '40px 36px' : '36px'
            }}>
              <p style={{ fontSize: 20, color: 'var(--color-cream)', fontWeight: 500, marginBottom: 16 }}>
                {paquete.nombre}
              </p>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 46, color: hot ? 'var(--color-gold)' : 'var(--color-cream)', fontWeight: 600, marginBottom: 8 }}>
                ${Number(paquete.precio_mxn).toLocaleString('es-MX')}
              </p>
              <p style={{ color: 'var(--color-muted)', fontSize: 15, marginBottom: 24 }}>
                {paquete.creditos} creditos
              </p>
              <Link href={`/crear-cuenta?paquete=${paquete.id}`}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: hot ? 'var(--color-gold)' : 'transparent',
                  color: hot ? 'var(--color-ink)' : 'var(--color-cream)',
                  border: hot ? 'none' : '1px solid var(--color-line)',
                  borderRadius: 8,
                  padding: '15px 0',
                  fontSize: 16,
                  fontWeight: 500
                }}>
                Comprar paquete
              </Link>
            </div>
          )
        })}
      </div>
    </main>
  )
}
