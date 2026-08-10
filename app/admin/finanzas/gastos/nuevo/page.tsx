import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { NuevoGastoForm } from './form'

export default async function NuevoGastoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: categorias } = await supabase
    .from('categorias_gasto')
    .select('id, nombre')
    .order('nombre')

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: 28 }}>
        <Link href="/admin/finanzas/gastos" style={{ color: 'var(--color-muted)', fontSize: 13 }}>← Gastos</Link>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-cream)', fontWeight: 600, marginTop: 8 }}>
          Registrar gasto
        </h1>
      </div>
      <NuevoGastoForm categorias={categorias ?? []} />
    </div>
  )
}
