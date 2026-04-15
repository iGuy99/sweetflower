import Reveal from '@/components/web/ui/Reveal/Reveal'
import { portfolioConfig as c } from './config'
import './Portfolio.css'

export default function Portfolio() {
  return (
    <section id="portfolio" className="sf-section sf-portfolio">
      <div className="sf-container">
        <Reveal as="header" className="sf-section__header">
          <span className="sf-section__eyebrow">{c.eyebrow}</span>
          <h2 className="sf-section__title">{c.title}</h2>
          <p className="sf-section__lede">{c.lede}</p>
        </Reveal>
        <Reveal className="sf-placeholder-note" delay={100}>
          {c.placeholder}
        </Reveal>
      </div>
    </section>
  )
}
