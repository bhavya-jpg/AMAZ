// "Delete my data": every event, delivery record and stored image.
import { requireAdmin } from '@/lib/http'
import { deleteAllEventData } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(req: Request) {
  const denied = requireAdmin(req)
  if (denied) return denied
  deleteAllEventData()
  return Response.json({ ok: true })
}
