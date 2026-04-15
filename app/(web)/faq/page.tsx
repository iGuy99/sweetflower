import type { Metadata } from 'next'
import FAQ from '@/components/web/FAQ/FAQ'

export const metadata: Metadata = {
  title: 'Česta pitanja — Sweet Flower Events',
  description:
    'Odgovori na najčešća pitanja prije zakazivanja termina.',
}

export default function FaqPage() {
  return <FAQ />
}
