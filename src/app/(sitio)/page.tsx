import Link from 'next/link'

export default function LandingPage() {
  return (
    <main>
      {/* NAV */}
      <nav style={{ borderBottom: '1px solid var(--color-line)' }}
        className="flex items-center justify-between px-24 py-6">
        <span style={{ color: 'var(--color-gold)', fontFamily: 'Georgia, serif', fontSize: 26, letterSpacing: '0.06em', fontWeight: 600 }}>
          HOTPOT FACTOR
        </span>
        <div className="flex items-center gap-8">
          <Link href="/menu" style={{ color: 'var(--color-muted)', fontSize: 16 }}>Menú semanal</Link>
          <Link href="/paquetes" style={{ color: 'var(--color-muted)', fontSize: 16 }}>Planes</Link>
          <Link href="/auth/login" style={{ color: 'var(--color-cream)', fontSize: 16 }}>Iniciar sesión</Link>
          <Link href="/paquetes" style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 8, padding: '12px 24px', fontSize: 16, fontWeight: 500 }}>
            Comenzar
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="flex items-center gap-16 px-24 py-24">
        <div className="flex flex-col gap-7" style={{ maxWidth: 560 }}>
          <span style={{ color: 'var(--color-gold)', fontSize: 12, fontWeight: 500, letterSpacing: '0.10em' }}>COMIDA REAL, LISTA PARA TU SEMANA</span>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 62, lineHeight: '70px', color: 'var(--color-cream)', fontWeight: 600 }}>
            Tu semana resuelta, platillo por platillo.
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 19, lineHeight: '32px' }}>
            Compra un paquete, recibe tus créditos y elige tu menú. Nosotros cocinamos y lo entregamos en tu puerta.
          </p>
          <div className="flex gap-4">
            <Link href="/paquetes" style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 8, padding: '16px 30px', fontSize: 17, fontWeight: 500 }}>
              Ver paquetes
            </Link>
            <Link href="/menu" style={{ border: '1px solid var(--color-line)', color: 'var(--color-cream)', borderRadius: 8, padding: '16px 30px', fontSize: 17, fontWeight: 500 }}>
              Ver menú de la semana
            </Link>
          </div>
          <div className="flex gap-6 items-center">
            {['Sin permanencia', 'Créditos sin vencimiento', 'Entrega a domicilio'].map(t => (
              <div key={t} className="flex items-center gap-2">
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-gold)' }} />
                <span style={{ color: 'var(--color-muted)', fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, height: 500, background: 'var(--color-surface)', borderRadius: 14, border: '1px solid var(--color-line)' }}
          className="flex items-center justify-center">
          <span style={{ color: 'var(--color-disabled)', fontSize: 14 }}>Foto del platillo</span>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-line)', borderBottom: '1px solid var(--color-line)' }}
        className="px-24 py-24">
        <div className="flex flex-col gap-4 mb-12">
          <span style={{ color: 'var(--color-gold)', fontSize: 12, fontWeight: 500, letterSpacing: '0.10em' }}>CÓMO FUNCIONA</span>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 44, lineHeight: '52px', color: 'var(--color-cream)', fontWeight: 600 }}>Cuatro pasos y ya</h2>
        </div>
        <div className="grid grid-cols-4 gap-5">
          {[
            { n: '01', t: 'Elige tu paquete', d: 'Compras créditos. Sin permanencia.' },
            { n: '02', t: 'Arma tu menú', d: '1 platillo = 1 crédito. Eliges antes del corte.' },
            { n: '03', t: 'Cocinamos fresco', d: 'Producimos solo lo pedido, sin desperdicios.' },
            { n: '04', t: 'Te llega a casa', d: 'Una entrega a tu puerta.' },
          ].map(({ n, t, d }) => (
            <div key={n} style={{ background: 'var(--color-ink)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '32px 30px 36px' }}>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 30, color: 'var(--color-gold)', fontWeight: 600, marginBottom: 14 }}>{n}</p>
              <p style={{ fontSize: 19, color: 'var(--color-cream)', fontWeight: 500, marginBottom: 10 }}>{t}</p>
              <p style={{ fontSize: 15, color: 'var(--color-muted)', lineHeight: '25px' }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PAQUETES */}
      <section className="px-24 py-24">
        <div className="flex flex-col gap-4 mb-12">
          <span style={{ color: 'var(--color-gold)', fontSize: 12, fontWeight: 500, letterSpacing: '0.10em' }}>PAQUETES</span>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 44, lineHeight: '52px', color: 'var(--color-cream)', fontWeight: 600 }}>Elige cuánto quieres comer</h2>
          <p style={{ color: 'var(--color-muted)', fontSize: 17, lineHeight: '28px', maxWidth: 560 }}>Compras una vez, recibes créditos. Tus créditos no vencen nunca.</p>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[
            { nombre: 'Ligero', precio: '$749', creditos: '5 créditos', unit: '$150 por platillo', hot: false },
            { nombre: 'Semanal', precio: '$1,390', creditos: '10 créditos', unit: '$139 por platillo', hot: true },
            { nombre: 'Familiar', precio: '$2,590', creditos: '20 créditos', unit: '$130 por platillo', hot: false },
          ].map(({ nombre, precio, creditos, unit, hot }) => (
            <div key={nombre} style={{ background: hot ? 'var(--color-raised)' : 'var(--color-surface)', border: `${hot ? 1.5 : 1}px solid ${hot ? 'var(--color-gold)' : 'var(--color-line)'}`, borderRadius: 14, padding: hot ? '40px 36px' : '36px' }}>
              <div className="flex items-center justify-between mb-5">
                <span style={{ fontSize: 20, color: 'var(--color-cream)', fontWeight: 500 }}>{nombre}</span>
                {hot && <span style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 100, padding: '6px 12px', fontSize: 10, fontWeight: 500, letterSpacing: '0.08em' }}>MÁS PEDIDO</span>}
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 46, color: hot ? 'var(--color-gold)' : 'var(--color-cream)', fontWeight: 600 }}>{precio}</span>
                <span style={{ color: 'var(--color-muted)', fontSize: 14 }}>MXN</span>
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: 15, marginBottom: 20 }}>{creditos}  ·  {unit}</p>
              <div style={{ borderTop: '1px solid var(--color-line)', paddingTop: 20, marginBottom: 20 }}>
                {['Entrega incluida', 'Créditos sin vencimiento', 'Sin permanencia'].map(b => (
                  <div key={b} className="flex items-center gap-2 mb-3">
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-gold)' }} />
                    <span style={{ fontSize: 15, color: 'var(--color-cream)' }}>{b}</span>
                  </div>
                ))}
              </div>
              <Link href="/paquetes" className="block text-center"
                style={{ background: hot ? 'var(--color-gold)' : 'transparent', color: hot ? 'var(--color-ink)' : 'var(--color-cream)', border: hot ? 'none' : '1px solid var(--color-line)', borderRadius: 8, padding: '15px 0', fontSize: 16, fontWeight: 500 }}>
                Comprar paquete
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-line)' }} className="px-24 py-24">
        <div className="flex flex-col gap-4 mb-12">
          <span style={{ color: 'var(--color-gold)', fontSize: 12, fontWeight: 500, letterSpacing: '0.10em' }}>PREGUNTAS FRECUENTES</span>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 42, lineHeight: '50px', color: 'var(--color-cream)', fontWeight: 600 }}>Lo que casi siempre nos preguntan</h2>
        </div>
        <div className="grid grid-cols-2 gap-5">
          {[
            { q: '¿Los créditos expiran?', a: 'No. Una vez que compras un paquete, tus créditos se quedan en tu cuenta hasta que los uses.' },
            { q: '¿Puedo cambiar mi selección?', a: 'Sí, hasta la fecha límite de 48 horas antes de cada entrega. Después se cierra el menú para producir.' },
            { q: '¿Qué pasa si no elijo a tiempo?', a: 'Te mandamos recordatorios antes del corte. Si no eliges, te contactamos directamente.' },
            { q: '¿A dónde entregan?', a: 'Entregamos en Valle Oriente y Santa María Corporativo. Al registrarte validamos tu dirección.' },
          ].map(({ q, a }) => (
            <div key={q} style={{ background: 'var(--color-ink)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '30px 32px' }}>
              <p style={{ fontSize: 19, color: 'var(--color-cream)', fontWeight: 500, marginBottom: 12 }}>{q}</p>
              <p style={{ fontSize: 16, color: 'var(--color-muted)', lineHeight: '26px' }}>{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ background: 'var(--color-raised)', borderTop: '1px solid var(--color-line)', borderBottom: '1px solid var(--color-line)' }}
        className="px-24 py-28 flex flex-col items-center gap-6">
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 50, lineHeight: '58px', color: 'var(--color-cream)', fontWeight: 600, textAlign: 'center', maxWidth: 700 }}>
          Deja de pensar qué vas a comer
        </h2>
        <p style={{ color: 'var(--color-muted)', fontSize: 18, textAlign: 'center' }}>
          Elige tu paquete hoy y tu semana queda resuelta.
        </p>
        <Link href="/paquetes" style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 8, padding: '18px 36px', fontSize: 18, fontWeight: 500 }}>
          Ver paquetes
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--color-line)' }} className="px-24 pt-20 pb-10">
        <div className="flex gap-20 mb-14">
          <div style={{ maxWidth: 320 }}>
            <span style={{ color: 'var(--color-gold)', fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 600, display: 'block', marginBottom: 16 }}>HOTPOT FACTOR</span>
            <p style={{ color: 'var(--color-muted)', fontSize: 15, lineHeight: '25px' }}>Comida real, preparada fresca cada semana y entregada en tu puerta.</p>
          </div>
          {[
            { title: 'Producto', items: ['Menú semanal', 'Paquetes', 'Cómo funciona'] },
            { title: 'Empresa', items: ['Nosotros', 'Blog'] },
            { title: 'Contacto', items: ['hola@hotpotfactor.mx', '+52 81 0000 0000'] },
          ].map(({ title, items }) => (
            <div key={title}>
              <p style={{ color: 'var(--color-gold)', fontSize: 11, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 16 }}>{title.toUpperCase()}</p>
              {items.map(item => (
                <p key={item} style={{ color: 'var(--color-muted)', fontSize: 15, marginBottom: 12 }}>{item}</p>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid var(--color-line)', paddingTop: 28 }} className="flex items-center justify-between">
          <p style={{ color: 'var(--color-disabled)', fontSize: 14 }}>© 2026 HotPot Factor. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <span style={{ color: 'var(--color-muted)', fontSize: 14 }}>Aviso de privacidad</span>
            <span style={{ color: 'var(--color-muted)', fontSize: 14 }}>Términos y condiciones</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
