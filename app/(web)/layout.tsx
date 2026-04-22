import type { Metadata } from 'next'
import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google'
import Navbar from '@/components/web/Layout/Navbar'
import ConstructionBanner from '@/components/web/Layout/ConstructionBanner'
import './web.css'

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

export const metadata: Metadata = {
  title: 'Sweet Flower Events — Organizacija i dekoracija vjenčanja',
  description:
    'Sweet Flower Events — organizacija i dekoracija vjenčanja, cvjećara u Brezi, Bosna i Hercegovina.',
}

export default function WebLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${cormorant.variable} ${plusJakarta.variable} sf-web-root`}>
      <Navbar />
      <main>{children}</main>
      <ConstructionBanner />
    </div>
  )
}
