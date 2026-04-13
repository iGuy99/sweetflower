'use client'

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
    <section className="countdown-section" id="countdown">
      <h2 className="section-title" data-aos="fade-down">
        Odbrojavanje
      </h2>
      <p className="section-subtitle" data-aos="fade" data-aos-delay="100">
        Do najboljeg derneka 2026.!
      </p>
      <div className="countdown-grid">
        <div className="countdown-item" data-aos="zoom-in" data-aos-delay="0">
          <div className="countdown-number">{String(countdown.days).padStart(2, '0')}</div>
          <div className="countdown-label">DANA</div>
        </div>
        <div className="countdown-item" data-aos="zoom-in" data-aos-delay="100">
          <div className="countdown-number">{String(countdown.hours).padStart(2, '0')}</div>
          <div className="countdown-label">SATI</div>
        </div>
        <div className="countdown-item" data-aos="zoom-in" data-aos-delay="200">
          <div className="countdown-number">{String(countdown.minutes).padStart(2, '0')}</div>
          <div className="countdown-label">MINUTA</div>
        </div>
        <div className="countdown-item" data-aos="zoom-in" data-aos-delay="300">
          <div className="countdown-number">{String(countdown.seconds).padStart(2, '0')}</div>
          <div className="countdown-label">SEKUNDI</div>
        </div>
      </div>
    </section>
  )
}
