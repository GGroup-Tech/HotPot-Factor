import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { correo, colonia, direccion } = await request.json()
  if (!correo || !colonia) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('lista_espera').insert({ correo, colonia, direccion: direccion || null })
  return NextResponse.json({ ok: true })
}
