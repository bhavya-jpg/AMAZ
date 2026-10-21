'use client'
// Minimal SSE client over fetch so we can send Authorization headers (EventSource cannot).

export interface SseHandlers {
  onMessage: (event: string, data: unknown) => void
  onState: (s: 'connecting' | 'open' | 'closed' | 'unauthorized') => void
}

export function connectSse(url: string, token: string | null, h: SseHandlers): () => void {
  let stopped = false
  let ctrl: AbortController | null = null
  let delay = 1000

  async function run() {
    while (!stopped) {
      h.onState('connecting')
      ctrl = new AbortController()
      try {
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: ctrl.signal,
          cache: 'no-store',
        })
        if (res.status === 401) {
          h.onState('unauthorized')
          return
        }
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
        h.onState('open')
        delay = 1000
        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let buf = ''
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          let i
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const block = buf.slice(0, i)
            buf = buf.slice(i + 2)
            let ev = 'message'
            const data: string[] = []
            for (const line of block.split('\n')) {
              if (line.startsWith('event: ')) ev = line.slice(7)
              else if (line.startsWith('data: ')) data.push(line.slice(6))
            }
            if (data.length) {
              try {
                h.onMessage(ev, JSON.parse(data.join('\n')))
              } catch {}
            }
          }
        }
      } catch {
        if (stopped) return
      }
      h.onState('closed')
      await new Promise((r) => setTimeout(r, delay))
      delay = Math.min(delay * 2, 10_000)
    }
  }
  void run()
  return () => {
    stopped = true
    ctrl?.abort()
  }
}
