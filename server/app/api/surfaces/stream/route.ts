// SSE stream for a paired surface. Auth: Authorization: Bearer <surface_token>.
// On connect, any unacknowledged door alert from the last 2 minutes is replayed.
import { surfaceFromRequest } from '@/lib/auth'
import { sseResponse, type HubMessage } from '@/lib/hub'
import { signedImagePath } from '@/lib/auth'
import { configuredDevice } from '@/lib/mode'
import { listEvents } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const surface = surfaceFromRequest(req)
  if (!surface) return Response.json({ error: 'unknown or revoked surface token — pair again' }, { status: 401 })
  const device = configuredDevice()
  const hello: HubMessage[] = listEvents(10)
    .filter((e) => e.decision === 'door' && !e.acked_at && Date.now() - e.received_at < 120_000)
    .reverse()
    .map((e) => ({
      event: 'alert' as const,
      data: {
        event_id: e.id,
        kind: 'door' as const,
        device_name: device?.id === e.device_id ? device.name : 'Front door',
        at: e.received_at,
        origin: e.origin,
        image_url: e.image_path ? signedImagePath(e.id) : null,
        image_source: e.image_source,
        description: e.description ?? null,
        description_source: e.description_source ?? null,
      },
    }))
  return sseResponse(surface.id, req.signal, hello)
}
