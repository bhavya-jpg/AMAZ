'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { connectSse } from '@/lib/client/sse'

interface Status {
  mode: 'live' | 'replay'
  admin: boolean
  admin_configured: boolean
  webhook_key_configured: boolean
  ring_token: { source: 'console' | 'env' | 'none'; setAt: number | null }
  device: { id: string; name: string } | null
  replay: { available: boolean; captured_at?: string; source?: string; device?: { id: string; name: string } }
  surfaces: { id: string; type: string; name: string; last_seen: number | null; connected: boolean }[]
}

interface TimelineEvent {
  id: string
  type: string
  sub_type: string | null
  decision: 'door' | 'badge' | 'log'
  origin: 'ring' | 'simulated' | 'replay'
  received_at: number
  image_url: string | null
  image_source: string | null
  image_error: string | null
  acked_at: number | null
  acked_by: string | null
  deliveries?: { surface: string; type: string; sent_ms: number; rendered_ms: number | null }[]
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
  return body
}

function Msg({ m }: { m: { ok?: string; err?: string } | null }) {
  if (!m) return null
  return <p className={`small ${m.err ? 'err' : 'okc'}`} role="status">{m.err ?? m.ok}</p>
}

export default function Console() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [events, setEvents] = useState<TimelineEvent[]>([])

  const refresh = useCallback(async () => {
    try {
      setStatus(await api('/api/status'))
      setLoadErr(null)
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Server unreachable')
    }
  }, [])

  const loadEvents = useCallback(async () => {
    try {
      setEvents((await api('/api/events')).events)
    } catch {
      setEvents([])
    }
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 5000)
    return () => clearInterval(t)
  }, [refresh])

  const canSeeTimeline = Boolean(status && (status.admin || status.mode === 'replay'))
  useEffect(() => {
    if (!canSeeTimeline) return
    loadEvents()
    let debounce: ReturnType<typeof setTimeout>
    const stop = connectSse('/api/console/stream', null, {
      onState: () => {},
      onMessage: (ev) => {
        if (ev === 'event' || ev === 'clear') {
          clearTimeout(debounce)
          debounce = setTimeout(loadEvents, 300)
        }
      },
    })
    return () => {
      stop()
      clearTimeout(debounce)
    }
  }, [canSeeTimeline, loadEvents])

  if (loadErr && !status) return <div className="wrap"><div className="notice"><span className="badge badge-bad">OFFLINE</span><p>Cannot reach the server: {loadErr}</p></div></div>
  if (!status) return <div className="wrap"><div className="skeleton" aria-busy="true">Loading the console…</div></div>

  return (
    <div className="wrap">
      <div className="app-head">
        <div>
                    <h1 className="app-title">Console</h1>
          <p className="muted">Link Ring, pair your screens, ring the bell.</p>
        </div>
        <ModeBadge status={status} />
      </div>

      {status.mode === 'replay' && (
        <div className="notice">
          <span className="badge badge-sim">REPLAY</span>
          <p>
            <b>Judge sandbox.</b> Ring Developer Playground tokens expire after ~30 minutes, so this hosted demo replays responses recorded from
            the real Playground{status.replay.captured_at ? ` on ${new Date(status.replay.captured_at).toUTCString()}` : ''}. Doorbell presses are{' '}
            <span className="pill simulated">SIMULATED</span> — the Playground cannot emit button_press webhooks, so the simulator signs one in
            Ring&apos;s documented format and posts it to the real webhook endpoint. Open <a href="/tv" target="_blank">/tv</a> in another window
            to see the alert.
          </p>
        </div>
      )}

      <div className="grid app-grid">
        {!status.admin && <Login onDone={refresh} configured={status.admin_configured} />}
        {status.admin && <RingSetup status={status} onChange={refresh} />}
        {status.admin && <Pairing status={status} onChange={refresh} />}
        <Simulate status={status} onFired={loadEvents} />
        {status.admin && status.mode === 'live' && status.device && <LiveView />}
      </div>

      {canSeeTimeline && <Timeline events={events} admin={status.admin} onChange={loadEvents} />}

      {status.admin && <Admin status={status} onChange={() => { refresh(); loadEvents() }} />}

    </div>
  )
}

function ModeBadge({ status }: { status: Status }) {
  const tokenOk = status.ring_token.source !== 'none'
  return (
    <div className="statusbar">
      <span className={`spill ${status.mode === 'replay' ? 'spill-sim' : 'spill-ok'}`}>
        <span className="dot" /> Mode <b data-testid="mode">{status.mode.toUpperCase()}</b>
      </span>
      {status.mode === 'live' && (
        <span className={`spill ${tokenOk ? 'spill-ok' : 'spill-bad'}`}><span className="dot" /> Ring token {tokenOk ? status.ring_token.source : 'not set'}</span>
      )}
      <span className={`spill ${status.webhook_key_configured ? 'spill-ok' : 'spill-bad'}`}>
        <span className="dot" /> Webhook key {status.webhook_key_configured ? 'configured' : 'missing'}
      </span>
    </div>
  )
}

function Login({ onDone, configured }: { onDone: () => void; configured: boolean }) {
  const [pw, setPw] = useState('')
  const [m, setM] = useState<{ ok?: string; err?: string } | null>(null)
  return (
    <section className="card">
      <h2>Console login</h2>
      {!configured && <p className="err small">ADMIN_PASSWORD is not set on the server.</p>}
      <p className="small muted">Log in to pair the TV, phone and light screens. Judges: the password is in the Devpost testing instructions.</p>
      <form
        className="row"
        onSubmit={async (e) => {
          e.preventDefault()
          try {
            await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: pw }) })
            setM({ ok: 'Logged in' })
            onDone()
          } catch (err) {
            setM({ err: (err as Error).message })
          }
        }}
      >
        <input type="password" aria-label="Admin password" placeholder="Admin password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <button className="primary" type="submit" disabled={!pw}>Log in</button>
      </form>
      <Msg m={m} />
    </section>
  )
}

function RingSetup({ status, onChange }: { status: Status; onChange: () => void }) {
  const [token, setToken] = useState('')
  const [devices, setDevices] = useState<{ id: string; name: string; type: string; online: boolean | null }[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [m, setM] = useState<{ ok?: string; err?: string } | null>(null)

  async function loadDevices() {
    setBusy(true)
    try {
      setDevices((await api('/api/ring/devices')).devices)
      setM(null)
    } catch (e) {
      setM({ err: (e as Error).message })
      setDevices(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <h2>1 · Ring</h2>
      {status.mode === 'live' ? (
        <>
          <p className="small muted">
            Paste an access token from the <a href="https://developer.amazon.com/ring/console/playground" target="_blank" rel="noreferrer">Ring Developer Playground</a> (valid ~30 min, kept in memory only).
          </p>
          <form
            className="row"
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              try {
                const r = await api('/api/ring/token', { method: 'POST', body: JSON.stringify({ token }) })
                setToken('')
                setM({ ok: `Token works — ${r.devices} device(s) visible` })
                onChange()
                loadDevices()
              } catch (err) {
                setM({ err: (err as Error).message })
              } finally {
                setBusy(false)
              }
            }}
          >
            <input type="password" aria-label="Ring access token" placeholder="Ring access token" value={token} onChange={(e) => setToken(e.target.value)} style={{ flex: 1 }} />
            <button className="primary" disabled={busy || !token}>Save</button>
          </form>
        </>
      ) : (
        <p className="small muted">Replay mode uses the recorded Playground device{status.replay.device ? `: ${status.replay.device.name}` : ''}.</p>
      )}
      <div className="row" style={{ marginTop: 8 }}>
        <button onClick={loadDevices} disabled={busy}>{busy ? 'Loading…' : 'Find devices'}</button>
        {status.device && <span className="small">Selected: <b>{status.device.name}</b></span>}
      </div>
      {devices && devices.length === 0 && <p className="small muted">No devices on this account.</p>}
      {devices?.map((d) => (
        <div key={d.id} className="row small" style={{ marginTop: 6 }}>
          <button
            onClick={async () => {
              await api('/api/ring/devices', { method: 'POST', body: JSON.stringify({ id: d.id, name: d.name }) })
              onChange()
            }}
          >
            Use
          </button>
          <span>{d.name}</span>
          <span className="muted">{d.type}</span>
          {d.online !== null && <span className={d.online ? 'okc' : 'err'}>{d.online ? 'online' : 'offline'}</span>}
        </div>
      ))}
      <Msg m={m} />
    </section>
  )
}

function Pairing({ status, onChange }: { status: Status; onChange: () => void }) {
  const [code, setCode] = useState('')
  const [m, setM] = useState<{ ok?: string; err?: string } | null>(null)
  return (
    <section className="card">
      <h2>2 · Screens and lights</h2>
      <p className="small muted">
        Open <a href="/tv" target="_blank">/tv</a>, <a href="/phone" target="_blank">/phone</a>, <a href="/light" target="_blank">/light</a>, then type the code it shows.
      </p>
      <form
        className="row"
        onSubmit={async (e) => {
          e.preventDefault()
          try {
            const r = await api('/api/surfaces/pair/approve', { method: 'POST', body: JSON.stringify({ code }) })
            setM({ ok: `Paired ${r.name}` })
            setCode('')
            onChange()
          } catch (err) {
            setM({ err: (err as Error).message })
          }
        }}
      >
        <input inputMode="numeric" aria-label="Pairing code" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={7} />
        <button className="primary" disabled={code.replace(/\D/g, '').length !== 6}>Pair</button>
      </form>
      <Msg m={m} />
      {status.surfaces.length === 0 ? (
        <p className="small muted">No screens paired yet.</p>
      ) : (
        <table style={{ marginTop: 8 }}>
          <tbody>
            {status.surfaces.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td className={s.connected ? 'okc' : 'muted'}>{s.connected ? 'connected' : 'offline'}</td>
                <td>
                  <button
                    className="danger small"
                    onClick={async () => {
                      await api('/api/surfaces', { method: 'DELETE', body: JSON.stringify({ id: s.id }) })
                      onChange()
                    }}
                  >
                    Unpair
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function Simulate({ status, onFired }: { status: Status; onFired: () => void }) {
  const [m, setM] = useState<{ ok?: string; err?: string } | null>(null)
  const allowed = status.admin || status.mode === 'replay'
  const ready = status.mode === 'replay' ? status.replay.available : Boolean(status.device)
  async function fire(type: string, label: string) {
    try {
      await api(`/api/sim/${type}`, { method: 'POST' })
      setM({ ok: `${label} sent` })
      onFired()
    } catch (e) {
      setM({ err: (e as Error).message })
    }
  }
  return (
    <section className="card">
      <h2>3 · Try it <span className="pill simulated">SIMULATED EVENTS</span></h2>
      <p className="small muted">
        The Ring Playground can stream video but cannot send doorbell or motion webhooks. These buttons sign a payload in Ring&apos;s documented
        format and post it to our real webhook endpoint.
      </p>
      {!allowed ? (
        <p className="small muted">Log in to simulate events in live mode.</p>
      ) : !ready ? (
        <p className="small err">{status.mode === 'replay' ? 'No recorded Playground data yet (fixtures/replay).' : 'Select a Ring device first.'}</p>
      ) : (
        <div className="row">
          <button className="primary" onClick={() => fire('button_press', 'Doorbell press')} data-testid="sim-press">Doorbell press</button>
          <button onClick={() => fire('motion_human', 'Person motion')}>Person nearby (motion)</button>
          <button onClick={() => fire('motion_other', 'Other motion')}>Bird / other motion</button>
        </div>
      )}
      <Msg m={m} />
    </section>
  )
}

function LiveView() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const sessionRef = useRef<string | null>(null)
  const frameTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const [state, setState] = useState<'idle' | 'starting' | 'live' | 'error'>('idle')
  const [err, setErr] = useState<string | null>(null)

  const stop = useCallback(async () => {
    if (frameTimer.current) clearInterval(frameTimer.current)
    pcRef.current?.close()
    pcRef.current = null
    if (sessionRef.current) {
      await fetch('/api/ring/stream', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionUrl: sessionRef.current }) }).catch(() => {})
      sessionRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setState('idle')
  }, [])

  useEffect(() => () => void stop(), [stop])

  async function start() {
    setState('starting')
    setErr(null)
    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
      pcRef.current = pc
      // Ring WHEP: every track must be recvonly.
      pc.addTransceiver('video', { direction: 'recvonly' })
      pc.addTransceiver('audio', { direction: 'recvonly' })
      pc.ontrack = (e) => {
        if (videoRef.current && e.streams[0]) videoRef.current.srcObject = e.streams[0]
      }
      await pc.setLocalDescription(await pc.createOffer())
      // Send the offer only after ICE gathering completes (Ring returns 500 otherwise).
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') return resolve()
        const t = setTimeout(resolve, 4000)
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(t)
            resolve()
          }
        }
      })
      const r = await api('/api/ring/stream', { method: 'POST', body: JSON.stringify({ sdpOffer: pc.localDescription!.sdp }) })
      sessionRef.current = r.sessionUrl
      await pc.setRemoteDescription({ type: 'answer', sdp: r.sdpAnswer })
      setState('live')
      // Push a frame every second: the fallback image source when the snapshot API has nothing.
      const canvas = document.createElement('canvas')
      frameTimer.current = setInterval(() => {
        const v = videoRef.current
        if (!v || v.videoWidth === 0) return
        canvas.width = Math.min(v.videoWidth, 1280)
        canvas.height = Math.round((canvas.width / v.videoWidth) * v.videoHeight)
        canvas.getContext('2d')!.drawImage(v, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((b) => b && fetch('/api/frames', { method: 'POST', body: b }).catch(() => {}), 'image/jpeg', 0.8)
      }, 1000)
    } catch (e) {
      setErr((e as Error).message)
      setState('error')
      pcRef.current?.close()
    }
  }

  return (
    <section className="card">
      <h2>Live view <span className="pill ring">RING WHEP</span></h2>
      <video ref={videoRef} className="live" autoPlay playsInline muted />
      <div className="row" style={{ marginTop: 8 }}>
        {state === 'live' ? <button onClick={stop}>Stop</button> : <button className="primary" onClick={start} disabled={state === 'starting'}>{state === 'starting' ? 'Connecting…' : 'Start live view'}</button>}
        <span className="small muted">Ring caps sessions at 30–60 s. While live, frames feed alert images.</span>
      </div>
      {err && <p className="small err">{err}</p>}
    </section>
  )
}

function Timeline({ events, admin, onChange }: { events: TimelineEvent[]; admin: boolean; onChange: () => void }) {
  return (
    <section className="card" style={{ marginTop: 16 }}>
      <h2>Timeline</h2>
      {events.length === 0 ? (
        <p className="small muted">No events yet. Press &quot;Doorbell press&quot; above, with /tv open in another window.</p>
      ) : (
        <table data-testid="timeline">
          <thead>
            <tr><th>Time</th><th>Event</th><th>Decision</th><th>Image</th><th>Delivered to</th><th>Ack</th></tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td className="small">{new Date(e.received_at).toLocaleTimeString()}</td>
                <td className="small">
                  {e.type}{e.sub_type ? ` · ${e.sub_type}` : ''} <span className={`pill ${e.origin}`}>{e.origin.toUpperCase()}</span>
                </td>
                <td><span className={`pill ${e.decision}`}>{e.decision === 'door' ? 'DOOR ALERT' : e.decision === 'badge' ? 'BADGE' : 'LOG ONLY'}</span></td>
                <td className="small">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {e.image_url ? <img className="thumb" src={e.image_url} alt="" title={e.image_source ?? ''} /> : e.decision === 'log' ? '—' : <span className="muted" title={e.image_error ?? ''}>none</span>}
                </td>
                <td className="small">
                  {e.deliveries?.length
                    ? e.deliveries.map((d, i) => (
                        <div key={i}>{d.surface}: {d.rendered_ms !== null ? <b>{(d.rendered_ms / 1000).toFixed(2)} s</b> : `sent ${(d.sent_ms / 1000).toFixed(2)} s`}</div>
                      ))
                    : '—'}
                </td>
                <td className="small">
                  {e.acked_at ? `${e.acked_by} · ${((e.acked_at - e.received_at) / 1000).toFixed(1)} s` : e.decision === 'door' && admin ? (
                    <button onClick={async () => { await api(`/api/events/${encodeURIComponent(e.id)}/ack`, { method: 'POST' }); onChange() }}>Ack</button>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function Admin({ status, onChange }: { status: Status; onChange: () => void }) {
  const [m, setM] = useState<{ ok?: string; err?: string } | null>(null)
  return (
    <section className="card" style={{ marginTop: 16 }}>
      <h2>Settings</h2>
      <div className="row">
        <button
          onClick={async () => {
            await api('/api/mode', { method: 'POST', body: JSON.stringify({ mode: status.mode === 'live' ? 'replay' : 'live' }) })
            onChange()
          }}
        >
          Switch to {status.mode === 'live' ? 'replay' : 'live'} mode
        </button>
        <button
          className="danger"
          onClick={async () => {
            if (!confirm('Delete every event and image? This cannot be undone.')) return
            try {
              await api('/api/data', { method: 'DELETE' })
              setM({ ok: 'All events and images deleted' })
              onChange()
            } catch (e) {
              setM({ err: (e as Error).message })
            }
          }}
        >
          Delete my data
        </button>
        <button onClick={async () => { await api('/api/admin/login', { method: 'DELETE' }); onChange() }}>Log out</button>
      </div>
      <Msg m={m} />
    </section>
  )
}
