import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { message, history } = await request.json()
  const supabase = await createClient()

  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth() + 1

  const { data: menu } = await supabase
    .from('menu_mes')
    .select('dia_semana, platillos(nombre, calorias, proteina_g, carbs_g, grasa_g)')
    .eq('anio', anio)
    .eq('mes', mes)
    .eq('publicado', true)

  const { data: paquetes } = await supabase
    .from('paquetes')
    .select('nombre, creditos, precio_mxn')
    .eq('activo', true)

  const { data: zonas } = await supabase
    .from('zonas_cobertura')
    .select('nombre_zona, colonia')
    .eq('activa', true)

  const dias = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
  const menuTexto = menu?.map(m => `${dias[(m as any).dia_semana]}: ${(m as any).platillos?.nombre} (${(m as any).platillos?.calorias} kcal, ${(m as any).platillos?.proteina_g}g proteína)`).join('\n') ?? 'No publicado'
  const paquetesTexto = paquetes?.map(p => `${p.nombre}: ${p.creditos} créditos por $${p.precio_mxn} MXN`).join('\n') ?? ''
  const zonasTexto = [...new Set(zonas?.map(z => z.nombre_zona))].join(', ') ?? ''

  const systemPrompt = `Eres Sofía, la asistente de HotPot Factor, un servicio de comida preparada en Monterrey.

Responde siempre en español, de forma amable y concisa.

MENÚ DE ESTE MES:
${menuTexto}

PAQUETES DISPONIBLES:
${paquetesTexto}

ZONAS DE ENTREGA: ${zonasTexto}

REGLAS DEL SERVICIO:
- Los créditos no vencen nunca
- Sin reembolsos en efectivo
- Puedes cambiar tu selección hasta 48 horas antes de cada entrega
- El menú se publica el día 20 de cada mes

Solo respondes preguntas sobre menú, paquetes, créditos, zonas de cobertura y cómo funciona el servicio. Para temas de cuenta personal, pide al cliente que inicie sesión.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages: [
        ...(history ?? []),
        { role: 'user', content: message }
      ]
    })
  })

  const data = await response.json()
  const reply = data.content?.[0]?.text ?? 'Lo siento, no pude procesar tu pregunta.'

  return NextResponse.json({ reply })
}
