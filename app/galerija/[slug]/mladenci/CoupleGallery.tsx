'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  LogOut,
  Download,
  Trash2,
  ListChecks,
  X,
  Images,
  Play,
  AlertTriangle,
  PackageOpen,
} from 'lucide-react'
import type { ResolvedTheme } from '@/lib/gallery-themes'
import { themeToStyle } from '@/lib/gallery-themes'
import Lightbox, { type MediaItem } from '../Lightbox'
import './couple.css'

interface CoupleGalleryProps {
  slug: string
  title: string
  eventDate: string | null
  theme: ResolvedTheme
}

const BS_MONTHS = [
  'januara', 'februara', 'marta', 'aprila', 'maja', 'juna',
  'jula', 'augusta', 'septembra', 'oktobra', 'novembra', 'decembra',
]

function formatEventDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getDate()}. ${BS_MONTHS[date.getMonth()]} ${date.getFullYear()}.`
}

/** Prezentacijska pomoćna: "Atida & Ismet" -> ["Atida", "Ismet"] za istaknuti naslov. */
function splitCoupleNames(value: string): [string, string] | null {
  const parts = value.split(/\s*&\s*/)
  if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
    return [parts[0].trim(), parts[1].trim()]
  }
  return null
}

export default function CoupleGallery({ slug, title, eventDate, theme }: CoupleGalleryProps) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const formattedDate = formatEventDate(eventDate)
  const coupleNames = splitCoupleNames(title)
  const selectedCount = selected.size

  const refreshMedia = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/galerija/${encodeURIComponent(slug)}/mladenci/media`, {
        cache: 'no-store',
        signal,
      })
      if (!res.ok) return
      const data = (await res.json()) as { media?: MediaItem[] }
      setMedia(Array.isArray(data.media) ? data.media : [])
    } catch {
      // Tiho — grid ostaje prazan/star, korisnik može ručno osvježiti stranicu.
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    const controller = new AbortController()
    void refreshMedia(controller.signal)
    return () => controller.abort()
  }, [refreshMedia])

  // Escape zatvara confirm modal (dialog semantika).
  useEffect(() => {
    if (!confirmDelete) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) setConfirmDelete(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmDelete, isDeleting])

  // Scroll-lock dok je confirm modal otvoren (ista iOS-safe tehnika kao
  // Lightbox; confirm se otvara samo u selection modu pa se ne sudara s njim).
  useEffect(() => {
    if (!confirmDelete) return
    if (document.body.style.position === 'fixed') return
    const scrollY = window.scrollY
    const body = document.body
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    }
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.width = prev.width
      body.style.overflow = prev.overflow
      window.scrollTo(0, scrollY)
    }
  }, [confirmDelete])

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/couple-logout', { method: 'POST' })
    window.location.reload()
  }, [])

  const handleNavigate = useCallback(
    (dir: number) => {
      setLightboxIndex((prev) => {
        if (prev === null || media.length === 0) return prev
        return (prev + dir + media.length) % media.length
      })
    },
    [media.length]
  )

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) setSelected(new Set())
      return !prev
    })
  }, [])

  const handleTileClick = useCallback(
    (index: number) => {
      if (!selectionMode) {
        setLightboxIndex(index)
        return
      }
      const id = media[index]?.id
      if (id === undefined) return
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    },
    [selectionMode, media]
  )

  const confirmDeleteSelected = useCallback(async () => {
    setIsDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/galerija/${encodeURIComponent(slug)}/mladenci/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      if (res.ok) {
        setMedia((prev) => prev.filter((m) => !selected.has(m.id)))
        setSelected(new Set())
        setSelectionMode(false)
        setConfirmDelete(false)
      } else {
        const data = await res.json().catch(() => ({}))
        setDeleteError(data.error || 'Brisanje nije uspjelo.')
      }
    } catch {
      setDeleteError('Greška u vezi. Pokušajte ponovo.')
    } finally {
      setIsDeleting(false)
    }
  }, [slug, selected])

  const handleDownloadSelected = useCallback(() => {
    const items = media.filter((m) => selected.has(m.id))
    if (items.length === 0) return

    // Uvijek ZIP ruta, i za mali broj fajlova: browseri blokiraju višestruke
    // programske downloade bez svježeg korisničkog gesta po fajlu (Chrome
    // prikaže "downloads blocked" traku), pa je sekvencijalni pristup nepouzdan.
    const ids = items.map((m) => m.id).join(',')
    const a = document.createElement('a')
    a.href = `/api/galerija/${encodeURIComponent(slug)}/mladenci/zip?ids=${ids}`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }, [slug, media, selected])

  return (
    <main className="sf-couple" style={themeToStyle(theme) as React.CSSProperties}>
      <div className="sf-couple__atmosphere" aria-hidden="true" />

      <header className="sf-couple__header">
        <div className="sf-couple__header-text">
          {coupleNames ? (
            <h1 className="sf-couple__title">
              {coupleNames[0]}
              <span className="sf-couple__title-amp" aria-hidden="true">&amp;</span>
              {coupleNames[1]}
            </h1>
          ) : (
            <h1 className="sf-couple__title">{title}</h1>
          )}
          {formattedDate && <p className="sf-couple__date">{formattedDate}</p>}
        </div>
        <button type="button" className="sf-couple__logout" onClick={handleLogout}>
          <LogOut size={15} aria-hidden="true" />
          Odjava
        </button>
      </header>

      <div className="sf-couple__actionbar">
        {selectionMode ? (
          <>
            <span className="sf-couple__actionbar-count">{selectedCount} izabrano</span>
            <div className="sf-couple__actionbar-buttons">
              <button
                type="button"
                className="sf-couple__action-btn"
                onClick={handleDownloadSelected}
                disabled={selectedCount === 0}
              >
                <Download size={15} aria-hidden="true" />
                Preuzmi selektovano
              </button>
              <button
                type="button"
                className="sf-couple__action-btn sf-couple__action-btn--danger"
                onClick={() => setConfirmDelete(true)}
                disabled={selectedCount === 0}
              >
                <Trash2 size={15} aria-hidden="true" />
                Obriši selektovano
              </button>
              <button type="button" className="sf-couple__action-btn" onClick={toggleSelectionMode}>
                <X size={15} aria-hidden="true" />
                Otkaži
              </button>
            </div>
          </>
        ) : (
          <>
            {media.length > 0 ? (
              <a
                className="sf-couple__action-btn"
                href={`/api/galerija/${encodeURIComponent(slug)}/mladenci/zip`}
              >
                <PackageOpen size={15} aria-hidden="true" />
                Preuzmi sve (ZIP)
              </a>
            ) : (
              <button type="button" className="sf-couple__action-btn" disabled>
                <PackageOpen size={15} aria-hidden="true" />
                Preuzmi sve (ZIP)
              </button>
            )}
            <button
              type="button"
              className="sf-couple__action-btn"
              onClick={toggleSelectionMode}
              disabled={media.length === 0}
            >
              <ListChecks size={15} aria-hidden="true" />
              Selektuj
            </button>
          </>
        )}
      </div>

      {loading ? (
        <p className="sf-couple__grid-empty">Učitavanje...</p>
      ) : media.length === 0 ? (
        <div className="sf-couple__grid-empty">
          <Images size={28} aria-hidden="true" />
          <p>Još nema slika — podijelite QR kod sa gostima.</p>
        </div>
      ) : (
        <ul className="sf-gallery__grid sf-couple__grid">
          {media.map((m, index) => {
            const isSelected = selected.has(m.id)
            return (
              <li key={m.id} className="sf-gallery__tile">
                <button
                  type="button"
                  className={`sf-gallery__tile-btn${isSelected ? ' sf-couple__tile-btn--selected' : ''}`}
                  onClick={() => handleTileClick(index)}
                  aria-pressed={selectionMode ? isSelected : undefined}
                  aria-label={
                    m.mediaType === 'video'
                      ? `Otvori video${m.uploaderName ? ` — ${m.uploaderName}` : ''}`
                      : `Otvori sliku${m.uploaderName ? ` — ${m.uploaderName}` : ''}`
                  }
                >
                  {m.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.thumbUrl}
                      alt={m.uploaderName ? `Uspomena — ${m.uploaderName}` : 'Uspomena'}
                      loading="lazy"
                      decoding="async"
                      className="sf-gallery__tile-img"
                    />
                  ) : (
                    <span className="sf-gallery__tile-fallback" aria-hidden="true">
                      <Play size={26} />
                    </span>
                  )}
                  {m.mediaType === 'video' && (
                    <span className="sf-gallery__tile-badge" aria-hidden="true">
                      <Play size={14} />
                    </span>
                  )}
                  {selectionMode && (
                    <span
                      className={`sf-couple__tile-check${isSelected ? ' is-checked' : ''}`}
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {confirmDelete && (
        <div className="sf-couple__overlay" onClick={() => !isDeleting && setConfirmDelete(false)}>
          <div
            className="sf-couple__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sf-couple-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sf-couple__modal-icon">
              <AlertTriangle size={36} aria-hidden="true" />
            </div>
            <h3 id="sf-couple-confirm-title">
              Obrisati {selectedCount} {selectedCount === 1 ? 'sliku' : 'slika'}?
            </h3>
            <p>Ovo je trajno.</p>
            {deleteError && <p className="sf-couple__error">{deleteError}</p>}
            <div className="sf-couple__modal-actions">
              <button
                type="button"
                className="sf-couple__action-btn"
                onClick={() => setConfirmDelete(false)}
                disabled={isDeleting}
              >
                Odustani
              </button>
              <button
                type="button"
                className="sf-couple__action-btn sf-couple__action-btn--danger"
                onClick={confirmDeleteSelected}
                disabled={isDeleting}
              >
                <Trash2 size={15} aria-hidden="true" />
                {isDeleting ? 'Brišem...' : 'Obriši trajno'}
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxIndex !== null && media[lightboxIndex] && (
        <Lightbox
          media={media}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={handleNavigate}
        />
      )}
    </main>
  )
}
