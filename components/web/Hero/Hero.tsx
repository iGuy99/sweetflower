import Link from 'next/link'
import { heroConfig } from './config'
import './Hero.css'

export default function Hero() {
  return (
    <section className="sf-hero" id="top">
      {heroConfig.imageSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="sf-hero__bg-img"
          src={heroConfig.imageSrc}
          alt=""
          aria-hidden
        />
      )}
      <div className="sf-hero__scrim" aria-hidden />

      <div className="sf-hero__inner sf-container">
        {/* Left column: eyebrow + headline */}
        <div className="sf-hero__left">
          <p className="sf-hero__eyebrow sf-hero__fade sf-hero__fade--1">
            {heroConfig.eyebrow}
          </p>
          <h1 className="sf-hero__headline sf-hero__fade sf-hero__fade--2">
            {heroConfig.headline.map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </h1>
        </div>

        {/* Right column: lede + ctas */}
        <div className="sf-hero__right sf-hero__fade sf-hero__fade--3">
          <p className="sf-hero__lede">{heroConfig.lede}</p>
          <div className="sf-hero__ctas">
            <Link href={heroConfig.ctaSecondary.href} className="sf-hero__cta sf-hero__cta--secondary">
              {heroConfig.ctaSecondary.label}
            </Link>
            <Link href={heroConfig.ctaPrimary.href} className="sf-hero__cta sf-hero__cta--primary">
              {heroConfig.ctaPrimary.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
