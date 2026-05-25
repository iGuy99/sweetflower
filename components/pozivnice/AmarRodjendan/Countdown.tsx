'use client'

import { useState, useEffect } from 'react'

const TARGET = new Date('2026-05-31T15:00:00')

export default function Countdown() {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 })

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, TARGET.getTime() - Date.now())
      setTime({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <section className="countdown-section">
      <div className="sec-eyebrow" data-aos="fade-down">odbrojavanje</div>
      <h2 className="sec-title" data-aos="fade-down" data-aos-delay="80">Do Amarovog</h2>
      <p className="sec-sub" data-aos="fade" data-aos-delay="150">prvog rođendana</p>

      <div className="event-card" data-aos="fade-up" data-aos-delay="200">
        <div className="event-item">
          <div className="event-icon" style={{ width: 34, height: 34 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="2" width="12" height="11" rx="2" stroke="#2b4028" strokeWidth="1.4" />
              <path d="M1 5.5h12" stroke="#2b4028" strokeWidth="1.4" />
              <path d="M4 1v2M10 1v2" stroke="#2b4028" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <span className="event-label" style={{ fontSize: 12 }}>Datum</span>
          <span className="event-value" style={{ fontSize: 20, width: 107 }}>31. Maj 2026.</span>
        </div>
        <div className="event-divider" />
        <div className="event-item">
          <div className="event-icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#2b4028" strokeWidth="1.4" />
              <path d="M7 4v3.5l2.5 1.5" stroke="#2b4028" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <span className="event-label">Početak</span>
          <span className="event-value">15:00h</span>
        </div>
      </div>

      <div className="cd-grid">
        {[
          { num: pad(time.d), label: 'Dana', delay: 250 },
          { num: pad(time.h), label: 'Sati', delay: 330 },
          { num: pad(time.m), label: 'Minuta', delay: 410 },
          { num: pad(time.s), label: 'Sekundi', delay: 490 },
        ].map(({ num, label, delay }) => (
          <div key={label} className="cd-item" data-aos="zoom-in" data-aos-delay={delay}>
            <span className="cd-num">{num}</span>
            <span className="cd-label">{label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
