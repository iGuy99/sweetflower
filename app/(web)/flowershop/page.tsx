import type { Metadata } from 'next'
import Flowershop from '@/components/web/Flowershop/Flowershop'

export const metadata: Metadata = {
  title: 'Flowershop Breza — Sweet Flower Events',
  description: 'Naša cvjećara u Brezi — buketi, aranžmani i dekoracije.',
}

export default function FlowershopPage() {
  return <Flowershop />
}
