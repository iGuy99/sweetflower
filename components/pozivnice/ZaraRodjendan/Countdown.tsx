'use client'

import { CalendarHeart, Clock } from 'lucide-react'

interface CountdownState {
  days: number
  hours: number
  minutes: number
  seconds: number
}

interface Props {
  countdown: CountdownState
}

export default function Countdown({ countdown }: Props) {
  return (
    <section className="zara-section" id="countdown">
      <h2 className="zara-section-title" data-aos="fade-down">Odbrojavanje</h2>
      <p className="zara-section-subtitle" data-aos="fade" data-aos-delay="100">
        Do Zarinog 7. rođendana!
      </p>

      <div className="zara-event-info" data-aos="fade-up" data-aos-delay="150">
        <div className="zara-event-info-item">
          <CalendarHeart size={18} className="zara-event-info-icon" />
          <span className="zara-event-info-label">Datum</span>
          <span className="zara-event-info-value">29. April 2026.</span>
        </div>
        <div className="zara-event-info-divider" />
        <div className="zara-event-info-item">
          <Clock size={18} className="zara-event-info-icon" />
          <span className="zara-event-info-label">Početak</span>
          <span className="zara-event-info-value">18:00h</span>
        </div>
      </div>

      <div className="zara-countdown-grid">
        <div className="zara-countdown-item" data-aos="zoom-in" data-aos-delay="200">
          <span className="zara-countdown-number">{String(countdown.days).padStart(2, '0')}</span>
          <span className="zara-countdown-label">Dana</span>
        </div>
        <div className="zara-countdown-item" data-aos="zoom-in" data-aos-delay="300">
          <span className="zara-countdown-number">{String(countdown.hours).padStart(2, '0')}</span>
          <span className="zara-countdown-label">Sati</span>
        </div>
        <div className="zara-countdown-item" data-aos="zoom-in" data-aos-delay="400">
          <span className="zara-countdown-number">{String(countdown.minutes).padStart(2, '0')}</span>
          <span className="zara-countdown-label">Minuta</span>
        </div>
        <div className="zara-countdown-item" data-aos="zoom-in" data-aos-delay="500">
          <span className="zara-countdown-number">{String(countdown.seconds).padStart(2, '0')}</span>
          <span className="zara-countdown-label">Sekundi</span>
        </div>
      </div>
    </section>
  )
}
