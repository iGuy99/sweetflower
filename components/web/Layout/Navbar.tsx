'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { HOME_HREF, LOGO_TEXT, NAV_LINKS, SECTION_CARDS } from './navConfig'
import './Navbar.css'

export default function Navbar() {
  const pathname = usePathname()
  const isHome = pathname === '/'

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const navClass = [
    'sf-nav',
    scrolled ? 'sf-nav--scrolled' : '',
    !isHome ? 'sf-nav--solid' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <header className={navClass}>
        <div className="sf-nav__inner sf-container">
          <Link href={HOME_HREF} className="sf-nav__logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 21C12 21 3 14.5 3 8.5a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 12.5-9 12.5z" />
            </svg>
            {LOGO_TEXT}
          </Link>

          <nav className="sf-nav__desktop" aria-label="Glavna navigacija">
            {NAV_LINKS.map((link) => (
              <div
                key={link.id}
                className={`sf-nav__item ${link.children ? 'sf-nav__item--has-children' : ''}`}
              >
                <Link href={link.href}>
                  {link.label}
                  {link.children && (
                    <span className="sf-nav__chev" aria-hidden>▾</span>
                  )}
                </Link>
                {link.children && (
                  <div className="sf-nav__dropdown">
                    {link.children.map((child) => (
                      <Link key={child.id} href={child.href}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <Link href="/kontakt" className="sf-nav__cta">
            Zakažite termin
          </Link>

          <button
            className={`sf-nav__burger ${menuOpen ? 'is-open' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Zatvori meni' : 'Otvori meni'}
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {/* Backdrop */}
      <div
        className={`sf-drawer-backdrop ${menuOpen ? 'is-open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden
      />

      {/* Side drawer */}
      <nav
        className={`sf-drawer ${menuOpen ? 'is-open' : ''}`}
        aria-label="Mobilna navigacija"
        aria-hidden={!menuOpen}
      >
        <div className="sf-drawer__header">
          <Link href={HOME_HREF} className="sf-drawer__brand" onClick={() => setMenuOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 21C12 21 3 14.5 3 8.5a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 12.5-9 12.5z" />
            </svg>
            {LOGO_TEXT}
          </Link>
          <button
            className="sf-drawer__close"
            onClick={() => setMenuOpen(false)}
            aria-label="Zatvori meni"
          >
            ✕
          </button>
        </div>

        <div className="sf-drawer__links">
          {SECTION_CARDS.map((card, i) => (
            <Link
              key={card.id}
              href={card.href}
              className="sf-drawer__link"
              style={{ animationDelay: menuOpen ? `${i * 60 + 120}ms` : '0ms' }}
              onClick={() => setMenuOpen(false)}
            >
              <span className="sf-drawer__link-label">{card.label}</span>
              <span className="sf-drawer__link-arrow" aria-hidden>→</span>
            </Link>
          ))}
        </div>

        <div className="sf-drawer__footer">
          <Link href="/kontakt" className="sf-drawer__cta" onClick={() => setMenuOpen(false)}>
            Zakažite termin
          </Link>
        </div>
      </nav>
    </>
  )
}
