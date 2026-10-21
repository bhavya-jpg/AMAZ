import { randomBytes } from 'node:crypto'
import path from 'node:path'

function env(name: string): string | undefined {
  const v = process.env[name]
  return v && v.trim() ? v.trim() : undefined
}

const g = globalThis as unknown as { __dsEphemeralSecret?: string }
// Without SESSION_SECRET, sessions and signed image URLs reset on restart (fine for local dev).
g.__dsEphemeralSecret ??= randomBytes(32).toString('hex')

export const config = {
  dataDir: env('DATA_DIR') ?? path.join(process.cwd(), 'data'),
  dbFile: env('DB_FILE'), // ':memory:' in tests
  adminPassword: env('ADMIN_PASSWORD'),
  sessionSecret: env('SESSION_SECRET') ?? g.__dsEphemeralSecret,
  // Key used to verify X-Signature. In production this is the HMAC Signing Key issued by Ring;
  // in the hackathon it is our own dev key, shared with the labelled simulator.
  ringHmacKey: env('RING_HMAC_KEY'),
  // Only a key issued by Ring (partner onboarding) proves an event came from Ring.
  // With our own dev key, every webhook event is labelled "simulated".
  ringHmacKeyFromRing: env('RING_HMAC_KEY_SOURCE') === 'ring',
  ringAccessToken: env('RING_ACCESS_TOKEN'),
  imageTtlMinutes: Number(env('IMAGE_TTL_MIN') ?? 60),
  defaultMode: (env('DOORSIGNAL_MODE') ?? 'live') as 'live' | 'replay',
}
