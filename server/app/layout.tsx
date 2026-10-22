import type { Metadata, Viewport } from 'next'
import { mono, sans, serif } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'DoorSignal — see the door',
  description: 'Visual-first Ring doorbell alerts for Deaf and hard-of-hearing households. A press, not motion, on every screen.',
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0a0a0b' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
