'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RsvpResponse, RsvpStats } from '@/db/queries/rsvp'

interface Props {
  slug: string
  rsvps: RsvpResponse[]
  stats: RsvpStats
}

type Filter = 'all' | 'attending' | 'not_attending'

export default function AdminDashboard({ slug, rsvps, stats }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

  const filtered = rsvps.filter(r => {
    if (filter === 'attending' && !r.attending) return false
    if (filter === 'not_attending' && r.attending) return false
    if (search && !r.full_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.refresh()
  }

  const allergies = (r: RsvpResponse) => {
    const list = []
    if (r.gluten_free) list.push('Bez glutena')
    if (r.lactose_free) list.push('Bez laktoze')
    if (r.vegetarian) list.push('Vegetarijanac')
    if (r.vegan) list.push('Vegan')
    if (r.nut_allergy) list.push('Orašasti plodovi')
    if (r.seafood_allergy) list.push('Morski plodovi')
    if (r.other_allergies) list.push(r.other_allergies)
    return list.join(', ') || '—'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Prijave gostiju</h1>
            <p style={{ color: '#888', fontSize: '0.9rem' }}>{slug}</p>
          </div>
          <button onClick={logout} style={{
            padding: '0.5rem 1rem', background: '#fff', border: '1px solid #ddd',
            borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem',
          }}>
            Odjava
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Ukupno odgovora', value: stats.total_responses },
            { label: 'Dolaze', value: stats.attending_count },
            { label: 'Ne dolaze', value: stats.not_attending_count },
            { label: 'Ukupno gostiju', value: stats.total_guests },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: '#fff', borderRadius: '10px', padding: '1.25rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center',
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#c4899a' }}>{value ?? 0}</div>
              <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: '#fff', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {(['all', 'attending', 'not_attending'] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '0.4rem 1rem', borderRadius: '20px', border: 'none',
                cursor: 'pointer', fontSize: '0.85rem',
                background: filter === f ? '#c4899a' : '#f0f0f0',
                color: filter === f ? '#fff' : '#555',
              }}>
                {f === 'all' ? 'Svi' : f === 'attending' ? 'Dolaze' : 'Ne dolaze'}
              </button>
            ))}
            <input
              placeholder="Pretraži po imenu..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                marginLeft: 'auto', padding: '0.4rem 0.75rem', border: '1px solid #ddd',
                borderRadius: '20px', fontSize: '0.85rem', outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
                {['Ime', 'Telefon', 'Dolazak', 'Gostiju', 'Alergije', 'Pjesma', 'Poruka', 'Datum'].map(h => (
                  <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: 600, color: '#555', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#aaa' }}>
                    Nema rezultata
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 500 }}>{r.full_name}</td>
                    <td style={{ padding: '0.875rem 1rem', color: '#888' }}>{r.phone || '—'}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem',
                        background: r.attending ? '#d4edda' : '#f8d7da',
                        color: r.attending ? '#155724' : '#721c24',
                      }}>
                        {r.attending ? 'Dolazi' : 'Ne dolazi'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>{r.attending ? r.guest_count : '—'}</td>
                    <td style={{ padding: '0.875rem 1rem', color: '#888', maxWidth: '200px' }}>{allergies(r)}</td>
                    <td style={{ padding: '0.875rem 1rem', color: '#888' }}>{r.song_request || '—'}</td>
                    <td style={{ padding: '0.875rem 1rem', color: '#888', maxWidth: '200px' }}>{r.message || '—'}</td>
                    <td style={{ padding: '0.875rem 1rem', color: '#aaa', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {new Date(r.created_at).toLocaleDateString('bs-BA')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
