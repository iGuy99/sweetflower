'use client'

import { Heart, ChevronDown } from 'lucide-react'

interface Props {
  heroReady: boolean
}

export default function Hero({ heroReady }: Props) {
  return (
    <section className={`zara-hero${heroReady ? ' ready' : ''}`}>
      <p className="hero-pretitle">Pozivam te na</p>
      <h1 className="hero-name">Zarin</h1>
      <h2 className="hero-subtitle">7. Rođendan!</h2>

      <div className="hero-separator">
        <span className="hero-separator-line" />
        <Heart size={16} className="hero-separator-heart" fill="currentColor" />
        <span className="hero-separator-line" />
      </div>

      <p className="hero-tagline">
        Veselim se da zajedno proslavimo ovaj poseban dan!
      </p>

      <div className="hero-scroll-hint">
        <ChevronDown size={44} />
        <ChevronDown size={44} />
      </div>
    </section>
  )
}
