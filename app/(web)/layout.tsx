import type { Metadata } from 'next'
import { Fraunces, DM_Sans } from 'next/font/google'
import Navbar from '@/components/web/Layout/Navbar'
import ConstructionBanner from '@/components/web/Layout/ConstructionBanner'
import './web.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
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
    <div className={`${fraunces.variable} ${dmSans.variable} sf-web-root`}>
      <Navbar />
      <main>{children}</main>
      <ConstructionBanner />
    </div>
  )
}
