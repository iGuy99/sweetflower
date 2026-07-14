'use client'

import { useState } from 'react'
import { Lock, User, LogIn } from 'lucide-react'
import './admin.css'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const res = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (res.ok) {
      window.location.href = '/admin'
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Pogrešno korisničko ime ili lozinka')
      setIsLoading(false)
    }
  }

  return (
    <div className="gadmin-login-page">
      <div className="gadmin-login-card">
        <div className="gadmin-login-head">
          <p className="gadmin-brand">SweetFlower</p>
          <h1 className="gadmin-login-title">Galerije — Admin</h1>
        </div>

        <form className="gadmin-form" onSubmit={handleSubmit}>
          <label className="gadmin-label">
            <User size={18} /> Korisničko ime
          </label>
          <input
            type="text"
            className="gadmin-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />

          <label className="gadmin-label">
            <Lock size={18} /> Lozinka
          </label>
          <input
            type="password"
            className="gadmin-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />

          {error && <div className="gadmin-error">{error}</div>}

          <button type="submit" className="gadmin-btn-primary" disabled={isLoading}>
            {isLoading ? 'Prijava...' : <><LogIn size={18} /> Prijavi se</>}
          </button>
        </form>
      </div>
    </div>
  )
}
