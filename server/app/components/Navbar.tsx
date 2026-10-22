'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const LINKS = [
  { href: '/#how', label: 'How it works' },
  { href: '/#why', label: 'Why' },
  { href: '/#honest', label: 'What’s real' },
  { href: '/#privacy', label: 'Privacy' },
]

export function Logo() {
  return (
    <span className="logo" aria-hidden="true">
      <span className="logo-dot" />
    </span>
  )
}

export default function Navbar() {
  const path = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [path])

  return (
    <header className={`nav ${scrolled ? 'nav-scrolled' : ''} ${open ? 'nav-open' : ''}`}>
      <div className="nav-inner">
        <Link href="/" className="brand" aria-label="DoorSignal home">
          <Logo />
          <span>DoorSignal</span>
        </Link>
        <nav className="nav-links" aria-label="Main">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
        </nav>
        <div className="nav-cta">
          <Link href="/tv" className="btn btn-ghost btn-sm" target="_blank">Open TV screen</Link>
          <Link href="/console" className={`btn btn-primary btn-sm ${path === '/console' ? 'is-active' : ''}`}>Console</Link>
        </div>
        <button className="nav-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span /><span />
        </button>
      </div>
      <div className="nav-sheet" hidden={!open}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
        ))}
        <Link href="/tv" target="_blank">Open TV screen</Link>
        <Link href="/console">Console</Link>
      </div>
    </header>
  )
}
