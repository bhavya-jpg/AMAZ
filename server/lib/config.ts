import { randomBytes } from 'node:crypto'
import path from 'node:path'

function env(name: string): string | undefined {
  const v = process.env[name]
  return v && v.trim() ? v.trim() : undefined
}

const g = globalThis as unknown as { __dsEphemeralSecret?: string }
// Without SESSION_SECRET, sessions and signed image URLs reset on restart (fine for local dev).
g.__dsEphemeralSecret ??= randomBytes(32).toString('hex')

export const config = {
  dataDir: env('DATA_DIR') ?? path.join(process.cwd(), 'data'),
  dbFile: env('DB_FILE'), // ':memory:' in tests
  adminPassword: env('ADMIN_PASSWORD'),
  sessionSecret: env('SESSION_SECRET') ?? g.__dsEphemeralSecret,
  // Key used to verify X-Signature. In production this is the HMAC Signing Key issued by Ring;
  // in the hackathon it is our own dev key, shared with the labelled simulator.
  ringHmacKey: env('RING_HMAC_KEY'),
  // Only a key issued by Ring (partner onboarding) proves an event came from Ring.
  // With our own dev key, every webhook event is labelled "simulated".
  ringHmacKeyFromRing: env('RING_HMAC_KEY_SOURCE') === 'ring',
  ringAccessToken: env('RING_ACCESS_TOKEN'),
  imageTtlMinutes: Number(env('IMAGE_TTL_MIN') ?? 60),
  defaultMode: (env('DOORSIGNAL_MODE') ?? 'live') as 'live' | 'replay',
  // Plain-language image descriptions with Claude on Amazon Bedrock. Off unless set to "on".
  // Credentials: AWS_BEARER_TOKEN_BEDROCK (a Bedrock API key) or the standard AWS credential chain.
  bedrock: {
    enabled: env('BEDROCK_DESCRIPTIONS') === 'on',
    region: env('AWS_REGION') ?? env('AWS_DEFAULT_REGION') ?? 'us-east-1',
    // Tried in order; the first model this AWS account can use is kept. Override with a comma-separated list.
    // Claude models go through the Anthropic Bedrock SDK; Amazon Nova models through the Bedrock Converse API.
    models: (
      env('BEDROCK_MODEL') ??
      'anthropic.claude-opus-5-5,anthropic.claude-sonnet-5-5,anthropic.claude-haiku-5-5,anthropic.claude-haiku-4-5,' +
        'us.amazon.nova-2-lite-v1:0,amazon.nova-lite-v1:0,us.amazon.nova-lite-v1:0,amazon.nova-pro-v1:0'
    )
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean),
  },
}
