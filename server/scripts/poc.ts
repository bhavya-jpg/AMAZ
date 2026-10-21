// Phase 1 proof of concept (gate F1–F3). Uses the product's own Ring client.
//   RING_ACCESS_TOKEN=<Playground token> npm run poc
// Prints results only — never prints the token.
import { mkdirSync, writeFileSync } from 'node:fs'
import {
  downloadSnapshot,
  getDeviceCapabilities,
  getDeviceStatus,
  listDevices,
  RingApiError,
} from '../lib/ring/client'

const token = process.env.RING_ACCESS_TOKEN
if (!token) {
  console.error('Set RING_ACCESS_TOKEN (Ring Developer Playground → Generate Token).')
  process.exit(2)
}

function report(step: string, fn: () => Promise<unknown>) {
  return fn().then(
    (v) => {
      console.log(`PASS ${step}`)
      return v
    },
    (e) => {
      const msg = e instanceof RingApiError ? `${e.message}\n     body: ${e.body.slice(0, 300)}` : String(e)
      console.log(`FAIL ${step}: ${msg}`)
      return undefined
    },
  )
}

async function main() {
  const devices = (await report('F1 list devices', () => listDevices(token!))) as
    | Awaited<ReturnType<typeof listDevices>>
    | undefined
  if (!devices?.length) {
    console.log('No devices returned — gate F1 failed. Stop here.')
    process.exit(1)
  }
  for (const d of devices) {
    console.log(`     device ${d.id} type=${d.type} name=${String(d.attributes?.name ?? '')}`)
  }
  const id = devices[0].id
  const status = await report('F2 device status', () => getDeviceStatus(token!, id))
  if (status) console.log('     status:', JSON.stringify(status).slice(0, 300))
  const caps = await report('F2 device capabilities', () => getDeviceCapabilities(token!, id))
  if (caps) console.log('     capabilities:', JSON.stringify(caps).slice(0, 300))
  const snap = (await report('F3 snapshot (latest in last 24h)', () =>
    downloadSnapshot(token!, id, { windowMs: 24 * 3600_000 }),
  )) as Awaited<ReturnType<typeof downloadSnapshot>> | undefined
  if (snap) {
    mkdirSync('data/poc', { recursive: true })
    const file = `data/poc/snapshot-${Date.now()}.jpg`
    writeFileSync(file, snap.bytes)
    console.log(`     saved ${snap.bytes.length} bytes (${snap.contentType}) → server/${file}`)
  } else {
    console.log('     Snapshot unavailable → use the live-view frame fallback (start a Playground stream and retry).')
  }
}

main()
