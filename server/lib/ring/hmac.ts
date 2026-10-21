// Ring webhook signatures: X-Signature: sha256=<hex HMAC-SHA256(raw body, signing key)>.
// Verify the raw bytes first, parse second (re-serialized JSON will not match).
import { createHmac, timingSafeEqual } from 'node:crypto'

export function signBody(rawBody: Buffer | string, key: string): string {
  return 'sha256=' + createHmac('sha256', key).update(rawBody).digest('hex')
}

export function verifySignature(rawBody: Buffer, header: string | null, key: string): boolean {
  if (!header || !key) return false
  const received = header.startsWith('sha256=') ? header.slice(7) : header
  if (!/^[0-9a-f]{64}$/i.test(received)) return false
  const expected = createHmac('sha256', key).update(rawBody).digest()
  return timingSafeEqual(expected, Buffer.from(received, 'hex'))
}
