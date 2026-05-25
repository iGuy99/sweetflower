'use client'

import { useState, useEffect, useRef } from 'react'

const SLIDES = [
  '/pozivnice/AmarRodjendan/cake1.jpg',
  '/pozivnice/AmarRodjendan/cake2.jpg',
  '/pozivnice/AmarRodjendan/cake3.jpg',
  '/pozivnice/AmarRodjendan/cake4.jpg',
  '/pozivnice/AmarRodjendan/cake5.jpg',
  '/pozivnice/AmarRodjendan/cake6.jpg',
  '/pozivnice/AmarRodjendan/cake7.jpg',
  '/pozivnice/AmarRodjendan/cake8.jpg',
  '/pozivnice/AmarRodjendan/cake-after.jpg',
]

type State = 'teaser' | 'playing' | 'replay'

export default function CakeCarousel() {
  const [state, setState] = useState<State>('teaser')
  const [idx, setIdx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const advance = () => {
    setIdx(prev => {
      const next = prev + 1
      if (next >= SLIDES.length) {
        clearTimer()
        setState('replay')
        return prev
      }
      return next
    })
  }

  const startShow = () => {
    setState('playing')
    setIdx(0)
    clearTimer()
    timerRef.current = setInterval(advance, 2800)
  }

  const replay = () => {
    setState('playing')
    setIdx(0)
    clearTimer()
    timerRef.current = setInterval(advance, 2800)
  }

  const handleTap = () => {
    if (state !== 'playing') return
    clearTimer()
    advance()
    if (idx + 1 < SLIDES.length) {
      timerRef.current = setInterval(advance, 2800)
    }
  }

  useEffect(() => () => clearTimer(), [])

  return (
    <section className="carousel-section">
      <p className="carousel-intro" data-aos="fade-down">U 17h jedemo moju drugu tortu!</p>

      <div
        className="carousel-frame"
        data-aos="fade-up"
        data-aos-delay="150"
        onClick={state === 'teaser' ? startShow : handleTap}
      >
        {/* Always in DOM so browser loads all images immediately */}
        <div className="carousel-slides">
          {SLIDES.map((src, i) => (
            <img
              key={src}
              className={`c-slide${i === idx ? ' active' : ''}`}
              src={src}
              alt=""
            />
          ))}
        </div>

        {state === 'teaser' && (
          <div className="carousel-teaser">
            <div className="teaser-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="13" stroke="rgba(43,58,40,0.35)" strokeWidth="1.5" />
                <path d="M11 9.5l9 4.5-9 4.5V9.5z" fill="#2b3a28" opacity="0.7" />
              </svg>
            </div>
            <p className="teaser-title">
              Prvu sam pojeo sam —<br />niko mi nije rekao<br />da ne smijem.
            </p>
            <p className="teaser-sub">Pritisni i gledaj</p>
          </div>
        )}

        {state === 'replay' && (
          <div className="cake-replay" onClick={e => { e.stopPropagation(); replay() }}>
            <div className="replay-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M8 14A8 8 0 1 0 14 6" stroke="#2b3a28" strokeWidth="2" strokeLinecap="round" />
                <path d="M14 2v4l-3.5-2L14 2z" fill="#2b3a28" />
              </svg>
            </div>
            <p className="replay-text">pogledaj ponovo</p>
          </div>
        )}

        {state === 'playing' && (
          <div className="carousel-dots">
            {SLIDES.map((_, i) => (
              <span key={i} className={`c-dot${i === idx ? ' active' : ''}`} />
            ))}
          </div>
        )}
      </div>

      <p className="carousel-caption">Tapni za sljedeću fotku</p>
    </section>
  )
}
