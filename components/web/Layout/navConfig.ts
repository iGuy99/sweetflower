export interface NavLink {
  id: string
  label: string
  href: string
  children?: NavLink[]
}

export const LOGO_TEXT = 'Sweet Flower'
export const HOME_HREF = '/'

export const NAV_LINKS: NavLink[] = [
  {
    id: 'usluge',
    label: 'Usluge',
    href: '/organizacija',
    children: [
      { id: 'organizacija', label: 'Organizacija vjenčanja', href: '/organizacija' },
      { id: 'dekoracija', label: 'Dekoracija vjenčanja', href: '/dekoracija' },
    ],
  },
  { id: 'portfolio', label: 'Portfolio', href: '/portfolio' },
  { id: 'kontakt', label: 'Kontakt', href: '/kontakt' },
  { id: 'faq', label: 'FAQ', href: '/faq' },
  { id: 'flowershop', label: 'Flowershop', href: '/flowershop' },
]

export interface SectionCard {
  id: string
  label: string
  description: string
  href: string
}

export const SECTION_CARDS: SectionCard[] = [
  {
    id: 'organizacija',
    label: 'Organizacija vjenčanja',
    description: 'Planiranje, koordinacija i svi detalji na jednom mjestu',
    href: '/organizacija',
  },
  {
    id: 'dekoracija',
    label: 'Dekoracija vjenčanja',
    description: 'Cvijeće, aranžmani i ambijent koji oduzima dah',
    href: '/dekoracija',
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    description: 'Naša ostvarenja — pogledajte priče iza događaja',
    href: '/portfolio',
  },
  {
    id: 'kontakt',
    label: 'Kontakt & Upitnik',
    description: 'Javite nam se i zatražite personaliziranu ponudu',
    href: '/kontakt',
  },
  {
    id: 'faq',
    label: 'Česta pitanja',
    description: 'Odgovori prije zakazivanja termina',
    href: '/faq',
  },
  {
    id: 'flowershop',
    label: 'Flowershop Breza',
    description: 'Naša cvjećara — buketi i aranžmani',
    href: '/flowershop',
  },
]
