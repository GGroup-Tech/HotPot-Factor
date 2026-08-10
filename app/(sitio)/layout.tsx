import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HotPot Factor',
  description: 'Comida real, lista para tu semana',
}

export default function SitioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-ink)' }}>
      {children}
    </div>
  )
}
