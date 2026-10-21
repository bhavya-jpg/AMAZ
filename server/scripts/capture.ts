// Records real Ring Developer Playground responses for replay mode (the public judge sandbox).
//   RING_ACCESS_TOKEN=<Playground token> npm run capture
// Writes fixtures/replay/{meta.json, devices.json, snapshot.jpg}. Only fields needed by the app are kept.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { downloadSnapshot, listDevices, RingApiError } from '../lib/ring/client'

const token = process.env.RING_ACCESS_TOKEN
if (!token) {
  console.error('Set RING_ACCESS_TOKEN (Ring Developer Playground → Generate Token).')
  process.exit(2)
}

async function main() {
  const dir = path.join(process.cwd(), 'fixtures', 'replay')
  mkdirSync(dir, { recursive: true })
  const devices = await listDevices(token!)
  if (!devices.length) throw new Error('Playground returned no devices')
  const d = devices[0]
  const device = { id: d.id, type: d.type, name: String(d.attributes?.name ?? 'Front door') }
  // Keep only id/type/name: no account, location or configuration data.
  writeFileSync(path.join(dir, 'devices.json'), JSON.stringify({ data: devices.map((x) => ({ id: x.id, type: x.type, attributes: { name: x.attributes?.name ?? null } })) }, null, 2))
  let snapshot = false
  try {
    const s = await downloadSnapshot(token!, d.id, { windowMs: 24 * 3600_000 })
    writeFileSync(path.join(dir, 'snapshot.jpg'), s.bytes)
    snapshot = true
  } catch (e) {
    console.warn('snapshot unavailable:', e instanceof RingApiError ? e.message : e)
    console.warn('Start a Playground live-view stream (e.g. Package) and run capture again.')
  }
  writeFileSync(
    path.join(dir, 'meta.json'),
    JSON.stringify({ captured_at: new Date().toISOString(), source: 'Ring Developer Playground via Ring Partner API (api.amazonvision.com)', device, snapshot }, null, 2),
  )
  console.log(`captured ${devices.length} device(s); snapshot=${snapshot} → fixtures/replay/`)
}

main().catch((e) => {
  console.error(e instanceof RingApiError ? e.message : e)
  process.exit(1)
})
