'use client'
// Hero animation: the real product loop, illustrated. Motion is ignored, a press takes the screen,
// one OK clears every screen. The image is a real Ring Developer Playground snapshot.
import { useEffect, useState } from 'react'

type Phase = 'idle' | 'motion' | 'press' | 'ack'
const SEQUENCE: { phase: Phase; ms: number }[] = [
  { phase: 'idle', ms: 1800 },
  { phase: 'motion', ms: 2200 },
  { phase: 'idle', ms: 900 },
  { phase: 'press', ms: 3600 },
  { phase: 'ack', ms: 1800 },
]

const LOG: Record<Phase, string> = {
  idle: 'watching the door',
  motion: 'motion_detected · other_motion → log only',
  press: 'button_press · signature ✓ → DOOR ALERT',
  ack: 'acknowledged on TV → cleared on 3 screens',
}

export default function HeroTv() {
  const [step, setStep] = useState(0)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    if (reduced) return
    const t = setTimeout(() => setStep((s) => (s + 1) % SEQUENCE.length), SEQUENCE[step].ms)
    return () => clearTimeout(t)
  }, [step, reduced])

  const phase: Phase = reduced ? 'press' : SEQUENCE[step].phase
  const lit = phase === 'press'

  return (
    <div className="herotv" aria-label="Illustration: a doorbell press shown full screen on a TV" role="img">
      <div className={`tv tv-${phase}`}>
        <div className="tv-screen">
          <div className="tv-idle">
            <div className="tv-clock">8:42</div>
            <div className="tv-sub">DoorSignal is watching the door</div>
          </div>
          <div className="tv-toast">
            <span className="dot dot-muted" /> Motion · bird — <b>ignored</b>
          </div>
          <div className="tv-alert">
            <div className="tv-alert-kind">DOORBELL</div>
            <div className="tv-alert-sub">Front door</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ring-playground-snapshot.jpg" alt="" />
            <div className="tv-alert-hint">Press OK to acknowledge</div>
          </div>
          <div className="tv-ack">
            <span className="check">✓</span> Cleared on every screen
          </div>
        </div>
        <div className="tv-stand" />
      </div>
      <div className="herotv-devices">
        {['TV', 'Phone', 'Light'].map((d) => (
          <span key={d} className={`devchip ${lit ? 'devchip-on' : ''}`}>
            <span className="dot" /> {d}
          </span>
        ))}
      </div>
      <div className="herotv-log mono" aria-live="off">
        <span className="caret">›</span> {LOG[phase]}
      </div>
      <p className="herotv-credit">Image: Ring Developer Playground snapshot fetched through the Ring Partner API.</p>
    </div>
  )
}
