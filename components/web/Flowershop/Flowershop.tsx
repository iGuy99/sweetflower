import Reveal from '@/components/web/ui/Reveal/Reveal'
import { flowershopConfig as c } from './config'
import './Flowershop.css'

export default function Flowershop() {
  return (
    <section id="flowershop" className="sf-section sf-flowershop">
      <div className="sf-container">
        <Reveal as="header" className="sf-section__header">
          <span className="sf-section__eyebrow">{c.eyebrow}</span>
          <h2 className="sf-section__title">{c.title}</h2>
          <p className="sf-section__lede">{c.lede}</p>
        </Reveal>
      </div>
    </section>
  )
}
