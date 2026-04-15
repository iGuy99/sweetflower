import { heroConfig } from './config'
import './Hero.css'

export default function Hero() {
  return (
    <section className="sf-hero" id="top">
      {heroConfig.videoSrc ? (
        <video
          className="sf-hero__video"
          src={heroConfig.videoSrc}
          poster={heroConfig.posterSrc || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        />
      ) : (
        <div className="sf-hero__bg" aria-hidden />
      )}
      <div className="sf-hero__scrim" aria-hidden />

      <div className="sf-hero__inner">
        <h1 className="sf-hero__logo sf-hero__fade sf-hero__fade--1">
          <span>{heroConfig.logoLine1}</span>
          <span className="sf-hero__logo-divider" aria-hidden />
          <span>{heroConfig.logoLine2}</span>
        </h1>

        <div className="sf-hero__center">
          <p className="sf-hero__headline sf-hero__fade sf-hero__fade--2">
            {heroConfig.headline.split('\n').map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </p>
          <p className="sf-hero__subtitle sf-hero__fade sf-hero__fade--3">
            {heroConfig.subtitle}
          </p>
        </div>

        <div className="sf-hero__scroll sf-hero__fade sf-hero__fade--4" aria-hidden>
          <span>{heroConfig.scrollHint}</span>
          <span className="sf-hero__scroll-line" />
        </div>
      </div>
    </section>
  )
}
