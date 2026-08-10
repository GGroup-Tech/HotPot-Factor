'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function NuevoGastoForm({ categorias }: { categorias: { id: string, nombre: string }[] }) {
  const router = useRouter()
  const supabase = createClient()
  const hoy = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    descripcion: '', categoria_id: categorias[0]?.id ?? '',
    monto_mxn: '', fecha: hoy, proveedor: '', recurrente: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fecha = new Date(form.fecha)
    const { error } = await supabase.from('gastos').insert({
      descripcion: form.descripcion,
      categoria_id: form.categoria_id,
      monto_mxn: Number(form.monto_mxn),
      fecha: form.fecha,
      proveedor: form.proveedor || null,
      recurrente: form.recurrente,
      mes_contable: fecha.getMonth() + 1,
      anio_contable: fecha.getFullYear(),
    })

    if (error) { setError(error.message); setLoading(false); return }
    router.push('/admin/finanzas/gastos')
  }

  const inputStyle = {
    background: 'var(--color-raised)', border: '1px solid var(--color-line)',
    borderRadius: 8, padding: '13px 16px', color: 'var(--color-cream)',
    fontSize: 15, outline: 'none', width: '100%'
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Descripción</label>
        <input type="text" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} required style={inputStyle} placeholder="Ej: Insumos semana 1" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Categoría</label>
          <select value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Monto (MXN)</label>
          <input type="number" value={form.monto_mxn} onChange={e => set('monto_mxn', e.target.value)} required min="0" step="0.01" style={inputStyle} placeholder="0.00" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Fecha</label>
          <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} required style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Proveedor (opcional)</label>
          <input type="text" value={form.proveedor} onChange={e => set('proveedor', e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input type="checkbox" id="recurrente" checked={form.recurrente} onChange={e => set('recurrente', e.target.checked)}
          style={{ width: 18, height: 18, cursor: 'pointer' }} />
        <label htmlFor="recurrente" style={{ color: 'var(--color-cream)', fontSize: 14, cursor: 'pointer' }}>
          Gasto recurrente mensual
        </label>
      </div>

      {error && <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 12 }}>
        <button type="button" onClick={() => router.back()}
          style={{ flex: 1, padding: '14px', borderRadius: 8, background: 'transparent', border: '1px solid var(--color-line)', color: 'var(--color-cream)', fontSize: 15, cursor: 'pointer' }}>
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          style={{ flex: 1, padding: '14px', borderRadius: 8, background: 'var(--color-gold)', border: 'none', color: 'var(--color-ink)', fontSize: 15, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Guardando...' : 'Guardar gasto'}
        </button>
      </div>
    </form>
  )
}
