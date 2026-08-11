'use client'
import { useState, useRef, useEffect } from 'react'

export function Sofia() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: '¡Hola! Soy Sofía. ¿En qué puedo ayudarte? Puedo contarte sobre nuestro menú, paquetes y zonas de entrega.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    const history = messages.map(m => ({ role: m.role, content: m.content }))
    const res = await fetch('/api/sofia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg, history })
    })
    const { reply } = await res.json()
    setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    setLoading(false)
  }

  return (
    <>
      {/* FAB */}
      <button onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 32, right: 32,
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--color-gold)', border: 'none',
          cursor: 'pointer', zIndex: 50,
          fontFamily: 'Georgia, serif', fontSize: 22,
          color: 'var(--color-ink)', fontWeight: 600,
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)'
        }}>
        {open ? '✕' : 'S'}
      </button>

      {/* Chat */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 104, right: 32,
          width: 360, height: 480,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-line)',
          borderRadius: 16, zIndex: 50,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)'
        }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-line)' }}>
            <p style={{ color: 'var(--color-gold)', fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 600 }}>Sofía</p>
            <p style={{ color: 'var(--color-muted)', fontSize: 12 }}>Asistente de HotPot Factor</p>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: 12,
                  background: m.role === 'user' ? 'var(--color-gold)' : 'var(--color-raised)',
                  color: m.role === 'user' ? 'var(--color-ink)' : 'var(--color-cream)',
                  fontSize: 14, lineHeight: '20px'
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--color-raised)', color: 'var(--color-muted)', fontSize: 14 }}>
                  Escribiendo...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-line)', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Escribe tu pregunta..."
              style={{
                flex: 1, background: 'var(--color-raised)',
                border: '1px solid var(--color-line)', borderRadius: 8,
                padding: '10px 14px', color: 'var(--color-cream)',
                fontSize: 14, outline: 'none'
              }}
            />
            <button onClick={sendMessage} disabled={loading}
              style={{
                background: 'var(--color-gold)', border: 'none',
                borderRadius: 8, padding: '10px 16px',
                color: 'var(--color-ink)', fontSize: 14,
                fontWeight: 500, cursor: 'pointer'
              }}>
              →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
