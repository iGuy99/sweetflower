'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  slug: string
}

export default function AdminLogin({ slug }: Props) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/invitation-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, username, password }),
    })

    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Pogrešni podaci')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f5f5f5', padding: '1rem',
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '2.5rem',
        maxWidth: '400px', width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', textAlign: 'center' }}>
          Prijave gostiju
        </h1>
        <p style={{ color: '#888', fontSize: '0.9rem', textAlign: 'center', marginBottom: '2rem' }}>
          {slug}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: '#555' }}>
              Korisničko ime
            </label>
            <input
              type="text" value={username} onChange={e => setUsername(e.target.value)}
              required autoComplete="username"
              style={{
                width: '100%', padding: '0.75rem', border: '1px solid #ddd',
                borderRadius: '6px', fontSize: '0.95rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: '#555' }}>
              Lozinka
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete="current-password"
              style={{
                width: '100%', padding: '0.75rem', border: '1px solid #ddd',
                borderRadius: '6px', fontSize: '0.95rem',
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#e53e3e', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '0.875rem', background: '#c4899a',
              color: '#fff', border: 'none', borderRadius: '6px',
              fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Prijava...' : 'Prijavi se'}
          </button>
        </form>
      </div>
    </div>
  )
}
