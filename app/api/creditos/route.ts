import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verificar que es staff
  const { data: staff } = await supabase.from('staff').select('id').eq('id', user.id).single()
  if (!staff) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const { usuario_id, cantidad, notas } = await request.json()
  if (!usuario_id || !cantidad) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('credito_movimientos').insert({
    usuario_id,
    tipo: 'ajuste_admin',
    cantidad: Number(cantidad),
    notas: notas || 'Ajuste manual por admin',
    creado_por: user.id
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
