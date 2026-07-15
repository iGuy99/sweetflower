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

// Preko ovoliko selektovanih fajlova, sekvencijalni pojedinačni download
// postaje nepraktičan — koristi se ZIP ruta umjesto toga (Faza E).
const DIRECT_DOWNLOAD_MAX = 5

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
  const [isDownloading, setIsDownloading] = useState(false)

  const formattedDate = formatEventDate(eventDate)
  const coupleNames = splitCoupleNames(title)
  const selectedCount = selected.size

  const refreshMedia = useCallback(async () => {
    try {
      const res = await fetch(`/api/galerija/${encodeURIComponent(slug)}/mladenci/media`, {
        cache: 'no-store',
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
    void refreshMedia()
  }, [refreshMedia])

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

  const handleDownloadSelected = useCallback(async () => {
    const items = media.filter((m) => selected.has(m.id))
    if (items.length === 0) return

    // > 5 fajlova: ZIP ruta (jedan HTTP zahtjev, server streamuje arhivu).
    if (items.length > DIRECT_DOWNLOAD_MAX) {
      const ids = items.map((m) => m.id).join(',')
      const a = document.createElement('a')
      a.href = `/api/galerija/${encodeURIComponent(slug)}/mladenci/zip?ids=${ids}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      return
    }

    setIsDownloading(true)
    try {
      // ≤ 5 fajlova: sekvencijalni pojedinačni download (mali razmak da
      // browser ne blokira višestruke automatske downloade).
      for (const item of items) {
        const a = document.createElement('a')
        a.href = item.downloadUrl
        a.download = item.fileName
        document.body.appendChild(a)
        a.click()
        a.remove()
        await sleep(150)
      }
    } finally {
      setIsDownloading(false)
    }
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
                disabled={selectedCount === 0 || isDownloading}
              >
                <Download size={15} aria-hidden="true" />
                {isDownloading ? 'Preuzimam...' : 'Preuzmi selektovano'}
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
          <div className="sf-couple__modal" onClick={(e) => e.stopPropagation()}>
            <div className="sf-couple__modal-icon">
              <AlertTriangle size={36} aria-hidden="true" />
            </div>
            <h3>Obrisati {selectedCount} {selectedCount === 1 ? 'sliku' : 'slika'}?</h3>
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
