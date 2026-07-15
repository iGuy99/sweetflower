'use client'

import { useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import type { ResolvedTheme } from '@/lib/gallery-themes'
import { themeToStyle } from '@/lib/gallery-themes'
import './couple.css'

interface CoupleLoginProps {
  slug: string
  title: string
  theme: ResolvedTheme
}

/** Prezentacijska pomoćna: "Atida & Ismet" -> ["Atida", "Ismet"] za istaknuti naslov. */
function splitCoupleNames(value: string): [string, string] | null {
  const parts = value.split(/\s*&\s*/)
  if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
    return [parts[0].trim(), parts[1].trim()]
  }
  return null
}

export default function CoupleLogin({ slug, title, theme }: CoupleLoginProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const coupleNames = splitCoupleNames(title)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/couple-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, password }),
      })

      if (res.ok) {
        window.location.reload()
        return
      }

      if (res.status === 429) {
        setError('Previše pokušaja. Pokušajte ponovo kasnije.')
      } else {
        setError('Pogrešna šifra. Pokušajte ponovo.')
      }
    } catch {
      setError('Greška u vezi. Pokušajte ponovo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main
      className="sf-couple sf-couple--login"
      style={themeToStyle(theme) as React.CSSProperties}
    >
      <div className="sf-couple__atmosphere" aria-hidden="true" />

      <div className="sf-couple__login-card">
        <span className="sf-couple__eyebrow">
          <span className="sf-couple__eyebrow-dot" aria-hidden="true" />
          Galerija za mladence
        </span>

        {coupleNames ? (
          <h1 className="sf-couple__login-title">
            <span>{coupleNames[0]}</span>
            <span className="sf-couple__login-amp" aria-hidden="true">
              &amp;
            </span>
            <span>{coupleNames[1]}</span>
          </h1>
        ) : (
          <h1 className="sf-couple__login-title">{title}</h1>
        )}

        <form className="sf-couple__login-form" onSubmit={handleSubmit}>
          <label htmlFor="couplePassword" className="sf-couple__label">
            Šifra
          </label>
          <input
            id="couplePassword"
            type="password"
            className="sf-couple__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
          {error && <p className="sf-couple__error">{error}</p>}

          <button type="submit" className="sf-couple__cta" disabled={isLoading}>
            <KeyRound size={18} aria-hidden="true" />
            {isLoading ? 'Provjera...' : 'Uđi u galeriju'}
          </button>
        </form>
      </div>
    </main>
  )
}
