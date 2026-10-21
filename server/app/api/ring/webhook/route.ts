// Ring webhook receiver (production contract from the Ring Partner API docs).
// Verify X-Signature on the raw bytes → parse → store idempotently → 200 fast → process async.
import { config } from '@/lib/config'
import { verifySignature } from '@/lib/ring/hmac'
import { WebhookSchema } from '@/lib/ring/schemas'
import { decide } from '@/lib/policy'
import { processEvent } from '@/lib/pipeline'
import { getEvent, insertEvent, type Origin } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const receivedAt = Date.now()
  if (!config.ringHmacKey) {
    return Response.json({ error: 'RING_HMAC_KEY not configured' }, { status: 503 })
  }
  const raw = Buffer.from(await req.arrayBuffer())
  if (!verifySignature(raw, req.headers.get('x-signature'), config.ringHmacKey)) {
    return Response.json({ error: 'invalid signature' }, { status: 401 })
  }

  let parsed
  try {
    parsed = WebhookSchema.safeParse(JSON.parse(raw.toString('utf8')))
  } catch {
    return Response.json({ error: 'invalid JSON' }, { status: 400 })
  }
  if (!parsed.success) {
    return Response.json({ error: 'unexpected payload', issues: parsed.error.issues.slice(0, 5) }, { status: 400 })
  }

  const { meta, data } = parsed.data
  // An event is "ring" only if the signing key was issued by Ring and it is not our simulator.
  const origin: Origin =
    config.ringHmacKeyFromRing && req.headers.get('x-doorsignal-origin') !== 'simulated' ? 'ring' : 'simulated'
  const row = {
    id: data.id,
    request_id: meta.request_id,
    type: data.type,
    sub_type: data.attributes.sub_type ?? null,
    device_id: data.attributes.source,
    ring_ts: data.attributes.timestamp,
    received_at: receivedAt,
    origin,
    decision: decide(data.type, data.attributes.sub_type),
  }
  if (!insertEvent(row)) {
    return Response.json({ status: 'duplicate', event_id: data.id })
  }

  const stored = getEvent(data.id)!
  // Acknowledge within Ring's 5-second window; the pipeline continues in the background.
  void processEvent(stored).catch((e) => console.error('[pipeline]', e))
  return Response.json({ status: 'accepted', event_id: data.id, decision: row.decision })
}
