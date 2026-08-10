'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function NuevoCuponPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({
    codigo: '', tipo: 'porcentaje', valor: '',
    usos_max: '', usos_por_usuario: '1',
    fecha_inicio: '', fecha_fin: '', notas: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.from('cupones').insert({
      codigo: form.codigo.toUpperCase().trim(),
      tipo: form.tipo,
      valor: Number(form.valor),
      usos_max: form.usos_max ? Number(form.usos_max) : null,
      usos_por_usuario: Number(form.usos_por_usuario),
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
      notas: form.notas || null,
      activo: true
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/admin/cupones')
  }

  const inputStyle = {
    background: 'var(--color-raised)', border: '1px solid var(--color-line)',
    borderRadius: 8, padding: '13px 16px', color: 'var(--color-cream)',
    fontSize: 15, outline: 'none', width: '100%'
  }

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: 28 }}>
        <Link href="/admin/cupones" style={{ color: 'var(--color-muted)', fontSize: 13 }}>← Cupones</Link>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-cream)', fontWeight: 600, marginTop: 8 }}>
          Nuevo cupón
        </h1>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Código</label>
          <input type="text" value={form.codigo} onChange={e => set('codigo', e.target.value)} required style={inputStyle} placeholder="BIENVENIDO10" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Tipo</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="monto_fijo">Monto fijo (MXN)</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>
              Valor {form.tipo === 'porcentaje' ? '(%)' : '(MXN)'}
            </label>
            <input type="number" value={form.valor} onChange={e => set('valor', e.target.value)} required min="0" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Usos máximos totales</label>
            <input type="number" value={form.usos_max} onChange={e => set('usos_max', e.target.value)} style={inputStyle} placeholder="Vacío = ilimitado" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Usos por usuario</label>
            <input type="number" value={form.usos_por_usuario} onChange={e => set('usos_por_usuario', e.target.value)} required min="1" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Fecha inicio (opcional)</label>
            <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Fecha fin (opcional)</label>
            <input type="date" value={form.fecha_fin} onChange={e => set('fecha_fin', e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Notas internas (opcional)</label>
          <input type="text" value={form.notas} onChange={e => set('notas', e.target.value)} style={inputStyle} />
        </div>

        {error && <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" onClick={() => router.back()}
            style={{ flex: 1, padding: '14px', borderRadius: 8, background: 'transparent', border: '1px solid var(--color-line)', color: 'var(--color-cream)', fontSize: 15, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            style={{ flex: 1, padding: '14px', borderRadius: 8, background: 'var(--color-gold)', border: 'none', color: 'var(--color-ink)', fontSize: 15, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creando...' : 'Crear cupón'}
          </button>
        </div>
      </form>
    </div>
  )
}
