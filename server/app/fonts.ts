// Self-hosted at build time by next/font (no runtime requests to Google). All SIL Open Font License.
import { Inter_Tight, Instrument_Serif, JetBrains_Mono } from 'next/font/google'

export const sans = Inter_Tight({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
export const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' })
export const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })
