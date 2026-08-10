import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await request.formData()
  const fecha_entrega = formData.get('fecha_entrega') as string
  const platillo_id = formData.get('platillo_id') as string

  if (!fecha_entrega || !platillo_id) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  // Verificar corte de 48h
  const fechaEntrega = new Date(fecha_entrega)
  const corte = new Date(fechaEntrega)
  corte.setHours(corte.getHours() - 48)
  if (new Date() >= corte) {
    return NextResponse.json({ error: 'El plazo de edición ha cerrado' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verificar saldo en transacción
  const { data: saldo } = await admin
    .from('saldo_creditos')
    .select('saldo')
    .eq('usuario_id', user.id)
    .single()

  if (!saldo || saldo.saldo < 1) {
    return NextResponse.json({ error: 'Sin créditos disponibles' }, { status: 400 })
  }

  // Insertar pedido
  const { data: pedido, error: pedidoError } = await admin
    .from('pedidos')
    .insert({
      usuario_id: user.id,
      fecha_entrega,
      platillo_id,
      estado: 'programado',
      corte_edicion: corte.toISOString()
    })
    .select()
    .single()

  if (pedidoError) {
    if (pedidoError.code === '23505') {
      return NextResponse.json({ error: 'Ya tienes un pedido para esa fecha' }, { status: 400 })
    }
    return NextResponse.json({ error: pedidoError.message }, { status: 500 })
  }

  // Descontar crédito
  await admin
    .from('credito_movimientos')
    .insert({
      usuario_id: user.id,
      tipo: 'consumo',
      cantidad: -1,
      referencia_id: pedido.id
    })

  return NextResponse.redirect(new URL('/cuenta/calendario', request.url))
}
