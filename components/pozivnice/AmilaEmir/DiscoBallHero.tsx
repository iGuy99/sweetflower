'use client'

import { useEffect, useRef, useState } from 'react'

const GRAIN_BASE = '/pozivnice/AmilaEmir'

const STRIPE_COLORS = [
  { hex: '#005B82', grainUrl: `${GRAIN_BASE}/grain_dark_blue.png` },
  { hex: '#70B1B8', grainUrl: `${GRAIN_BASE}/grain_teal.png` },
  { hex: '#F16A2D', grainUrl: `${GRAIN_BASE}/grain_orange.png` },
  { hex: '#F9E7C4', grainUrl: `${GRAIN_BASE}/grain_cream.png` },
  { hex: '#E63E24', grainUrl: `${GRAIN_BASE}/grain_red.png` },
]
const NUM_STRIPES = 20
const ANGLE_PER = (Math.PI * 2) / NUM_STRIPES

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.src = url
  })
}

async function loadPatterns(ctx: CanvasRenderingContext2D) {
  return Promise.all(
    STRIPE_COLORS.map(async ({ grainUrl }) => {
      const img = await loadImage(grainUrl)
      const pattern = ctx.createPattern(img, 'repeat')!
      pattern.setTransform(new DOMMatrix().scale(0.5))
      return pattern
    })
  )
}

function drawStripe(ctx: CanvasRenderingContext2D, i: number, W: number, H: number, patterns: (CanvasPattern | string)[]) {
  const cx = W / 2
  const cy = H / 2
  const radius = Math.sqrt(W * W + H * H)
  const fill = patterns[i % STRIPE_COLORS.length]
  const start = i * ANGLE_PER - Math.PI / 2
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.arc(cx, cy, radius, start, start + ANGLE_PER)
  ctx.closePath()
  ctx.fillStyle = fill as string
  ctx.fill()
  ctx.restore()
}

async function preloadSunburst(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await loadPatterns(ctx)
}

async function animateSunburst(canvas: HTMLCanvasElement, glowCanvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  const glowCtx = glowCanvas.getContext('2d')!
  const W = canvas.width
  const H = canvas.height
  const patterns = await loadPatterns(ctx)
  const DELAY_PER_STRIPE = 60

  for (let i = 0; i < NUM_STRIPES; i++) {
    await new Promise(resolve => setTimeout(resolve, DELAY_PER_STRIPE))
    drawStripe(ctx, i, W, H, patterns)

    const cx = W / 2
    const cy = H / 2
    const radius = Math.sqrt(W * W + H * H)
    const start = i * ANGLE_PER - Math.PI / 2
    glowCtx.clearRect(0, 0, W, H)
    glowCtx.save()
    glowCtx.beginPath()
    glowCtx.moveTo(cx, cy)
    glowCtx.arc(cx, cy, radius, start, start + ANGLE_PER)
    glowCtx.closePath()
    glowCtx.shadowColor = 'rgba(255, 245, 200, 0.95)'
    glowCtx.shadowBlur = 18
    glowCtx.strokeStyle = 'rgba(255, 245, 200, 0.7)'
    glowCtx.lineWidth = 2
    glowCtx.stroke()
    glowCtx.restore()
  }

  glowCtx.clearRect(0, 0, W, H)
  drawPermanentGlow(ctx, W, H)
}

function drawPermanentGlow(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const cx = W / 2
  const cy = H / 2
  const radius = Math.sqrt(W * W + H * H)

  for (let i = 0; i < NUM_STRIPES; i++) {
    const start = i * ANGLE_PER - Math.PI / 2
    const midAngle = start + ANGLE_PER / 2
    const glowDist = radius * 0.5
    const glowX = cx + Math.cos(midAngle) * glowDist
    const glowY = cy + Math.sin(midAngle) * glowDist

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius, start, start + ANGLE_PER)
    ctx.closePath()
    ctx.clip()

    const grad = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, radius * 0.55)
    grad.addColorStop(0, 'rgba(255, 255, 240, 0.28)')
    grad.addColorStop(0.5, 'rgba(255, 255, 220, 0.10)')
    grad.addColorStop(1, 'rgba(255, 255, 200, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
}

interface Props {
  audioRef: React.RefObject<HTMLAudioElement | null>
  onMusicStarted: () => void
  onDone: () => void
}

export default function DiscoBallHero({ audioRef, onMusicStarted, onDone }: Props) {
  const ballRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glowCanvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const spinningRef = useRef(false)
  const rotationRef = useRef(0)
  const dragRef = useRef({ active: false, lastX: 0, velocity: 0 })
  const [lightsOn, setLightsOn] = useState(false)
  const [outro, setOutro] = useState(false)
  const [ballLeaving, setBallLeaving] = useState(false)

  useEffect(() => {
    const ball = ballRef.current
    const wrap = wrapRef.current
    if (!ball || !wrap) return

    const triggerSpin = (velocity: number) => {
      if (spinningRef.current) return
      spinningRef.current = true

      // Map swipe velocity to animation duration (faster swipe = shorter duration)
      const speed = Math.abs(velocity)
      const duration = Math.max(0.5, Math.min(3.5, 3.5 - (speed - 4) * 0.07))
      ball.style.animationDuration = `${duration}s`
      const middle = ball.querySelector('.disco-ball-middle') as HTMLElement
      if (middle) middle.style.animationDuration = `${duration}s`

      ball.classList.add('is-spinning')
      ball.style.transform = ''
      setLightsOn(true)

      if (audioRef?.current) {
        const audio = audioRef.current
        console.log('[audio] triggerSpin — paused:', audio.paused, 'muted:', audio.muted, 'volume:', audio.volume, 'readyState:', audio.readyState)
        audio.currentTime = 0
        audio.volume = 1
        audio.muted = false
        const p = audio.play()
        if (p) p.then(() => console.log('[audio] play() success')).catch(e => console.warn('[audio] play() failed:', e))
        if (onMusicStarted) onMusicStarted()
      } else {
        console.warn('[audio] audioRef.current is null')
      }

      setTimeout(() => setOutro(true), 2400)
    }

    const onDown = (e: PointerEvent) => {
      if (spinningRef.current) return
      dragRef.current = { active: true, lastX: e.clientX, velocity: 0 }
      wrap.setPointerCapture(e.pointerId)
    }

    const onMove = (e: PointerEvent) => {
      if (!dragRef.current.active || spinningRef.current) return
      const delta = e.clientX - dragRef.current.lastX
      dragRef.current.velocity = delta
      dragRef.current.lastX = e.clientX
      rotationRef.current -= delta * 0.8
      ball.style.transform = `rotateX(90deg) rotateZ(${rotationRef.current}deg)`
    }

    const onUp = () => {
      if (!dragRef.current.active || spinningRef.current) return
      dragRef.current.active = false
      if (Math.abs(dragRef.current.velocity) > 4) triggerSpin(dragRef.current.velocity)
    }

    // Unlock audio on first touchstart (guaranteed user gesture for mobile)
    const unlockAudio = () => {
      if (audioRef?.current && audioRef.current.paused) {
        audioRef.current.play().then(() => {
          console.log('[audio] touchstart unlock success')
          audioRef.current!.pause()
          audioRef.current!.currentTime = 0
        }).catch(e => console.warn('[audio] touchstart unlock failed:', e))
      }
      wrap.removeEventListener('touchstart', unlockAudio)
    }
    wrap.addEventListener('touchstart', unlockAudio, { passive: true })

    wrap.addEventListener('pointerdown', onDown)
    wrap.addEventListener('pointermove', onMove)
    wrap.addEventListener('pointerup', onUp)
    wrap.addEventListener('pointercancel', onUp)

    return () => {
      wrap.removeEventListener('touchstart', unlockAudio)
      wrap.removeEventListener('pointerdown', onDown)
      wrap.removeEventListener('pointermove', onMove)
      wrap.removeEventListener('pointerup', onUp)
      wrap.removeEventListener('pointercancel', onUp)
    }
  }, [onDone, audioRef, onMusicStarted])

  useEffect(() => {
    const canvas = canvasRef.current
    const glowCanvas = glowCanvasRef.current
    if (!canvas || !glowCanvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    glowCanvas.width = window.innerWidth
    glowCanvas.height = window.innerHeight
    preloadSunburst(canvas)
  }, [])

  useEffect(() => {
    if (!lightsOn || !canvasRef.current || !glowCanvasRef.current) return
    animateSunburst(canvasRef.current, glowCanvasRef.current)
  }, [lightsOn])

  useEffect(() => {
    const discoBall = ballRef.current
    if (!discoBall) return

    const radius = 112
    const squareSize = 14.56
    const prec = 19.55
    const fuzzy = 0.001
    const inc = (Math.PI - fuzzy) / prec

    function randomColor(type: string) {
      const c = type === 'bright' ? randomNumber(130, 255) : randomNumber(110, 190)
      return `rgb(${c},${c},${c})`
    }

    function randomNumber(min: number, max: number) {
      return Math.floor(Math.random() * (max - min + 1)) + min
    }

    for (let t = fuzzy; t < Math.PI; t += inc) {
      const z = radius * Math.cos(t)
      const currentRadius =
        Math.abs(
          radius * Math.cos(0) * Math.sin(t) -
          radius * Math.cos(Math.PI) * Math.sin(t)
        ) / 2.5
      const circumference = Math.abs(2 * Math.PI * currentRadius)
      const squaresThatFit = Math.floor(circumference / squareSize)
      const angleInc = (Math.PI * 2 - fuzzy) / squaresThatFit

      for (let i = angleInc / 2 + fuzzy; i < Math.PI * 2; i += angleInc) {
        const square = document.createElement('div')
        const tile = document.createElement('div')

        tile.style.width = squareSize + 'px'
        tile.style.height = squareSize + 'px'
        tile.style.transformOrigin = '0 0 0'
        tile.style.transform = `rotate(${i}rad) rotateY(${t}rad)`
        tile.style.backfaceVisibility = 'hidden'

        const isMid = (t > 1.3 && t < 1.9) || (t < -1.3 && t > -1.9)
        const isTop = t < 0.7
        let tileColor: string
        if (isTop && Math.random() < 0.6) {
          const bright = randomNumber(210, 255)
          tileColor = `rgb(${bright},${bright},${bright})`
        } else {
          tileColor = randomColor(isMid ? 'bright' : 'any')
        }
        tile.style.backgroundColor = tileColor
        tile.style.animation = `discoReflect 2s linear ${randomNumber(0, 20) / 10}s infinite`

        if (Math.random() < 0.15) {
          const coloredGlows = [
            { bg: '#c8e4ee', glow: 'rgba(0, 91, 130, 0.4)', maxSpread: 2 },
            { bg: '#cce3e6', glow: 'rgba(112, 177, 184, 0.6)', maxSpread: 7 },
            { bg: '#f7d8c0', glow: 'rgba(241, 106, 45, 0.4)', maxSpread: 2 },
            { bg: '#faf0dc', glow: 'rgba(249, 231, 196, 0.55)', maxSpread: 7 },
            { bg: '#f5c4bc', glow: 'rgba(230, 62, 36, 0.6)', maxSpread: 7 },
            { bg: '#f4f4f4', glow: 'rgba(255, 255, 255, 0.7)', maxSpread: 7 },
            { bg: '#ddeef2', glow: 'rgba(100, 180, 200, 0.55)', maxSpread: 7 },
            { bg: '#fde8d8', glow: 'rgba(255, 150, 80, 0.55)', maxSpread: 7 },
          ]
          const pick = coloredGlows[randomNumber(0, coloredGlows.length - 1)]
          const glowSize = randomNumber(3, 14)
          const glowSpread = randomNumber(1, pick.maxSpread)
          const duration = randomNumber(6, 30) / 10
          const delay = randomNumber(0, 80) / 10
          tile.style.backgroundColor = pick.bg
          tile.style.boxShadow = `0 0 ${glowSize}px ${glowSpread}px ${pick.glow}`
          tile.classList.add('disco-tile-glow')
          tile.style.animation = `tileGlow ${duration}s ease-in-out ${delay}s infinite`
          tile.style.animationPlayState = 'paused'
        }

        square.className = 'disco-square'
        square.style.top = '112px'
        square.style.left = '112px'
        const x = radius * Math.cos(i) * Math.sin(t)
        const y = radius * Math.sin(i) * Math.sin(t)
        square.style.transform = `translateX(${x}px) translateY(${y}px) translateZ(${z}px)`

        square.appendChild(tile)
        discoBall.appendChild(square)
      }
    }

    return () => {
      while (discoBall.firstChild) discoBall.removeChild(discoBall.firstChild)
    }
  }, [])

  useEffect(() => {
    if (!lightsOn || !ballRef.current) return
    const glowTiles = ballRef.current.querySelectorAll('.disco-tile-glow')
    glowTiles.forEach((tile) => {
      (tile as HTMLElement).style.animationPlayState = 'running'
    })
  }, [lightsOn])

  useEffect(() => {
    if (!outro || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height
    const cx = W / 2
    const cy = H / 2
    const radius = Math.sqrt(W * W + H * H)
    const DELAY = 55

    ;(async () => {
      for (let i = NUM_STRIPES - 1; i >= 0; i--) {
        await new Promise(resolve => setTimeout(resolve, DELAY))
        const start = i * ANGLE_PER - Math.PI / 2
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, radius, start, start + ANGLE_PER)
        ctx.closePath()
        ctx.clip()
        ctx.clearRect(0, 0, W, H)
        ctx.restore()
      }
      setBallLeaving(true)
      await new Promise(resolve => setTimeout(resolve, 900))
      onDone()
    })()
  }, [outro, onDone])

  return (
    <div className={`disco-hero${outro ? ' outro' : ''}`}>
      <canvas ref={canvasRef} className="disco-canvas" />
      <canvas ref={glowCanvasRef} className="disco-canvas" style={{ pointerEvents: 'none' }} />
      <div className={`disco-lights-overlay ${lightsOn ? 'lights-on' : ''}`} />
      <div className="disco-overlay" />
      <div className={`disco-scene ${ballLeaving ? 'outro' : ''}`}>
        <div className="disco-ball-light" />
        <div className={`disco-ball-wrap ${lightsOn ? 'lights-on' : ''}`} ref={wrapRef}>
          <div className="disco-string" />
          <div className="disco-ball-sphere" />
          <div className="disco-ball" ref={ballRef}>
            <div className="disco-ball-middle" />
          </div>
        </div>
      </div>
      <p className={`disco-hint ${lightsOn ? 'hint-hidden' : ''}`}>Zavrti me</p>
    </div>
  )
}
