// The console posts a JPEG frame from the Ring live view about once a second (fallback image source).
import { requireAdmin } from '@/lib/http'
import { putFrame } from '@/lib/media'
import { configuredDevice } from '@/lib/mode'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 2_000_000

export async function POST(req: Request) {
  const denied = requireAdmin(req)
  if (denied) return denied
  const device = configuredDevice()
  if (!device) return Response.json({ error: 'no device selected' }, { status: 409 })
  const bytes = Buffer.from(await req.arrayBuffer())
  if (bytes.length < 100 || bytes.length > MAX_BYTES || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return Response.json({ error: 'expected a JPEG under 2 MB' }, { status: 400 })
  }
  putFrame(device.id, bytes)
  return Response.json({ ok: true })
}
