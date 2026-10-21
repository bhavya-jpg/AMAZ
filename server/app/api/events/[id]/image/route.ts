import { existsSync, readFileSync } from 'node:fs'
import { checkImageSignature } from '@/lib/auth'
import { getEvent } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const url = new URL(req.url)
  if (!checkImageSignature(id, url.searchParams.get('exp'), url.searchParams.get('sig'))) {
    return Response.json({ error: 'link expired or invalid' }, { status: 403 })
  }
  const ev = getEvent(id)
  if (!ev?.image_path || !existsSync(ev.image_path)) return Response.json({ error: 'image deleted or not available' }, { status: 404 })
  return new Response(readFileSync(ev.image_path), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=300' },
  })
}
