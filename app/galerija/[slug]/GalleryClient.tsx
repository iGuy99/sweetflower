'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import {
  ImagePlus,
  X,
  RefreshCw,
  CircleAlert,
  Images,
  Play,
  ChevronLeft,
  ChevronRight,
  Heart,
  Download,
} from 'lucide-react'
import {
  uploadFile,
  UploadAbortedError,
  UploadError,
} from '@/lib/upload/multipart-uploader'
import type { ResolvedTheme } from '@/lib/gallery-themes'
import { themeToStyle, validateTheme, resolveTheme } from '@/lib/gallery-themes'

// --- Tipovi ---

interface GalleryClientProps {
  slug: string
  title: string
  eventDate: string | null
  isPublic: boolean
  theme: ResolvedTheme
  isPreview: boolean
}

type UploadStatus = 'queued' | 'uploading' | 'done' | 'error'

interface UploadItem {
  id: string
  name: string
  progress: number // 0..100
  status: UploadStatus
  error?: string
}

interface MediaItem {
  id: number
  mediaType: 'image' | 'video'
  thumbUrl: string | null
  url: string
  downloadUrl: string
  uploaderName: string | null
  fileName: string
  createdAt: string
}

/** Faza objedinjenog overlay-a. */
type OverlayPhase = 'idle' | 'active' | 'success' | 'error'

// --- Konstante ---

const MAX_FILE_CONCURRENCY = 2
const SUCCESS_AUTOCLOSE_MS = 2200
const SWIPE_THRESHOLD_PX = 50
const RING_RADIUS = 54
const RING_CIRC = 2 * Math.PI * RING_RADIUS

// --- Pomoćne ---

const BS_MONTHS = [
  'januara', 'februara', 'marta', 'aprila', 'maja', 'juna',
  'jula', 'augusta', 'septembra', 'oktobra', 'novembra', 'decembra',
]

function formatEventDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  // Ručno formatiranje (bosanski) — ne oslanja se na Intl locale podršku.
  return `${date.getDate()}. ${BS_MONTHS[date.getMonth()]} ${date.getFullYear()}.`
}

function errorMessage(err: unknown): string {
  if (err instanceof UploadAbortedError) return 'Otkazano'
  if (err instanceof UploadError) return err.message
  if (err instanceof Error) return err.message
  return 'Greška pri uploadu'
}

/** Prezentacijska pomoćna: "Atida & Ismet" -> ["Atida", "Ismet"] za istaknuti naslov. */
function splitCoupleNames(value: string): [string, string] | null {
  const parts = value.split(/\s*&\s*/)
  if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
    return [parts[0].trim(), parts[1].trim()]
  }
  return null
}

// --- Komponenta ---

export default function GalleryClient({
  slug,
  title,
  eventDate,
  isPublic,
  theme,
  isPreview,
}: GalleryClientProps) {
  const [uploaderName, setUploaderName] = useState('')
  const [items, setItems] = useState<UploadItem[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [mediaLoading, setMediaLoading] = useState(isPublic)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  // Tema uživo — mijenja se SAMO u preview modu (postMessage iz editora).
  const [liveTheme, setLiveTheme] = useState<ResolvedTheme>(theme)

  // Objedinjeni overlay: faza (izvedena iz stanja uploada) + ručno zatvaranje.
  const [overlayPhase, setOverlayPhase] = useState<OverlayPhase>('idle')
  const [overlayDismissed, setOverlayDismissed] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const filesRef = useRef<Map<string, File>>(new Map())
  const controllersRef = useRef<Map<string, AbortController>>(new Map())
  const queueRef = useRef<string[]>([])
  const activeRef = useRef(0)
  const nameRef = useRef('')
  const pumpRef = useRef<() => void>(() => {})
  const stoppedRef = useRef(false) // postavljeno na unmount — zaustavlja novi rad

  const formattedDate = formatEventDate(eventDate)
  const coupleNames = splitCoupleNames(title)

  // Agregatni napredak trenutne serije (queued + uploading + terminalni članovi serije).
  const activeCount = items.filter(
    (it) => it.status === 'queued' || it.status === 'uploading'
  ).length
  const errorCount = items.filter((it) => it.status === 'error').length
  const doneCount = items.filter((it) => it.status === 'done').length
  const totalCount = items.length
  const aggregatePercent =
    totalCount > 0
      ? Math.round(
          items.reduce((sum, it) => sum + it.progress, 0) / totalCount
        )
      : 0
  const currentNumber = Math.min(doneCount + 1, totalCount)
  const currentName =
    items.find((it) => it.status === 'uploading')?.name ??
    items.find((it) => it.status === 'queued')?.name ??
    ''

  const overlayVisible = !overlayDismissed && overlayPhase !== 'idle'

  // Drži najsvježije ime gosta dostupnim uploaderu bez re-kreiranja poslova.
  useEffect(() => {
    nameRef.current = uploaderName.trim()
  }, [uploaderName])

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    )
  }, [])

  const refreshMedia = useCallback(async () => {
    if (!isPublic) return
    try {
      const res = await fetch(
        `/api/galerija/${encodeURIComponent(slug)}/media`,
        { cache: 'no-store' }
      )
      if (!res.ok) return
      const data = (await res.json()) as { media?: MediaItem[] }
      setMedia(Array.isArray(data.media) ? data.media : [])
    } catch {
      // Tiho — grid je sekundaran; upload i dalje radi.
    } finally {
      setMediaLoading(false)
    }
  }, [isPublic, slug])

  const runUpload = useCallback(
    async (id: string) => {
      const file = filesRef.current.get(id)
      if (!file) {
        activeRef.current -= 1
        pumpRef.current()
        return
      }

      const controller = new AbortController()
      controllersRef.current.set(id, controller)
      updateItem(id, { status: 'uploading', progress: 0, error: undefined })

      try {
        await uploadFile(slug, file, {
          uploaderName: nameRef.current || undefined,
          signal: controller.signal,
          onProgress: (fraction) =>
            updateItem(id, { progress: Math.round(fraction * 100) }),
        })
        updateItem(id, { status: 'done', progress: 100 })
        // Uspješan fajl više ne treba u memoriji (može biti do 1GB).
        filesRef.current.delete(id)
        void refreshMedia()
      } catch (err) {
        updateItem(id, { status: 'error', error: errorMessage(err) })
      } finally {
        controllersRef.current.delete(id)
        activeRef.current -= 1
        pumpRef.current()
      }
    },
    [slug, updateItem, refreshMedia]
  )

  const pump = useCallback(() => {
    if (stoppedRef.current) return
    while (
      activeRef.current < MAX_FILE_CONCURRENCY &&
      queueRef.current.length > 0
    ) {
      const id = queueRef.current.shift()
      if (id === undefined) break
      activeRef.current += 1
      void runUpload(id)
    }
  }, [runUpload])

  useEffect(() => {
    pumpRef.current = pump
  }, [pump])

  useEffect(() => {
    void refreshMedia()
  }, [refreshMedia])

  // Preview mod: editor šalje temu preko postMessage sa istog origina —
  // primijeni je uživo bez refresha stranice.
  useEffect(() => {
    if (!isPreview) return
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      // Editor je roditelj iframe-a — poruke iz drugih izvora se odbijaju.
      if (e.source !== window.parent) return
      if (e.data?.type !== 'sf-theme-preview') return
      // Revalidacija payload-a: i preview putanja mora proći kroz validateTheme,
      // da nevalidirane vrijednosti nikad ne uđu u inline style.
      const validated = validateTheme(e.data.payload)
      if (!validated) return
      setLiveTheme(resolveTheme(validated))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [isPreview])

  // Na unmount: zaustavi queue i otkaži sve tekuće uploade (da se ne nastave
  // u pozadini na stranici koju je gost napustio).
  useEffect(() => {
    const controllers = controllersRef.current
    return () => {
      stoppedRef.current = true
      queueRef.current = []
      controllers.forEach((c) => c.abort())
    }
  }, [])

  // Vodi fazu overlay-a iz agregatnog stanja. Transacija u success/error samo
  // kad je serija bila aktivna, pa se ne "vaskrsava" nakon zatvaranja.
  useEffect(() => {
    if (activeCount > 0) {
      setOverlayPhase('active')
      return
    }
    setOverlayPhase((prev) => {
      if (prev !== 'active') return prev
      if (errorCount > 0) return 'error'
      if (doneCount > 0) return 'success'
      return 'idle'
    })
  }, [activeCount, errorCount, doneCount])

  // Samozatvaranje overlay-a nakon poruke zahvalnosti.
  useEffect(() => {
    if (overlayPhase !== 'success' || overlayDismissed) return
    const t = setTimeout(() => setOverlayDismissed(true), SUCCESS_AUTOCLOSE_MS)
    return () => clearTimeout(t)
  }, [overlayPhase, overlayDismissed])

  // Zaključaj scroll pozadine dok je lightbox ili overlay otvoren (iOS-safe:
  // position:fixed na body-ju spriječava i "rubber-band" skrolanje ispod).
  useEffect(() => {
    const locked = lightboxIndex !== null || overlayVisible
    if (!locked) return
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
  }, [lightboxIndex, overlayVisible])

  const handleFilesSelected = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const list = event.target.files
      if (!list || list.length === 0) return

      const added: UploadItem[] = []
      for (const file of Array.from(list)) {
        const id =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`
        filesRef.current.set(id, file)
        queueRef.current.push(id)
        added.push({ id, name: file.name, progress: 0, status: 'queued' })
      }

      // Nova serija: odbaci terminalne (done/error) redove iz prethodne serije
      // da agregatni napredak i brojač ostanu tačni, i oslobodi njihove fajlove.
      setItems((prev) => {
        const kept = prev.filter(
          (it) => it.status === 'queued' || it.status === 'uploading'
        )
        const keptIds = new Set(kept.map((k) => k.id))
        for (const it of prev) {
          if (!keptIds.has(it.id) && !added.some((a) => a.id === it.id)) {
            filesRef.current.delete(it.id)
          }
        }
        return [...kept, ...added]
      })
      setOverlayDismissed(false)
      // Dozvoli ponovni odabir istih fajlova.
      event.target.value = ''
      pump()
    },
    [pump]
  )

  const handleRetryAll = useCallback(() => {
    let requeued = false
    setItems((prev) =>
      prev.map((it) => {
        if (it.status !== 'error') return it
        if (!filesRef.current.has(it.id)) return it
        queueRef.current.push(it.id)
        requeued = true
        return { ...it, status: 'queued', progress: 0, error: undefined }
      })
    )
    if (requeued) {
      setOverlayDismissed(false)
      pump()
    }
  }, [pump])

  const handleCancelAll = useCallback(() => {
    // Zatvori overlay odmah i zaustavi sve; abort catch-evi postavljaju terminalni
    // status u pozadini, ali overlay ostaje skriven jer je ručno odbačen.
    setOverlayDismissed(true)
    queueRef.current = []
    controllersRef.current.forEach((c) => c.abort())
  }, [])

  const closeOverlay = useCallback(() => setOverlayDismissed(true), [])

  const openPicker = useCallback(() => {
    fileInputRef.current?.click()
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

  const closeLightbox = useCallback(() => setLightboxIndex(null), [])

  return (
    <main
      className="sf-gallery"
      style={themeToStyle(liveTheme) as React.CSSProperties}
      data-frame={liveTheme.decor.viewportFrame ? undefined : 'off'}
      data-ornaments={liveTheme.decor.ornaments ? undefined : 'off'}
      data-script-amp={liveTheme.decor.scriptAmp ? undefined : 'off'}
    >
      <div className="sf-gallery__atmosphere" aria-hidden="true" />

      <div className="sf-gallery__container">
        <header className="sf-gallery__hero">
          <span className="sf-gallery__eyebrow sf-gallery__fade sf-gallery__fade--1">
            <span className="sf-gallery__eyebrow-dot" aria-hidden="true" />
            {liveTheme.texts.tagline}
          </span>

          {coupleNames ? (
            <h1 className="sf-gallery__title sf-gallery__fade sf-gallery__fade--2">
              <span className="sf-gallery__title-name">{coupleNames[0]}</span>
              <span className="sf-gallery__title-amp" aria-hidden="true">
                &amp;
              </span>
              <span className="sf-gallery__title-name">{coupleNames[1]}</span>
            </h1>
          ) : (
            <h1 className="sf-gallery__title sf-gallery__fade sf-gallery__fade--2">
              {title}
            </h1>
          )}

          <span
            className="sf-gallery__ornament sf-gallery__fade sf-gallery__fade--2"
            aria-hidden="true"
          >
            <span className="sf-gallery__ornament-dot" />
          </span>

          {formattedDate && (
            <span className="sf-gallery__promise sf-gallery__fade sf-gallery__fade--2">
              {formattedDate}
            </span>
          )}
          <p className="sf-gallery__lede sf-gallery__fade sf-gallery__fade--3">
            {liveTheme.texts.welcome}
          </p>
        </header>

        <section
          className="sf-gallery__uploader sf-gallery__fade sf-gallery__fade--3"
          aria-label="Dodavanje slika i videa"
        >
          <div className="sf-gallery__name-field">
            <label htmlFor="uploaderName" className="sf-gallery__label">
              Vaše ime (opcionalno)
            </label>
            <input
              id="uploaderName"
              type="text"
              className="sf-gallery__input"
              placeholder="npr. Amar i Zara"
              value={uploaderName}
              maxLength={80}
              onChange={(e) => setUploaderName(e.target.value)}
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="sf-gallery__file-input"
            onChange={handleFilesSelected}
          />

          <button
            type="button"
            className="sf-gallery__cta"
            onClick={openPicker}
          >
            <ImagePlus size={20} aria-hidden="true" />
            {liveTheme.texts.buttonLabel}
          </button>
        </section>

        {isPublic || isPreview ? (
          <MediaGallery
            media={media}
            loading={mediaLoading}
            onOpen={setLightboxIndex}
            isPreview={isPreview}
          />
        ) : (
          <section className="sf-gallery__private">
            <p className="sf-gallery__private-note">
              Vaše slike vidljive su mladencima.
            </p>
          </section>
        )}
      </div>

      {overlayVisible && (
        <UploadOverlay
          phase={overlayPhase}
          percent={aggregatePercent}
          currentNumber={currentNumber}
          totalCount={totalCount}
          currentName={currentName}
          errorCount={errorCount}
          doneCount={doneCount}
          onCancelAll={handleCancelAll}
          onRetryAll={handleRetryAll}
          onClose={closeOverlay}
        />
      )}

      {lightboxIndex !== null && media[lightboxIndex] && (
        <Lightbox
          media={media}
          index={lightboxIndex}
          onClose={closeLightbox}
          onNavigate={handleNavigate}
        />
      )}
    </main>
  )
}

// --- Objedinjeni fullscreen loader ---

interface UploadOverlayProps {
  phase: OverlayPhase
  percent: number
  currentNumber: number
  totalCount: number
  currentName: string
  errorCount: number
  doneCount: number
  onCancelAll: () => void
  onRetryAll: () => void
  onClose: () => void
}

function UploadOverlay({
  phase,
  percent,
  currentNumber,
  totalCount,
  currentName,
  errorCount,
  doneCount,
  onCancelAll,
  onRetryAll,
  onClose,
}: UploadOverlayProps) {
  const isActive = phase === 'active'
  const ringPercent = phase === 'success' ? 100 : percent
  const dashOffset = RING_CIRC * (1 - ringPercent / 100)

  return (
    <div
      className={`sf-overlay sf-overlay--${phase}`}
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label="Napredak slanja"
    >
      <div className="sf-overlay__panel">
        {isActive && (
          <>
            <div className="sf-overlay__ring" aria-hidden="true">
              <svg viewBox="0 0 120 120" className="sf-overlay__ring-svg">
                <circle
                  className="sf-overlay__ring-track"
                  cx="60"
                  cy="60"
                  r={RING_RADIUS}
                />
                <circle
                  className="sf-overlay__ring-progress"
                  cx="60"
                  cy="60"
                  r={RING_RADIUS}
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <div className="sf-overlay__ring-label">
                <span className="sf-overlay__percent">{percent}</span>
                <span className="sf-overlay__percent-sign">%</span>
              </div>
            </div>

            <p className="sf-overlay__status">
              Uploadujem {currentNumber} od {totalCount}
            </p>
            {currentName && (
              <p className="sf-overlay__file" title={currentName}>
                {currentName}
              </p>
            )}
            <button
              type="button"
              className="sf-overlay__link"
              onClick={onCancelAll}
            >
              Otkaži
            </button>
          </>
        )}

        {phase === 'success' && (
          <>
            <div className="sf-overlay__ring" aria-hidden="true">
              <svg viewBox="0 0 120 120" className="sf-overlay__ring-svg">
                <circle
                  className="sf-overlay__ring-track"
                  cx="60"
                  cy="60"
                  r={RING_RADIUS}
                />
                <circle
                  className="sf-overlay__ring-progress sf-overlay__ring-progress--done"
                  cx="60"
                  cy="60"
                  r={RING_RADIUS}
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={0}
                />
              </svg>
              <div className="sf-overlay__ring-label">
                <Heart
                  size={40}
                  className="sf-overlay__heart"
                  aria-hidden="true"
                />
              </div>
            </div>
            <p className="sf-overlay__thanks">Hvala! Vaše slike su poslane</p>
            <p className="sf-overlay__file">
              {doneCount === 1
                ? 'Sačuvana je 1 uspomena'
                : `Sačuvano je ${doneCount} uspomena`}
            </p>
            <button
              type="button"
              className="sf-overlay__btn"
              onClick={onClose}
            >
              Zatvori
            </button>
          </>
        )}

        {phase === 'error' && (
          <>
            <div className="sf-overlay__icon-badge" aria-hidden="true">
              <CircleAlert size={44} />
            </div>
            <p className="sf-overlay__status">
              {errorCount === 1
                ? '1 fajl nije uspio'
                : `${errorCount} fajla nije uspjelo`}
            </p>
            {doneCount > 0 && (
              <p className="sf-overlay__file">
                {doneCount === 1
                  ? '1 uspomena je ipak poslana'
                  : `${doneCount} uspomena je ipak poslano`}
              </p>
            )}
            <div className="sf-overlay__actions">
              <button
                type="button"
                className="sf-overlay__btn"
                onClick={onRetryAll}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Pokušaj ponovo
              </button>
              <button
                type="button"
                className="sf-overlay__btn sf-overlay__btn--ghost"
                onClick={onClose}
              >
                Zatvori
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// --- Grid galerije ---

interface MediaGalleryProps {
  media: MediaItem[]
  loading: boolean
  onOpen: (index: number) => void
  isPreview: boolean
}

function MediaGallery({ media, loading, onOpen, isPreview }: MediaGalleryProps) {
  return (
    <section className="sf-gallery__grid-section" aria-label="Galerija uspomena">
      <div className="sf-gallery__grid-header">
        <span className="sf-gallery__eyebrow">
          <span className="sf-gallery__eyebrow-dot" aria-hidden="true" />
          Zajedničke uspomene
        </span>
        <h2 className="sf-gallery__subtitle">Galerija</h2>
        <span
          className="sf-gallery__ornament sf-gallery__ornament--sm"
          aria-hidden="true"
        >
          <span className="sf-gallery__ornament-dot" />
        </span>
      </div>

      {loading ? (
        <p className="sf-gallery__grid-empty">Učitavanje…</p>
      ) : media.length === 0 && isPreview ? (
        // Preview mod (editor): prazna/privatna galerija — pokaži demo grid
        // umjesto praznog stanja da se vidi kako izgled sjeda uz stvarne fajlove.
        <ul className="sf-gallery__grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="sf-gallery__tile sf-gallery__tile--demo" />
          ))}
        </ul>
      ) : media.length === 0 ? (
        <div className="sf-gallery__grid-empty">
          <Images size={28} aria-hidden="true" />
          <p>Još nema uspomena. Budite prvi koji će podijeliti trenutak.</p>
        </div>
      ) : (
        <ul className="sf-gallery__grid">
          {media.map((m, index) => (
            <li key={m.id} className="sf-gallery__tile">
              <button
                type="button"
                className="sf-gallery__tile-btn"
                onClick={() => onOpen(index)}
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
                    alt={
                      m.uploaderName ? `Uspomena — ${m.uploaderName}` : 'Uspomena'
                    }
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
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// --- Lightbox ---

interface LightboxProps {
  media: MediaItem[]
  index: number
  onClose: () => void
  onNavigate: (dir: number) => void
}

function Lightbox({ media, index, onClose, onNavigate }: LightboxProps) {
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
        img.src = neighbor.url
      }
    }
  }, [index, media, total])

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
