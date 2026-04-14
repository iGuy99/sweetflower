'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  UserCheck,
  UserX,
  LogOut,
  Search,
  RefreshCw,
  Music,
  Utensils,
  MessageSquare,
  Calendar,
  Phone,
  MoreVertical,
  Trash2,
  X,
  Edit3,
  Check,
  Minus,
  Plus,
  AlertTriangle,
} from 'lucide-react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import './AdminStyles.css'
import type { RsvpResponse, RsvpStats } from '@/db/queries/rsvp'

interface Props {
  slug: string
  rsvps: RsvpResponse[]
  stats: RsvpStats
}

export default function AdminDashboard({ slug, rsvps: initialRsvps, stats: initialStats }: Props) {
  const router = useRouter()
  const [responses, setResponses] = useState<RsvpResponse[]>(initialRsvps)
  const [stats, setStats] = useState<RsvpStats>(initialStats)
  const [filteredResponses, setFilteredResponses] = useState<RsvpResponse[]>(initialRsvps)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'yes' | 'no'>('all')
  const [selectedResponse, setSelectedResponse] = useState<RsvpResponse | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [editingGuests, setEditingGuests] = useState(false)
  const [editedGuestCount, setEditedGuestCount] = useState(0)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null)

  useEffect(() => {
    AOS.init({ duration: 800, once: true })
  }, [])

  useEffect(() => {
    let filtered = responses

    if (filter !== 'all') {
      filtered = filtered.filter((r) => (filter === 'yes' ? r.attending : !r.attending))
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.phone && r.phone.includes(searchTerm))
      )
    }

    setFilteredResponses(filtered)
  }, [responses, filter, searchTerm])

  const fetchResponses = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/rsvp')
      if (res.ok) {
        const data = await res.json()
        setResponses(data.rsvps)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Greška pri učitavanju:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = (id: number, name: string) => {
    setDeleteConfirm({ id, name })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    try {
      const res = await fetch(`/api/admin/rsvp/${deleteConfirm.id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchResponses()
        if (selectedResponse?.id === deleteConfirm.id) setSelectedResponse(null)
      }
    } catch (error) {
      console.error('Greška pri brisanju:', error)
    } finally {
      setDeleteConfirm(null)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/pozivnice/${slug}/admin`)
    router.refresh()
  }

  const handleUpdateGuests = async () => {
    if (!selectedResponse || editedGuestCount < 1) return
    try {
      const res = await fetch(`/api/admin/rsvp/${selectedResponse.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_count: editedGuestCount }),
      })
      if (res.ok) {
        const updated = { ...selectedResponse, guest_count: editedGuestCount }
        setSelectedResponse(updated)
        setResponses(responses.map((r) => (r.id === selectedResponse.id ? updated : r)))
        setEditingGuests(false)
      }
    } catch (error) {
      console.error('Greška pri ažuriranju:', error)
    }
  }

  const getDietaryTags = (r: RsvpResponse): string[] => {
    const tags: string[] = []
    if (r.gluten_free) tags.push('Bez glutena')
    if (r.lactose_free) tags.push('Bez laktoze')
    if (r.vegetarian) tags.push('Vegetarijanac')
    if (r.vegan) tags.push('Vegan')
    if (r.nut_allergy) tags.push('Alergija na orašaste')
    if (r.seafood_allergy) tags.push('Alergija na morske plodove')
    return tags
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const coupleName = slug.replace(/([a-z])([A-Z])/, '$1 & $2')

  const displayStats = {
    total: Number(stats.total_responses) || 0,
    attending: Number(stats.attending_count) || 0,
    notAttending: Number(stats.not_attending_count) || 0,
    totalGuests: Number(stats.total_guests) || 0,
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-content">
          <p className="admin-title">Prijave Gostiju</p>
          <h1 className="admin-subtitle">{coupleName}</h1>
        </div>
        <button className="admin-logout-btn desktop-only" onClick={handleLogout}>
          <LogOut size={18} />
          Odjava
        </button>
        <div className="mobile-menu-wrapper mobile-only">
          <button className="mobile-menu-btn" onClick={() => setShowMobileMenu(!showMobileMenu)}>
            <MoreVertical size={24} />
          </button>
          {showMobileMenu && (
            <div className="mobile-menu-dropdown">
              <button onClick={handleLogout}>
                <LogOut size={16} />
                Odjava
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Statistika */}
      <div className="admin-stats">
        <div
          className={`stat-card clickable ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-value">{displayStats.total}</div>
          <div className="stat-label">Ukupno prijava</div>
        </div>
        <div
          className={`stat-card attending clickable ${filter === 'yes' ? 'active' : ''}`}
          onClick={() => setFilter('yes')}
        >
          <div className="stat-icon"><UserCheck size={24} /></div>
          <div className="stat-value">{displayStats.attending}</div>
          <div className="stat-label">Dolaze</div>
        </div>
        <div
          className={`stat-card not-attending clickable ${filter === 'no' ? 'active' : ''}`}
          onClick={() => setFilter('no')}
        >
          <div className="stat-icon"><UserX size={24} /></div>
          <div className="stat-value">{displayStats.notAttending}</div>
          <div className="stat-label">Ne dolaze</div>
        </div>
        <div className="stat-card guests">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-value">{displayStats.totalGuests}</div>
          <div className="stat-label">Ukupno gostiju</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar" data-aos="fade-up">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Pretraži po imenu ili telefonu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Svi ({displayStats.total})
          </button>
          <button
            className={`filter-btn ${filter === 'yes' ? 'active' : ''}`}
            onClick={() => setFilter('yes')}
          >
            Dolaze ({displayStats.attending})
          </button>
          <button
            className={`filter-btn ${filter === 'no' ? 'active' : ''}`}
            onClick={() => setFilter('no')}
          >
            Ne dolaze ({displayStats.notAttending})
          </button>
        </div>
        <div className="action-buttons">
          <button className="action-btn" onClick={fetchResponses} disabled={isLoading}>
            <RefreshCw size={18} style={isLoading ? { animation: 'spin 1s linear infinite' } : {}} />
            Osvježi
          </button>
        </div>
      </div>

      {/* Tabela / Kartice */}
      <div className="admin-content" data-aos="fade-up">
        {isLoading ? (
          <div className="loading-state">Učitavam prijave...</div>
        ) : filteredResponses.length === 0 ? (
          <div className="empty-state">
            {searchTerm || filter !== 'all'
              ? 'Nema rezultata za zadane filtere'
              : 'Još nema prijava'}
          </div>
        ) : (
          <>
            {/* Desktop tabela */}
            <table className="admin-table desktop-only">
              <thead>
                <tr>
                  <th>Ime</th>
                  <th>Status</th>
                  <th>Gosti</th>
                  <th>Dijeta</th>
                  <th>Pjesma</th>
                  <th>Datum</th>
                  <th>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {filteredResponses.map((response) => {
                  const dietary = getDietaryTags(response)
                  return (
                    <tr key={response.id}>
                      <td>
                        <div className="name-cell">
                          <strong>{response.full_name}</strong>
                          {response.phone && (
                            <small><Phone size={12} /> {response.phone}</small>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${response.attending ? 'attending' : 'not-attending'}`}>
                          {response.attending ? 'Dolazi' : 'Ne dolazi'}
                        </span>
                      </td>
                      <td>{response.attending ? response.guest_count : '-'}</td>
                      <td>
                        {dietary.length > 0 ? (
                          <span className="dietary-badge">
                            <Utensils size={14} />
                            {dietary.length}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        {response.song_request ? (
                          <span className="song-badge"><Music size={14} /></span>
                        ) : '-'}
                      </td>
                      <td>{formatDate(response.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="view-btn"
                            onClick={() => setSelectedResponse(response)}
                          >
                            Detalji
                          </button>
                          <button
                            className="delete-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(response.id, response.full_name)
                            }}
                            title="Obriši"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile kartice */}
            <div className="admin-cards mobile-only">
              {filteredResponses.map((response) => {
                const dietary = getDietaryTags(response)
                return (
                  <div
                    key={response.id}
                    className="response-card"
                    onClick={() => setSelectedResponse(response)}
                  >
                    <div className="card-header">
                      <div className="card-name-status">
                        <h3>{response.full_name}</h3>
                        <span className={`status-badge ${response.attending ? 'attending' : 'not-attending'}`}>
                          {response.attending ? 'Dolazi' : 'Ne dolazi'}
                        </span>
                      </div>
                    </div>
                    {response.attending && (
                      <div className="card-info">
                        <span><Users size={14} /> {response.guest_count} gost(a)</span>
                        {dietary.length > 0 && (
                          <span><Utensils size={14} /> {dietary.length} dijeta</span>
                        )}
                        {response.song_request && (
                          <span><Music size={14} /> Ima pjesmu</span>
                        )}
                      </div>
                    )}
                    <div className="card-footer">
                      <div className="card-date">
                        <Calendar size={14} />
                        {formatDate(response.created_at)}
                      </div>
                      <button
                        className="card-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(response.id, response.full_name)
                        }}
                        title="Obriši"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal za detalje */}
      {selectedResponse && (
        <div
          className="modal-overlay"
          onClick={() => { setSelectedResponse(null); setEditingGuests(false) }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => { setSelectedResponse(null); setEditingGuests(false) }}
            >
              &times;
            </button>

            <h2>{selectedResponse.full_name}</h2>

            <div className="modal-section">
              <label>Status:</label>
              <span className={`status-badge large ${selectedResponse.attending ? 'attending' : 'not-attending'}`}>
                {selectedResponse.attending ? 'Dolazi' : 'Ne dolazi'}
              </span>
            </div>

            {selectedResponse.phone && (
              <div className="modal-section">
                <label><Phone size={16} /> Telefon:</label>
                <span>{selectedResponse.phone}</span>
              </div>
            )}

            {selectedResponse.attending && (
              <>
                <div className="modal-section">
                  <label>Broj gostiju:</label>
                  {editingGuests ? (
                    <div className="edit-guests-wrapper">
                      <div className="guests-counter">
                        <button
                          type="button"
                          className="counter-btn"
                          onClick={() => setEditedGuestCount(Math.max(1, editedGuestCount - 1))}
                          disabled={editedGuestCount <= 1}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="counter-value">{editedGuestCount}</span>
                        <button
                          type="button"
                          className="counter-btn"
                          onClick={() => setEditedGuestCount(editedGuestCount + 1)}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <div className="edit-actions">
                        <button className="save-btn" onClick={handleUpdateGuests}>
                          <Check size={16} /> Spremi
                        </button>
                        <button className="cancel-btn" onClick={() => setEditingGuests(false)}>
                          <X size={16} /> Odustani
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="guests-display">
                      <span>{selectedResponse.guest_count}</span>
                      <button
                        className="edit-guests-btn"
                        onClick={() => {
                          setEditedGuestCount(selectedResponse.guest_count)
                          setEditingGuests(true)
                        }}
                      >
                        <Edit3 size={16} /> Uredi
                      </button>
                    </div>
                  )}
                </div>

                {(() => {
                  const dietary = getDietaryTags(selectedResponse)
                  return dietary.length > 0 ? (
                    <div className="modal-section">
                      <label><Utensils size={16} /> Dijeta:</label>
                      <div className="dietary-list">
                        {dietary.map((d, i) => (
                          <span key={i} className="dietary-tag">{d}</span>
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}

                {selectedResponse.other_allergies && (
                  <div className="modal-section">
                    <label>Ostale alergije:</label>
                    <span>{selectedResponse.other_allergies}</span>
                  </div>
                )}

                {selectedResponse.song_request && (
                  <div className="modal-section">
                    <label><Music size={16} /> Obavezna pjesma:</label>
                    <span className="song-text">{selectedResponse.song_request}</span>
                  </div>
                )}
              </>
            )}

            {selectedResponse.message && (
              <div className="modal-section">
                <label><MessageSquare size={16} /> Poruka:</label>
                <p className="message-text">{selectedResponse.message}</p>
              </div>
            )}

            <div className="modal-section">
              <label>Prijavljeno:</label>
              <span>{formatDate(selectedResponse.created_at)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <AlertTriangle size={48} />
            </div>
            <h3>Obriši prijavu?</h3>
            <p>
              Da li ste sigurni da želite obrisati prijavu za{' '}
              <strong>{deleteConfirm.name}</strong>?
            </p>
            <p className="delete-warning">Ova akcija se ne može poništiti.</p>
            <div className="delete-modal-actions">
              <button className="delete-modal-cancel" onClick={() => setDeleteConfirm(null)}>
                Odustani
              </button>
              <button className="delete-modal-confirm" onClick={confirmDelete}>
                <Trash2 size={16} /> Obriši
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
