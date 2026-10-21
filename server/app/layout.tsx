import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DoorSignal',
  description: 'Visual-first Ring doorbell alerts for Deaf and hard-of-hearing households.',
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0b0d10' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
