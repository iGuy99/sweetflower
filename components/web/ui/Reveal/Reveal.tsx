'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import './Reveal.css'

type AllowedTag = 'div' | 'section' | 'article' | 'header' | 'p' | 'span' | 'li'

interface Props {
  children: ReactNode
  delay?: number
  className?: string
  as?: AllowedTag
  /**
   * Minimum viewport overlap required to trigger. Default 0.15 (15%).
   */
  threshold?: number
}

export default function Reveal({
  children,
  delay = 0,
  className = '',
  as = 'div',
  threshold = 0.15,
}: Props) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    )

    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  const Tag = as as 'div'
  const style = delay ? { transitionDelay: `${delay}ms` } : undefined
  const cls = `sf-reveal ${visible ? 'is-visible' : ''} ${className}`.trim()

  return (
    <Tag ref={ref as React.RefObject<HTMLDivElement>} className={cls} style={style}>
      {children}
    </Tag>
  )
}
