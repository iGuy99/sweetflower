'use client'

import { useState, useEffect, useRef } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import './ZaraRodjendan.css'

import CakeIntro from './CakeIntro'
import Hero from './Hero'
import Countdown from './Countdown'
import Venue from './Venue'
import Program from './Program'
import Closing from './Closing'
import type { Invitation } from '@/db/queries/invitations'

interface Props {
  invitation: Invitation
}

export default function ZaraRodjendan({ invitation }: Props) {
  const [showCakeIntro, setShowCakeIntro] = useState(true)
  const [heroReady, setHeroReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [musicStarted, setMusicStarted] = useState(false)
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio('/pozivnice/ZaraRodjendan/song.mp3')
    audio.loop = true
    audio.preload = 'auto'
    audioRef.current = audio
    return () => { audio.pause(); audio.src = '' }
  }, [])

  // Lock scroll during intro
  useEffect(() => {
    if (showCakeIntro) {
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
  }, [showCakeIntro])

  useEffect(() => {
    AOS.init({ duration: 1000, easing: 'ease-out-cubic', once: true, offset: 80 })
  }, [])

  // Countdown to 29.04.2026 17:00
  useEffect(() => {
    const birthdayDate = new Date(2026, 3, 29, 18, 0, 0)
    const update = () => {
      const diff = birthdayDate.getTime() - Date.now()
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

  const toggleMusic = () => {
    if (!audioRef.current) return
    audioRef.current.muted = isPlaying
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="zara-site">
      {showCakeIntro && (
        <CakeIntro
          audioRef={audioRef}
          onMusicStarted={() => { setIsPlaying(true); setMusicStarted(true) }}
          onDone={() => {
            setShowCakeIntro(false)
            setHeroReady(true)
            setTimeout(() => AOS.refresh(), 150)
          }}
        />
      )}

      <Hero heroReady={heroReady} />

      <div className="zara-sections">
        <div className="zara-bg-cream">
          <Countdown countdown={countdown} />
        </div>

        <div className="zara-bg-cream zara-maca-wrap">
          <img
            src="/pozivnice/ZaraRodjendan/maca.png"
            alt="Zarina torta"
            className="zara-maca-showcase"
            data-aos="zoom-in"
          />
        </div>

        <div className="zara-bg-gold">
          <Venue />
        </div>

        <div className="zara-bg-cream">
          <Program />
        </div>

        <div className="zara-bg-coral">
          <Closing />
        </div>

        <footer className="zara-footer">
          <div className="zara-footer-name">Zara</div>
          <div className="zara-footer-date">29. April 2026.</div>
          <div className="zara-footer-credit">Napravljeno s ljubavlju 🌸</div>
        </footer>
      </div>

      {musicStarted && (
        <button
          className="zara-music-btn"
          onClick={toggleMusic}
          aria-label={isPlaying ? 'Pauziraj muziku' : 'Pusti muziku'}
        >
          {isPlaying ? <Volume2 size={22} /> : <VolumeX size={22} />}
        </button>
      )}
    </div>
  )
}
