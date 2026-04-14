'use client'

import { useState, useEffect, useRef } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import './AmilaEmir.css'

import Hero from './Hero'
import DiscoBallHero from './DiscoBallHero'
import Countdown from './Countdown'
import Venue from './Venue'
import Program from './Program'
import DressCode from './DressCode'
import FAQ from './FAQ'
import RsvpForm from '@/components/rsvp/RsvpForm'
import type { Invitation } from '@/db/queries/invitations'

const CONFIG = {
  couple: {
    partner1: 'Amila',
    partner2: 'Emir',
    initials: 'A&E',
    tagline: 'VJENČANJE',
  },
  date: {
    full: '8. august 2026.',
    year: 2026,
    month: 8,
    day: 8,
    ceremonyTime: '18:00h',
    banquetTime: '18:30h',
  },
  venue: {
    name: 'Hotel Monti Igman',
    subname: 'otvoreni dio Montini',
    address: 'Veliko polje bb, Sarajevo 71240',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3516.4266901719593!2d18.2651444!3d43.748069799999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4758b52dd4d0948f%3A0xa7e59f98ab07c3fb!2sHotel%20Monti!5e1!3m2!1sen!2sba!4v1775742141754!5m2!1sen!2sba',
    mapsLink: 'https://www.google.com/maps/place/Montini/@43.7480698,18.2651444,808m/data=!3m1!1e3!4m6!3m5!1s0x4758b50045445b49:0x2325a2cd993174a5!8m2!3d43.7488484!4d18.2652067!16s%2Fg%2F11wxtq_hcv',
  },
  schedule: [
    { time: '17:00', icon: 'camera', title: 'Dolazak gostiju', description: 'Dobrodošli!' },
    { time: '18:00', icon: 'ceremony', title: 'Ceremonija', description: 'Hotel Monti Igman' },
    { time: '18:30', icon: 'dinner', title: 'Večera', description: 'Ulazak mladenaca' },
    { time: '19:00', icon: 'party', title: 'Party is on!', description: 'Otvaramo plesni podij!' },
  ],
  dressCode: { type: 'Funky Summer' },
  dressCodeNotes: ['Cure: ponijeti obuću za ples i jaknice'],
  parkingInfo: 'Parking je dostupan u sklopu hotela za sve goste.',
  faqs: [
    {
      question: 'Parking',
      answer: 'Besplatni parking se nalazi u sklopu Hotela Monti Igman i dostupan je za sve goste.',
    },
    {
      question: 'Smještaj',
      answer: 'Rezervišite sobu uz promo kod "Vjenčanje 8.8.2026. Amila i Emir". Rezervacija putem telefona hotela: 033 744-700.',
    },
    {
      question: 'Ostala pitanja?',
      answer: 'Za bilo kakva dodatna pitanja slobodno se obratite nama. Rado ćemo vam pomoći!',
    },
  ],
}

interface Props {
  invitation: Invitation
}

export default function AmilaEmir({ invitation }: Props) {
  const [showDiscoHero, setShowDiscoHero] = useState(true)
  const [heroReady, setHeroReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [musicStarted, setMusicStarted] = useState(false)
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUnlockedRef = useRef(false)

  useEffect(() => {
    const audio = new Audio('/pozivnice/AmilaEmir/song.mp3')
    audio.loop = true
    audio.preload = 'none'
    audioRef.current = audio
    return () => { audio.pause(); audio.src = '' }
  }, [])

  // Unlock audio on first document interaction (required for iOS/Chrome autoplay policy)
  useEffect(() => {
    const unlock = () => {
      if (audioUnlockedRef.current || !audioRef.current) return
      const audio = audioRef.current
      audio.load()
      audio.play().then(() => {
        audio.pause()
        audio.currentTime = 0
        audioUnlockedRef.current = true
        console.log('[audio] unlocked via document interaction')
      }).catch(e => console.warn('[audio] unlock failed:', e))
    }

    document.addEventListener('touchstart', unlock, { passive: true, once: true })
    document.addEventListener('mousedown', unlock, { once: true })
    return () => {
      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('mousedown', unlock)
    }
  }, [])

  useEffect(() => {
    if (showDiscoHero) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [showDiscoHero])

  useEffect(() => {
    AOS.init({ duration: 1000, easing: 'ease-out-cubic', once: true, offset: 100 })
  }, [])

  useEffect(() => {
    const weddingDate = new Date(
      CONFIG.date.year, CONFIG.date.month - 1, CONFIG.date.day, 17, 0, 0
    )
    const update = () => {
      const diff = weddingDate.getTime() - Date.now()
      if (diff > 0) {
        setCountdown({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / (1000 * 60)) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        })
      }
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  const scrollToRSVP = () => {
    const el = document.getElementById('rsvp')
    if (!el) return
    const start = window.pageYOffset
    const target = el.offsetTop - 50
    const distance = target - start
    const duration = 1500
    let startTime: number | null = null
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      window.scrollTo(0, start + distance * progress * (2 - progress))
      if (elapsed < duration) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }

  const toggleMusic = () => {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause() } else { audioRef.current.play() }
    setIsPlaying(!isPlaying)
  }

  return (
    <>
      <div className="wedding-site visible">
        {showDiscoHero && (
          <DiscoBallHero
            audioRef={audioRef}
            onMusicStarted={() => { setIsPlaying(true); setMusicStarted(true) }}
            onDone={() => { setShowDiscoHero(false); setHeroReady(true) }}
          />
        )}

        <Hero
          couple={CONFIG.couple}
          date={CONFIG.date}
          onScrollToRSVP={scrollToRSVP}
          heroReady={heroReady}
        />

        <div className="sections-wrapper">
          <Countdown countdown={countdown} />
          <Venue venue={CONFIG.venue} date={CONFIG.date} parkingInfo={CONFIG.parkingInfo} />
          <Program schedule={CONFIG.schedule} />
          <DressCode dressCode={CONFIG.dressCode} dressCodeNotes={CONFIG.dressCodeNotes} />
          <FAQ faqs={CONFIG.faqs} />
          <RsvpForm invitation={invitation} />

          <footer className="footer">
            <h3 className="footer-names">{CONFIG.couple.partner1} & {CONFIG.couple.partner2}</h3>
            <p className="footer-date">{CONFIG.date.full}</p>
            <p className="footer-credit">Napravljeno s ljubavlju</p>
            <a href={`/pozivnice/${invitation.slug}/admin`} className="admin-link">
              Prijave gostiju
            </a>
          </footer>
        </div>

        {musicStarted && (
          <button
            className="music-toggle"
            onClick={toggleMusic}
            aria-label={isPlaying ? 'Pauziraj muziku' : 'Pusti muziku'}
          >
            {isPlaying ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
        )}
      </div>
    </>
  )
}
