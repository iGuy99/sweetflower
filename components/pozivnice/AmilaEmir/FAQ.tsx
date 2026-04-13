'use client'

import { HelpCircle } from 'lucide-react'
import FaqIcon from './FaqIcon'

interface FaqItem {
  question: string
  answer: string
}

interface Props {
  faqs: FaqItem[]
}

export default function FAQ({ faqs }: Props) {
  return (
    <section className="faq-section">
      <HelpCircle size={32} style={{ color: '#ffffff', marginBottom: '0.5rem' }} data-aos="zoom-in" />
      <h2 className="section-title" data-aos="fade-down" data-aos-delay="100">Važne Informacije</h2>
      <div className="section-divider" data-aos="zoom-in" data-aos-delay="200"></div>
      <div className="faq-grid">
        {faqs.map((faq, index) => (
          <div key={index} className="faq-card" data-aos="fade-up" data-aos-delay={index * 100}>
            <div className="faq-card-icon">
              <FaqIcon question={faq.question} />
            </div>
            <div className="faq-card-content">
              <h3 className="faq-card-question">{faq.question}</h3>
              <p className="faq-card-answer">{faq.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
