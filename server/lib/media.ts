// Image acquisition for an alert, in order of preference:
//   1. replay mode  → a snapshot recorded earlier from the Ring Developer Playground (labelled)
//   2. Ring snapshot API (POST /media/image/download)
//   3. the most recent live-view (WHEP) frame captured by the console, if fresh
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { downloadSnapshot, RingApiError } from './ring/client'
import { getRingToken } from './ring/token'
import { imagesDir, type EventRow } from './store'
import { replayFixture } from './replay'
import { currentMode } from './mode'

const FRAME_MAX_AGE_MS = 15_000
const g = globalThis as unknown as { __dsFrames?: Map<string, { bytes: Buffer; at: number }> }
const frames = (g.__dsFrames ??= new Map())

export function putFrame(deviceId: string, bytes: Buffer) {
  frames.set(deviceId, { bytes, at: Date.now() })
}

export function latestFrame(deviceId: string) {
  const f = frames.get(deviceId)
  return f && Date.now() - f.at <= FRAME_MAX_AGE_MS ? f : undefined
}

export interface ImageResult {
  path: string | null
  source: string | null
  error: string | null
}

function save(eventId: string, bytes: Buffer): string {
  mkdirSync(imagesDir(), { recursive: true })
  const file = path.join(imagesDir(), `${eventId.replace(/[^a-zA-Z0-9_.-]/g, '_')}.jpg`)
  writeFileSync(file, bytes)
  return file
}

export async function acquireImage(ev: EventRow): Promise<ImageResult> {
  if (currentMode() === 'replay' || ev.origin === 'replay') {
    const fx = replayFixture()
    if (fx?.snapshotFile && existsSync(fx.snapshotFile)) {
      return { path: save(ev.id, readFileSync(fx.snapshotFile)), source: 'replay: recorded Ring Playground snapshot', error: null }
    }
    return { path: null, source: null, error: 'No recorded snapshot in fixtures/replay' }
  }

  const errors: string[] = []
  const token = getRingToken()
  if (token) {
    try {
      // Real Ring events have media at their timestamp; simulated presses use the latest image.
      const snap = await downloadSnapshot(
        token,
        ev.device_id,
        ev.origin === 'ring' ? { atMs: ev.ring_ts } : { windowMs: 10 * 60_000 },
      )
      return { path: save(ev.id, snap.bytes), source: 'ring: snapshot API', error: null }
    } catch (e) {
      errors.push(e instanceof RingApiError ? e.message : String(e))
    }
  } else {
    errors.push('No Ring token configured')
  }

  const frame = latestFrame(ev.device_id)
  if (frame) return { path: save(ev.id, frame.bytes), source: 'ring: live-view frame', error: null }
  errors.push('No fresh live-view frame')
  return { path: null, source: null, error: errors.join('; ') }
}
