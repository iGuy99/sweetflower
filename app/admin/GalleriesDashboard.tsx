'use client'

import { useState } from 'react'
import {
  Plus, LogOut, Copy, Check, Trash2, Link2, Eye, EyeOff,
  Image as ImageIcon, HardDrive, AlertTriangle, X,
} from 'lucide-react'
import { slugify } from '@/lib/slug'
import type { GalleryStats } from '@/db/queries/galleries'
import './admin.css'

interface Props {
  initialGalleries: GalleryStats[]
}

function formatBytes(bytes: number): string {
  const n = Number(bytes) || 0
  if (n === 0) return '0 MB'
  const mb = n / (1024 * 1024)
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function GalleriesDashboard({ initialGalleries }: Props) {
  const [galleries, setGalleries] = useState<GalleryStats[]>(initialGalleries)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<GalleryStats | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const refresh = async () => {
    const res = await fetch('/api/admin/galleries')
    if (res.ok) {
      const data = await res.json()
      setGalleries(data.galleries)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/admin-logout', { method: 'POST' })
    window.location.href = '/admin'
  }

  const copyLink = async (key: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1800)
    } catch {
      // clipboard može biti blokiran — fallback: prompt sa URL-om
      window.prompt('Kopiraj link:', url)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/admin/galleries/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setGalleries((gs) => gs.filter((g) => g.id !== deleteTarget.id))
        setDeleteTarget(null)
      } else {
        setDeleteError('Brisanje nije uspjelo. Pokušajte ponovo.')
      }
    } catch {
      setDeleteError('Greška u vezi. Pokušajte ponovo.')
    } finally {
      setIsDeleting(false)
    }
  }

  const closeDeleteModal = () => {
    setDeleteTarget(null)
    setDeleteError('')
  }

  return (
    <div className="gadmin-page">
      <header className="gadmin-topbar">
        <div>
          <p className="gadmin-brand">SweetFlower</p>
          <h1 className="gadmin-h1">Galerije</h1>
        </div>
        <div className="gadmin-topbar-actions">
          <button className="gadmin-btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={18} /> Nova galerija
          </button>
          <button className="gadmin-btn-ghost" onClick={handleLogout}>
            <LogOut size={18} /> Odjava
          </button>
        </div>
      </header>

      {galleries.length === 0 ? (
        <div className="gadmin-empty">
          <Link2 size={40} />
          <p>Još nema galerija. Klikni „Nova galerija” da kreiraš prvu.</p>
        </div>
      ) : (
        <div className="gadmin-grid">
          {galleries.map((g) => {
            const guestUrl = `${origin}/galerija/${g.slug}`
            const coupleUrl = `${origin}/galerija/${g.slug}/mladenci`
            return (
              <div className="gadmin-card" key={g.id}>
                <div className="gadmin-card-head">
                  <div>
                    <h2 className="gadmin-card-title">{g.title}</h2>
                    <p className="gadmin-card-sub">/{g.slug} · {formatDate(g.event_date)}</p>
                  </div>
                  <span className={`gadmin-badge ${g.is_public ? 'is-public' : 'is-private'}`}>
                    {g.is_public ? <><Eye size={13} /> Javna</> : <><EyeOff size={13} /> Privatna</>}
                  </span>
                </div>

                <div className="gadmin-card-stats">
                  <span><ImageIcon size={15} /> {Number(g.media_count)} fajlova</span>
                  <span><HardDrive size={15} /> {formatBytes(g.total_bytes)}</span>
                </div>

                <div className="gadmin-card-links">
                  <button className="gadmin-link-btn" onClick={() => copyLink(`guest-${g.id}`, guestUrl)}>
                    {copiedKey === `guest-${g.id}` ? <><Check size={15} /> Kopirano</> : <><Copy size={15} /> Link za goste</>}
                  </button>
                  <button className="gadmin-link-btn" onClick={() => copyLink(`couple-${g.id}`, coupleUrl)}>
                    {copiedKey === `couple-${g.id}` ? <><Check size={15} /> Kopirano</> : <><Copy size={15} /> Link za mladence</>}
                  </button>
                </div>

                <div className="gadmin-card-foot">
                  <button className="gadmin-btn-danger-ghost" onClick={() => setDeleteTarget(g)}>
                    <Trash2 size={15} /> Obriši
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <CreateGalleryModal
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); await refresh() }}
        />
      )}

      {deleteTarget && (
        <div className="gadmin-overlay" onClick={closeDeleteModal}>
          <div className="gadmin-modal gadmin-modal-danger" onClick={(e) => e.stopPropagation()}>
            <div className="gadmin-modal-icon"><AlertTriangle size={44} /></div>
            <h3>Obriši galeriju „{deleteTarget.title}”?</h3>
            <p>
              Trajno se brišu <strong>svi fajlovi</strong> ({Number(deleteTarget.media_count)} kom,
              {' '}{formatBytes(deleteTarget.total_bytes)}) i sam link galerije.
            </p>
            <p className="gadmin-danger-note">Ova akcija se ne može poništiti.</p>
            {deleteError && <div className="gadmin-error">{deleteError}</div>}
            <div className="gadmin-modal-actions">
              <button className="gadmin-btn-ghost" onClick={closeDeleteModal} disabled={isDeleting}>
                Odustani
              </button>
              <button className="gadmin-btn-danger" onClick={confirmDelete} disabled={isDeleting}>
                <Trash2 size={16} /> {isDeleting ? 'Brišem...' : 'Obriši trajno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Modal za kreiranje galerije ---

function CreateGalleryModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [eventDate, setEventDate] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [couplePassword, setCouplePassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const onTitleChange = (v: string) => {
    setTitle(v)
    if (!slugEdited) setSlug(slugify(v))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const res = await fetch('/api/admin/galleries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        slug,
        eventDate: eventDate || null,
        isPublic,
        couplePassword,
      }),
    })

    if (res.ok) {
      onCreated()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Greška pri kreiranju')
      setIsLoading(false)
    }
  }

  return (
    <div className="gadmin-overlay" onClick={onClose}>
      <div className="gadmin-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="gadmin-modal-close" onClick={onClose} aria-label="Zatvori">
          <X size={20} />
        </button>
        <h3>Nova galerija</h3>

        <form className="gadmin-form" onSubmit={handleSubmit}>
          <label className="gadmin-label">Naslov (imena mladenaca)</label>
          <input
            className="gadmin-input"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Amila & Emir"
            required
          />

          <label className="gadmin-label">Slug (u linku)</label>
          <input
            className="gadmin-input"
            value={slug}
            onChange={(e) => { setSlug(e.target.value); setSlugEdited(true) }}
            placeholder="amila-emir"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
          <p className="gadmin-hint">Link za goste: /galerija/{slug || 'amila-emir'}</p>

          <label className="gadmin-label">Datum događaja (opcionalno)</label>
          <input
            className="gadmin-input"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />

          <label className="gadmin-label">Lozinka za mladence</label>
          <input
            className="gadmin-input"
            value={couplePassword}
            onChange={(e) => setCouplePassword(e.target.value)}
            placeholder="min. 8 znakova"
            autoCapitalize="none"
            spellCheck={false}
            required
          />

          <label className="gadmin-check">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            <span>Javna galerija (gosti vide sve slike)</span>
          </label>

          {error && <div className="gadmin-error">{error}</div>}

          <button type="submit" className="gadmin-btn-primary" disabled={isLoading}>
            {isLoading ? 'Kreiram...' : <><Plus size={18} /> Kreiraj galeriju</>}
          </button>
        </form>
      </div>
    </div>
  )
}
