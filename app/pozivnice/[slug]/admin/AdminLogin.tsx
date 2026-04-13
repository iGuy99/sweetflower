'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, User, LogIn, ArrowLeft } from 'lucide-react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import './AdminStyles.css'

interface Props {
  slug: string
}

export default function AdminLogin({ slug }: Props) {
  const router = useRouter()
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    AOS.init({ duration: 800, once: true })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const res = await fetch('/api/auth/invitation-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, username: credentials.username, password: credentials.password }),
    })

    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Pogrešno korisničko ime ili lozinka')
      setIsLoading(false)
    }
  }

  return (
    <div className="admin-login-page">
      <a href={`/pozivnice/${slug}`} className="back-to-invite">
        <ArrowLeft size={18} />
        Nazad na pozivnicu
      </a>
      <div className="admin-login-container" data-aos="fade-up">
        <div className="admin-login-header">
          <h1 className="admin-login-title">Admin Panel</h1>
          <p className="admin-login-subtitle">{slug.replace(/([A-Z])/g, ' $1').trim()}</p>
        </div>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label className="admin-form-label">
              <User size={18} />
              Korisničko ime
            </label>
            <input
              type="text"
              className="admin-form-input"
              value={credentials.username}
              onChange={e => setCredentials({ ...credentials, username: e.target.value })}
              placeholder="Unesite korisničko ime"
              required
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">
              <Lock size={18} />
              Lozinka
            </label>
            <input
              type="password"
              className="admin-form-input"
              value={credentials.password}
              onChange={e => setCredentials({ ...credentials, password: e.target.value })}
              placeholder="Unesite lozinku"
              required
            />
          </div>

          {error && <div className="admin-error-message">{error}</div>}

          <button type="submit" className="admin-login-button" disabled={isLoading}>
            {isLoading ? 'Prijava...' : <><LogIn size={18} /> Prijavi se</>}
          </button>
        </form>
      </div>
    </div>
  )
}
