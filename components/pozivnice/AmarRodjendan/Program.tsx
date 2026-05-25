const SCHEDULE = [
  {
    time: '15:00',
    title: 'Dolazak',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 12s0-3.5 5-3.5 5 3.5 5 3.5" stroke="#3a2e22" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="7" cy="5" r="2.5" stroke="#3a2e22" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    time: '15:30',
    title: 'Ručak',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 10h10M4 10V7a3 3 0 016 0v3" stroke="#3a2e22" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M5.5 7h3" stroke="#3a2e22" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    time: '16:00',
    title: 'Slikanje',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="2" y="3" width="10" height="8" rx="1.5" stroke="#3a2e22" strokeWidth="1.3" />
        <circle cx="7" cy="7" r="2" stroke="#3a2e22" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    time: '16:30',
    title: 'Zabava i igra',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M7 2l1.2 2.5 2.8.4-2 2 .5 2.8L7 8.5l-2.5 1.2.5-2.8-2-2 2.8-.4L7 2z"
          stroke="#3a2e22" strokeWidth="1.2"
        />
      </svg>
    ),
  },
]

export default function Program() {
  return (
    <section className="program-section">
      <img
        className="program-bg"
        src="/pozivnice/AmarRodjendan/amar-party-hat.jpg"
        alt=""
      />

      <div className="program-inner">
        <div className="program-header">
          <div className="sec-eyebrow" style={{ color: 'rgb(43,58,40)' }} data-aos="fade-down">
            31. maj 2026.
          </div>
          <h2 className="sec-title" style={{ color: 'rgb(43,58,40)' }} data-aos="fade-down" data-aos-delay="80">
            Program
          </h2>
          <p className="sec-sub" style={{ color: 'rgb(43,58,40)', marginBottom: 20 }} data-aos="fade" data-aos-delay="150">
            Šta smo pripremili za vas
          </p>
        </div>

        <div className="program-timeline">
          {SCHEDULE.map(({ time, title, icon }, i) => (
            <div
              key={time}
              className="prog-item"
              data-aos="fade-right"
              data-aos-delay={200 + i * 80}
            >
              <span className="prog-time" style={{ fontSize: 20 }}>{time}</span>
              <div className="prog-icon">{icon}</div>
              <div>
                <div className="prog-title">{title}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
