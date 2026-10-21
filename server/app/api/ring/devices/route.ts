// Lists Ring devices (live: real API; replay: the recorded Playground response) and selects one.
import { readJson, requireAdmin } from '@/lib/http'
import { currentMode } from '@/lib/mode'
import { getDeviceStatus, listDevices, RingApiError } from '@/lib/ring/client'
import { getRingToken } from '@/lib/ring/token'
import { replayFixture } from '@/lib/replay'
import { setSetting } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const denied = requireAdmin(req)
  if (denied) return denied
  if (currentMode() === 'replay') {
    const fx = replayFixture()
    if (!fx) return Response.json({ error: 'no recorded Playground data in fixtures/replay' }, { status: 404 })
    return Response.json({ source: 'replay', captured_at: fx.capturedAt, devices: [{ ...fx.device, online: null }] })
  }
  const token = getRingToken()
  if (!token) return Response.json({ error: 'paste a Ring Playground token first' }, { status: 409 })
  try {
    const devices = await listDevices(token)
    const withStatus = await Promise.all(
      devices.map(async (d) => {
        const online = await getDeviceStatus(token, d.id)
          .then((s) => (s.data?.attributes as { online?: boolean })?.online ?? null)
          .catch(() => null)
        return { id: d.id, type: d.type, name: String(d.attributes?.name ?? d.id), online }
      }),
    )
    return Response.json({ source: 'ring', devices: withStatus })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Ring API failed' }, { status: e instanceof RingApiError && e.status === 401 ? 401 : 502 })
  }
}

export async function POST(req: Request) {
  const denied = requireAdmin(req)
  if (denied) return denied
  const body = await readJson<{ id?: string; name?: string }>(req)
  if (!body?.id) return Response.json({ error: 'device id required' }, { status: 400 })
  setSetting('device_id', String(body.id))
  setSetting('device_name', String(body.name ?? body.id).slice(0, 60))
  return Response.json({ ok: true })
}
