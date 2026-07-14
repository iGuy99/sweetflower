import type { Metadata } from 'next'
import {
  Cormorant_Garamond,
  Plus_Jakarta_Sans,
  Parisienne,
} from 'next/font/google'

const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600'],
  variable: '--font-body',
  display: 'swap',
})

// Elegantan script akcent — koristi se samo za "&" u imenima mladenaca.
const parisienne = Parisienne({
  subsets: ['latin', 'latin-ext'],
  weight: ['400'],
  variable: '--font-script',
  display: 'swap',
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
      className={`${cormorant.variable} ${plusJakarta.variable} ${parisienne.variable} sf-gallery-root`}
    >
      {children}
    </div>
  )
}
