// A surface reports when an alert became visible, so latency is measured end to end.
import { surfaceFromRequest } from '@/lib/auth'
import { recordRendered } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const surface = surfaceFromRequest(req)
  if (!surface) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  recordRendered(id, surface.id)
  return Response.json({ ok: true })
}
