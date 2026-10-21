// Acknowledge on any surface (or the console) clears the alert everywhere.
import { isAdminRequest, surfaceFromRequest } from '@/lib/auth'
import { broadcast } from '@/lib/hub'
import { ackEvent, getEvent } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const surface = surfaceFromRequest(req)
  const by = surface?.name ?? (isAdminRequest(req) ? 'console' : null)
  if (!by) return Response.json({ error: 'unauthorized' }, { status: 401 })
  if (!getEvent(id)) return Response.json({ error: 'unknown event' }, { status: 404 })
  const first = ackEvent(id, by)
  broadcast({ event: 'clear', data: { event_id: id, acked_by: by } })
  return Response.json({ ok: true, already_acknowledged: !first })
}
