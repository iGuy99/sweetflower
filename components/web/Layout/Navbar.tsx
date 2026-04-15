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
  const [pastCards, setPastCards] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!isHome) {
      setPastCards(false)
      return
    }
    const cards = document.querySelector('.sf-nav-cards')
    if (!cards) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const past =
          !entry.isIntersecting && entry.boundingClientRect.top < 0
        setPastCards(past)
      },
      { threshold: 0 },
    )

    observer.observe(cards)
    return () => observer.disconnect()
  }, [isHome, pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const navClass = [
    'sf-nav',
    scrolled || !isHome ? 'sf-nav--scrolled' : '',
    pastCards || !isHome ? 'sf-nav--past-cards' : '',
    !isHome ? 'sf-nav--solid' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <header className={navClass}>
        <div className="sf-nav__inner sf-container">
          <Link href={HOME_HREF} className="sf-nav__logo">
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
                    <span className="sf-nav__chev" aria-hidden>
                      ▾
                    </span>
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

      <div
        className={`sf-mobile-menu ${menuOpen ? 'is-open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className="sf-mobile-menu__brand">{LOGO_TEXT}</div>
        <div className="sf-mobile-menu__grid">
          {SECTION_CARDS.map((card) => (
            <Link
              key={card.id}
              href={card.href}
              className="sf-mobile-card"
              onClick={() => setMenuOpen(false)}
            >
              <span className="sf-mobile-card__label">{card.label}</span>
              <span className="sf-mobile-card__desc">{card.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
