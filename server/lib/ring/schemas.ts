// Webhook payloads as documented in the Ring Partner API docs (Notifications / Event Types).
import { z } from 'zod'

export const RING_EVENT_TYPES = [
  'button_press',
  'motion_detected',
  'device_added',
  'device_removed',
  'device_online',
  'device_offline',
] as const

export const WebhookSchema = z.object({
  meta: z.object({
    version: z.string(),
    time: z.string(),
    request_id: z.string().min(1),
    account_id: z.string().optional(),
  }),
  data: z.object({
    id: z.string().min(1),
    type: z.enum(RING_EVENT_TYPES),
    attributes: z
      .object({
        source: z.string().min(1),
        source_type: z.string(),
        timestamp: z.number().int().nonnegative(),
        // motion_detected only: motion | human | vehicle | other_motion
        sub_type: z.string().optional(),
        component_ids: z.array(z.string()).optional(),
      })
      .passthrough(),
    relationships: z.unknown().optional(),
  }),
})

export type RingWebhook = z.infer<typeof WebhookSchema>
