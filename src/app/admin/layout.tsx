import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const nav = [
    { href: '/admin', label: 'Panel' },
    { href: '/admin/pedidos', label: 'Pedidos' },
    { href: '/admin/clientes', label: 'Clientes' },
    { href: '/admin/menu', label: 'Menú del mes' },
    { href: '/admin/produccion', label: 'Producción' },
    { href: '/admin/reparto', label: 'Reparto' },
    { href: '/admin/finanzas', label: 'Finanzas' },
    { href: '/admin/cupones', label: 'Cupones' },
  ]

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-ink)' }}>
      <aside style={{ width: 238, background: 'var(--color-surface)', borderRight: '1px solid var(--color-line)', padding: '24px 18px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ paddingLeft: 12, marginBottom: 24 }}>
          <p style={{ color: 'var(--color-gold)', fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 600, letterSpacing: '0.06em' }}>HOTPOT FACTOR</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 9, fontWeight: 500, letterSpacing: '0.10em', marginTop: 4 }}>ADMINISTRACIÓN</p>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {nav.map(({ href, label }) => (
            <Link key={href} href={href}
              style={{ color: 'var(--color-muted)', fontSize: 14, padding: '11px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-disabled)' }} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
