import type { Metadata } from 'next'
import Dekoracija from '@/components/web/Dekoracija/Dekoracija'

export const metadata: Metadata = {
  title: 'Dekoracija vjenčanja — Sweet Flower Events',
  description:
    'Cvijeće, aranžmani, table settings i detalji koji čine atmosferu.',
}

export default function DekoracijaPage() {
  return <Dekoracija />
}
