'use client'

import { useState } from 'react'
import { Send, Utensils, Music, Check, AlertCircle } from 'lucide-react'
import type { Invitation } from '@/db/queries/invitations'

interface Props {
  invitation: Invitation
}

const DIETARY_OPTIONS = [
  { key: 'gluten_free', label: 'Bez glutena / Celijakija' },
  { key: 'lactose_free', label: 'Bez laktoze' },
  { key: 'vegetarian', label: 'Vegetarijanac' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'nut_allergy', label: 'Alergija na orašaste plodove' },
  { key: 'seafood_allergy', label: 'Alergija na morske plodove' },
]

interface FormData {
  name: string
  phone: string
  attending: 'yes' | 'no'
  guests: number
  gluten_free: boolean
  lactose_free: boolean
  vegetarian: boolean
  vegan: boolean
  nut_allergy: boolean
  seafood_allergy: boolean
  otherDietary: string
  song: string
  message: string
}

const INITIAL_FORM: FormData = {
  name: '',
  phone: '',
  attending: 'yes',
  guests: 1,
  gluten_free: false,
  lactose_free: false,
  vegetarian: false,
  vegan: false,
  nut_allergy: false,
  seafood_allergy: false,
  otherDietary: '',
  song: '',
  message: '',
}

export default function RsvpForm({ invitation }: Props) {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: invitation.slug,
          full_name: formData.name,
          phone: formData.phone,
          attending: formData.attending,
          guest_count: formData.guests,
          gluten_free: formData.gluten_free,
          lactose_free: formData.lactose_free,
          vegetarian: formData.vegetarian,
          vegan: formData.vegan,
          nut_allergy: formData.nut_allergy,
          seafood_allergy: formData.seafood_allergy,
          other_allergies: formData.otherDietary,
          song_request: formData.song,
          message: formData.message,
        }),
      })

      if (res.ok) {
        setSubmitStatus('success')
        setFormData(INITIAL_FORM)
      } else {
        setSubmitStatus('error')
      }
    } catch {
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="rsvp-section" id="rsvp">
      <h2 className="section-title" data-aos="fade-down">Potvrdite Dolazak</h2>
      <p className="section-subtitle" data-aos="fade" data-aos-delay="100">
        Molimo potvrdite do 15. maja 2026.
      </p>
      <form className="rsvp-form" data-aos="fade-up" data-aos-delay="200" onSubmit={handleSubmit}>

        <div className="form-group">
          <label className="form-label required">Ime i prezime</label>
          <input
            type="text" name="name" className="form-input"
            placeholder="Vaše ime" value={formData.name}
            onChange={handleChange} required
          />
        </div>

        {invitation.show_phone && (
          <div className="form-group">
            <label className="form-label">Broj telefona (opcionalno)</label>
            <input
              type="tel" name="phone" className="form-input"
              placeholder="+387 6X XXX XXX" value={formData.phone}
              onChange={handleChange}
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label required">Hoćete li prisustvovati?</label>
          <div className="radio-group">
            <label className="radio-label">
              <input type="radio" name="attending" value="yes"
                checked={formData.attending === 'yes'} onChange={handleChange} />
              Da, dolazim
            </label>
            <label className="radio-label">
              <input type="radio" name="attending" value="no"
                checked={formData.attending === 'no'} onChange={handleChange} />
              Nažalost, ne mogu doći
            </label>
          </div>
        </div>

        {formData.attending === 'yes' && (
          <>
            {invitation.show_guest_count && (
              <div className="form-group">
                <label className="form-label">Broj gostiju (uključujući vas)</label>
                <input
                  type="number" name="guests" className="form-input"
                  min="1" max="10" value={formData.guests}
                  onChange={handleChange} style={{ width: '100px' }}
                />
              </div>
            )}

            {invitation.show_allergies && (
              <div className="form-group">
                <div className="form-section-title">
                  <Utensils size={18} />
                  Alergije na hranu i posebni zahtjevi
                </div>
                <p className="form-section-note">
                  Veoma nam je važno da znamo o eventualnim dijetalnim ograničenjima.
                </p>
                <div className="checkbox-grid">
                  {DIETARY_OPTIONS.map(({ key, label }) => (
                    <label key={key} className="checkbox-label">
                      <input
                        type="checkbox" name={key}
                        checked={formData[key as keyof FormData] as boolean}
                        onChange={handleChange}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <input
                  type="text" name="otherDietary" className="form-input"
                  placeholder="Ostale alergije ili posebni zahtjevi..."
                  value={formData.otherDietary} onChange={handleChange}
                />
              </div>
            )}

            {invitation.show_song_request && (
              <div className="form-group">
                <div className="form-section-title">
                  <Music size={18} />
                  Vaša obavezna pjesma
                </div>
                <p className="form-section-note">
                  Koja pjesma ne smije nedostajati na našem vjenčanju?
                </p>
                <input
                  type="text" name="song" className="form-input"
                  placeholder="Izvođač - Naziv pjesme"
                  value={formData.song} onChange={handleChange}
                />
              </div>
            )}
          </>
        )}

        {invitation.show_message && (
          <div className="form-group">
            <label className="form-label">Poruka za mladence (opcionalno)</label>
            <textarea
              name="message" className="form-textarea"
              placeholder="Napišite nam par riječi..."
              value={formData.message} onChange={handleChange}
            />
          </div>
        )}

        {submitStatus === 'success' && (
          <div className="submit-message success">
            <Check size={20} />
            Hvala na potvrdi! Radujemo se što ćemo slaviti s vama.
          </div>
        )}
        {submitStatus === 'error' && (
          <div className="submit-message error">
            <AlertCircle size={20} />
            Došlo je do greške. Molimo pokušajte ponovo.
          </div>
        )}

        <button type="submit" className="submit-button" disabled={isSubmitting}>
          {isSubmitting ? 'Šaljem...' : <><Send size={18} /> Pošalji potvrdu</>}
        </button>
      </form>
    </section>
  )
}
