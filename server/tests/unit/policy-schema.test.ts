import { describe, expect, it } from 'vitest'
import { decide } from '@/lib/policy'
import { WebhookSchema } from '@/lib/ring/schemas'
import { buildPayload } from '@/lib/simulator'

describe('policy: a press is a door alert, motion never is', () => {
  it.each([
    ['button_press', undefined, 'door'],
    ['motion_detected', 'human', 'badge'],
    ['motion_detected', 'motion', 'log'],
    ['motion_detected', 'vehicle', 'log'],
    ['motion_detected', 'other_motion', 'log'],
    ['motion_detected', undefined, 'log'],
    ['device_offline', undefined, 'log'],
    ['something_new', undefined, 'log'],
  ])('%s/%s → %s', (type, sub, expected) => {
    expect(decide(type, sub)).toBe(expected)
  })
})

describe('webhook schema', () => {
  // Copied from the button_press example in the Ring Partner API docs.
  const documentedButtonPress = {
    meta: { version: '1.1', time: '2026-02-14T00:02:53.027052438Z', request_id: 'c83081fc-2f1b-4cb7-8b18-b18a318b8bab', account_id: 'ava1.ring.account.XXXYYY' },
    data: {
      id: 'dev_button_press_1771027372393',
      type: 'button_press',
      attributes: { source: 'dev', source_type: 'devices', timestamp: 1771027372393 },
      relationships: { devices: { links: { self: '/v1/devices/dev' } } },
    },
  }

  it('accepts the documented button_press payload', () => {
    expect(WebhookSchema.safeParse(documentedButtonPress).success).toBe(true)
  })

  it('accepts the documented motion_detected shape with sub_type and component_ids', () => {
    const m = { meta: documentedButtonPress.meta, data: { id: 'x', type: 'motion_detected', attributes: { source: 'dev', source_type: 'devices', timestamp: 1786715596787, sub_type: 'motion', component_ids: ['0'] } } }
    expect(WebhookSchema.safeParse(m).success).toBe(true)
  })

  it('rejects unknown types, missing request_id and string timestamps', () => {
    expect(WebhookSchema.safeParse({ ...documentedButtonPress, data: { ...documentedButtonPress.data, type: 'ding' } }).success).toBe(false)
    expect(WebhookSchema.safeParse({ ...documentedButtonPress, meta: { version: '1.1', time: 't' } }).success).toBe(false)
    const badTs = structuredClone(documentedButtonPress) as { data: { attributes: Record<string, unknown> } }
    badTs.data.attributes.timestamp = 'yesterday'
    expect(WebhookSchema.safeParse(badTs).success).toBe(false)
  })

  it('simulator payloads conform to the same schema', () => {
    for (const k of ['button_press', 'motion_human', 'motion_other'] as const) {
      expect(WebhookSchema.safeParse(buildPayload(k, 'dev-1')).success).toBe(true)
    }
  })
})
