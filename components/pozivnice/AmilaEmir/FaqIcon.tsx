'use client'

import { Car, HelpCircle, Home, Clock } from 'lucide-react'

interface Props {
  question: string
}

export default function FaqIcon({ question }: Props) {
  const q = question.toLowerCase()
  if (q.includes('parking')) return <Car size={20} />
  if (q.includes('smještaj')) return <Home size={20} />
  if (q.includes('dolazak')) return <Clock size={20} />
  return <HelpCircle size={20} />
}
