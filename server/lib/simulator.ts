// Labelled event simulator. The Ring Developer Playground cannot emit button_press or
// motion webhooks, so we build payloads in the documented shape, sign them with our dev
// key, and POST them to our own webhook over HTTP — exercising the real verification path.
import { randomUUID } from 'node:crypto'
import { signBody } from './ring/hmac'

export const SIM_TYPES = {
  button_press: { type: 'button_press' as const, sub_type: undefined },
  motion_human: { type: 'motion_detected' as const, sub_type: 'human' },
  motion_other: { type: 'motion_detected' as const, sub_type: 'other_motion' },
}
export type SimType = keyof typeof SIM_TYPES

export function buildPayload(kind: SimType, deviceId: string, now = Date.now()) {
  const { type, sub_type } = SIM_TYPES[kind]
  return {
    meta: { version: '1.1', time: new Date(now).toISOString(), request_id: randomUUID() },
    data: {
      id: `${deviceId}_${type}_${now}`,
      type,
      attributes: {
        source: deviceId,
        source_type: 'devices',
        timestamp: now,
        ...(sub_type ? { sub_type } : {}),
      },
      relationships: { devices: { links: { self: `/v1/devices/${deviceId}` } } },
    },
  }
}

export async function sendSimulated(kind: SimType, deviceId: string, webhookUrl: string, key: string) {
  const body = JSON.stringify(buildPayload(kind, deviceId))
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signBody(body, key),
      'X-DoorSignal-Origin': 'simulated',
    },
    body,
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}
