// Amazon Bedrock image descriptions: request shape, guardrails in the prompt, failure handling,
// and the pipeline storing and broadcasting the description. Bedrock itself is mocked here.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { config } from '@/lib/config'
import { cleanDescription, describeImage, DESCRIBE_SYSTEM, setDescribeClientForTests } from '@/lib/describe'
import { subscribe } from '@/lib/hub'
import { setMode } from '@/lib/mode'
import { processEvent } from '@/lib/pipeline'
import { getEvent, insertEvent, resetDbForTests } from '@/lib/store'

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])

type Params = { model: string; output_config: unknown; system: string; messages: { content: unknown[] }[] }

function mockClient(impl: (params: Params) => unknown) {
  const create = vi.fn(async (params: Params) => impl(params))
  setDescribeClientForTests({ messages: { create } } as never)
  return create
}

afterEach(() => {
  setDescribeClientForTests(undefined)
  config.bedrock.enabled = false
})

describe('describeImage', () => {
  it('sends the image to Claude on Bedrock with the no-identification rules and returns one clean line', async () => {
    const create = mockClient(() => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: ' "A person holding a package at the front door." ' }] }))
    const d = await describeImage(JPEG)
    expect(d).toEqual({ text: 'A person holding a package at the front door.', source: `bedrock: ${config.bedrock.model}`, error: null })
    const params = create.mock.calls[0][0]
    expect(params.model).toBe(config.bedrock.model)
    expect(params.output_config).toEqual({ effort: 'low' })
    expect(params.messages[0].content[0]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: JPEG.toString('base64') } })
    expect(params.system).toBe(DESCRIBE_SYSTEM)
    expect(DESCRIBE_SYSTEM).toMatch(/Never identify anyone/)
    expect(DESCRIBE_SYSTEM).toMatch(/age, gender, race, ethnicity/)
  })

  it('treats a refusal as "no description", not an error the household sees', async () => {
    mockClient(() => ({ stop_reason: 'refusal', content: [] }))
    const d = await describeImage(JPEG)
    expect(d.text).toBeNull()
    expect(d.error).toMatch(/declined/)
  })

  it('reports a failed Bedrock call without throwing', async () => {
    mockClient(() => { throw Object.assign(new Error('denied'), { status: 403 }) })
    const d = await describeImage(JPEG)
    expect(d).toMatchObject({ text: null, error: 'Amazon Bedrock request failed (HTTP 403)' })
  })

  it('cleans model output to one short line', () => {
    expect(cleanDescription('**A dog**\n on the porch.')).toBe('A dog on the porch.')
    expect(cleanDescription('   ')).toBeNull()
    expect(cleanDescription('x'.repeat(300))!.length).toBe(198)
  })
})

describe('pipeline with Bedrock descriptions on', () => {
  beforeEach(() => {
    resetDbForTests()
    setMode('replay') // uses the recorded Playground snapshot as the event image
  })

  it('stores the description and sends it to paired screens after the image', async () => {
    config.bedrock.enabled = true
    mockClient(() => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'A package on the doorstep, no one at the door.' }] }))
    const msgs: { event: string; data: Record<string, unknown> }[] = []
    const off = subscribe('test-surface', (chunk) => {
      const ev = /event: (\w+)/.exec(chunk)?.[1]
      const data = /data: (.*)/.exec(chunk)?.[1]
      if (ev && data) msgs.push({ event: ev, data: JSON.parse(data) })
    })
    insertEvent({ id: 'ev-1', request_id: 'r-1', type: 'button_press', sub_type: null, device_id: 'dev-1', ring_ts: Date.now(), received_at: Date.now(), origin: 'simulated', decision: 'door' })
    await processEvent(getEvent('ev-1')!)
    off()
    expect(getEvent('ev-1')).toMatchObject({ description: 'A package on the doorstep, no one at the door.', description_source: `bedrock: ${config.bedrock.model}` })
    const updates = msgs.filter((m) => m.event === 'update')
    expect(updates.at(-1)!.data).toMatchObject({ event_id: 'ev-1', description: 'A package on the doorstep, no one at the door.' })
    // The image update comes first, so the alert never waits for Bedrock.
    expect(updates[0].data).toHaveProperty('image_url')
  })

  it('never calls Bedrock for log-only motion', async () => {
    config.bedrock.enabled = true
    const create = mockClient(() => ({ stop_reason: 'end_turn', content: [] }))
    insertEvent({ id: 'ev-2', request_id: 'r-2', type: 'motion_detected', sub_type: 'other_motion', device_id: 'dev-1', ring_ts: Date.now(), received_at: Date.now(), origin: 'simulated', decision: 'log' })
    await processEvent(getEvent('ev-2')!)
    expect(create).not.toHaveBeenCalled()
  })
})
