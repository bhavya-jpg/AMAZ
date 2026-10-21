// Replay mode serves responses that were captured from the real Ring Developer Playground
// by `npm run capture` (see scripts/capture.ts). Nothing here is hand-written Ring data.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

export interface ReplayFixture {
  capturedAt: string
  source: string
  device: { id: string; name: string; type: string }
  devicesJson: unknown
  snapshotFile: string | null
}

export function replayDir() {
  return path.join(process.cwd(), 'fixtures', 'replay')
}

export function replayFixture(): ReplayFixture | undefined {
  const metaFile = path.join(replayDir(), 'meta.json')
  if (!existsSync(metaFile)) return undefined
  const meta = JSON.parse(readFileSync(metaFile, 'utf8'))
  const snap = path.join(replayDir(), 'snapshot.jpg')
  return {
    capturedAt: meta.captured_at,
    source: meta.source,
    device: meta.device,
    devicesJson: JSON.parse(readFileSync(path.join(replayDir(), 'devices.json'), 'utf8')),
    snapshotFile: existsSync(snap) ? snap : null,
  }
}
