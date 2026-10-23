'use client'
// Shared alert surface for /tv, /phone and /light: pairing, live connection, alert, acknowledge.
import { useCallback, useEffect, useRef, useState } from 'react'
import { connectSse } from '@/lib/client/sse'

type Variant = 'tv' | 'phone' | 'light'

interface Alert {
  event_id: string
  kind: 'door' | 'badge'
  device_name: string
  at: number
  origin: 'ring' | 'simulated' | 'replay'
  image_url: string | null
  image_source: string | null
  image_error?: string | null
  description?: string | null
  description_source?: string | null
}

const storeKey = (v: Variant) => `doorsignal.surface.${v}`

function readStored(v: Variant): { token: string; name: string } | null {
  try {
    const raw = localStorage.getItem(storeKey(v))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function Surface({ variant }: { variant: Variant }) {
  const [creds, setCreds] = useState<{ token: string; name: string } | null | undefined>(undefined)
  const [pairing, setPairing] = useState<{ id: string; code: string } | null>(null)
  const [pairError, setPairError] = useState<string | null>(null)
  const [conn, setConn] = useState<'connecting' | 'open' | 'closed' | 'unauthorized'>('connecting')
  const [alert, setAlert] = useState<Alert | null>(null)
  const [now, setNow] = useState(Date.now())
  const alertRef = useRef<Alert | null>(null)
  alertRef.current = alert

  useEffect(() => setCreds(readStored(variant)), [variant])

  // ---- pairing (TV-initiated: show a code, approve it in the console) ----
  useEffect(() => {
    if (creds !== null) return
    let stop = false
    let timer: ReturnType<typeof setTimeout>
    ;(async () => {
      try {
        const name = variant === 'tv' ? 'Living room TV (web)' : variant === 'phone' ? 'Phone' : 'Room light'
        const r = await fetch('/api/surfaces/pair/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: variant, name }) })
        const p = await r.json()
        if (!r.ok) throw new Error(p.error)
        setPairing({ id: p.pairing_id, code: p.code })
        const poll = async () => {
          if (stop) return
          const s = await fetch(`/api/surfaces/pair/${p.pairing_id}`, { cache: 'no-store' }).then((x) => x.json())
          if (s.status === 'approved') {
            const c = { token: s.surface_token, name: s.name }
            try { localStorage.setItem(storeKey(variant), JSON.stringify(c)) } catch {}
            setPairing(null)
            setCreds(c)
          } else if (s.status === 'expired' || s.status === 'unknown') {
            setPairError('Code expired — reload to get a new one.')
          } else {
            timer = setTimeout(poll, 1500)
          }
        }
        poll()
      } catch (e) {
        setPairError(e instanceof Error ? e.message : 'Could not start pairing')
      }
    })()
    return () => {
      stop = true
      clearTimeout(timer)
    }
  }, [creds, variant])

  // ---- live connection ----
  useEffect(() => {
    if (!creds) return
    return connectSse('/api/surfaces/stream', creds.token, {
      onState: (s) => {
        setConn(s)
        if (s === 'unauthorized') {
          try { localStorage.removeItem(storeKey(variant)) } catch {}
          setCreds(null)
        }
      },
      onMessage: (ev, data) => {
        const d = data as Alert & { acked_by?: string }
        if (ev === 'alert') {
          // A badge never replaces an open door alert.
          if (d.kind === 'badge' && alertRef.current?.kind === 'door') return
          setAlert(d)
          fetch(`/api/events/${encodeURIComponent(d.event_id)}/rendered`, { method: 'POST', headers: { Authorization: `Bearer ${creds.token}` } }).catch(() => {})
          if (variant === 'phone' && 'vibrate' in navigator) navigator.vibrate(d.kind === 'door' ? [400, 200, 400, 200, 400] : [150])
        } else if (ev === 'update') {
          // Image and description updates arrive separately; merge only the fields each carries.
          const patch = Object.fromEntries(
            (['image_url', 'image_source', 'image_error', 'description', 'description_source'] as const).filter((k) => k in d).map((k) => [k, d[k]]),
          )
          setAlert((a) => (a && a.event_id === d.event_id ? { ...a, ...patch } : a))
        } else if (ev === 'clear') {
          setAlert((a) => (a && a.event_id === d.event_id ? null : a))
        }
      },
    })
  }, [creds, variant])

  // Badges fade on their own after 20 s; door alerts stay until acknowledged.
  useEffect(() => {
    if (alert?.kind !== 'badge') return
    const t = setTimeout(() => setAlert((a) => (a?.event_id === alert.event_id ? null : a)), 20_000)
    return () => clearTimeout(t)
  }, [alert])

  useEffect(() => {
    if (!alert) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [alert])

  const acknowledge = useCallback(async () => {
    const a = alertRef.current
    if (!a || !creds) return
    setAlert(null)
    await fetch(`/api/events/${encodeURIComponent(a.event_id)}/ack`, { method: 'POST', headers: { Authorization: `Bearer ${creds.token}` } }).catch(() => {})
  }, [creds])

  // Remote OK / Enter / Space acknowledges.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (alertRef.current && (e.key === 'Enter' || e.key === ' ' || e.key === 'OK')) {
        e.preventDefault()
        acknowledge()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [acknowledge])

  // ---------- render ----------
  if (creds === undefined) return null

  if (!creds) {
    return (
      <main className="surface idle" aria-live="polite">
        <div>
          <h1>Pair this {variant === 'tv' ? 'screen' : variant}</h1>
          {pairing ? (
            <>
              <p className="muted" style={{ fontSize: '3.4vmin' }}>Enter this code in the DoorSignal console:</p>
              <div className="code" data-testid="pair-code">{pairing.code}</div>
            </>
          ) : (
            <p className="muted">{pairError ?? 'Getting a code…'}</p>
          )}
          {pairError && <p className="err">{pairError}</p>}
        </div>
      </main>
    )
  }

  if (variant === 'light') {
    const cls = alert ? (alert.kind === 'door' ? 'light-door flash' : 'light-badge') : ''
    return (
      <main className={`surface ${cls}`} onClick={acknowledge} aria-live="assertive" data-testid="light">
        {!alert && <p className="muted">DoorSignal light · {conn === 'open' ? 'ready' : conn}</p>}
        {alert && <span className="sr-only">{alert.kind === 'door' ? 'Doorbell' : 'Person nearby'}</span>}
      </main>
    )
  }

  if (!alert) {
    return (
      <main className="surface idle">
        <div>
          <div className="clock" suppressHydrationWarning>{new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <h1>DoorSignal is watching the door</h1>
          <p className="muted" style={{ fontSize: '2.6vmin' }}>{creds.name}</p>
        </div>
        <div className="status-dot" data-testid="conn" style={{ color: conn === 'open' ? 'var(--ok)' : 'var(--bad)' }}>
          ● {conn === 'open' ? 'connected' : conn === 'connecting' ? 'connecting…' : 'reconnecting…'}
        </div>
      </main>
    )
  }

  const seconds = ((now - alert.at) / 1000).toFixed(1)
  return (
    <main
      className={`surface alert ${alert.kind === 'badge' ? 'badge' : ''}`}
      role="alertdialog"
      aria-live="assertive"
      aria-label={alert.kind === 'door' ? 'Doorbell pressed' : 'Person near the door'}
      onClick={acknowledge}
      data-testid="alert"
    >
      <div className={`kind ${alert.kind === 'door' ? 'flash' : ''}`} data-testid="alert-kind">{alert.kind === 'door' ? 'DOORBELL' : 'PERSON NEARBY'}</div>
      <div className="sub">{alert.device_name}</div>
      {alert.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={alert.image_url} alt="Latest image from the Ring camera" data-testid="alert-img" />
      ) : (
        <div className="noimg">{alert.image_error ? 'No image available' : 'Getting image…'}</div>
      )}
      {alert.description && (
        <p className="desc" data-testid="alert-desc" aria-live="polite">
          {alert.description}
          <span className="desc-src">
            {alert.description_source?.startsWith('replay') ? 'AI description · Amazon Bedrock · recorded' : 'AI description · Amazon Bedrock'}
          </span>
        </p>
      )}
      <div className="hint">{alert.kind === 'door' ? 'Press OK to acknowledge' : 'No one rang — just letting you know'}</div>
      {alert.origin !== 'ring' && (
        <div className="origin">{alert.origin === 'simulated' ? (alert.kind === 'door' ? 'SIMULATED PRESS' : 'SIMULATED MOTION') : 'REPLAY'}</div>
      )}
      <div className="elapsed">{seconds}s ago</div>
    </main>
  )
}
