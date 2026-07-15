'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Plus, LogOut, Copy, Check, Trash2, Link2, Eye, EyeOff,
  Image as ImageIcon, HardDrive, AlertTriangle, X, Palette, Users, KeyRound,
} from 'lucide-react'
import { slugify } from '@/lib/slug'
import type { GalleryStats } from '@/db/queries/galleries'
import type { AdminAccount } from '@/db/queries/admin'
import { TEMPLATES, DEFAULT_TEMPLATE } from '@/lib/gallery-themes'
import './admin.css'

interface Props {
  initialGalleries: GalleryStats[]
  isSuper: boolean
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

export default function GalleriesDashboard({ initialGalleries, isSuper }: Props) {
  const [galleries, setGalleries] = useState<GalleryStats[]>(initialGalleries)
  const [showCreate, setShowCreate] = useState(false)
  const [showAdmins, setShowAdmins] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<GalleryStats | null>(null)
  const [passwordTarget, setPasswordTarget] = useState<GalleryStats | null>(null)
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
          {isSuper && (
            <button className="gadmin-btn-ghost" onClick={() => setShowAdmins(true)}>
              <Users size={18} /> Admini
            </button>
          )}
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
                  <a className="gadmin-link-btn" href={`/admin/galerije/${g.id}/izgled`}>
                    <Palette size={15} /> Izgled
                  </a>
                  <button className="gadmin-link-btn" onClick={() => setPasswordTarget(g)}>
                    <KeyRound size={15} /> Šifra mladenaca
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

      {showAdmins && <AdminsModal onClose={() => setShowAdmins(false)} />}

      {passwordTarget && (
        <CouplePasswordModal
          gallery={passwordTarget}
          onClose={() => setPasswordTarget(null)}
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

// --- Modal za reset šifre mladenaca ---

function CouplePasswordModal({
  gallery,
  onClose,
}: {
  gallery: GalleryStats
  onClose: () => void
}) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDone, setIsDone] = useState(false)

  // Escape zatvara modal (dialog semantika).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Šifra mora imati bar 8 znakova')
      return
    }
    if (password !== confirm) {
      setError('Šifre se ne podudaraju')
      return
    }
    setIsSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/galleries/${gallery.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couplePassword: password }),
      })
      if (res.ok) {
        setIsDone(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Greška pri promjeni šifre')
      }
    } catch {
      setError('Greška u vezi. Pokušajte ponovo.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="gadmin-overlay" onClick={onClose}>
      <div
        className="gadmin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gadmin-couple-pass-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="gadmin-modal-close" onClick={onClose} aria-label="Zatvori">
          <X size={20} />
        </button>
        <h3 id="gadmin-couple-pass-title">Šifra mladenaca — {gallery.title}</h3>

        {isDone ? (
          <>
            <p className="gadmin-hint">
              Šifra je promijenjena. Stara šifra više ne važi za novu prijavu;
              mladenci koji su već prijavljeni ostaju prijavljeni do isteka sesije (30 dana).
            </p>
            <div className="gadmin-modal-actions">
              <button type="button" className="gadmin-btn-primary" onClick={onClose}>
                U redu
              </button>
            </div>
          </>
        ) : (
          <form className="gadmin-form" onSubmit={handleSubmit}>
            <label className="gadmin-label" htmlFor="gadmin-couple-pass">Nova šifra</label>
            <input
              id="gadmin-couple-pass"
              className="gadmin-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min. 8 znakova"
              required
            />

            <label className="gadmin-label" htmlFor="gadmin-couple-pass-confirm">Potvrdi šifru</label>
            <input
              id="gadmin-couple-pass-confirm"
              className="gadmin-input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="ponovi šifru"
              required
            />

            {error && <div className="gadmin-error">{error}</div>}

            <button type="submit" className="gadmin-btn-primary" disabled={isSaving}>
              <KeyRound size={16} /> {isSaving ? 'Spremam...' : 'Promijeni šifru'}
            </button>
          </form>
        )}
      </div>
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
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
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
        template,
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

          <span className="gadmin-label" id="gadmin-template-label">Izgled</span>
          <div className="gadmin-template-grid" role="group" aria-labelledby="gadmin-template-label">
            {Object.entries(TEMPLATES).map(([id, t]) => (
              <button
                key={id}
                type="button"
                className={`gadmin-template-card${template === id ? ' is-selected' : ''}`}
                aria-pressed={template === id}
                onClick={() => setTemplate(id)}
              >
                <span className="gadmin-template-swatches">
                  <span className="gadmin-template-swatch" style={{ background: t.colors.bg }} />
                  <span className="gadmin-template-swatch" style={{ background: t.colors.accent }} />
                  <span className="gadmin-template-swatch" style={{ background: t.colors.text }} />
                </span>
                <span className="gadmin-template-name">{t.name}</span>
              </button>
            ))}
          </div>

          {error && <div className="gadmin-error">{error}</div>}

          <button type="submit" className="gadmin-btn-primary" disabled={isLoading}>
            {isLoading ? 'Kreiram...' : <><Plus size={18} /> Kreiraj galeriju</>}
          </button>
        </form>
      </div>
    </div>
  )
}

// --- Modal za upravljanje adminima (samo superadmin) ---

const USERNAME_RE = /^[a-z0-9_.-]{3,50}$/

function AdminsModal({ onClose }: { onClose: () => void }) {
  const [admins, setAdmins] = useState<AdminAccount[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [resetId, setResetId] = useState<number | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetError, setResetError] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [rowError, setRowError] = useState('')

  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newConfirm, setNewConfirm] = useState('')
  const [createError, setCreateError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoadError('')
    try {
      const res = await fetch('/api/admin/admins', { signal })
      if (res.ok) {
        const data = await res.json()
        setAdmins(data.admins)
      } else {
        setLoadError('Greška pri učitavanju admina.')
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setLoadError('Greška u vezi. Pokušajte ponovo.')
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  // Escape zatvara modal (dialog semantika).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const openReset = (id: number) => {
    setResetId(id)
    setResetPassword('')
    setResetConfirm('')
    setResetError('')
  }

  const submitReset = async (id: number) => {
    if (resetPassword.length < 8) {
      setResetError('Lozinka mora imati bar 8 znakova')
      return
    }
    if (resetPassword !== resetConfirm) {
      setResetError('Lozinke se ne podudaraju')
      return
    }
    setIsResetting(true)
    setResetError('')
    try {
      const res = await fetch(`/api/admin/admins/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword }),
      })
      if (res.ok) {
        setResetId(null)
      } else {
        const data = await res.json().catch(() => ({}))
        setResetError(data.error || 'Greška pri promjeni lozinke')
      }
    } catch {
      setResetError('Greška u vezi. Pokušajte ponovo.')
    } finally {
      setIsResetting(false)
    }
  }

  const handleDelete = async (admin: AdminAccount) => {
    if (!window.confirm(`Obrisati admina „${admin.username}”?`)) return
    setDeletingId(admin.id)
    setRowError('')
    try {
      const res = await fetch(`/api/admin/admins/${admin.id}`, { method: 'DELETE' })
      if (res.ok) {
        setAdmins((prev) => (prev ? prev.filter((a) => a.id !== admin.id) : prev))
      } else {
        const data = await res.json().catch(() => ({}))
        setRowError(data.error || 'Brisanje nije uspjelo.')
      }
    } catch {
      setRowError('Greška u vezi. Pokušajte ponovo.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const username = newUsername.trim().toLowerCase()

    if (!USERNAME_RE.test(username)) {
      setCreateError('Korisničko ime: 3-50 znakova, mala slova/brojevi/_.-')
      return
    }
    if (newPassword.length < 8) {
      setCreateError('Lozinka mora imati bar 8 znakova')
      return
    }
    if (newPassword !== newConfirm) {
      setCreateError('Lozinke se ne podudaraju')
      return
    }

    setIsCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: newPassword }),
      })
      if (res.ok) {
        setNewUsername('')
        setNewPassword('')
        setNewConfirm('')
        await load()
      } else {
        const data = await res.json().catch(() => ({}))
        setCreateError(data.error || 'Greška pri kreiranju admina')
      }
    } catch {
      setCreateError('Greška u vezi. Pokušajte ponovo.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="gadmin-overlay" onClick={onClose}>
      <div
        className="gadmin-modal gadmin-modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gadmin-admins-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="gadmin-modal-close" onClick={onClose} aria-label="Zatvori">
          <X size={20} />
        </button>
        <h3 id="gadmin-admins-title">Admini</h3>
        <p className="gadmin-hint">Upravljanje admin nalozima (dostupno samo superadminu).</p>

        {loadError && <div className="gadmin-error">{loadError}</div>}
        {rowError && <div className="gadmin-error">{rowError}</div>}

        <ul className="gadmin-admins-list">
          {admins === null && <li className="gadmin-hint">Učitavanje...</li>}
          {admins?.map((admin) => (
            <li key={admin.id} className="gadmin-admin-row">
              <div className="gadmin-admin-row-head">
                <span className="gadmin-admin-username">{admin.username}</span>
                {admin.role === 'super' ? (
                  <span className="gadmin-badge gadmin-badge-super">Superadmin</span>
                ) : (
                  <span className="gadmin-badge is-private">Admin</span>
                )}
                <span className="gadmin-admin-date">{formatDate(admin.created_at)}</span>
              </div>

              {admin.role !== 'super' && (
                <div className="gadmin-admin-row-actions">
                  <button
                    type="button"
                    className="gadmin-link-btn"
                    onClick={() => openReset(admin.id)}
                  >
                    <KeyRound size={14} /> Reset lozinke
                  </button>
                  <button
                    type="button"
                    className="gadmin-btn-danger-ghost"
                    onClick={() => handleDelete(admin)}
                    disabled={deletingId === admin.id}
                  >
                    <Trash2 size={14} /> {deletingId === admin.id ? 'Brišem...' : 'Obriši'}
                  </button>
                </div>
              )}

              {resetId === admin.id && (
                <div className="gadmin-admin-reset">
                  <input
                    className="gadmin-input"
                    type="password"
                    placeholder="Nova lozinka (min. 8 znakova)"
                    aria-label="Nova lozinka"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                  />
                  <input
                    className="gadmin-input"
                    type="password"
                    placeholder="Potvrdi lozinku"
                    aria-label="Potvrdi novu lozinku"
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                  />
                  {resetError && <div className="gadmin-error">{resetError}</div>}
                  <div className="gadmin-admin-reset-actions">
                    <button
                      type="button"
                      className="gadmin-btn-ghost"
                      onClick={() => setResetId(null)}
                      disabled={isResetting}
                    >
                      Odustani
                    </button>
                    <button
                      type="button"
                      className="gadmin-btn-primary"
                      onClick={() => submitReset(admin.id)}
                      disabled={isResetting}
                    >
                      {isResetting ? 'Spremam...' : 'Potvrdi'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        <h3 className="gadmin-admins-subheading">Novi admin</h3>
        <form className="gadmin-form" onSubmit={handleCreate}>
          <label className="gadmin-label" htmlFor="gadmin-new-username">Korisničko ime</label>
          <input
            id="gadmin-new-username"
            className="gadmin-input"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="npr. ana.admin"
            autoCapitalize="none"
            spellCheck={false}
            required
          />

          <label className="gadmin-label" htmlFor="gadmin-new-password">Lozinka</label>
          <input
            id="gadmin-new-password"
            className="gadmin-input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="min. 8 znakova"
            required
          />

          <label className="gadmin-label" htmlFor="gadmin-new-confirm">Potvrdi lozinku</label>
          <input
            id="gadmin-new-confirm"
            className="gadmin-input"
            type="password"
            value={newConfirm}
            onChange={(e) => setNewConfirm(e.target.value)}
            placeholder="ponovi lozinku"
            required
          />

          {createError && <div className="gadmin-error">{createError}</div>}

          <button type="submit" className="gadmin-btn-primary" disabled={isCreating}>
            {isCreating ? 'Kreiram...' : <><Plus size={18} /> Dodaj admina</>}
          </button>
        </form>
      </div>
    </div>
  )
}
