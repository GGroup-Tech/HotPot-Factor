import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function MenuPage() {
  const supabase = await createClient()
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth() + 1

  const { data: menu } = await supabase
    .from('menu_mes')
    .select('dia_semana, platillos(id, nombre, descripcion, calorias, proteina_g, carbs_g, grasa_g)')
    .eq('anio', anio)
    .eq('mes', mes)
    .eq('publicado', true)
    .order('dia_semana')

  const { data: comodines } = await supabase
    .from('comodines_mes')
    .select('platillos(id, nombre, descripcion, calorias, proteina_g, carbs_g, grasa_g)')
    .eq('anio', anio)
    .eq('mes', mes)

  const dias = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

  return (
    <main style={{ background: 'var(--color-ink)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid var(--color-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 100px' }}>
        <Link href="/" style={{ color: 'var(--color-gold)', fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 600, letterSpacing: '0.06em', textDecoration: 'none' }}>
          HOTPOT FACTOR
        </Link>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <Link href="/menu" style={{ color: 'var(--color-cream)', fontSize: 16, textDecoration: 'none' }}>Menú semanal</Link>
          <Link href="/paquetes" style={{ color: 'var(--color-muted)', fontSize: 16, textDecoration: 'none' }}>Planes</Link>
          <Link href="/auth/login" style={{ color: 'var(--color-muted)', fontSize: 16, textDecoration: 'none' }}>Iniciar sesión</Link>
          <Link href="/paquetes" style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 8, padding: '12px 24px', fontSize: 16, fontWeight: 500, textDecoration: 'none' }}>
            Comenzar
          </Link>
        </div>
      </nav>

      <div style={{ padding: '80px 100px' }}>
        <div style={{ marginBottom: 60 }}>
          <p style={{ color: 'var(--color-gold)', fontSize: 12, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 12 }}>MENÚ DE LA SEMANA</p>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 44, lineHeight: '52px', color: 'var(--color-cream)', fontWeight: 600, marginBottom: 16 }}>
            {hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).charAt(0).toUpperCase() +
             hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).slice(1)}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 100, padding: '10px 18px', width: 'fit-content' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-gold)' }} />
            <p style={{ color: 'var(--color-cream)', fontSize: 14 }}>Elige antes del domingo 8:00 pm</p>
          </div>
        </div>

        {!menu || menu.length === 0 ? (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, padding: '48px', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-muted)', fontSize: 17, marginBottom: 8 }}>El menú aún no ha sido publicado</p>
            <p style={{ color: 'var(--color-disabled)', fontSize: 14 }}>Se publica el día 20 de cada mes</p>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--color-gold)', fontSize: 10, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 20 }}>PLATILLOS DE LA SEMANA</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 48 }}>
              {menu.map((m: any) => (
                <div key={m.dia_semana} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ background: 'var(--color-raised)', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: 'var(--color-disabled)', fontSize: 13 }}>Foto</p>
                  </div>
                  <div style={{ padding: '16px' }}>
                    <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', marginBottom: 6 }}>{dias[m.dia_semana]?.toUpperCase()}</p>
                    <p style={{ color: 'var(--color-cream)', fontSize: 15, fontWeight: 500, marginBottom: 6 }}>{m.platillos?.nombre}</p>
                    <p style={{ color: 'var(--color-muted)', fontSize: 12, lineHeight: '18px', marginBottom: 12 }}>{m.platillos?.descripcion}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-line)', paddingTop: 10 }}>
                      <p style={{ color: 'var(--color-gold)', fontSize: 12, fontWeight: 500 }}>1 crédito</p>
                      <p style={{ color: 'var(--color-muted)', fontSize: 11 }}>{m.platillos?.calorias} kcal</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      {[['P', m.platillos?.proteina_g], ['C', m.platillos?.carbs_g], ['G', m.platillos?.grasa_g]].map(([l, v]) => (
                        <div key={l as string} style={{ textAlign: 'center' }}>
                          <p style={{ color: 'var(--color-cream)', fontSize: 11, fontWeight: 500 }}>{v}g</p>
                          <p style={{ color: 'var(--color-disabled)', fontSize: 9 }}>{l}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {comodines && comodines.length > 0 && (
              <>
                <p style={{ color: 'var(--color-gold)', fontSize: 10, fontWeight: 500, letterSpacing: '0.10em', marginBottom: 20 }}>COMODINES — DISPONIBLES CUALQUIER DÍA</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  {comodines.map((c: any, i) => (
                    <div key={i} style={{ background: 'var(--color-raised)', border: '1.5px solid var(--color-gold)', borderRadius: 12, padding: '20px', display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ background: 'var(--color-surface)', width: 80, height: 80, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p style={{ color: 'var(--color-disabled)', fontSize: 11 }}>Foto</p>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: 'var(--color-gold)', fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', marginBottom: 4 }}>COMODÍN</p>
                        <p style={{ color: 'var(--color-cream)', fontSize: 16, fontWeight: 500, marginBottom: 4 }}>{c.platillos?.nombre}</p>
                        <p style={{ color: 'var(--color-muted)', fontSize: 12 }}>{c.platillos?.descripcion}</p>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                          <p style={{ color: 'var(--color-muted)', fontSize: 11 }}>{c.platillos?.calorias} kcal</p>
                          <p style={{ color: 'var(--color-muted)', fontSize: 11 }}>P: {c.platillos?.proteina_g}g</p>
                          <p style={{ color: 'var(--color-muted)', fontSize: 11 }}>C: {c.platillos?.carbs_g}g</p>
                          <p style={{ color: 'var(--color-muted)', fontSize: 11 }}>G: {c.platillos?.grasa_g}g</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* CTA */}
        <div style={{ marginTop: 64, textAlign: 'center' }}>
          <p style={{ color: 'var(--color-cream)', fontFamily: 'Georgia, serif', fontSize: 32, fontWeight: 600, marginBottom: 16 }}>
            ¿Te gusta lo que ves?
          </p>
          <Link href="/paquetes" style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', borderRadius: 8, padding: '16px 36px', fontSize: 17, fontWeight: 500, textDecoration: 'none' }}>
            Ver paquetes
          </Link>
        </div>
      </div>
    </main>
  )
}
