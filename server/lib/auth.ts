import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { config } from './config'
import { surfaceByTokenHash, touchSurface, type SurfaceRow } from './store'

export const ADMIN_COOKIE = 'ds_admin'

function hmac(s: string) {
  return createHmac('sha256', config.sessionSecret).update(s).digest('hex')
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

// ---------- admin (console) ----------

export function adminConfigured() {
  return Boolean(config.adminPassword)
}

export function checkAdminPassword(pw: string) {
  return adminConfigured() && safeEqual(hmac(`pw:${pw}`), hmac(`pw:${config.adminPassword}`))
}

/** Session cookie value: expiry plus signature. */
export function makeAdminSession(ttlMs = 12 * 3600_000) {
  const exp = Date.now() + ttlMs
  return `${exp}.${hmac(`admin:${exp}`)}`
}

export function isAdminSession(value: string | undefined): boolean {
  if (!value) return false
  const [exp, sig] = value.split('.')
  if (!exp || !sig || Number(exp) < Date.now()) return false
  return safeEqual(sig, hmac(`admin:${exp}`))
}

export function isAdminRequest(req: Request): boolean {
  const cookie = req.headers.get('cookie') ?? ''
  const m = cookie.match(new RegExp(`(?:^|; )${ADMIN_COOKIE}=([^;]+)`))
  return isAdminSession(m?.[1] ? decodeURIComponent(m[1]) : undefined)
}

// ---------- surfaces ----------

export function newSurfaceToken() {
  const plain = randomBytes(32).toString('base64url')
  return { plain, hash: hashToken(plain) }
}

export function hashToken(plain: string) {
  return createHash('sha256').update(plain).digest('hex')
}

export function newPairingCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export function surfaceFromRequest(req: Request): SurfaceRow | undefined {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) return undefined
  const s = surfaceByTokenHash(hashToken(token))
  if (s) touchSurface(s.id)
  return s
}

// ---------- signed, expiring image URLs (usable from <img> and the Fire TV app) ----------

export function signedImagePath(eventId: string, ttlMs = 10 * 60_000) {
  const exp = Date.now() + ttlMs
  return `/api/events/${encodeURIComponent(eventId)}/image?exp=${exp}&sig=${hmac(`img:${eventId}:${exp}`)}`
}

export function checkImageSignature(eventId: string, exp: string | null, sig: string | null) {
  if (!exp || !sig || Number(exp) < Date.now()) return false
  return safeEqual(sig, hmac(`img:${eventId}:${exp}`))
}
