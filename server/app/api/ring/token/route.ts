// Paste a Ring Developer Playground token. Held in memory only; validated with a real API call.
import { readJson, requireAdmin } from '@/lib/http'
import { listDevices, RingApiError } from '@/lib/ring/client'
import { clearRingToken, setRingToken } from '@/lib/ring/token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const denied = requireAdmin(req)
  if (denied) return denied
  const body = await readJson<{ token?: string }>(req)
  const token = String(body?.token ?? '').trim()
  if (token.length < 20) return Response.json({ error: 'paste the full access token from the Ring Developer Playground' }, { status: 400 })
  try {
    const devices = await listDevices(token)
    setRingToken(token)
    return Response.json({ ok: true, devices: devices.length })
  } catch (e) {
    const status = e instanceof RingApiError ? e.status : 502
    return Response.json({ error: e instanceof Error ? e.message : 'Ring API call failed' }, { status: status === 401 ? 400 : 502 })
  }
}

export async function DELETE(req: Request) {
  const denied = requireAdmin(req)
  if (denied) return denied
  clearRingToken()
  return Response.json({ ok: true })
}
