'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AsignarCreditos({ usuarioId }: { usuarioId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [cantidad, setCantidad] = useState('5')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/creditos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioId, cantidad: Number(cantidad), notas })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  const inputStyle = {
    background: 'var(--color-raised)', border: '1px solid var(--color-line)',
    borderRadius: 8, padding: '12px 14px', color: 'var(--color-cream)',
    fontSize: 14, outline: 'none', width: '100%'
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ width: '100%', padding: '13px', borderRadius: 8, background: 'transparent', border: '1px solid var(--color-line)', color: 'var(--color-cream)', fontSize: 14, cursor: 'pointer' }}>
        Asignar créditos manualmente
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 14, padding: '36px', width: 400 }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: 'var(--color-cream)', fontWeight: 600, marginBottom: 24 }}>
              Asignar créditos
            </h2>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Cantidad de créditos</label>
                <input type="number" value={cantidad} onChange={e => setCantidad(e.target.value)}
                  min="-50" max="50" required style={inputStyle} />
                <p style={{ color: 'var(--color-disabled)', fontSize: 11 }}>Usa número negativo para restar créditos</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500 }}>Motivo</label>
                <input type="text" value={notas} onChange={e => setNotas(e.target.value)}
                  placeholder="Ej: Compensación por error" style={inputStyle} />
              </div>
              {error && <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setOpen(false)}
                  style={{ flex: 1, padding: '13px', borderRadius: 8, background: 'transparent', border: '1px solid var(--color-line)', color: 'var(--color-cream)', fontSize: 14, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  style={{ flex: 1, padding: '13px', borderRadius: 8, background: 'var(--color-gold)', border: 'none', color: 'var(--color-ink)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
