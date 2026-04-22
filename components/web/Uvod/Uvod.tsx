import Link from 'next/link'
import Reveal from '@/components/web/ui/Reveal/Reveal'
import StatCounter from '@/components/web/ui/StatCounter/StatCounter'
import { uvodConfig as c } from './config'
import './Uvod.css'

export default function Uvod() {
  return (
    <section id="o-nama" className="sf-uvod">
      <div className="sf-container">

        <Reveal as="header" className="sf-uvod__header" delay={0}>
          <span className="sf-uvod__eyebrow">
            <span className="sf-uvod__eyebrow-dot" aria-hidden />
            {c.eyebrow}
          </span>
          <span className="sf-uvod__promise">— {c.promiseLabel} —</span>
          <h2 className="sf-uvod__headline">{c.headline}</h2>
        </Reveal>

        <div className="sf-uvod__split">
          <Reveal className="sf-uvod__image-wrap" delay={200}>
            {c.imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.imageSrc} alt="Sweet Flower Events" className="sf-uvod__image" />
            ) : (
              <div className="sf-uvod__image-placeholder" aria-hidden>
                <span>Fotografija — uskoro</span>
              </div>
            )}
          </Reveal>

          <div className="sf-uvod__content">
            <Reveal as="p" className="sf-uvod__body" delay={300}>
              {c.body}
            </Reveal>
            <Reveal delay={450}>
              <Link href={c.cta.href} className="sf-uvod__cta">
                {c.cta.label}
              </Link>
            </Reveal>
          </div>
        </div>

        <div className="sf-uvod__stats">
          {c.stats.map((stat, i) => (
            <StatCounter
              key={i}
              label={stat.label}
              sublabel={stat.sublabel}
              className="sf-uvod__stat"
              delay={i * 180}
            />
          ))}
        </div>

      </div>
    </section>
  )
}
