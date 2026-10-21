import { readJson, requireAdmin } from '@/lib/http'
import { removeSurface } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Unpair (revoke) a surface. */
export async function DELETE(req: Request) {
  const denied = requireAdmin(req)
  if (denied) return denied
  const body = await readJson<{ id?: string }>(req)
  if (!body?.id) return Response.json({ error: 'surface id required' }, { status: 400 })
  removeSurface(body.id)
  return Response.json({ ok: true })
}
