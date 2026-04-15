import type { Metadata } from 'next'
import Kontakt from '@/components/web/Kontakt/Kontakt'

export const metadata: Metadata = {
  title: 'Kontakt & Upitnik — Sweet Flower Events',
  description:
    'Javite nam se — kontakt forma i upitnik za personaliziranu ponudu.',
}

export default function KontaktPage() {
  return <Kontakt />
}
