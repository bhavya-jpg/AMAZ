/* eslint-disable @next/next/no-img-element -- static screenshots of our own app, served from /public */
import Link from 'next/link'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import Reveal from './components/Reveal'

const THREAD = 'https://community-ring.sprinklr.com/t/flashing-or-strobing-light-system-for-hearing-impaired/7715'
const PIP = 'https://ring.com/support/articles/k9l04/Viewing-Your-Cameras-on-Fire-TV-with-Alexa'
const WCAG = 'https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html'

function Fn({ n }: { n: number }) {
  return <sup><a href={`#fn${n}`} aria-label={`Source ${n}`}>{n}</a></sup>
}

export default function Landing() {
  return (
    <>
      <Navbar />
      <Reveal />
      <main className="landing">
        {/* ---------- hero ---------- */}
        <section className="hero">
          <p className="eyebrow">For Deaf and hard-of-hearing households with a Ring doorbell</p>
          <h1 className="h1">Know when someone’s at the door.</h1>
          <p className="lead">
            DoorSignal turns a Ring doorbell press into a full‑screen alert, with the camera image, on every screen in your home. Motion is
            never mistaken for a visitor.
          </p>
          <div className="hero-ctas">
            <Link href="/console" className="btn btn-primary btn-lg">Try the live demo</Link>
            <a href="#how" className="btn btn-link btn-lg">How it works ›</a>
          </div>
          <figure className="hero-visual">
            <div className="tvframe">
              <div className="screen">
                <img src="/screens/tv-idle.jpg" alt="" width={1280} height={720} />
                <img
                  className="crossfade"
                  src="/screens/tv-alert.jpg"
                  alt="The DoorSignal TV screen showing a doorbell press full screen, with the Ring camera image"
                  width={1280}
                  height={720}
                />
              </div>
            </div>
            <div className="tvstand" aria-hidden="true" />
            <figcaption className="caption">
              Screenshots of the TV screen in this demo, before and after a simulated press. The camera image is a real Ring Developer
              Playground snapshot.
            </figcaption>
          </figure>
        </section>

        {/* ---------- problem ---------- */}
        <section id="why" className="section">
          <div className="problem">
            <div data-reveal>
              <h2 className="h2">The chime is a sound. Not everyone hears it.</h2>
              <blockquote className="pullquote">
                “My parents are Deaf and we have the Ring doorbell 2 set up! … It would be great if someone could come up with an idea for
                our hearing impaired compadres.”
                <cite>
                  Ring Community member <Fn n={1} />
                </cite>
              </blockquote>
            </div>
            <div className="stats" data-reveal>
              <div className="stat">
                <div className="stat-num">None</div>
                <p>Ring sells no light or vibration accessory for Deaf users. <Fn n={1} /></p>
              </div>
              <div className="stat">
                <div className="stat-num">15–30 s</div>
                <p>The lag people report for the usual workaround: routines that flash smart lights. <Fn n={1} /></p>
              </div>
              <div className="stat">
                <div className="stat-num">Motion too</div>
                <p>Those routines also fire on motion, so the lights flash when no one rang. <Fn n={1} /></p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- features ---------- */}
        <section className="section-alt">
          <div className="section" style={{ paddingTop: 56, paddingBottom: 56 }}>
            <div className="feature" data-reveal>
              <div className="feature-copy">
                <h2 className="h2">A press takes over the screen. Motion never does.</h2>
                <p>DoorSignal listens for Ring’s doorbell event, not a sound, and treats each kind of event differently.</p>
                <ul>
                  <li>Doorbell press: a full-screen alert that stays until someone acknowledges it.</li>
                  <li>Person on camera: a quiet “person nearby” screen, with no flash.</li>
                  <li className="no">Cars, birds, branches: logged, nothing on screen.</li>
                </ul>
              </div>
              <div className="tvframe">
                <div className="screen">
                  <img src="/screens/tv-badge.jpg" alt="The TV screen showing a quiet Person nearby notice for motion" width={1280} height={720} />
                </div>
              </div>
            </div>

            <div className="feature flip" data-reveal>
              <div className="feature-copy">
                <h2 className="h2">On every screen, at the same time.</h2>
                <p>
                  Pair the TV, a phone and a room light with a six-digit code. A press reaches all of them at once, so it doesn’t matter
                  which room you’re in.
                </p>
                <p>
                  The door alert flashes twice a second, under the three-per-second photosensitivity limit, and not at all if you’ve turned
                  on reduced motion. <Fn n={3} />
                </p>
              </div>
              <div className="pair">
                <div className="tvframe">
                  <div className="screen">
                    <img src="/screens/tv-alert.jpg" alt="The TV screen during a doorbell press" width={1280} height={720} />
                  </div>
                </div>
                <div className="phoneframe">
                  <img src="/screens/phone-alert.jpg" alt="The phone screen during the same doorbell press" width={390} height={844} />
                </div>
              </div>
            </div>

            <div className="feature stack" data-reveal>
              <div className="feature-copy">
                <h2 className="h2">Acknowledge once. Everything clears.</h2>
                <p>
                  Press OK on the remote or tap the phone, and every screen clears. The console records which screens showed the alert, how
                  long each took, and who acknowledged it.
                </p>
              </div>
              <div className="shot">
                <img src="/screens/console-timeline.jpg" alt="The console timeline listing a doorbell press, the screens it reached and the acknowledgement" width={1539} height={432} />
              </div>
            </div>
          </div>
        </section>

        {/* ---------- how ---------- */}
        <section id="how" className="section">
          <h2 className="h2" data-reveal>How it works</h2>
          <p className="lead" data-reveal>Four steps from the button to your screen, all on the Ring Partner API.</p>
          <ol className="steps" data-reveal>
            <li>
              <h3>Ring sends a press</h3>
              <p>A <code>button_press</code> webhook arrives. DoorSignal checks its HMAC-SHA256 signature and replies within Ring’s 5-second window.</p>
            </li>
            <li>
              <h3>DoorSignal decides</h3>
              <p>A press is a door alert. A person on camera is a quiet badge. Any other motion is only logged.</p>
            </li>
            <li>
              <h3>Every screen shows it</h3>
              <p>Paired screens get the alert over a live connection, with the latest camera image fetched from Ring.</p>
            </li>
            <li>
              <h3>One OK clears all</h3>
              <p>The first acknowledgement clears every screen and is written to the timeline.</p>
            </li>
          </ol>
        </section>

        {/* ---------- compare ---------- */}
        <section className="section-alt">
          <div className="section">
            <h2 className="h2" data-reveal>What already exists, and what’s missing.</h2>
            <div className="tablewrap" data-reveal>
              <table className="ctable">
                <thead>
                  <tr><th scope="col" /><th scope="col">Where it shows</th><th scope="col">Press vs. motion</th><th scope="col">Stays until seen</th></tr>
                </thead>
                <tbody>
                  <tr><th scope="row">Phone sound recognition (iOS, Android)</th><td>The phone, if it can hear the chime</td><td>Listens for the chime only</td><td>A notification</td></tr>
                  <tr><th scope="row">Ring Picture-in-Picture on Fire TV <Fn n={2} /></th><td>Top-right corner, select Echo Show and Fire TV models</td><td>Set up through Alexa announcements</td><td>Not documented</td></tr>
                  <tr><th scope="row">Smart-light routines <Fn n={1} /></th><td>Lights you’ve set up</td><td>Reported to fire on motion</td><td>No</td></tr>
                  <tr className="us"><th scope="row">DoorSignal</th><td>Full screen on every paired TV, phone and light</td><td>Only a press raises a door alert</td><td>Yes, until someone presses OK</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ---------- honest ---------- */}
        <section id="honest" className="section">
          <h2 className="h2" data-reveal>What’s real in this demo.</h2>
          <p className="lead" data-reveal>Everything that isn’t live Ring data is labelled, on this page and on screen.</p>
          <div className="tablewrap" data-reveal>
            <table className="ctable">
              <thead>
                <tr><th scope="col">Part</th><th scope="col">Status</th><th scope="col">Detail</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row">Ring Partner API</th><td><span className="tag tag-real">Real</span></td><td>Devices, status, capabilities, snapshots and WHEP live view, verified against the Ring Developer Playground.</td></tr>
                <tr><th scope="row">Webhook path</th><td><span className="tag tag-real">Real</span></td><td>Signature check, de-duplication, the press/motion policy and the fan-out to screens are the production code.</td></tr>
                <tr><th scope="row">The doorbell press</th><td><span className="tag tag-sim">Simulated</span></td><td>The Playground can’t send webhooks, so a simulator signs one in Ring’s documented format. Those alerts are labelled “SIMULATED” on screen.</td></tr>
                <tr><th scope="row">This hosted sandbox</th><td><span className="tag tag-sim">Replay</span></td><td>Playground tokens last 30 minutes, so the hosted demo replays responses recorded from the real Playground.</td></tr>
                <tr><th scope="row">Fire TV app</th><td><span className="tag tag-exp">Experimental</span></td><td>Builds in CI. Not yet run on a device. The web TV screen is what this demo uses.</td></tr>
                <tr><th scope="row">User testing</th><td><span className="tag tag-exp">Not yet</span></td><td>Deaf and hard-of-hearing users have not tested DoorSignal yet. That is the next step.</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------- privacy ---------- */}
        <section id="privacy" className="section-alt">
          <div className="section">
            <h2 className="h2" data-reveal>Private by design.</h2>
            <div className="grid4" data-reveal>
              <div><h3>No face recognition</h3><p>DoorSignal never identifies people. It shows the image and nothing more.</p></div>
              <div><h3>Tokens stay in memory</h3><p>Ring access tokens are never written to disk or to logs.</p></div>
              <div><h3>Images expire</h3><p>Camera images are deleted automatically. One button deletes everything.</p></div>
              <div><h3>Signed or rejected</h3><p>A webhook without a valid signature never reaches a screen.</p></div>
            </div>
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="band">
          <div className="section">
            <h2 className="h2">Try it in thirty seconds.</h2>
            <ol>
              <li>Open the <Link href="/tv" target="_blank">TV screen</Link> in a new window.</li>
              <li>Log in to the <Link href="/console">console</Link> and pair it with the code it shows.</li>
              <li>Press “Doorbell press”, then try motion.</li>
            </ol>
            <div className="hero-ctas">
              <Link href="/console" className="btn btn-primary btn-lg">Open the console</Link>
              <a href="https://github.com/bhavya-jpg/AMAZ" target="_blank" rel="noreferrer" className="btn btn-link btn-lg">Read the code ›</a>
            </div>
          </div>
        </section>

        <section className="footnotes" aria-label="Sources">
          <ol>
            <li id="fn1">Ring Community, <a href={THREAD} target="_blank" rel="noreferrer">“Flashing or strobing light system for hearing impaired”</a>. Figures are as reported by members of that thread.</li>
            <li id="fn2">Ring support, <a href={PIP} target="_blank" rel="noreferrer">“Viewing your cameras on Fire TV with Alexa”</a>: Picture-in-Picture appears “in the top right corner” on “select Echo Show and Fire TV models”.</li>
            <li id="fn3">W3C, <a href={WCAG} target="_blank" rel="noreferrer">WCAG 2.2 Success Criterion 2.3.1, Three Flashes or Below Threshold</a>.</li>
          </ol>
        </section>
      </main>
      <Footer />
    </>
  )
}
