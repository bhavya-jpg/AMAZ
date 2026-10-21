// WHEP proxy for the console's live view (the browser cannot call Ring directly: CORS + token).
import { readJson, requireAdmin } from '@/lib/http'
import { configuredDevice } from '@/lib/mode'
import { startWhep, stopWhep } from '@/lib/ring/client'
import { getRingToken } from '@/lib/ring/token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const denied = requireAdmin(req)
  if (denied) return denied
  const body = await readJson<{ sdpOffer?: string }>(req)
  const token = getRingToken()
  const device = configuredDevice()
  if (!token || !device) return Response.json({ error: 'needs a Ring token and a selected device' }, { status: 409 })
  if (!body?.sdpOffer) return Response.json({ error: 'missing sdpOffer' }, { status: 400 })
  try {
    return Response.json(await startWhep(token, device.id, body.sdpOffer))
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'WHEP failed' }, { status: 502 })
  }
}

export async function DELETE(req: Request) {
  const denied = requireAdmin(req)
  if (denied) return denied
  const body = await readJson<{ sessionUrl?: string }>(req)
  const token = getRingToken()
  if (token && body?.sessionUrl) await stopWhep(token, body.sessionUrl).catch(() => {})
  return Response.json({ ok: true })
}
