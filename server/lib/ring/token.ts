// The Ring access token is held in memory only (never written to the database or logs).
// Sources: RING_ACCESS_TOKEN env, or pasted in the admin console (Playground tokens last ~30 min).
import { config } from '../config'

const g = globalThis as unknown as { __dsRingToken?: { token: string; setAt: number } }

export function setRingToken(token: string) {
  g.__dsRingToken = { token: token.trim(), setAt: Date.now() }
}

export function clearRingToken() {
  g.__dsRingToken = undefined
}

export function getRingToken(): string | undefined {
  return g.__dsRingToken?.token ?? config.ringAccessToken
}

export function ringTokenInfo() {
  if (g.__dsRingToken) return { source: 'console' as const, setAt: g.__dsRingToken.setAt }
  if (config.ringAccessToken) return { source: 'env' as const, setAt: null }
  return { source: 'none' as const, setAt: null }
}
