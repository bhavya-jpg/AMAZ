import { readJson, requireAdmin } from '@/lib/http'
import { setMode } from '@/lib/mode'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const denied = requireAdmin(req)
  if (denied) return denied
  const body = await readJson<{ mode?: string }>(req)
  if (body?.mode !== 'live' && body?.mode !== 'replay') return Response.json({ error: 'mode must be live or replay' }, { status: 400 })
  setMode(body.mode)
  return Response.json({ ok: true, mode: body.mode })
}
