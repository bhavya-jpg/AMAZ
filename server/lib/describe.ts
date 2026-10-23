// One plain-language sentence about the doorbell image, from Claude on Amazon Bedrock
// (Anthropic Bedrock Mantle client, SigV4 or a Bedrock API key). It is shown under the image
// and read by screen readers and braille displays, so a DeafBlind person learns who or what is
// at the door. It never identifies people. Off unless BEDROCK_DESCRIPTIONS=on.
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { AnthropicBedrockMantle } from '@anthropic-ai/bedrock-sdk'
import { config } from './config'

export const DESCRIBE_SYSTEM = `You write one short sentence describing a doorbell camera image for a Deaf or DeafBlind person.
It appears on their TV and phone and is read aloud by screen readers and braille displays.
Say what is at the door and what is happening: a person, people, a package, a vehicle, an animal, or nobody.
Mention weather or darkness only if it matters.
Never identify anyone. Never guess a name, age, gender, race, ethnicity or emotion. Refer to people only as "a person" or "two people".
A uniform or a parcel may be mentioned, because it says why someone is there.
Ignore text overlays such as timestamps, device IDs and logos.
If the image is unclear, say so plainly.
At most 20 words. Plain language. No preamble.`

export interface Description {
  text: string | null
  source: string | null
  error: string | null
}

type MessagesClient = Pick<AnthropicBedrockMantle, 'messages'>
const g = globalThis as unknown as { __dsDescribeClient?: MessagesClient }

function client(): MessagesClient {
  return (g.__dsDescribeClient ??= new AnthropicBedrockMantle({ awsRegion: config.bedrock.region }))
}

export function setDescribeClientForTests(c: MessagesClient | undefined) {
  g.__dsDescribeClient = c
}

/** One line, no quotes or markup, at most 200 characters. */
export function cleanDescription(raw: string): string | null {
  const text = raw.replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim().replace(/^["“']|["”']$/g, '').trim()
  if (!text) return null
  return text.length > 200 ? `${text.slice(0, 197).trimEnd()}…` : text
}

export async function describeImage(bytes: Buffer, mediaType: 'image/jpeg' | 'image/png' = 'image/jpeg'): Promise<Description> {
  const source = `bedrock: ${config.bedrock.model}`
  try {
    const res = await client().messages.create(
      {
        model: config.bedrock.model,
        max_tokens: 2000,
        // A one-sentence caption needs little reasoning; low effort keeps it fast and cheap.
        output_config: { effort: 'low' },
        system: DESCRIBE_SYSTEM,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: bytes.toString('base64') } },
              { type: 'text', text: 'Describe this doorbell camera image.' },
            ],
          },
        ],
      },
      { timeout: 20_000, maxRetries: 1 },
    )
    // A declined request is not an error for the household: the alert simply has no description.
    if (res.stop_reason === 'refusal') return { text: null, source, error: 'The model declined to describe this image' }
    const raw = res.content.map((b) => (b.type === 'text' ? b.text : '')).join(' ')
    const text = cleanDescription(raw)
    return text ? { text, source, error: null } : { text: null, source, error: 'Empty description' }
  } catch (e) {
    const status = (e as { status?: number }).status
    // AWS's own error text (e.g. "You don't have access to the model...") says what to fix; it carries no credentials.
    const reason = (e as { error?: { error?: { message?: string }; message?: string } }).error
    const detail = reason?.error?.message ?? reason?.message
    return {
      text: null,
      source,
      error: `Amazon Bedrock request failed${status ? ` (HTTP ${status})` : ''}${detail ? `: ${String(detail).slice(0, 240)}` : ''}`,
    }
  }
}

/** A real Bedrock response recorded from the deployed app, replayed in the public sandbox. */
export function replayDescription(): Description | null {
  const file = path.join(process.cwd(), 'fixtures', 'replay', 'bedrock-description.json')
  if (!existsSync(file)) return null
  const fx = JSON.parse(readFileSync(file, 'utf8')) as { text: string; model: string; captured_at: string }
  return { text: fx.text, source: `replay: recorded Amazon Bedrock response (${fx.model}, ${fx.captured_at})`, error: null }
}
