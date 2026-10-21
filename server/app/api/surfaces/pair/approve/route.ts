// Admin types the code shown on the surface.
import { randomUUID } from 'node:crypto'
import { newSurfaceToken } from '@/lib/auth'
import { readJson, requireAdmin } from '@/lib/http'
import { approvePairing, findPendingByCode } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const denied = requireAdmin(req)
  if (denied) return denied
  const body = await readJson<{ code?: string }>(req)
  const code = String(body?.code ?? '').replace(/\D/g, '')
  if (code.length !== 6) return Response.json({ error: 'enter the 6-digit code shown on the screen' }, { status: 400 })
  const p = findPendingByCode(code)
  if (!p) return Response.json({ error: 'no pending pairing with that code (it may have expired)' }, { status: 404 })
  const token = newSurfaceToken()
  const surfaceId = randomUUID()
  approvePairing(p.id, { id: surfaceId, tokenPlain: token.plain, tokenHash: token.hash, type: p.type, name: p.name })
  return Response.json({ approved: true, surface_id: surfaceId, name: p.name, type: p.type })
}
