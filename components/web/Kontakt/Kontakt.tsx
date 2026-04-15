import Reveal from '@/components/web/ui/Reveal/Reveal'
import { kontaktConfig as c } from './config'
import './Kontakt.css'

export default function Kontakt() {
  return (
    <section id="kontakt" className="sf-section sf-kontakt">
      <div className="sf-container">
        <Reveal as="header" className="sf-section__header">
          <span className="sf-section__eyebrow">{c.eyebrow}</span>
          <h2 className="sf-section__title">{c.title}</h2>
          <p className="sf-section__lede">{c.lede}</p>
        </Reveal>

        <Reveal className="sf-placeholder-note" delay={100}>
          {c.contactPlaceholder}
        </Reveal>

        <Reveal as="header" className="sf-section__header sf-section__header--inner" delay={160}>
          <h3 className="sf-section__title sf-section__title--sub">{c.upitnikTitle}</h3>
          <p className="sf-section__lede">{c.upitnikLede}</p>
        </Reveal>

        <Reveal className="sf-placeholder-note" delay={200}>
          {c.upitnikPlaceholder}
        </Reveal>
      </div>
    </section>
  )
}
