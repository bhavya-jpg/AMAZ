// Timeline for the console, including per-surface delivery latency.
import { isAdminRequest } from '@/lib/auth'
import { currentMode } from '@/lib/mode'
import { timelineEntry } from '@/lib/pipeline'
import { deliveriesFor, listEvents } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // Replay mode is the public judge sandbox; live data needs the admin session.
  if (!isAdminRequest(req) && currentMode() !== 'replay') return Response.json({ error: 'admin login required' }, { status: 401 })
  const events = listEvents(50).map((e) => ({
    ...timelineEntry(e),
    deliveries: deliveriesFor(e.id).map((d) => ({
      surface: d.name,
      type: d.type,
      sent_ms: d.sent_at - e.received_at,
      rendered_ms: d.rendered_at ? d.rendered_at - e.received_at : null,
    })),
  }))
  return Response.json({ events })
}
