'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function CrearCuentaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paqueteId = searchParams.get('paquete')
  const supabase = createClient()

  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', telefono: '', colonia: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          nombre: form.nombre,
          apellido: form.apellido,
          telefono: form.telefono,
        }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(paqueteId ? `/pago?paquete=${paqueteId}` : '/cuenta')
    }
  }

  const inputStyle = {
    background: 'var(--color-raised)',
    border: '1px solid var(--color-line)',
    borderRadius: 8,
    padding: '14px 16px',
    color: 'var(--color-cream)',
    fontSize: 15,
    outline: 'none',
    width: '100%'
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-16" style={{ background: 'var(--color-ink)' }}>
      <div style={{ width: 520, background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 16, padding: '52px' }}>
        <div className="mb-8">
          <Link href="/" style={{ color: 'var(--color-muted)', fontSize: 14 }}>← Inicio</Link>
          <h1 style={{ color: 'var(--color-cream)', fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 600, marginTop: 16 }}>Crear cuenta</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 14, marginTop: 6 }}>Completa tus datos para comenzar</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Nombre</label>
              <input type="text" value={form.nombre} onChange={e => set('nombre', e.target.value)} required style={inputStyle} />
            </div>
            <div className="flex flex-col gap-2">
              <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Apellido</label>
              <input type="text" value={form.apellido} onChange={e => set('apellido', e.target.value)} required style={inputStyle} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Correo electrónico</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required style={inputStyle} />
          </div>

          <div className="flex flex-col gap-2">
            <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Teléfono</label>
            <input type="tel" value={form.telefono} onChange={e => set('telefono', e.target.value)} style={inputStyle} placeholder="81 1234 5678" />
          </div>

          <div className="flex flex-col gap-2">
            <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Colonia (para validar cobertura)</label>
            <input type="text" value={form.colonia} onChange={e => set('colonia', e.target.value)} required style={inputStyle} placeholder="Ej: Valle Oriente" />
          </div>

          <div className="flex flex-col gap-2">
            <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Contraseña</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} style={inputStyle} />
          </div>

          {error && <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 8, padding: '15px', fontSize: 16, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, border: 'none', width: '100%', marginTop: 4 }}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p style={{ color: 'var(--color-muted)', fontSize: 13, textAlign: 'center', marginTop: 24 }}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/auth/login" style={{ color: 'var(--color-gold)' }}>Iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}
