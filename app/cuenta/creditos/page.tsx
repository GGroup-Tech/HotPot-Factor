import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CreditosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: saldo } = await supabase
    .from('saldo_creditos')
    .select('saldo')
    .eq('usuario_id', user.id)
    .single()

  const { data: movimientos } = await supabase
    .from('credito_movimientos')
    .select('*')
    .eq('usuario_id', user.id)
    .order('creado_en', { ascending: false })
    .limit(20)

  const creditos = saldo?.saldo ?? 0

  const tipoLabel: Record<string, string> = {
    compra: 'Compra de paquete',
    consumo: 'Entrega asignada',
    cancelacion: 'Cancelación',
    ajuste_admin: 'Ajuste manual',
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: 'var(--color-cream)', fontWeight: 600, marginBottom: 6 }}>Mis créditos</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 15 }}>Historial de movimientos</p>
      </div>

      <div style={{ background: 'var(--color-raised)', border: '1.5px solid var(--color-gold)', borderRadius: 12, padding: '28px' }}>
        <p style={{ color: 'var(--color-gold)', fontSize: 10, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 8 }}>SALDO DISPONIBLE</p>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 56, color: 'var(--color-cream)', fontWeight: 600 }}>{creditos}</p>
        <p style={{ color: 'var(--color-muted)', fontSize: 14, marginTop: 6 }}>créditos sin vencimiento</p>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '22px' }}>
        <p style={{ color: 'var(--color-gold)', fontSize: 10, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>MOVIMIENTOS</p>
        {movimientos && movimientos.length > 0

