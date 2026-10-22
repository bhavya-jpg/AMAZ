import type { Metadata, Viewport } from 'next'
import { sans } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'DoorSignal — Know when someone’s at the door',
  description: 'Visual-first Ring doorbell alerts for Deaf and hard-of-hearing households. A press, not motion, on every screen.',
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#fbfaf8' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>{children}</body>
    </html>
  )
}
