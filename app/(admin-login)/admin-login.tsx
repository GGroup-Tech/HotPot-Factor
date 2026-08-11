'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Correo o contraseña incorrectos'); setLoading(false); return }

    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('id', data.user.id)
      .eq('activo', true)
      .single()

    if (!staff) {
      await supabase.auth.signOut()
      setError('No tienes acceso al panel de administración')
      setLoading(false)
      return
    }

    router.push('/admin')
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-ink)' }}>
      <div style={{ width: 420, background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 16, padding: '48px' }}>
        <div className="text-center mb-8">
          <p style={{ color: 'var(--color-gold)', fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 6 }}>HOTPOT FACTOR</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 12, letterSpacing: '0.10em', fontWeight: 500 }}>ADMINISTRACIÓN</p>
          <h1 style={{ color: 'var(--color-cream)', fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 600, marginTop: 20 }}>Iniciar sesión</h1>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ background: 'var(--color-raised)', border: '1px solid var(--color-line)', borderRadius: 8, padding: '14px 16px', color: 'var(--color-cream)', fontSize: 15, outline: 'none' }} />
          </div>
          <div className="flex flex-col gap-2">
            <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ background: 'var(--color-raised)', border: '1px solid var(--color-line)', borderRadius: 8, padding: '14px 16px', color: 'var(--color-cream)', fontSize: 15, outline: 'none' }} />
          </div>

          {error && <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>{error}</p>}

          <button type="submit" disabled={loading}
            style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 8, padding: '15px', fontSize: 16, fontWeight: 500, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Entrando...' : 'Entrar al panel'}
          </button>
        </form>

        <p style={{ color: 'var(--color-disabled)', fontSize: 12, textAlign: 'center', marginTop: 24 }}>
          Solo personal autorizado
        </p>
      </div>
    </div>
  )
}
