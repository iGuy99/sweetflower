import type { Metadata } from 'next'
import {
  Cormorant_Garamond,
  Plus_Jakarta_Sans,
  Parisienne,
  Playfair_Display,
  Marcellus,
  EB_Garamond,
  Inter,
  Lora,
  Montserrat,
  Great_Vibes,
  Dancing_Script,
} from 'next/font/google'

// Ova tri fonta su default tema (Zlatna klasika) — ostaju preloadovana kao i
// prije da nema perf kazne za najčešći slučaj.
const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--f-cormorant',
  display: 'swap',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600'],
  variable: '--f-jakarta',
  display: 'swap',
})

// Elegantan script akcent — koristi se samo za "&" u imenima mladenaca.
const parisienne = Parisienne({
  subsets: ['latin', 'latin-ext'],
  weight: ['400'],
  variable: '--f-parisienne',
  display: 'swap',
})

// Ostali fontovi iz kurirane liste tema — preload: false, skidaju se tek
// kad ih tema stvarno koristi (lazy @font-face, bez perf kazne).
const playfair = Playfair_Display({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600'],
  variable: '--f-playfair',
  display: 'swap',
  preload: false,
})

const marcellus = Marcellus({
  subsets: ['latin', 'latin-ext'],
  weight: ['400'],
  variable: '--f-marcellus',
  display: 'swap',
  preload: false,
})

const ebGaramond = EB_Garamond({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600'],
  variable: '--f-ebgaramond',
  display: 'swap',
  preload: false,
})

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600'],
  variable: '--f-inter',
  display: 'swap',
  preload: false,
})

const lora = Lora({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600'],
  variable: '--f-lora',
  display: 'swap',
  preload: false,
})

const montserrat = Montserrat({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600'],
  variable: '--f-montserrat',
  display: 'swap',
  preload: false,
})

const greatVibes = Great_Vibes({
  subsets: ['latin', 'latin-ext'],
  weight: ['400'],
  variable: '--f-greatvibes',
  display: 'swap',
  preload: false,
})

const dancingScript = Dancing_Script({
  subsets: ['latin', 'latin-ext'],
  weight: ['400'],
  variable: '--f-dancing',
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: 'Galerija uspomena — Sweet Flower Events',
  description: 'Podijelite vaše slike i video zapise sa mladencima.',
}

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`${cormorant.variable} ${plusJakarta.variable} ${parisienne.variable} ${playfair.variable} ${marcellus.variable} ${ebGaramond.variable} ${inter.variable} ${lora.variable} ${montserrat.variable} ${greatVibes.variable} ${dancingScript.variable} sf-gallery-root`}
    >
      {children}
    </div>
  )
}
