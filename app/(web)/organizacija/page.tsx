import type { Metadata } from 'next'
import Organizacija from '@/components/web/Organizacija/Organizacija'

export const metadata: Metadata = {
  title: 'Organizacija vjenčanja — Sweet Flower Events',
  description:
    'Planiranje, koordinacija i svi detalji vjenčanja na jednom mjestu.',
}

export default function OrganizacijaPage() {
  return <Organizacija />
}
