// A surface (Fire TV app, TV page, phone page, light page) asks to pair and shows the code.
import { randomUUID } from 'node:crypto'
import { newPairingCode } from '@/lib/auth'
import { readJson } from '@/lib/http'
import { insertPairing, type SurfaceType } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TYPES: SurfaceType[] = ['firetv', 'tv', 'phone', 'light']
const TTL_MS = 10 * 60_000

export async function POST(req: Request) {
  const body = await readJson<{ type?: string; name?: string }>(req)
  const type = body?.type as SurfaceType
  if (!TYPES.includes(type)) return Response.json({ error: `type must be one of ${TYPES.join(', ')}` }, { status: 400 })
  const name = String(body?.name ?? type).slice(0, 40) || type
  const id = randomUUID()
  const code = newPairingCode()
  insertPairing({ id, code, type, name, ttlMs: TTL_MS })
  return Response.json({ pairing_id: id, code, expires_in_s: TTL_MS / 1000 })
}
