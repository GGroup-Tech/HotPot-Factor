# DECISIONES DEL PROYECTO

Todas las decisiones están cerradas. No hay pendientes bloqueantes.

## MODELO DE NEGOCIO

### D-01 · Compra única — sin suscripción en Fase 1
Sin cobro automático ni renovación. Fase 2 evaluará suscripciones.

### D-02 · Tres paquetes
- Ligero: $749 MXN / 5 créditos / $150 por crédito
- Semanal: $1,390 MXN / 10 créditos / $139 por crédito
- Familiar: $2,590 MXN / 20 créditos / $130 por crédito

### D-03 · Los créditos no vencen — nunca
Se acumulan indefinidamente. Confirmado por el cliente.

### D-04 · Sin reembolso en efectivo
Los créditos no se convierten en dinero bajo ninguna circunstancia.

### D-05 · Al cancelar dentro del plazo, el crédito queda libre
Vuelve al saldo disponible para asignar a cualquier fecha futura.
Confirmado por el cliente.

### D-06 · Menú publicado el día 20 de cada mes
A partir del día 20 los clientes pueden asignar créditos a fechas.
Confirmado por el cliente.

### D-07 · Dos comodines por mes, uso ilimitado
Confirmado por el cliente: ilimitado.

### D-08 · Corte de edición: 48 horas antes de cada entrega
Sin excepciones vía código.

### D-09 · Zonas: Valle Oriente y Santa María Corporativo
Colonias no cubiertas van a lista_espera.

## PAGOS

### D-10 · Stripe
El cliente abre y administra la cuenta.
El desarrollador integra con las llaves que proporcione el cliente.

Variables necesarias:
- STRIPE_SECRET_KEY
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- STRIPE_WEBHOOK_SECRET

## TÉCNICAS

### D-11 · Stack
- Next.js 14 (App Router)
- Supabase (Postgres + Auth + Storage)
- Vercel
- Stripe
- Anthropic API (Sofía — claude-haiku-3)
- Resend (emails)
- Tailwind CSS v3

### D-12 · Tres entornos
- local: Supabase CLI local
- staging: Proyecto Supabase gratuito + Vercel preview
- producción: Proyecto Supabase de pago + rama main

### D-13 · Sofía como FAB
Círculo dorado esquina inferior derecha. Sin acceso a datos personales en Fase 1.

### D-14 · Login separado para staff
Pantalla de login propia. No comparte auth con los clientes.
