import type { Metadata } from 'next'
import Portfolio from '@/components/web/Portfolio/Portfolio'

export const metadata: Metadata = {
  title: 'Portfolio — Sweet Flower Events',
  description:
    'Odabrana vjenčanja i proslave koje smo organizovali i uredili.',
}

export default function PortfolioPage() {
  return <Portfolio />
}
