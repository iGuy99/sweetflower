'use client'

import { ChevronDown } from 'lucide-react'

interface Props {
  couple: { partner1: string; partner2: string; tagline: string }
  date: { full: string }
  onScrollToRSVP: () => void
  heroReady: boolean
}

export default function Hero({ couple, date, onScrollToRSVP, heroReady }: Props) {
  return (
    <section
      id="hero"
      className={`hero${heroReady ? ' hero-ready' : ''}`}
      style={{ backgroundImage: 'url(/pozivnice/AmilaEmir/hero.jpg)' }}
    >
      <div className="hero-content">
        <p className="hero-tagline">{couple.tagline}</p>
        <h1 className="hero-names">
          <span className="hero-name-first">{couple.partner1}</span>
          <span className="hero-ampersand">&</span>
          <span className="hero-name-second">{couple.partner2}</span>
        </h1>
        <div className="hero-divider"></div>
        <p className="hero-date">{date.full}</p>
      </div>
      <div className="scroll-indicator" onClick={onScrollToRSVP}>
        <span>POTVRDITE DOLAZAK</span>
        <ChevronDown size={24} />
      </div>
    </section>
  )
}
