// In-process SSE hub: one server instance, many paired surfaces.
import { recordDelivery } from './store'

export interface AlertMessage {
  event_id: string
  kind: 'door' | 'badge'
  device_name: string
  at: number
  origin: 'ring' | 'simulated' | 'replay'
  image_url: string | null
  image_source: string | null
}

export type HubMessage =
  | { event: 'alert'; data: AlertMessage }
  | { event: 'update'; data: { event_id: string; image_url: string | null; image_source: string | null; image_error: string | null } }
  | { event: 'clear'; data: { event_id: string; acked_by: string } }
  | { event: 'event'; data: Record<string, unknown> } // timeline entries for the console

type Sink = { surfaceId: string; send: (chunk: string) => void }

const g = globalThis as unknown as { __dsSinks?: Set<Sink> }
const sinks = (g.__dsSinks ??= new Set<Sink>())

export function format(msg: HubMessage) {
  return `event: ${msg.event}\ndata: ${JSON.stringify(msg.data)}\n\n`
}

export function subscribe(surfaceId: string, send: (chunk: string) => void) {
  const sink = { surfaceId, send }
  sinks.add(sink)
  return () => sinks.delete(sink)
}

export function broadcast(msg: HubMessage) {
  const chunk = format(msg)
  for (const s of sinks) {
    try {
      s.send(chunk)
      if (msg.event === 'alert' && !s.surfaceId.startsWith('console:')) recordDelivery(msg.data.event_id, s.surfaceId)
    } catch {
      sinks.delete(s)
    }
  }
}

export function connectedSurfaceIds() {
  return [...new Set([...sinks].map((s) => s.surfaceId))]
}

/** Server-Sent Events response that stays open until the client disconnects. */
export function sseResponse(surfaceId: string, signal: AbortSignal, hello?: HubMessage[]) {
  const enc = new TextEncoder()
  let unsubscribe = () => {}
  let ping: ReturnType<typeof setInterval> | undefined
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (s: string) => controller.enqueue(enc.encode(s))
      send(`retry: 2000\n\n`)
      for (const m of hello ?? []) send(format(m))
      unsubscribe = subscribe(surfaceId, send)
      ping = setInterval(() => send(`event: ping\ndata: {}\n\n`), 15_000)
      signal.addEventListener('abort', () => {
        clearInterval(ping)
        unsubscribe()
        try {
          controller.close()
        } catch {}
      })
    },
    cancel() {
      clearInterval(ping)
      unsubscribe()
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
