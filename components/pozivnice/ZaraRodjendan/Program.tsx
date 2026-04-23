'use client'

import { Users, Sparkles, Cake } from 'lucide-react'

const SCHEDULE = [
  {
    time: '18:00',
    icon: <Users size={20} />,
    title: 'Dolazak',
    desc: 'Dobrodošli mali gosti!',
  },
  {
    time: '18:30',
    icon: <Sparkles size={20} />,
    title: 'Igra na napuhancu i terenu',
    desc: 'Zabava i igre za sve!',
  },
  {
    time: '19:00',
    icon: <Cake size={20} />,
    title: 'Torta',
    desc: 'Pušemo svjećice zajedno!',
  },
]

export default function Program() {
  return (
    <section className="zara-section">
      <h2 className="zara-section-title" data-aos="fade-down">Program Rođendana</h2>
      <p className="zara-section-subtitle" data-aos="fade" data-aos-delay="100">
        Šta smo pripremili za vas
      </p>

      <div className="zara-program-timeline">
        {SCHEDULE.map((item, i) => (
          <div
            key={i}
            className="zara-program-item"
            data-aos="fade-up"
            data-aos-delay={i * 100}
          >
            <div className="zara-program-time">{item.time}</div>
            <div className="zara-program-icon">{item.icon}</div>
            <div>
              <div className="zara-program-title">{item.title}</div>
              <div className="zara-program-desc">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
