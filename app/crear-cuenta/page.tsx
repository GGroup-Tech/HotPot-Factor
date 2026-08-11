'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ListaEspera } from '../components/ListaEspera'

function CrearCuentaForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paqueteId = searchParams.get('paquete')
  const supabase = createClient()

  const [form, setForm] = useState({
    nombre: '', apellido: '', email: '',
    password: '', telefono: '', colonia: ''
  })
  const [error, setError] = useState('')
  const [cobertura, setCobertura] = useState<'idle' | 'ok' | 'fuera'>('idle')
  const [zonaId, setZonaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (field === 'colonia') setCobertura('idle')
  }

  async function validarCobertura() {
    if (!form.colonia.trim()) return
    const { data } = await supabase
      .from('zonas_cobertura')
      .select('id, nombre_zona')
      .ilike('colonia', `%${form.colonia.trim()}%`)
      .eq('activa', true)
      .limit(1)
      .single()

    if (data) { setCobertura('ok'); setZonaId(data.id) }
    else { setCobertura('fuera'); setZonaId(null) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (cobertura !== 'ok') { setError('Verifica tu colonia antes de continuar'); return }
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { nombre: form.nombre, apellido: form.apellido, telefono: form.telefono } }
    })

    if (authError) { setError(authError.message); setLoading(false); return }

    if (zonaId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('usuarios').update({ colonia: form.colonia, zona_id: zonaId }).eq('id', user.id)
    }

    router.push(paqueteId ? '/paquetes' : '/cuenta')
  }

  const inputStyle = {
    background: 'var(--color-raised)', border: '1px solid var(--color-line)',
    borderRadius: 8, padding: '14px 16px', color: 'var(--color-cream)',
    fontSize: 15, outline: 'none', width: '100%'
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-16" style={{ background: 'var(--color-ink)' }}>
      <div style={{ width: 520, background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 16, padding: '52px' }}>
        <div className="mb-8">
          <Link href="/" style={{ color: 'var(--color-muted)', fontSize: 14 }}>← Inicio</Link>
          <h1 style={{ color: 'var(--color-cream)', fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 600, marginTop: 16 }}>Crear cuenta</h1>
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
            <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Colonia</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={form.colonia} onChange={e => set('colonia', e.target.value)}
                required style={{ ...inputStyle, flex: 1 }} placeholder="Ej: Valle Oriente" />
              <button type="button" onClick={validarCobertura}
                style={{ padding: '14px 18px', borderRadius: 8, background: 'transparent', border: '1px solid var(--color-line)', color: 'var(--color-cream)', fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Verificar
              </button>
            </div>
            {cobertura === 'ok' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--color-success)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} />
                <p style={{ color: 'var(--color-success)', fontSize: 13 }}>Tu colonia está en nuestra zona de cobertura</p>
              </div>
            )}
            {cobertura === 'fuera' && <ListaEspera colonia={form.colonia} />}
          </div>

          <div className="flex flex-col gap-2">
            <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Contraseña</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} style={inputStyle} />
          </div>

          {error && <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>{error}</p>}

          <button type="submit" disabled={loading || cobertura !== 'ok'}
            style={{ background: cobertura === 'ok' ? 'var(--color-gold)' : 'var(--color-disabled)', color: 'var(--color-ink)', borderRadius: 8, padding: '15px', fontSize: 16, fontWeight: 500, border: 'none', cursor: cobertura === 'ok' ? 'pointer' : 'not-allowed', marginTop: 4 }}>
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

export default function CrearCuentaPage() {
  return (
    <Suspense fallback={null}>
      <CrearCuentaForm />
    </Suspense>
  )
}
