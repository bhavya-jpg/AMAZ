// Amazon Bedrock image descriptions: request shape, guardrails in the prompt, failure handling,
// and the pipeline storing and broadcasting the description. Bedrock itself is mocked here.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { config } from '@/lib/config'
import { cleanDescription, describeImage, describeModel, DESCRIBE_SYSTEM, resetDescribeModelForTests, setDescribeClientForTests } from '@/lib/describe'
import { subscribe } from '@/lib/hub'
import { setMode } from '@/lib/mode'
import { processEvent } from '@/lib/pipeline'
import { getEvent, insertEvent, resetDbForTests } from '@/lib/store'

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])

type Params = { model: string; output_config: unknown; system: string; messages: { content: unknown[] }[] }

function mockClient(impl: (params: Params) => unknown, runtime?: { send: unknown }) {
  const create = vi.fn(async (params: Params) => impl(params))
  setDescribeClientForTests({ messages: { create } } as never, runtime as never)
  return create
}

const unavailable = (p: Params) => {
  throw Object.assign(new Error('403'), { status: 403, error: { message: `${p.model} is not available for this account.` } })
}

afterEach(() => {
  setDescribeClientForTests(undefined)
  resetDescribeModelForTests()
  config.bedrock.enabled = false
})

describe('describeImage', () => {
  it('sends the image to Claude on Bedrock with the no-identification rules and returns one clean line', async () => {
    const create = mockClient(() => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: ' "A person holding a package at the front door." ' }] }))
    const d = await describeImage(JPEG)
    expect(d).toEqual({ text: 'A person holding a package at the front door.', source: `bedrock: ${config.bedrock.models[0]}`, error: null })
    const params = create.mock.calls[0][0]
    expect(params.model).toBe(config.bedrock.models[0])
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
    mockClient(() => { throw Object.assign(new Error('denied'), { status: 500 }) })
    const d = await describeImage(JPEG)
    expect(d).toMatchObject({ text: null, error: 'Amazon Bedrock request failed (HTTP 500)' })
  })

  it('moves to the next model when the account cannot use one, and keeps the one that works', async () => {
    const create = mockClient((p) => {
      if (p.model === config.bedrock.models[0]) {
        throw Object.assign(new Error('403'), { status: 403, error: { message: `${p.model} is not available for this account.` } })
      }
      return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Nobody at the door.' }] }
    })
    const d = await describeImage(JPEG)
    expect(d).toEqual({ text: 'Nobody at the door.', source: `bedrock: ${config.bedrock.models[1]}`, error: null })
    expect(describeModel()).toBe(config.bedrock.models[1])
    await describeImage(JPEG)
    expect(create.mock.calls.map((c) => c[0].model)).toEqual([config.bedrock.models[0], config.bedrock.models[1], config.bedrock.models[1]])
  })

  it('reports AWS\'s reason when no model is available', async () => {
    const send = vi.fn(async () => {
      throw Object.assign(new Error('amazon.nova-pro-v1:0 is not available for this account.'), { $metadata: { httpStatusCode: 403 } })
    })
    mockClient(unavailable, { send })
    const d = await describeImage(JPEG)
    expect(d.text).toBeNull()
    expect(d.error).toMatch(/HTTP 403\): amazon\.nova-pro-v1:0 is not available for this account/)
  })

  it('cleans model output to one short line', () => {
    expect(cleanDescription('**A dog**\n on the porch.')).toBe('A dog on the porch.')
    expect(cleanDescription('   ')).toBeNull()
    expect(cleanDescription('x'.repeat(300))!.length).toBe(198)
  })
})

describe('Amazon Nova through the Bedrock Converse API', () => {
  it('falls back to Nova when the account cannot use any Claude model, sending the image bytes', async () => {
    const send = vi.fn(async (cmd: { input: Record<string, unknown> }) => ({
      cmdSeen: Boolean(cmd),
      stopReason: 'end_turn',
      output: { message: { role: 'assistant', content: [{ text: 'A person with a parcel at the door.' }] } },
    }))
    mockClient(unavailable, { send })
    const d = await describeImage(JPEG)
    const nova = config.bedrock.models.find((m) => !m.startsWith('anthropic.'))!
    expect(d).toEqual({ text: 'A person with a parcel at the door.', source: `bedrock: ${nova}`, error: null })
    const input = send.mock.calls[0][0].input as { modelId: string; system: unknown; messages: { content: unknown[] }[] }
    expect(input.modelId).toBe(nova)
    expect(input.system).toEqual([{ text: DESCRIBE_SYSTEM }])
    expect(input.messages[0].content[0]).toEqual({ image: { format: 'jpeg', source: { bytes: JPEG } } })
  })

  it('tries the next Nova ID when one is not served on demand in the region', async () => {
    setDescribeClientForTests({ messages: { create: vi.fn() } } as never, {
      send: vi.fn(async (cmd: { input: { modelId: string } }) => {
        if (cmd.input.modelId === 'us.amazon.nova-2-lite-v1:0') {
          throw Object.assign(new Error('The provided model identifier is invalid.'), { $metadata: { httpStatusCode: 400 } })
        }
        return { stopReason: 'end_turn', output: { message: { role: 'assistant', content: [{ text: 'Nobody there.' }] } } }
      }),
    } as never)
    const prev = config.bedrock.models
    config.bedrock.models = ['us.amazon.nova-2-lite-v1:0', 'amazon.nova-lite-v1:0']
    try {
      expect(await describeImage(JPEG)).toEqual({ text: 'Nobody there.', source: 'bedrock: amazon.nova-lite-v1:0', error: null })
    } finally {
      config.bedrock.models = prev
    }
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
    expect(getEvent('ev-1')).toMatchObject({ description: 'A package on the doorstep, no one at the door.', description_source: `bedrock: ${config.bedrock.models[0]}` })
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
