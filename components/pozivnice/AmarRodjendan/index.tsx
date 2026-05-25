'use client'

import { useEffect } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import type { Invitation } from '@/db/queries/invitations'
import Hero from './Hero'
import Countdown from './Countdown'
import Venue from './Venue'
import Program from './Program'
import CakeCarousel from './CakeCarousel'
import OutroRsvp from './OutroRsvp'
import Closing from './Closing'
import './AmarRodjendan.css'

interface Props {
  invitation: Invitation
}

export default function AmarRodjendan({ invitation }: Props) {
  useEffect(() => {
    AOS.init({ duration: 900, easing: 'ease-out-cubic', once: true, offset: 80 })
  }, [])

  return (
    <div className="amar-page">
      <Hero />
      <Countdown />
      <Venue />
      <Program />
      <CakeCarousel />
      <OutroRsvp invitation={invitation} />
      <Closing />
    </div>
  )
}
