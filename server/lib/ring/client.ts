// Ring Partner API client.
// Endpoints, headers and media flows follow
// https://developer.amazon.com/docs/ring/api-documentation.html
import { randomUUID } from 'node:crypto'

export const RING_API_BASE = process.env.RING_API_BASE || 'https://api.amazonvision.com'
const USER_AGENT = 'DoorSignal/0.1'

export class RingApiError extends Error {
  constructor(
    public status: number,
    public body: string,
    public endpoint: string,
  ) {
    super(`Ring API ${endpoint} failed: HTTP ${status}${hint(status)}`)
  }
}

function hint(status: number): string {
  if (status === 401) return ' (token missing or expired — Playground tokens last ~30 minutes)'
  if (status === 406) return ' (blocked by Ring WAF: missing User-Agent/Hardware_Id, or a datacenter IP)'
  if (status === 429) return ' (rate limited)'
  return ''
}

// Hardware_Id must uniquely identify the user + device combination using our system.
// One stable UUID per server instance is sufficient for a single-household prototype.
const HARDWARE_ID = process.env.RING_HARDWARE_ID || randomUUID()

function headers(token: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'User-Agent': USER_AGENT,
    Hardware_Id: HARDWARE_ID,
    ...extra,
  }
}

async function getJson<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${RING_API_BASE}${path}`, {
    headers: headers(token, { Accept: 'application/json' }),
    cache: 'no-store',
  })
  if (!res.ok) throw new RingApiError(res.status, await res.text(), `GET ${path}`)
  return (await res.json()) as T
}

export interface RingDevice {
  id: string
  type: string
  attributes: Record<string, unknown>
}

export async function listDevices(token: string): Promise<RingDevice[]> {
  const body = await getJson<{ data: RingDevice[] }>(token, '/v1/devices')
  return body.data ?? []
}

export function getDeviceStatus(token: string, deviceId: string) {
  return getJson<{ data: { attributes: Record<string, unknown> } }>(
    token,
    `/v1/devices/${encodeURIComponent(deviceId)}/status`,
  )
}

export function getDeviceCapabilities(token: string, deviceId: string) {
  return getJson<{ data: { attributes: Record<string, unknown> } }>(
    token,
    `/v1/devices/${encodeURIComponent(deviceId)}/capabilities`,
  )
}

/**
 * Ring authorizes media only for times after the access token was issued (observed:
 * 403 TIME_RANGE_NOT_AUTHORIZED otherwise). Reads the token's own `iat` claim — no
 * signature check is needed because this only narrows the time window we ask for.
 */
export function tokenIssuedAtMs(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
    return typeof payload.iat === 'number' ? payload.iat * 1000 : null
  } catch {
    return null
  }
}

export interface Snapshot {
  bytes: Buffer
  contentType: string
}

// POST /media/image/download answers 303 with a time-limited pre-signed Location.
// We follow it manually so the Bearer token is never sent to the pre-signed host.
export async function downloadSnapshot(
  token: string,
  deviceId: string,
  opts: { atMs?: number; windowMs?: number } = {},
): Promise<Snapshot> {
  const now = Date.now()
  const issued = tokenIssuedAtMs(token)
  const start = Math.max(now - (opts.windowMs ?? 10 * 60_000), issued ? issued + 1000 : 0)
  const body = opts.atMs
    ? { type: 'at_timestamp', timestamp: opts.atMs, image_options: { format: 'jpeg' } }
    : {
        type: 'latest_in_range',
        start_timestamp: start,
        image_options: { format: 'jpeg' },
      }
  const path = `/v1/devices/${encodeURIComponent(deviceId)}/media/image/download`
  const res = await fetch(`${RING_API_BASE}${path}`, {
    method: 'POST',
    headers: headers(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
    redirect: 'manual',
    cache: 'no-store',
  })
  if (res.status !== 303) throw new RingApiError(res.status, await res.text(), `POST ${path}`)
  const location = res.headers.get('location')
  if (!location) throw new RingApiError(303, 'missing Location header', `POST ${path}`)
  const img = await fetch(location, { cache: 'no-store' })
  if (!img.ok) throw new RingApiError(img.status, await img.text(), 'GET snapshot location')
  return {
    bytes: Buffer.from(await img.arrayBuffer()),
    contentType: img.headers.get('content-type') || 'image/jpeg',
  }
}

// WHEP: the client's SDP offer is forwarded as-is. All tracks must be recvonly.
export async function startWhep(token: string, deviceId: string, sdpOffer: string) {
  const path = `/v1/devices/${encodeURIComponent(deviceId)}/media/streaming/whep/sessions`
  const res = await fetch(`${RING_API_BASE}${path}`, {
    method: 'POST',
    headers: headers(token, { 'Content-Type': 'application/sdp' }),
    body: sdpOffer,
    cache: 'no-store',
  })
  if (!res.ok) throw new RingApiError(res.status, await res.text(), `POST ${path}`)
  const location = res.headers.get('location')
  return {
    sdpAnswer: await res.text(),
    sessionUrl: location ? new URL(location, RING_API_BASE).toString() : null,
  }
}

export async function stopWhep(token: string, sessionUrl: string) {
  if (!sessionUrl.startsWith(RING_API_BASE)) throw new Error('refusing to send token to a non-Ring URL')
  await fetch(sessionUrl, { method: 'DELETE', headers: headers(token) })
}
