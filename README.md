# HotPot Factor

Sistema D2C de créditos de comida preparada.
El cliente compra un paquete, recibe créditos, asigna platillos a fechas y recibe comida en su puerta.

## Stack

- Next.js 14 (App Router)
- Supabase (Postgres + Auth + Storage)
- Vercel
- Stripe
- Anthropic API (Sofía)
- Resend
- Tailwind CSS v3

## Setup

```bash
npm install
cp .env.example .env.local
npx supabase start
npx supabase db reset
npm run dev
```

## Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=
```

## Entornos

| Entorno    | Branch     | Supabase          |
|------------|------------|-------------------|
| local      | cualquiera | CLI local         |
| staging    | feature/*  | Proyecto gratuito |
| producción | main       | Proyecto de pago  |

## Documentación

- INVARIANTES.md — reglas que nunca se rompen en código
- DECISIONES.md — decisiones de negocio y técnicas

## Plan de 6 semanas

- Semana 1: Repo, Supabase, schema, entornos
- Semana 2: Sitio público, menú, paquetes
- Semana 3: Auth, compra con Stripe, ledger de créditos
- Semana 4: Calendario, corte de 48h, vista de cocina
- Semana 5: Sofía, cupones, emails
- Semana 6: QA, deploy, capacitación
