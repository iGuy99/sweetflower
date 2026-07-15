'use client'

import { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react'

// --- Tipovi ---
// Premješteno iz GalleryClient.tsx (čisto premještanje, bez promjene logike)
// — dijeli ga i guest stranica i mladenci stranica (Faza C).

export interface MediaItem {
  id: number
  mediaType: 'image' | 'video'
  thumbUrl: string | null
  url: string
  downloadUrl: string
  uploaderName: string | null
  fileName: string
  createdAt: string
}

// --- Konstante ---

const SWIPE_THRESHOLD_PX = 50

// --- Lightbox ---

interface LightboxProps {
  media: MediaItem[]
  index: number
  onClose: () => void
  onNavigate: (dir: number) => void
}

export default function Lightbox({ media, index, onClose, onNavigate }: LightboxProps) {
  const item = media[index]
  const total = media.length
  const hasSiblings = total > 1
  // Blur-up: izvedeno iz URL-a koji se učitao (bez reset-efekta na navigaciju).
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const fullLoaded = loadedUrl === item.url
  const touchStartX = useRef<number | null>(null)

  // Tipke: strelice + Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') onNavigate(-1)
      else if (e.key === 'ArrowRight') onNavigate(1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, onNavigate])

  // Preload susjednih punih slika (prethodna + sljedeća) radi brže navigacije.
  useEffect(() => {
    if (total === 0) return
    for (const dir of [-1, 1]) {
      const neighbor = media[(index + dir + total) % total]
      if (neighbor && neighbor.mediaType === 'image') {
        const img = new window.Image()
        // Nizak prioritet: preload ne smije konkurisati mreži/dekodiranju
        // trenutno prikazane slike (posebno na mobilnoj vezi).
        img.setAttribute('fetchpriority', 'low')
        img.src = neighbor.url
      }
    }
  }, [index, media, total])

  // Zaključaj scroll pozadine dok je lightbox otvoren (iOS-safe: position:fixed
  // na body-ju spriječava i "rubber-band" skrolanje ispod). Vlastiti mount/unmount
  // lock — ne prati navigaciju unutar lightboxa (index se mijenja bez re-locka).
  useEffect(() => {
    // No-op siguran: ako je body već fiksiran (npr. overlay lock u roditelju),
    // ne dupliraj lock — teoretski slučaj koji se u praksi ne dešava.
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
  }, [])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current
    touchStartX.current = null
    if (start === null || !hasSiblings) return
    const dx = (e.changedTouches[0]?.clientX ?? start) - start
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return
    onNavigate(dx < 0 ? 1 : -1)
  }

  return (
    <div
      className="sf-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Pregled uspomene"
      onClick={onClose}
    >
      <button
        type="button"
        className="sf-lightbox__close"
        aria-label="Zatvori"
        onClick={onClose}
      >
        <X size={22} aria-hidden="true" />
      </button>

      {hasSiblings && (
        <button
          type="button"
          className="sf-lightbox__nav sf-lightbox__nav--prev"
          aria-label="Prethodna"
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(-1)
          }}
        >
          <ChevronLeft size={26} aria-hidden="true" />
        </button>
      )}

      <div
        className="sf-lightbox__stage"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {item.mediaType === 'video' ? (
          <video
            className="sf-lightbox__media"
            src={item.url}
            controls
            autoPlay
            playsInline
          />
        ) : (
          <div className="sf-lightbox__frame">
            {item.thumbUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={`sf-lightbox__blur${
                  fullLoaded ? ' is-hidden' : ''
                }`}
                src={item.thumbUrl}
                alt=""
                aria-hidden="true"
              />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={`sf-lightbox__media sf-lightbox__full${
                fullLoaded ? ' is-loaded' : ''
              }`}
              src={item.url}
              alt={
                item.uploaderName ? `Uspomena — ${item.uploaderName}` : 'Uspomena'
              }
              decoding="async"
              fetchPriority="high"
              onLoad={() => setLoadedUrl(item.url)}
            />
          </div>
        )}

        <div className="sf-lightbox__meta">
          <a
            className="sf-lightbox__download"
            href={item.downloadUrl}
            download={item.fileName}
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={16} aria-hidden="true" />
            Preuzmi
          </a>
          <div className="sf-lightbox__meta-text">
            {item.uploaderName && (
              <p className="sf-lightbox__caption">{item.uploaderName}</p>
            )}
            {hasSiblings && (
              <p className="sf-lightbox__counter">
                {index + 1} / {total}
              </p>
            )}
          </div>
        </div>
      </div>

      {hasSiblings && (
        <button
          type="button"
          className="sf-lightbox__nav sf-lightbox__nav--next"
          aria-label="Sljedeća"
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(1)
          }}
        >
          <ChevronRight size={26} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
