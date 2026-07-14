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
  CircleCheckBig,
  CircleAlert,
  LoaderCircle,
  Play,
  Images,
} from 'lucide-react'
import {
  uploadFile,
  UploadAbortedError,
  UploadError,
} from '@/lib/upload/multipart-uploader'

// --- Tipovi ---

interface GalleryClientProps {
  slug: string
  title: string
  eventDate: string | null
  isPublic: boolean
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
  uploaderName: string | null
  fileName: string
  createdAt: string
}

// --- Konstante ---

const MAX_FILE_CONCURRENCY = 2

// --- Pomoćne ---

function formatEventDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('hr-HR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function errorMessage(err: unknown): string {
  if (err instanceof UploadAbortedError) return 'Otkazano'
  if (err instanceof UploadError) return err.message
  if (err instanceof Error) return err.message
  return 'Greška pri uploadu'
}

// --- Komponenta ---

export default function GalleryClient({
  slug,
  title,
  eventDate,
  isPublic,
}: GalleryClientProps) {
  const [uploaderName, setUploaderName] = useState('')
  const [items, setItems] = useState<UploadItem[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [mediaLoading, setMediaLoading] = useState(isPublic)
  const [lightbox, setLightbox] = useState<MediaItem | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const filesRef = useRef<Map<string, File>>(new Map())
  const controllersRef = useRef<Map<string, AbortController>>(new Map())
  const queueRef = useRef<string[]>([])
  const activeRef = useRef(0)
  const nameRef = useRef('')
  const pumpRef = useRef<() => void>(() => {})
  const stoppedRef = useRef(false) // postavljeno na unmount — zaustavlja novi rad

  const formattedDate = formatEventDate(eventDate)
  const doneCount = items.filter((it) => it.status === 'done').length

  // Drži najsvježije ime gosta dostupnim uploaderu bez re-kreiranja poslova.
  useEffect(() => {
    nameRef.current = uploaderName.trim()
  }, [uploaderName])

  const updateItem = useCallback(
    (id: string, patch: Partial<UploadItem>) => {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
      )
    },
    []
  )

  const refreshMedia = useCallback(async () => {
    if (!isPublic) return
    try {
      const res = await fetch(`/api/galerija/${encodeURIComponent(slug)}/media`, {
        cache: 'no-store',
      })
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

      setItems((prev) => [...prev, ...added])
      // Dozvoli ponovni odabir istih fajlova.
      event.target.value = ''
      pump()
    },
    [pump]
  )

  const handleRetry = useCallback(
    (id: string) => {
      if (!filesRef.current.has(id)) return
      updateItem(id, { status: 'queued', progress: 0, error: undefined })
      queueRef.current.push(id)
      pump()
    },
    [pump, updateItem]
  )

  const handleCancel = useCallback(
    (id: string) => {
      queueRef.current = queueRef.current.filter((qid) => qid !== id)
      const controller = controllersRef.current.get(id)
      if (controller) {
        controller.abort() // runUpload catch postavlja terminalni status
      } else {
        // Fajl je još čekao u redu — nema uploada za prekinuti, pa ga sami označi.
        updateItem(id, { status: 'error', error: 'Otkazano', progress: 0 })
      }
    },
    [updateItem]
  )

  const openPicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <main className="sf-gallery">
      <div className="sf-gallery__atmosphere" aria-hidden="true" />

      <div className="sf-gallery__container">
        <header className="sf-gallery__hero">
          <p className="sf-gallery__eyebrow">Podijelite uspomene</p>
          <h1 className="sf-gallery__title">{title}</h1>
          {formattedDate && (
            <p className="sf-gallery__date">{formattedDate}</p>
          )}
          <p className="sf-gallery__lede">
            Pomozite mladencima da sačuvaju svaki trenutak — dodajte slike i
            video zapise koje ste snimili.
          </p>
        </header>

        <section className="sf-gallery__uploader" aria-label="Dodavanje slika i videa">
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
            Dodajte vaše slike i video
          </button>

          {items.length > 0 && (
            <ul className="sf-gallery__file-list">
              {items.map((item) => (
                <UploadRow
                  key={item.id}
                  item={item}
                  onRetry={handleRetry}
                  onCancel={handleCancel}
                />
              ))}
            </ul>
          )}

          {doneCount > 0 && (
            <p className="sf-gallery__thanks" role="status">
              Hvala vam! {doneCount === 1 ? 'Vaša uspomena je' : `${doneCount} uspomena je`}{' '}
              poslano mladencima.
            </p>
          )}
        </section>

        {isPublic ? (
          <MediaGallery
            media={media}
            loading={mediaLoading}
            onOpen={setLightbox}
          />
        ) : (
          <section className="sf-gallery__private">
            <p className="sf-gallery__private-note">
              Vaše slike vidljive su mladencima.
            </p>
          </section>
        )}
      </div>

      {lightbox && (
        <Lightbox item={lightbox} onClose={() => setLightbox(null)} />
      )}
    </main>
  )
}

// --- Red za jedan fajl ---

interface UploadRowProps {
  item: UploadItem
  onRetry: (id: string) => void
  onCancel: (id: string) => void
}

function statusLabel(status: UploadStatus): string {
  switch (status) {
    case 'queued':
      return 'Čeka'
    case 'uploading':
      return 'Uploaduje'
    case 'done':
      return 'Gotovo'
    case 'error':
      return 'Greška'
  }
}

function UploadRow({ item, onRetry, onCancel }: UploadRowProps) {
  const { id, name, progress, status, error } = item

  return (
    <li className={`sf-file sf-file--${status}`}>
      <div className="sf-file__icon" aria-hidden="true">
        {status === 'done' && <CircleCheckBig size={18} />}
        {status === 'error' && <CircleAlert size={18} />}
        {status === 'uploading' && (
          <LoaderCircle size={18} className="sf-file__spinner" />
        )}
        {status === 'queued' && <LoaderCircle size={18} />}
      </div>

      <div className="sf-file__body">
        <div className="sf-file__head">
          <span className="sf-file__name" title={name}>
            {name}
          </span>
          <span className="sf-file__status">
            {status === 'error' && error ? error : statusLabel(status)}
          </span>
        </div>

        <div
          className="sf-file__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label={`Napredak za ${name}`}
        >
          <div
            className="sf-file__bar-fill"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>
      </div>

      <div className="sf-file__actions">
        {status === 'error' && (
          <button
            type="button"
            className="sf-file__action"
            aria-label={`Pokušaj ponovo: ${name}`}
            onClick={() => onRetry(id)}
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
        )}
        {(status === 'uploading' || status === 'queued') && (
          <button
            type="button"
            className="sf-file__action"
            aria-label={`Otkaži: ${name}`}
            onClick={() => onCancel(id)}
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  )
}

// --- Grid galerije ---

interface MediaGalleryProps {
  media: MediaItem[]
  loading: boolean
  onOpen: (item: MediaItem) => void
}

function MediaGallery({ media, loading, onOpen }: MediaGalleryProps) {
  return (
    <section className="sf-gallery__grid-section" aria-label="Galerija uspomena">
      <div className="sf-gallery__grid-header">
        <p className="sf-gallery__eyebrow">Zajedničke uspomene</p>
        <h2 className="sf-gallery__subtitle">Galerija</h2>
      </div>

      {loading ? (
        <p className="sf-gallery__grid-empty">Učitavanje…</p>
      ) : media.length === 0 ? (
        <div className="sf-gallery__grid-empty">
          <Images size={28} aria-hidden="true" />
          <p>Još nema uspomena. Budite prvi koji će podijeliti trenutak.</p>
        </div>
      ) : (
        <ul className="sf-gallery__grid">
          {media.map((m) => (
            <li key={m.id} className="sf-gallery__tile">
              <button
                type="button"
                className="sf-gallery__tile-btn"
                onClick={() => onOpen(m)}
                aria-label={
                  m.mediaType === 'video'
                    ? `Otvori video${m.uploaderName ? ` — ${m.uploaderName}` : ''}`
                    : `Otvori sliku${m.uploaderName ? ` — ${m.uploaderName}` : ''}`
                }
              >
                {m.thumbUrl ? (
                  <img
                    src={m.thumbUrl}
                    alt={m.uploaderName ? `Uspomena — ${m.uploaderName}` : 'Uspomena'}
                    loading="lazy"
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
  item: MediaItem
  onClose: () => void
}

function Lightbox({ item, onClose }: LightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

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

      <div className="sf-lightbox__stage" onClick={(e) => e.stopPropagation()}>
        {item.mediaType === 'video' ? (
          <video
            className="sf-lightbox__media"
            src={item.url}
            controls
            autoPlay
            playsInline
          />
        ) : (
          <img
            className="sf-lightbox__media"
            src={item.url}
            alt={item.uploaderName ? `Uspomena — ${item.uploaderName}` : 'Uspomena'}
          />
        )}
        {item.uploaderName && (
          <p className="sf-lightbox__caption">{item.uploaderName}</p>
        )}
      </div>
    </div>
  )
}
