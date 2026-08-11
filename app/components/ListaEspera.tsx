'use client'
import { useState } from 'react'

export function ListaEspera({ colonia }: { colonia: string }) {
  const [correo, setCorreo] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/lista-espera', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, colonia })
    })
    setDone(true)
  }

  if (done) return (
    <p style={{ color: 'var(--color-success)', fontSize: 13 }}>
      Te avisaremos cuando lleguemos a tu colonia.
    </p>
  )

  return (
    <div style={{ background: 'var(--color-ink)', border: '1px solid var(--color-danger)', borderRadius: 8, padding: '14px' }}>
      <p style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 10 }}>
        Tu colonia no está en nuestra zona de entrega todavía.
      </p>
      <p style={{ color: 'var(--color-muted)', fontSize: 12, marginBottom: 10 }}>
        Déjanos tu correo y te avisamos cuando lleguemos.
      </p>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
        <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} required
          placeholder="tu@correo.com"
          style={{ flex: 1, background: 'var(--color-raised)', border: '1px solid var(--color-line)', borderRadius: 6, padding: '9px 12px', color: 'var(--color-cream)', fontSize: 13, outline: 'none' }} />
        <button type="submit"
          style={{ padding: '9px 14px', borderRadius: 6, background: 'var(--color-danger)', border: 'none', color: 'white', fontSize: 13, cursor: 'pointer' }}>
          Avisar
        </button>
      </form>
    </div>
  )
}
