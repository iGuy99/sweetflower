'use client'

import { useState, useEffect, useRef } from 'react'
import type { Invitation } from '@/db/queries/invitations'

const OUTRO_IMGS = Array.from({ length: 9 }, (_, i) =>
  `/pozivnice/AmarRodjendan/outro${i + 1}.jpg`
)

interface Props {
  invitation: Invitation
}

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function OutroRsvp({ invitation }: Props) {
  const [outroIdx, setOutroIdx] = useState(0)
  const [name, setName] = useState('')
  const [adults, setAdults] = useState(1)
  const [kids, setKids] = useState(0)
  const [choice, setChoice] = useState<'yes' | 'no' | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [thanksMsg, setThanksMsg] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const id = setInterval(() => {
      setOutroIdx(prev => (prev + 1) % OUTRO_IMGS.length)
    }, 3500)
    return () => clearInterval(id)
  }, [])

  const adjAdults = (delta: number) => setAdults(prev => Math.max(0, prev + delta))
  const adjKids = (delta: number) => setKids(prev => Math.max(0, prev + delta))

  const submit = async () => {
    if (!name.trim()) {
      nameRef.current?.focus()
      return
    }
    if (!choice) return

    setStatus('submitting')

    const message = kids > 0 ? `Djeca: ${kids}` : undefined

    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: invitation.slug,
          full_name: name.trim(),
          attending: choice === 'yes' ? 'yes' : 'no',
          guest_count: adults,
          message,
        }),
      })

      if (res.ok) {
        setStatus('success')
        if (choice === 'yes') {
          const kidsPart = kids > 0 ? ` & ${kids} djece` : ''
          setThanksMsg(`Hvala! Veselimo se da vidimo vas — ${adults} odrasli${kidsPart}.`)
        } else {
          setThanksMsg('Žao nam je što nećete moći doći. Hvala što ste javili!')
        }
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className="outro-section">
      {OUTRO_IMGS.map((src, i) => (
        <img
          key={src}
          className={`outro-img${i === outroIdx ? ' active' : ''}`}
          src={src}
          alt="Amar"
        />
      ))}

      <div className="outro-img-fade" />

      <div className="outro-rsvp-wrap">
        <div className="rsvp-card" data-aos="fade-up">
          <div className="sec-eyebrow" style={{ color: 'var(--green-muted)', marginBottom: 6 }}>
            potvrdite dolazak
          </div>
          <h2 className="sec-title" style={{ color: 'var(--green-ink)', marginBottom: 16 }}>
            Hoćete li doći?
          </h2>

          {status === 'success' ? (
            <p className="rsvp-thanks">{thanksMsg}</p>
          ) : (
            <>
              <input
                ref={nameRef}
                className="rsvp-name"
                type="text"
                placeholder="Ime i prezime"
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
              />

              <div className="rsvp-counter">
                <div className="rsvp-counter-label">
                  <small>odrasli</small>
                  Broj odraslih
                </div>
                <div className="rsvp-stepper">
                  <button className="rsvp-btn-step" onClick={() => adjAdults(-1)}>−</button>
                  <span className="rsvp-count">{adults}</span>
                  <button className="rsvp-btn-step" onClick={() => adjAdults(1)}>+</button>
                </div>
              </div>

              <div className="rsvp-divider" />

              <div className="rsvp-counter">
                <div className="rsvp-counter-label">
                  <small>djeca</small>
                  Broj djece
                </div>
                <div className="rsvp-stepper">
                  <button className="rsvp-btn-step" onClick={() => adjKids(-1)}>−</button>
                  <span className="rsvp-count">{kids}</span>
                  <button className="rsvp-btn-step" onClick={() => adjKids(1)}>+</button>
                </div>
              </div>

              <div className="rsvp-actions">
                <button
                  className={`rsvp-choice${choice === 'yes' ? ' selected-yes' : ''}`}
                  onClick={() => setChoice('yes')}
                >
                  ✓ Dolazim
                </button>
                <button
                  className={`rsvp-choice${choice === 'no' ? ' selected-no' : ''}`}
                  onClick={() => setChoice('no')}
                >
                  Ne dolazim
                </button>
              </div>

              {choice && (
                <button
                  className="rsvp-submit"
                  onClick={submit}
                  disabled={status === 'submitting'}
                >
                  {status === 'submitting' ? '...' : 'Potvrdi'}
                </button>
              )}

              {status === 'error' && (
                <p className="rsvp-error">Greška pri slanju. Pokušajte ponovo.</p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
