'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Undo2,
  Smartphone,
  Monitor,
} from 'lucide-react'
import {
  resolveTheme,
  TEMPLATES,
  DEFAULT_TEMPLATE,
  DEFAULT_TEXTS,
  TEXT_LIMITS,
  DISPLAY_FONTS,
  BODY_FONTS,
  SCRIPT_FONTS,
  type GalleryTheme,
  type ThemeColors,
  type ThemeFonts,
  type ThemeTexts,
  type ThemeDecor,
} from '@/lib/gallery-themes'
import './theme-editor.css'

interface Props {
  galleryId: number
  slug: string
  title: string
  initialTheme: GalleryTheme | null
}

const COLOR_GROUPS: { title: string; keys: (keyof ThemeColors)[] }[] = [
  { title: 'Pozadine', keys: ['bg', 'bgSoft', 'surface'] },
  { title: 'Akcenat', keys: ['accent', 'accentDeep'] },
  { title: 'Tekst', keys: ['text', 'textSoft', 'muted'] },
  { title: 'Dugme', keys: ['button', 'buttonText'] },
  { title: 'Lightbox', keys: ['lightbox'] },
]

const COLOR_LABELS: Record<keyof ThemeColors, string> = {
  bg: 'Pozadina',
  bgSoft: 'Pozadina (atmosfera)',
  surface: 'Površina',
  accent: 'Akcent',
  accentDeep: 'Akcent (tamniji)',
  text: 'Tekst',
  textSoft: 'Tekst (podnaslov)',
  muted: 'Meta tekst',
  button: 'Dugme',
  buttonText: 'Tekst na dugmetu',
  lightbox: 'Lightbox',
}

const DECOR_LABELS: { key: keyof ThemeDecor; label: string }[] = [
  { key: 'viewportFrame', label: 'Okvir oko stranice' },
  { key: 'ornaments', label: 'Ornamenti' },
  { key: 'scriptAmp', label: "Ukrasni „&”" },
]

export default function ThemeEditor({ galleryId, slug, title, initialTheme }: Props) {
  const [theme, setTheme] = useState<GalleryTheme>(initialTheme ?? { template: DEFAULT_TEMPLATE })
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [viewMode, setViewMode] = useState<'phone' | 'desktop'>('phone')
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const resolved = resolveTheme(theme) // izvedeno pri renderu, ne u useEffectu

  const pushPreview = useCallback(
    (next: GalleryTheme) => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'sf-theme-preview', payload: resolveTheme(next) },
        window.location.origin
      )
    },
    []
  )

  const applyTheme = useCallback(
    (next: GalleryTheme) => {
      setTheme(next)
      setIsDirty(true)
      pushPreview(next)
    },
    [pushPreview]
  )

  const selectTemplate = useCallback(
    (id: string) => applyTheme({ template: id }),
    [applyTheme]
  )

  const clearOverrides = useCallback(
    () => applyTheme({ template: theme.template }),
    [applyTheme, theme.template]
  )

  const updateColor = useCallback(
    (key: keyof ThemeColors, value: string) => {
      applyTheme({ ...theme, colors: { ...theme.colors, [key]: value } })
    },
    [applyTheme, theme]
  )

  const updateFont = useCallback(
    (key: keyof ThemeFonts, value: string) => {
      applyTheme({ ...theme, fonts: { ...theme.fonts, [key]: value } })
    },
    [applyTheme, theme]
  )

  const updateText = useCallback(
    (key: keyof ThemeTexts, value: string) => {
      const texts = { ...theme.texts }
      if (value.trim() === '') {
        delete texts[key]
      } else {
        texts[key] = value
      }
      const hasTexts = Object.keys(texts).length > 0
      const next: GalleryTheme = { ...theme, texts: hasTexts ? texts : undefined }
      applyTheme(next)
    },
    [applyTheme, theme]
  )

  const updateDecor = useCallback(
    (key: keyof ThemeDecor, value: boolean) => {
      applyTheme({ ...theme, decor: { ...theme.decor, [key]: value } })
    },
    [applyTheme, theme]
  )

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`/api/admin/galleries/${galleryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
      })
      if (res.ok) {
        setIsDirty(false)
      } else {
        const data = await res.json().catch(() => ({}))
        setSaveError(data.error || 'Greška pri snimanju')
      }
    } catch {
      setSaveError('Greška u vezi. Pokušajte ponovo.')
    } finally {
      setIsSaving(false)
    }
  }, [galleryId, theme])

  const handleResetToDefault = useCallback(async () => {
    setIsSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`/api/admin/galleries/${galleryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: null }),
      })
      if (res.ok) {
        const next: GalleryTheme = { template: DEFAULT_TEMPLATE }
        setTheme(next)
        setIsDirty(false)
        pushPreview(next)
      } else {
        const data = await res.json().catch(() => ({}))
        setSaveError(data.error || 'Greška pri resetovanju')
      }
    } catch {
      setSaveError('Greška u vezi. Pokušajte ponovo.')
    } finally {
      setIsSaving(false)
    }
  }, [galleryId, pushPreview])

  // Upozori na napuštanje stranice dok ima nesnimljenih promjena.
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  return (
    <div className="te-page">
      <header className="te-header">
        <div className="te-header-left">
          <a href="/admin" className="te-back">
            <ArrowLeft size={18} /> Nazad
          </a>
          <div>
            <p className="te-brand">SweetFlower — Izgled galerije</p>
            <h1 className="te-title">{title}</h1>
          </div>
        </div>
        <div className="te-header-actions">
          {saveError && <span className="te-error">{saveError}</span>}
          <button type="button" className="te-btn-ghost" onClick={clearOverrides} disabled={isSaving}>
            <Undo2 size={16} /> Ukloni prilagodbe
          </button>
          <button type="button" className="te-btn-ghost" onClick={handleResetToDefault} disabled={isSaving}>
            <RotateCcw size={16} /> Vrati na default
          </button>
          <button type="button" className="te-btn-primary" onClick={handleSave} disabled={isSaving}>
            <Save size={16} /> {isSaving ? 'Snimam...' : 'Sačuvaj'}
          </button>
        </div>
      </header>

      <div className="te-layout">
        <aside className="te-controls">
          <section className="te-section">
            <h2 className="te-section-title">Template</h2>
            <div className="te-template-grid">
              {Object.entries(TEMPLATES).map(([id, t]) => (
                <button
                  key={id}
                  type="button"
                  className={`te-template-card${theme.template === id ? ' is-selected' : ''}`}
                  onClick={() => selectTemplate(id)}
                >
                  <span className="te-template-swatches">
                    <span className="te-template-swatch" style={{ background: t.colors.bg }} />
                    <span className="te-template-swatch" style={{ background: t.colors.accent }} />
                    <span className="te-template-swatch" style={{ background: t.colors.text }} />
                  </span>
                  <span className="te-template-name">{t.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="te-section">
            <h2 className="te-section-title">Boje</h2>
            {COLOR_GROUPS.map((group) => (
              <div key={group.title} className="te-color-group">
                <h3 className="te-color-group-title">{group.title}</h3>
                <div className="te-color-rows">
                  {group.keys.map((key) => (
                    <label key={key} className="te-color-row">
                      <span className="te-color-label">{COLOR_LABELS[key]}</span>
                      <span className="te-color-input">
                        <input
                          type="color"
                          value={resolved.colors[key]}
                          onChange={(e) => updateColor(key, e.target.value)}
                        />
                        <span className="te-color-hex">{resolved.colors[key]}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="te-section">
            <h2 className="te-section-title">Fontovi</h2>
            <label className="te-field">
              <span className="te-field-label">Naslovni (display)</span>
              <select
                className="te-select"
                value={resolved.fonts.display}
                onChange={(e) => updateFont('display', e.target.value)}
              >
                {DISPLAY_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </label>
            <label className="te-field">
              <span className="te-field-label">Tekst (body)</span>
              <select
                className="te-select"
                value={resolved.fonts.body}
                onChange={(e) => updateFont('body', e.target.value)}
              >
                {BODY_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </label>
            <label className="te-field">
              <span className="te-field-label">Script („&”)</span>
              <select
                className="te-select"
                value={resolved.fonts.script}
                onChange={(e) => updateFont('script', e.target.value)}
              >
                {SCRIPT_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </label>
          </section>

          <section className="te-section">
            <h2 className="te-section-title">Tekstovi</h2>
            <label className="te-field">
              <span className="te-field-label">Nadnaslov (eyebrow)</span>
              <input
                type="text"
                className="te-input"
                value={theme.texts?.tagline ?? ''}
                placeholder={DEFAULT_TEXTS.tagline}
                maxLength={TEXT_LIMITS.tagline}
                onChange={(e) => updateText('tagline', e.target.value)}
              />
            </label>
            <label className="te-field">
              <span className="te-field-label">Poruka dobrodošlice</span>
              <textarea
                className="te-textarea"
                value={theme.texts?.welcome ?? ''}
                placeholder={DEFAULT_TEXTS.welcome}
                maxLength={TEXT_LIMITS.welcome}
                rows={4}
                onChange={(e) => updateText('welcome', e.target.value)}
              />
            </label>
            <label className="te-field">
              <span className="te-field-label">Tekst dugmeta</span>
              <input
                type="text"
                className="te-input"
                value={theme.texts?.buttonLabel ?? ''}
                placeholder={DEFAULT_TEXTS.buttonLabel}
                maxLength={TEXT_LIMITS.buttonLabel}
                onChange={(e) => updateText('buttonLabel', e.target.value)}
              />
            </label>
          </section>

          <section className="te-section">
            <h2 className="te-section-title">Dekoracije</h2>
            {DECOR_LABELS.map(({ key, label }) => (
              <label key={key} className="te-toggle">
                <input
                  type="checkbox"
                  checked={resolved.decor[key]}
                  onChange={(e) => updateDecor(key, e.target.checked)}
                />
                <span>{label}</span>
              </label>
            ))}
          </section>
        </aside>

        <div className="te-preview-col">
          <div className="te-preview-toolbar">
            <button
              type="button"
              className={`te-view-btn${viewMode === 'phone' ? ' is-active' : ''}`}
              onClick={() => setViewMode('phone')}
            >
              <Smartphone size={16} /> Telefon
            </button>
            <button
              type="button"
              className={`te-view-btn${viewMode === 'desktop' ? ' is-active' : ''}`}
              onClick={() => setViewMode('desktop')}
            >
              <Monitor size={16} /> Desktop
            </button>
          </div>

          <div className={viewMode === 'phone' ? 'te-preview te-preview--phone' : 'te-preview te-preview--desktop'}>
            <iframe
              ref={iframeRef}
              src={`/galerija/${slug}?preview=1`}
              onLoad={() => pushPreview(theme)}
              title="Pregled galerije"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
