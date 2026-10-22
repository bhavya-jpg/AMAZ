import Link from 'next/link'
import { Logo } from './Navbar'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <div className="brand"><Logo /><span>DoorSignal</span></div>
          <p className="muted">
            Visual-first Ring doorbell alerts for Deaf and hard-of-hearing households. Built for the Amazon Developer Hackathon 2026 — Ring track.
          </p>
        </div>
        <div>
          <h4>Product</h4>
          <Link href="/console">Console</Link>
          <Link href="/tv" target="_blank">TV screen</Link>
          <Link href="/phone" target="_blank">Phone screen</Link>
          <Link href="/light" target="_blank">Light screen</Link>
        </div>
        <div>
          <h4>Project</h4>
          <a href="https://github.com/bhavya-jpg/AMAZ" target="_blank" rel="noreferrer">Source on GitHub</a>
          <a href="https://github.com/bhavya-jpg/AMAZ/blob/claude/sleepy-heisenberg-2k4b1w/FRICTION_LOG.md" target="_blank" rel="noreferrer">Friction log</a>
          <a href="https://developer.amazon.com/docs/ring/api-documentation.html" target="_blank" rel="noreferrer">Ring Partner API</a>
        </div>
        <div>
          <h4>Honest small print</h4>
          <p className="muted small">
            Not a safety or emergency device. No face recognition. Not affiliated with or endorsed by Ring or Amazon. Ring is a trademark of
            Ring LLC.
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 DoorSignal contributors · MIT License</span>
        <span>Built on the Ring Partner API</span>
      </div>
    </footer>
  )
}
