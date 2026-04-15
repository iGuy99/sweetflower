import Reveal from '@/components/web/ui/Reveal/Reveal'
import { uvodConfig as c } from './config'
import './Uvod.css'

export default function Uvod() {
  return (
    <section id="uvod" className="sf-uvod">
      <div className="sf-container">
        <Reveal as="header" className="sf-uvod__header">
          <span className="sf-uvod__eyebrow">{c.eyebrow}</span>
          <span className="sf-uvod__promise-label">— {c.promiseLabel} —</span>
          <h2 className="sf-uvod__headline">{c.headline}</h2>
        </Reveal>

        <div className="sf-uvod__body">
          {c.blocks.map((block, i) => {
            const delay = (i % 2) * 60

            if (block.kind === 'quote') {
              const sentences = block.text.split(/(?<=\.)\s+/)
              return (
                <Reveal key={i} as="div" delay={delay}>
                  <blockquote className="sf-uvod__quote">
                    <p>
                      {sentences.map((sentence, j) => (
                        <span key={j} className="sf-uvod__quote-line">
                          {sentence}
                        </span>
                      ))}
                    </p>
                  </blockquote>
                </Reveal>
              )
            }

            if (block.kind === 'stat') {
              return (
                <Reveal key={i} as="div" delay={delay} className="sf-uvod__stat">
                  <span className="sf-uvod__stat-label">{block.label}</span>
                  <p>{block.text}</p>
                </Reveal>
              )
            }

            return (
              <Reveal key={i} as="p" delay={delay} className="sf-uvod__paragraph">
                {block.text}
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
