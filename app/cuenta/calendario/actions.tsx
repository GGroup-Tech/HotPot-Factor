'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CalendarioActions({ pedidoId, platilloActual, comodines, platilloFijo }: {
  pedidoId: string
  platilloActual: string
  comodines: { id: string, nombre: string }[]
  platilloFijo: { id: string, nombre: string } | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const opciones = [
    platilloFijo,
    ...comodines
  ].filter(Boolean).filter(p => p!.nombre !== platilloActual)

  async function cambiar(platilloId: string) {
    setLoading(true)
    await fetch('/api/cliente/editar-entrega', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedido_id: pedidoId, platillo_id: platilloId, accion: 'cambiar' })
    })
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  async function cancelar() {
    if (!confirm('¿Cancelar esta entrega? El crédito regresará a tu saldo.')) return
    setLoading(true)
    await fetch('/api/cliente/editar-entrega', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedido_id: pedidoId, accion: 'cancelar' })
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} disabled={loading}
        style={{ background: 'transparent', border: '1px solid var(--color-line)', borderRadius: 8, padding: '9px 16px', fontSize: 13, color: 'var(--color-cream)', cursor: 'pointer' }}>
        Editar
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 44, zIndex: 10,
          background: 'var(--color-surface)', border: '1px solid var(--color-line)',
          borderRadius: 10, padding: '8px', minWidth: 220,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}>
          {opciones.length > 0 && (
            <>
              <p style={{ color: 'var(--color-muted)', fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', padding: '6px 10px' }}>CAMBIAR A</p>
              {opciones.map(p => p && (
                <button key={p.id} onClick={() => cambiar(p.id)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', fontSize: 14, color: 'var(--color-cream)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 7 }}>
                  {p.nombre}
                </button>
              ))}
              <div style={{ height: 1, background: 'var(--color-line)', margin: '6px 0' }} />
            </>
          )}
          <button onClick={cancelar}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', fontSize: 14, color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 7 }}>
            Cancelar entrega
          </button>
        </div>
      )}
    </div>
  )
}
