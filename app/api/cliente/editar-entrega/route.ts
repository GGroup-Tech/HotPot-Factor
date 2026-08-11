import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { pedido_id, platillo_id, accion } = await request.json()
  const admin = createAdminClient()

  // Verificar que el pedido pertenece al usuario
  const { data: pedido } = await admin
    .from('pedidos')
    .select('id, usuario_id, estado, corte_edicion, platillo_id')
    .eq('id', pedido_id)
    .eq('usuario_id', user.id)
    .single()

  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

  // Verificar corte 48h
  if (new Date() >= new Date(pedido.corte_edicion)) {
    return NextResponse.json({ error: 'El plazo de edición ha cerrado' }, { status: 400 })
  }

  if (accion === 'cancelar') {
    // Cancelar pedido y devolver crédito
    await admin.from('pedidos').update({ estado: 'cancelado' }).eq('id', pedido_id)
    await admin.from('credito_movimientos').insert({
      usuario_id: user.id,
      tipo: 'cancelacion',
      cantidad: 1,
      referencia_id: pedido_id,
      notas: 'Cancelación de entrega'
    })
    return NextResponse.json({ ok: true })
  }

  if (accion === 'cambiar' && platillo_id) {
    // Cambiar platillo
    await admin.from('pedidos').update({ platillo_id }).eq('id', pedido_id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
