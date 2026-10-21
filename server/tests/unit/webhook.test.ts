// Exercises the real route handlers (no HTTP server): webhook → store → hub → ack.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as webhook } from '@/app/api/ring/webhook/route'
import { POST as ack } from '@/app/api/events/[id]/ack/route'
import { subscribe } from '@/lib/hub'
import { signBody } from '@/lib/ring/hmac'
import { buildPayload } from '@/lib/simulator'
import { getEvent, listEvents, resetDbForTests, deleteAllEventData } from '@/lib/store'
import { makeAdminSession, ADMIN_COOKIE } from '@/lib/auth'

const KEY = 'test-hmac-key'

function post(body: string, sig: string | null) {
  return webhook(
    new Request('http://localhost/api/ring/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(sig ? { 'x-signature': sig } : {}) },
      body,
    }),
  )
}

function collect() {
  const msgs: { event: string; data: Record<string, unknown> }[] = []
  const off = subscribe('test-surface', (chunk) => {
    const ev = /event: (\w+)/.exec(chunk)?.[1]
    const data = /data: (.*)/.exec(chunk)?.[1]
    if (ev && data) msgs.push({ event: ev, data: JSON.parse(data) })
  })
  return { msgs, off }
}

beforeEach(() => {
  resetDbForTests()
})

describe('webhook route', () => {
  it('accepts a signed button_press, stores it and broadcasts a door alert', async () => {
    const { msgs, off } = collect()
    const body = JSON.stringify(buildPayload('button_press', 'dev-1'))
    const res = await post(body, signBody(body, KEY))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: 'accepted', decision: 'door' })
    await vi.waitFor(() => expect(msgs.some((m) => m.event === 'update')).toBe(true))
    off()
    const alert = msgs.find((m) => m.event === 'alert')!
    expect(alert.data).toMatchObject({ kind: 'door', origin: 'ring' })
    // No Ring token and no live frame in the test → explicit error, not a fake image.
    const update = msgs.find((m) => m.event === 'update')!
    expect(update.data.image_url).toBeNull()
    expect(String(update.data.image_error)).toContain('No Ring token configured')
    expect(listEvents()).toHaveLength(1)
  })

  it('rejects unsigned and tampered requests with 401 and stores nothing', async () => {
    const body = JSON.stringify(buildPayload('button_press', 'dev-1'))
    expect((await post(body, null)).status).toBe(401)
    expect((await post(body.replace('dev-1', 'dev-2'), signBody(body, KEY))).status).toBe(401)
    expect((await post(body, signBody(body, 'wrong-key'))).status).toBe(401)
    expect(listEvents()).toHaveLength(0)
  })

  it('returns 400 for signed but malformed payloads', async () => {
    const notJson = 'not json'
    expect((await post(notJson, signBody(notJson, KEY))).status).toBe(400)
    const wrongShape = JSON.stringify({ hello: 'world' })
    expect((await post(wrongShape, signBody(wrongShape, KEY))).status).toBe(400)
  })

  it('processes a duplicate request_id only once', async () => {
    const body = JSON.stringify(buildPayload('button_press', 'dev-1'))
    const sig = signBody(body, KEY)
    expect((await (await post(body, sig)).json()).status).toBe('accepted')
    expect((await (await post(body, sig)).json()).status).toBe('duplicate')
    expect(listEvents()).toHaveLength(1)
  })

  it('never raises a door alert for motion', async () => {
    const { msgs, off } = collect()
    for (let i = 0; i < 20; i++) {
      const body = JSON.stringify(buildPayload('motion_other', 'dev-1', Date.now() + i))
      expect((await post(body, signBody(body, KEY))).status).toBe(200)
    }
    off()
    expect(msgs.filter((m) => m.event === 'alert')).toHaveLength(0)
    expect(listEvents(100).every((e) => e.decision === 'log')).toBe(true)
  })

  it('human motion produces a badge, not a door alert', async () => {
    const { msgs, off } = collect()
    const body = JSON.stringify(buildPayload('motion_human', 'dev-1'))
    await post(body, signBody(body, KEY))
    await vi.waitFor(() => expect(msgs.some((m) => m.event === 'alert')).toBe(true))
    off()
    expect(msgs.find((m) => m.event === 'alert')!.data.kind).toBe('badge')
  })
})

describe('acknowledge', () => {
  it('requires auth, clears everywhere, and is idempotent', async () => {
    const payload = buildPayload('button_press', 'dev-1')
    const body = JSON.stringify(payload)
    await post(body, signBody(body, KEY))
    const id = payload.data.id
    const ctx = { params: Promise.resolve({ id }) }

    expect((await ack(new Request(`http://localhost/api/events/${id}/ack`, { method: 'POST' }), ctx)).status).toBe(401)

    const admin = { cookie: `${ADMIN_COOKIE}=${encodeURIComponent(makeAdminSession())}` }
    const { msgs, off } = collect()
    const r1 = await ack(new Request(`http://localhost/api/events/${id}/ack`, { method: 'POST', headers: admin }), ctx)
    expect(await r1.json()).toMatchObject({ ok: true, already_acknowledged: false })
    const r2 = await ack(new Request(`http://localhost/api/events/${id}/ack`, { method: 'POST', headers: admin }), ctx)
    expect(await r2.json()).toMatchObject({ ok: true, already_acknowledged: true })
    off()
    expect(msgs.filter((m) => m.event === 'clear')).toHaveLength(2)
    expect(getEvent(id)!.acked_by).toBe('console')
  })
})

describe('delete my data', () => {
  it('removes all events', async () => {
    const body = JSON.stringify(buildPayload('button_press', 'dev-1'))
    await post(body, signBody(body, KEY))
    expect(listEvents()).toHaveLength(1)
    deleteAllEventData()
    expect(listEvents()).toHaveLength(0)
  })
})
