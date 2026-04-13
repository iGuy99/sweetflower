'use client'

import ScheduleIcon from './ScheduleIcon'

interface ScheduleItem {
  time: string
  icon: string
  title: string
  description: string
}

interface Props {
  schedule: ScheduleItem[]
}

export default function Program({ schedule }: Props) {
  return (
    <section className="program-section">
      <h2 className="section-title" data-aos="fade-down">Program Dana</h2>
      <p className="section-subtitle" data-aos="fade" data-aos-delay="100">
        Šta smo planirali za vas
      </p>
      <div className="program-timeline">
        {schedule.map((item, index) => (
          <div key={index} className="program-item" data-aos="fade-up" data-aos-delay={index * 100}>
            <div className="program-time" data-aos="zoom-in" data-aos-delay={index * 100 + 50}>
              {item.time}
            </div>
            <div className="program-icon" data-aos="flip-left" data-aos-delay={index * 100 + 100}>
              <ScheduleIcon type={item.icon} />
            </div>
            <h4 className="program-title">{item.title}</h4>
            <p className="program-description">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
