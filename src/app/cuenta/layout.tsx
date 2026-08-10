import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nombre, apellido')
    .eq('id', user.id)
    .single()

  const nombre = usuario ? `${usuario.nombre} ${usuario.apellido}` : user.email

  const nav = [
    { href: '/cuenta', label: 'Resumen' },
    { href: '/cuenta/calendario', label: 'Mi calendario' },
    { href: '/cuenta/entregas', label: 'Próximas entregas' },
    { href: '/cuenta/creditos', label: 'Mis créditos' },
    { href: '/cuenta/compras', label: 'Mis compras' },
    { href: '/cuenta/perfil', label: 'Mi perfil' },
  ]

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-ink)' }}>
      {/* Sidebar */}
      <aside style={{ width: 248, background: 'var(--color-surface)', borderRight: '1px solid var(--color-line)', padding: '24px 20px', display: 'flex', flexDirection: 'column' }}>
        <Link href="/" style={{ color: 'var(--color-gold)', fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 32, display: 'block' }}>
          HOTPOT FACTOR
        </Link>
        <nav className="flex flex-col gap-1 flex-1">
          {nav.map(({ href, label }) => (
            <Link key={href} href={href}
              style={{ color: 'var(--color-muted)', fontSize: 15, padding: '12px', borderRadius: 8, display: 'block' }}>
              {label}
            </Link>
          ))}
        </nav>
        <div style={{ borderTop: '1px solid var(--color-line)', paddingTop: 20 }}>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: 12 }}>{nombre}</p>
          <form action="/auth/signout" method="post">
            <button type="submit" style={{ color: 'var(--color-muted)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-10">
        {children}
      </main>
    </div>
  )
}
