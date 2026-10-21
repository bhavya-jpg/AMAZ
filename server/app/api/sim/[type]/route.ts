import { isAdminRequest } from '@/lib/auth'
import { config } from '@/lib/config'
import { configuredDevice, currentMode } from '@/lib/mode'
import { replayFixture } from '@/lib/replay'
import { SIM_TYPES, sendSimulated, type SimType } from '@/lib/simulator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const g = globalThis as unknown as { __dsLastPublicSim?: number }

export async function POST(req: Request, ctx: { params: Promise<{ type: string }> }) {
  const { type } = await ctx.params
  if (!(type in SIM_TYPES)) return Response.json({ error: 'unknown simulation type' }, { status: 404 })
  if (!config.ringHmacKey) return Response.json({ error: 'RING_HMAC_KEY not configured' }, { status: 503 })

  const mode = currentMode()
  const admin = isAdminRequest(req)
  if (!admin) {
    // Judges may trigger the sandbox in replay mode without logging in (rate limited).
    if (mode !== 'replay') return Response.json({ error: 'admin login required in live mode' }, { status: 401 })
    const now = Date.now()
    if (g.__dsLastPublicSim && now - g.__dsLastPublicSim < 3000) {
      return Response.json({ error: 'slow down — one simulated event every 3 seconds' }, { status: 429 })
    }
    g.__dsLastPublicSim = now
  }

  const deviceId = mode === 'replay' ? replayFixture()?.device.id : configuredDevice()?.id
  if (!deviceId) {
    return Response.json(
      { error: mode === 'replay' ? 'No recorded Playground device in fixtures/replay' : 'Choose a Ring device in Setup first' },
      { status: 409 },
    )
  }
  const webhookUrl = new URL('/api/ring/webhook', req.url).toString()
  const result = await sendSimulated(type as SimType, deviceId, webhookUrl, config.ringHmacKey)
  return Response.json({ simulated: true, type, webhook: result }, { status: result.status === 200 ? 200 : 502 })
}
