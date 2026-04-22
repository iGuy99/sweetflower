'use client'

import { useEffect, useRef, useState } from 'react'
import './StatCounter.css'

interface Props {
  label: string
  sublabel: string
  className?: string
  delay?: number
}

function parseLabel(label: string): { value: number; suffix: string } {
  const match = label.match(/^(\d+)(.*)$/)
  if (!match) return { value: 0, suffix: label }
  return { value: parseInt(match[1], 10), suffix: match[2] }
}

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4)
}

export default function StatCounter({ label, sublabel, className, delay = 0 }: Props) {
  const { value, suffix } = parseLabel(label)
  const [count, setCount] = useState(0)
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true

          // Appear first, then count
          setTimeout(() => {
            setVisible(true)

            const countDelay = 700
            setTimeout(() => {
              const duration = 2400
              const start = performance.now()

              const tick = (now: number) => {
                const elapsed = now - start
                const progress = Math.min(elapsed / duration, 1)
                setCount(Math.round(easeOutQuart(progress) * value))
                if (progress < 1) requestAnimationFrame(tick)
              }

              requestAnimationFrame(tick)
            }, countDelay)
          }, delay)

          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [value, delay])

  return (
    <div
      ref={ref}
      className={`sf-stat-counter ${visible ? 'sf-stat-counter--visible' : ''} ${className ?? ''}`}
    >
      <span className="sf-uvod__stat-label">
        {count}{suffix}
      </span>
      <span className="sf-uvod__stat-sublabel">{sublabel}</span>
    </div>
  )
}
