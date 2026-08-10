import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CuentaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nombre, apellido')
    .eq('id', user.id)
    .single()

  const { data: saldo } = await supabase
    .from('saldo_creditos')
    .select('saldo')
    .eq('usuario_id', user.id)
    .single()

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id, fecha_entrega, estado, platillos(nombre)')
    .eq('usuario_id', user.id)
    .eq('estado', 'programado')
    .gte('fecha_entrega', new Date().toISOString().split('T')[0])
    .order('fecha_entrega')
    .limit(3)

  const creditos = saldo?.saldo ?? 0
  const nombre = usuario?.nombre ?? 'Cliente'

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: 'var(--color-cream)', fontWeight: 600, marginBottom: 6 }}>
          Hola, {nombre}
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 15 }}>Aquí está el resumen de tu cuenta</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div style={{ background: creditos > 0 ? 'var(--color-raised)' : 'var(--color-surface)', border: `1.5px solid ${creditos > 0 ? 'var(--color-gold)' : 'var(--color-line)'}`, borderRadius: 12, padding: '22px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 10, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>CRÉDITOS DISPONIBLES</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 42, color: 'var(--color-cream)', fontWeight: 600 }}>{creditos}</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 6 }}>Sin vencimiento</p>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 10, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>PRÓXIMAS ENTREGAS</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 42, color: 'var(--color-cream)', fontWeight: 600 }}>{pedidos?.length ?? 0}</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 6 }}>Este mes</p>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 10, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>ESTADO</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: 'var(--color-success)', fontWeight: 600, marginTop: 8 }}>Activo</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 6 }}>Cuenta al corriente</p>
        </div>
      </div>

      {/* Próximas entregas */}
      {pedidos && pedidos.length > 0 && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 10, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>PRÓXIMAS ENTREGAS</p>
          <div className="flex flex-col gap-3">
            {pedidos.map((pedido: any) => (
              <div key={pedido.id} className="flex items-center justify-between" style={{ padding: '14px 0', borderBottom: '1px solid var(--color-line)' }}>
                <div>
                  <p style={{ color: 'var(--color-cream)', fontSize: 15, fontWeight: 500 }}>
                    {pedido.platillos?.nombre ?? 'Platillo'}
                  </p>
                  <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>
                    {new Date(pedido.fecha_entrega).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <span style={{ background: 'var(--color-success)', color: 'var(--color-ink)', borderRadius: 100, padding: '4px 10px', fontSize: 11, fontWeight: 500 }}>
                  Programado
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sin créditos */}
      {creditos === 0 && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '32px', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-cream)', fontSize: 18, fontWeight: 500, marginBottom: 8 }}>No tienes créditos disponibles</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 15, marginBottom: 20 }}>Compra un paquete para empezar a elegir tus platillos</p>
          <a href="/paquetes" style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 8, padding: '14px 28px', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
            Ver paquetes
          </a>
        </div>
      )}
    </div>
  )
}
