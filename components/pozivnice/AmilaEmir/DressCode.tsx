'use client'

import { PiDiscoBallBold } from 'react-icons/pi'

interface Props {
  dressCode: { type: string }
  dressCodeNotes: string[]
}

export default function DressCode({ dressCode, dressCodeNotes }: Props) {
  return (
    <section className="dresscode-section">
      <h2 className="section-title" data-aos="fade-down">Dress Code</h2>
      <div className="dresscode-card" data-aos="zoom-in" data-aos-delay="100">
        <div className="dresscode-icon" data-aos="flip-up" data-aos-delay="300">
          <PiDiscoBallBold size={28} />
        </div>
        <h4 className="dresscode-type">{dressCode.type}</h4>
      </div>
      {dressCodeNotes.map((note, index) => (
        <p key={index} className="dresscode-note" data-aos="fade-up" data-aos-delay={400 + index * 100}>
          {note}
        </p>
      ))}
    </section>
  )
}
