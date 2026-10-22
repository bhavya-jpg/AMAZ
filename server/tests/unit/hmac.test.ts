import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { signBody, verifySignature } from '@/lib/ring/hmac'

const key = 'k-123'
const body = Buffer.from('{"meta":{"request_id":"r1"},"data":{"type":"button_press"}}')

describe('Ring webhook HMAC', () => {
  it('matches the documented algorithm: sha256= + hex HMAC-SHA256 of the raw body', () => {
    const expected = 'sha256=' + createHmac('sha256', key).update(body).digest('hex')
    expect(signBody(body, key)).toBe(expected)
  })

  it('accepts a valid signature', () => {
    expect(verifySignature(body, signBody(body, key), key)).toBe(true)
  })

  it('accepts the hex digest without the sha256= prefix', () => {
    expect(verifySignature(body, signBody(body, key).slice(7), key)).toBe(true)
  })

  it('rejects a tampered body', () => {
    const tampered = Buffer.from(body.toString().replace('button_press', 'motion_detected'))
    expect(verifySignature(tampered, signBody(body, key), key)).toBe(false)
  })

  it('rejects re-serialized JSON whose bytes differ', () => {
    const reserialized = Buffer.from(JSON.stringify(JSON.parse(body.toString()), null, 2))
    expect(verifySignature(reserialized, signBody(body, key), key)).toBe(false)
  })

  it('rejects the wrong key, a missing header, and malformed signatures', () => {
    expect(verifySignature(body, signBody(body, 'other'), key)).toBe(false)
    expect(verifySignature(body, null, key)).toBe(false)
    expect(verifySignature(body, 'sha256=xyz', key)).toBe(false)
    expect(verifySignature(body, 'sha256=' + 'a'.repeat(63), key)).toBe(false)
    expect(verifySignature(body, signBody(body, key), '')).toBe(false)
  })
})

import { tokenIssuedAtMs } from '@/lib/ring/client'
describe('Ring token issued-at', () => {
  it('reads iat from a JWT payload and tolerates junk', () => {
    const payload = Buffer.from(JSON.stringify({ iat: 1792682544 })).toString('base64url')
    expect(tokenIssuedAtMs(`h.${payload}.s`)).toBe(1792682544000)
    expect(tokenIssuedAtMs('not-a-jwt')).toBeNull()
  })
})
