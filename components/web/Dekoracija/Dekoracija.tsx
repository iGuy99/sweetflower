import Reveal from '@/components/web/ui/Reveal/Reveal'
import { dekoracijaConfig as c } from './config'
import './Dekoracija.css'

export default function Dekoracija() {
  return (
    <section id="dekoracija" className="sf-section sf-dekoracija">
      <div className="sf-container">
        <Reveal as="header" className="sf-section__header">
          <span className="sf-section__eyebrow">{c.eyebrow}</span>
          <h2 className="sf-section__title">{c.title}</h2>
        </Reveal>

        <div className="sf-dekoracija__intro">
          {c.intro.map((paragraph, i) => (
            <Reveal key={i} as="p" delay={i * 80} className="sf-dekoracija__paragraph">
              {paragraph}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
