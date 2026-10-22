import Link from 'next/link'
import Footer from './components/Footer'
import HeroTv from './components/HeroTv'
import Navbar from './components/Navbar'
import Reveal from './components/Reveal'
import Spotlight from './components/Spotlight'

const MARQUEE = ['press ≠ motion', 'full screen', 'every screen at once', 'one OK clears all', 'no face recognition', 'built on the Ring Partner API']

export default function Landing() {
  return (
    <>
      <Navbar />
      <Reveal />
      <Spotlight />
      <main className="landing">
        {/* ---------- hero ---------- */}
        <section className="hero">
          <div className="hero-bg" aria-hidden="true">
            <span className="ripple r1" /><span className="ripple r2" /><span className="ripple r3" />
          </div>
          <div className="hero-copy">
            <p className="eyebrow" data-reveal>
              <span className="pulse-dot" /> Ring track · Amazon Developer Hackathon 2026
            </p>
            <h1 className="display" aria-label="See the door.">
              <span className="line"><span className="word" style={{ ['--d' as string]: '0ms' }}>See</span> <span className="word" style={{ ['--d' as string]: '90ms' }}>the</span></span>
              <span className="line"><em className="word serif" style={{ ['--d' as string]: '180ms' }}>door.</em></span>
            </h1>
            <p className="lede" data-reveal>
              When your Ring doorbell is pressed, the screen you&apos;re watching tells you — full screen, with the camera image, on every screen
              in the house. Motion never does. Built for Deaf and hard-of-hearing households.
            </p>
            <div className="hero-ctas" data-reveal>
              <Link href="/console" className="btn btn-primary btn-lg">Try the live demo <span aria-hidden="true">→</span></Link>
              <Link href="/tv" target="_blank" className="btn btn-ghost btn-lg">Open the TV screen</Link>
            </div>
          </div>
          <div className="hero-visual" data-reveal>
            <HeroTv />
          </div>
        </section>

        {/* ---------- marquee ---------- */}
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[...MARQUEE, ...MARQUEE, ...MARQUEE].map((m, i) => (
              <span key={i}>{m}<i>✦</i></span>
            ))}
          </div>
        </div>

        {/* ---------- problem ---------- */}
        <section id="why" className="section">
          <p className="kicker" data-reveal>01 — The problem</p>
          <blockquote className="quote" data-reveal>
            “My parents are Deaf and we have the Ring doorbell 2 set up! … It would be great if someone could come up with an idea for our
            hearing impaired compadres.”
            <cite>
              — Ring Community,{' '}
              <a href="https://community-ring.sprinklr.com/t/flashing-or-strobing-light-system-for-hearing-impaired/7715" target="_blank" rel="noreferrer">
                “Flashing or strobing light system for hearing impaired”
              </a>
            </cite>
          </blockquote>
          <div className="facts">
            <div className="fact spot" data-reveal>
              <div className="fact-num">0</div>
              <p>light or vibration accessories from Ring for Deaf users, per a Ring representative.</p>
            </div>
            <div className="fact spot" data-reveal>
              <div className="fact-num">15–30<small>s</small></div>
              <p>delay users report for the common workaround: routines that flash smart lights.</p>
            </div>
            <div className="fact spot" data-reveal>
              <div className="fact-num">≠</div>
              <p>Those routines fire on motion too — so the lights flash for a passing car.</p>
            </div>
          </div>
        </section>

        {/* ---------- how ---------- */}
        <section id="how" className="section how">
          <div className="how-sticky">
            <p className="kicker" data-reveal>02 — How it works</p>
            <h2 className="h2" data-reveal>The press itself, <em className="serif">not a sound,</em> reaches you.</h2>
          </div>
          <ol className="steps">
            {[
              ['Ring sends a button_press', 'A signed webhook arrives. DoorSignal verifies the HMAC-SHA256 X-Signature on the raw bytes and answers within Ring’s 5-second window.'],
              ['DoorSignal decides', 'A press is a door alert. A person on camera is a quiet badge. Every other motion — birds, cars, branches — is only logged.'],
              ['Every screen, at once', 'TV, phone and room light show it together: full screen, the latest Ring camera image, a 2 Hz flash that stays until someone acknowledges.'],
              ['One OK clears all', 'Press OK on the remote — or tap the phone — and every screen clears. The timeline records who saw it and how fast.'],
            ].map(([t, d], i) => (
              <li key={t} className="step spot" data-reveal>
                <span className="step-n">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- bento ---------- */}
        <section className="section">
          <p className="kicker" data-reveal>03 — Built for people who can’t hear the chime</p>
          <div className="bento">
            <article className="tile tile-wide spot" data-reveal>
              <h3>Full screen. Stays until you’ve seen it.</h3>
              <p>Not a corner thumbnail that fades. A DOORBELL card that holds the screen until it’s acknowledged.</p>
              <div className="mini-alert" aria-hidden="true"><span>DOORBELL</span><small>Front door · press OK</small></div>
            </article>
            <article className="tile tile-tall tile-photo spot" data-reveal>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ring-playground-snapshot.jpg" alt="A package at a front door, from the Ring Developer Playground" />
              <div className="tile-photo-cap">
                <h3>See who — or what — is there</h3>
                <p>The latest Ring camera image, fetched through the Ring Partner API. Never face recognition.</p>
              </div>
            </article>
            <article className="tile spot" data-reveal>
              <h3>Press ≠ motion</h3>
              <p>Only a doorbell press takes over the screen.</p>
              <div className="chips"><span className="chip chip-door">PRESS → ALERT</span><span className="chip">BIRD → LOG</span></div>
            </article>
            <article className="tile spot" data-reveal>
              <h3>Every screen</h3>
              <p>TV, phone, room light — paired with a 6-digit code.</p>
              <div className="screens" aria-hidden="true"><i /><i /><i /></div>
            </article>
            <article className="tile tile-wide spot" data-reveal>
              <h3>Safe flash</h3>
              <p>2 flashes per second — under the 3 Hz photosensitivity threshold — and none at all with reduced motion.</p>
            </article>
            <article className="tile tile-wide spot" data-reveal>
              <h3>Measured, not claimed</h3>
              <p>Every alert records when each screen rendered it. You see the latency; we don’t guess it.</p>
            </article>
          </div>
        </section>

        {/* ---------- compare ---------- */}
        <section className="section">
          <p className="kicker" data-reveal>04 — Why not what already exists</p>
          <div className="compare" data-reveal>
            <div className="crow chead"><span /><span>Hears the chime?</span><span>Press vs motion</span><span>Every screen</span><span>Stays until seen</span></div>
            {[
              ['Phone sound recognition (iOS / Android)', 'needs to', '—', 'phone only', '—'],
              ['Fire TV Ring Picture-in-Picture', 'audio announcement', 'setting', 'select models', 'corner feed'],
              ['Smart-light routines', 'no', 'fires on motion', 'lights', '—'],
              ['DoorSignal', 'not needed', '✓', '✓', '✓'],
            ].map((r) => (
              <div key={r[0]} className={`crow ${r[0] === 'DoorSignal' ? 'cus' : ''}`}>
                {r.map((c, i) => <span key={i}>{c}</span>)}
              </div>
            ))}
          </div>
          <p className="muted small" data-reveal>
            Sources: Ring support (“select Echo Show and Fire TV models”, “top right corner”), Ring Community reports. Deaf users have not yet
            validated DoorSignal — that is our next step.
          </p>
        </section>

        {/* ---------- honest ---------- */}
        <section id="honest" className="section">
          <p className="kicker" data-reveal>05 — What’s real, and what’s simulated</p>
          <h2 className="h2" data-reveal>No staged screenshots. <em className="serif">Labelled</em> simulations.</h2>
          <div className="honest">
            <div className="hcard spot" data-reveal>
              <span className="badge badge-real">REAL</span>
              <h3>Ring Partner API</h3>
              <p>Devices, status, capabilities, image snapshots and WHEP live view — verified against the Ring Developer Playground.</p>
            </div>
            <div className="hcard spot" data-reveal>
              <span className="badge badge-real">REAL</span>
              <h3>The webhook path</h3>
              <p>Signature verification, idempotency, the policy and the fan-out are the production code path.</p>
            </div>
            <div className="hcard spot" data-reveal>
              <span className="badge badge-sim">SIMULATED</span>
              <h3>The doorbell press</h3>
              <p>The Playground can’t send button_press webhooks, so a labelled simulator signs one in Ring’s documented format.</p>
            </div>
            <div className="hcard spot" data-reveal>
              <span className="badge badge-sim">REPLAY</span>
              <h3>This hosted sandbox</h3>
              <p>Playground tokens last 30 minutes, so it replays responses recorded from the real Playground.</p>
            </div>
          </div>
        </section>

        {/* ---------- privacy ---------- */}
        <section id="privacy" className="section privacy" data-reveal>
          <p className="kicker">06 — Privacy by design</p>
          <ul className="plist">
            <li><b>No face recognition.</b> DoorSignal never identifies people.</li>
            <li><b>Tokens in memory only.</b> Ring tokens are never stored or logged.</li>
            <li><b>Images expire.</b> Deleted automatically; one click deletes everything.</li>
            <li><b>Signed or rejected.</b> Unsigned webhooks never reach a screen.</li>
          </ul>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="section cta" data-reveal>
          <h2 className="h2">Try it in <em className="serif">thirty seconds.</em></h2>
          <ol className="cta-steps">
            <li>Open the <Link href="/tv" target="_blank">TV screen</Link> in a second window.</li>
            <li>Open the <Link href="/console">console</Link> and pair it with the code it shows.</li>
            <li>Press <b>Doorbell press</b>. Then try a bird.</li>
          </ol>
          <div className="hero-ctas">
            <Link href="/console" className="btn btn-primary btn-lg">Open the console <span aria-hidden="true">→</span></Link>
            <a href="https://github.com/bhavya-jpg/AMAZ" target="_blank" rel="noreferrer" className="btn btn-ghost btn-lg">Read the code</a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
