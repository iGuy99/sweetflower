'use client'

import Link from 'next/link'
import Reveal from '@/components/web/ui/Reveal/Reveal'
import { SECTION_CARDS } from './navConfig'
import './MobileNavCards.css'

export default function MobileNavCards() {
  return (
    <section className="sf-nav-cards" aria-label="Glavna navigacija">
      <div className="sf-container">
        <Reveal className="sf-nav-cards__header" as="header">
          <span className="sf-nav-cards__eyebrow">Istražite</span>
          <h2 className="sf-nav-cards__title">Gdje dalje?</h2>
        </Reveal>

        <div className="sf-nav-cards__grid">
          {SECTION_CARDS.map((card, i) => (
            <Reveal key={card.id} delay={i * 90}>
              <Link href={card.href} className="sf-nav-card">
                <span className="sf-nav-card__label">{card.label}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
