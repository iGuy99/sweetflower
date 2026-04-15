import Reveal from '@/components/web/ui/Reveal/Reveal'
import { faqConfig as c } from './config'
import './FAQ.css'

export default function FAQ() {
  return (
    <section id="faq" className="sf-section sf-faq">
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
