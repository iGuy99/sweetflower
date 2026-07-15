// Čist izomorfni modul za teme galerija — BEZ importa iz db/s3/auth,
// koristi ga i server (SSR render, API validacija) i klijent (editor, preview).

// --- Tipovi ---

export interface ThemeColors {
  bg: string // pozadina stranice
  bgSoft: string // vrh atmosfere (radial gradijent)
  surface: string // kartice, upload panel, inputi
  accent: string // zlatna: okvir, ornamenti, eyebrow, akcenti
  accentDeep: string // tamnija varijanta akcenta (hover, dublje linije)
  text: string // glavni tekst
  textSoft: string // podnaslovi
  muted: string // meta/sekundarni tekst
  button: string // pozadina CTA dugmeta
  buttonText: string // tekst na CTA dugmetu
  lightbox: string // lightbox/overlay pozadina + baza za sjene
}

export interface ThemeFonts {
  display: string
  body: string
  script: string
}

export interface ThemeTexts {
  tagline: string
  welcome: string
  buttonLabel: string
}

export interface ThemeDecor {
  viewportFrame: boolean
  ornaments: boolean
  scriptAmp: boolean
}

// U bazi: sve osim template je opcionalno (override preko templatea)
export interface GalleryTheme {
  template: string
  colors?: Partial<ThemeColors>
  fonts?: Partial<ThemeFonts>
  texts?: Partial<ThemeTexts>
  decor?: Partial<ThemeDecor>
}

// Potpuno razriješena tema (template + overridi + defaulti)
export interface ResolvedTheme {
  template: string
  colors: ThemeColors
  fonts: ThemeFonts
  texts: ThemeTexts
  decor: ThemeDecor
}

// --- Fontovi ---

export const DISPLAY_FONTS = [
  { id: 'cormorant', label: 'Cormorant Garamond', cssVar: '--f-cormorant' },
  { id: 'playfair', label: 'Playfair Display', cssVar: '--f-playfair' },
  { id: 'marcellus', label: 'Marcellus', cssVar: '--f-marcellus' },
  { id: 'ebgaramond', label: 'EB Garamond', cssVar: '--f-ebgaramond' },
] as const

export const BODY_FONTS = [
  { id: 'jakarta', label: 'Plus Jakarta Sans', cssVar: '--f-jakarta' },
  { id: 'inter', label: 'Inter', cssVar: '--f-inter' },
  { id: 'lora', label: 'Lora', cssVar: '--f-lora' },
  { id: 'montserrat', label: 'Montserrat', cssVar: '--f-montserrat' },
] as const

export const SCRIPT_FONTS = [
  { id: 'parisienne', label: 'Parisienne', cssVar: '--f-parisienne' },
  { id: 'greatvibes', label: 'Great Vibes', cssVar: '--f-greatvibes' },
  { id: 'dancing', label: 'Dancing Script', cssVar: '--f-dancing' },
] as const

// --- Default tekstovi (= trenutni hardkodirani stringovi) ---

export const DEFAULT_TEXTS: ThemeTexts = {
  tagline: 'Podijelite uspomene',
  welcome:
    'Pomozite mladencima da sačuvaju svaki trenutak — dodajte slike i video zapise koje ste snimili.',
  buttonLabel: 'Dodajte vaše slike i video',
}

export const TEXT_LIMITS = { tagline: 120, welcome: 400, buttonLabel: 60 } as const

export const DEFAULT_DECOR: ThemeDecor = {
  viewportFrame: true,
  ornaments: true,
  scriptAmp: true,
}

// --- Templatei ---

export const TEMPLATES: Record<string, { name: string; colors: ThemeColors; fonts: ThemeFonts }> = {
  'zlatna-klasika': {
    name: 'Zlatna klasika',
    colors: {
      bg: '#fbf5ea',
      bgSoft: '#efdcbf',
      surface: '#fffdf9',
      accent: '#b8863f',
      accentDeep: '#96692b',
      text: '#241a12',
      textSoft: '#4a3c30',
      muted: '#8a7a68',
      button: '#2f2018',
      buttonText: '#fffdf9',
      lightbox: '#120c08',
    },
    fonts: { display: 'cormorant', body: 'jakarta', script: 'parisienne' },
  },
  'blush-ruza': {
    name: 'Blush ruža',
    colors: {
      bg: '#fdf3f1',
      bgSoft: '#f6dcd6',
      surface: '#fffafa',
      accent: '#b0576b',
      accentDeep: '#8e3f52',
      text: '#33191d',
      textSoft: '#5c3a40',
      muted: '#9a7078',
      button: '#4a222c',
      buttonText: '#fff7f5',
      lightbox: '#180a0d',
    },
    fonts: { display: 'playfair', body: 'jakarta', script: 'greatvibes' },
  },
  botanika: {
    name: 'Botanika',
    colors: {
      bg: '#f7f5ec',
      bgSoft: '#e5e4cf',
      surface: '#fdfcf6',
      accent: '#6b7b4f',
      accentDeep: '#55633e',
      text: '#22281a',
      textSoft: '#47503a',
      muted: '#85897a',
      button: '#2e3524',
      buttonText: '#f8faf2',
      lightbox: '#10130b',
    },
    fonts: { display: 'ebgaramond', body: 'lora', script: 'parisienne' },
  },
  'nocna-elegancija': {
    name: 'Noćna elegancija',
    colors: {
      bg: '#151824',
      bgSoft: '#232842',
      surface: '#1d2133',
      accent: '#cfa968',
      accentDeep: '#b8863f',
      text: '#f0e9d9',
      textSoft: '#cfc4a9',
      muted: '#8f8873',
      button: '#cfa968',
      buttonText: '#1a1408',
      lightbox: '#0a0c14',
    },
    fonts: { display: 'playfair', body: 'jakarta', script: 'parisienne' },
  },
  'pastelno-zelena': {
    name: 'Pastelno zelena',
    colors: {
      bg: '#f2f7f0',
      bgSoft: '#dcead8',
      surface: '#fbfdf9',
      accent: '#6f9678',
      accentDeep: '#567a5f',
      text: '#243026',
      textSoft: '#4a5a4f',
      muted: '#84948a',
      button: '#35473c',
      buttonText: '#f7fbf5',
      lightbox: '#0e1410',
    },
    fonts: { display: 'marcellus', body: 'jakarta', script: 'dancing' },
  },
}

export const DEFAULT_TEMPLATE = 'zlatna-klasika'

// --- Funkcije ---

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/
// Kontrolni znakovi (0x00-0x1F, DEL 0x7F) — uklanjaju se iz tekstualnih polja.
const CONTROL_CHARS_RE = /[\x00-\x1f\x7f]/g

/**
 * Razriješi temu iz baze (ili null) u potpun, immutable objekat spreman
 * za render — template daje osnovu, korisnički overridi je nadopunjuju.
 */
export function resolveTheme(theme: GalleryTheme | null | undefined): ResolvedTheme {
  const templateId =
    theme?.template && Object.hasOwn(TEMPLATES, theme.template)
      ? theme.template
      : DEFAULT_TEMPLATE
  const base = TEMPLATES[templateId]

  return {
    template: templateId,
    colors: { ...base.colors, ...theme?.colors },
    fonts: { ...base.fonts, ...theme?.fonts },
    texts: { ...DEFAULT_TEXTS, ...theme?.texts },
    decor: { ...DEFAULT_DECOR, ...theme?.decor },
  }
}

function isValidHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_RE.test(value.toLowerCase())
}

function validateColors(input: unknown): Partial<ThemeColors> | undefined {
  if (typeof input !== 'object' || input === null) return undefined
  const src = input as Record<string, unknown>
  const result: Partial<ThemeColors> = {}

  const keys: (keyof ThemeColors)[] = [
    'bg',
    'bgSoft',
    'surface',
    'accent',
    'accentDeep',
    'text',
    'textSoft',
    'muted',
    'button',
    'buttonText',
    'lightbox',
  ]
  for (const key of keys) {
    const value = src[key]
    if (isValidHexColor(value)) {
      result[key] = value.toLowerCase()
    }
  }

  return Object.keys(result).length > 0 ? result : undefined
}

function validateFonts(input: unknown): Partial<ThemeFonts> | undefined {
  if (typeof input !== 'object' || input === null) return undefined
  const src = input as Record<string, unknown>
  const result: Partial<ThemeFonts> = {}

  if (typeof src.display === 'string' && DISPLAY_FONTS.some((f) => f.id === src.display)) {
    result.display = src.display
  }
  if (typeof src.body === 'string' && BODY_FONTS.some((f) => f.id === src.body)) {
    result.body = src.body
  }
  if (typeof src.script === 'string' && SCRIPT_FONTS.some((f) => f.id === src.script)) {
    result.script = src.script
  }

  return Object.keys(result).length > 0 ? result : undefined
}

function sanitizeText(value: unknown, limit: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const cleaned = value.trim().replace(CONTROL_CHARS_RE, '')
  if (!cleaned) return undefined
  return cleaned.slice(0, limit)
}

function validateTexts(input: unknown): Partial<ThemeTexts> | undefined {
  if (typeof input !== 'object' || input === null) return undefined
  const src = input as Record<string, unknown>
  const result: Partial<ThemeTexts> = {}

  const tagline = sanitizeText(src.tagline, TEXT_LIMITS.tagline)
  if (tagline !== undefined) result.tagline = tagline
  const welcome = sanitizeText(src.welcome, TEXT_LIMITS.welcome)
  if (welcome !== undefined) result.welcome = welcome
  const buttonLabel = sanitizeText(src.buttonLabel, TEXT_LIMITS.buttonLabel)
  if (buttonLabel !== undefined) result.buttonLabel = buttonLabel

  return Object.keys(result).length > 0 ? result : undefined
}

function validateDecor(input: unknown): Partial<ThemeDecor> | undefined {
  if (typeof input !== 'object' || input === null) return undefined
  const src = input as Record<string, unknown>
  const result: Partial<ThemeDecor> = {}

  if (src.viewportFrame === true || src.viewportFrame === false) {
    result.viewportFrame = src.viewportFrame
  }
  if (src.ornaments === true || src.ornaments === false) {
    result.ornaments = src.ornaments
  }
  if (src.scriptAmp === true || src.scriptAmp === false) {
    result.scriptAmp = src.scriptAmp
  }

  return Object.keys(result).length > 0 ? result : undefined
}

/**
 * Striktna validacija teme za API — gradi objekat polje-po-polje,
 * NIKAD ne prosljeđuje korisnički input dalje kroz spread. Vraća `null`
 * ako je input nevažeći (template obavezan i mora postojati).
 */
export function validateTheme(input: unknown): GalleryTheme | null {
  if (typeof input !== 'object' || input === null) return null
  const src = input as Record<string, unknown>

  // Object.hasOwn (ne `in`): `in` matchuje i naslijeđene ključeve
  // poput 'constructor'/'toString', što bi propustilo nevažeći template.
  if (typeof src.template !== 'string' || !Object.hasOwn(TEMPLATES, src.template)) {
    return null
  }

  const result: GalleryTheme = { template: src.template }

  const colors = validateColors(src.colors)
  if (colors) result.colors = colors
  const fonts = validateFonts(src.fonts)
  if (fonts) result.fonts = fonts
  const texts = validateTexts(src.texts)
  if (texts) result.texts = texts
  const decor = validateDecor(src.decor)
  if (decor) result.decor = decor

  return result
}

/** Vrati objekat CSS varijabli za inline style na .sf-gallery-root/main. */
export function themeToStyle(t: ResolvedTheme): Record<string, string> {
  const displayVar = DISPLAY_FONTS.find((f) => f.id === t.fonts.display)?.cssVar ?? '--f-cormorant'
  const bodyVar = BODY_FONTS.find((f) => f.id === t.fonts.body)?.cssVar ?? '--f-jakarta'
  const scriptVar = SCRIPT_FONTS.find((f) => f.id === t.fonts.script)?.cssVar ?? '--f-parisienne'

  return {
    '--t-bg': t.colors.bg,
    '--t-bg-soft': t.colors.bgSoft,
    '--t-surface': t.colors.surface,
    '--t-accent': t.colors.accent,
    '--t-accent-deep': t.colors.accentDeep,
    '--t-text': t.colors.text,
    '--t-text-soft': t.colors.textSoft,
    '--t-muted': t.colors.muted,
    '--t-button': t.colors.button,
    '--t-button-text': t.colors.buttonText,
    '--t-lightbox': t.colors.lightbox,
    '--font-display': `var(${displayVar})`,
    '--font-body': `var(${bodyVar})`,
    '--font-script': `var(${scriptVar})`,
  }
}

/**
 * Defanzivno parsiranje vrijednosti iz MySQL JSON kolone. mysql2 obično
 * vraća već parsiran objekat za JSON kolone, ali braniti se i od stringa
 * (raw driver konfiguracije variraju).
 */
export function parseThemeColumn(value: unknown): GalleryTheme | null {
  if (value === null || value === undefined) return null

  if (typeof value === 'string') {
    try {
      return validateTheme(JSON.parse(value))
    } catch {
      return null
    }
  }

  if (typeof value === 'object') {
    return validateTheme(value)
  }

  return null
}
