import { adminConfigured, isAdminRequest } from '@/lib/auth'
import { config } from '@/lib/config'
import { describeModel } from '@/lib/describe'
import { connectedSurfaceIds } from '@/lib/hub'
import { configuredDevice, currentMode } from '@/lib/mode'
import { ringTokenInfo } from '@/lib/ring/token'
import { replayFixture } from '@/lib/replay'
import { deleteExpiredImages, listSurfaces } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // Retention also runs when nothing new arrives (the console polls status every 5 s).
  deleteExpiredImages(config.imageTtlMinutes * 60_000)
  const fx = replayFixture()
  const connected = new Set(connectedSurfaceIds())
  return Response.json({
    mode: currentMode(),
    admin: isAdminRequest(req),
    admin_configured: adminConfigured(),
    webhook_key_configured: Boolean(config.ringHmacKey),
    ring_token: ringTokenInfo(),
    device: configuredDevice() ?? null,
    bedrock: { descriptions: config.bedrock.enabled, model: config.bedrock.enabled ? describeModel() : null, region: config.bedrock.enabled ? config.bedrock.region : null },
    replay: fx ? { available: true, captured_at: fx.capturedAt, source: fx.source, device: fx.device } : { available: false },
    surfaces: listSurfaces().map((s) => ({ id: s.id, type: s.type, name: s.name, last_seen: s.last_seen, connected: connected.has(s.id) })),
  })
}
