'use client'

import { useState } from 'react'
import './ConstructionBanner.css'

export default function ConstructionBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div
      className="sf-construction"
      role="status"
      onClick={() => setDismissed(true)}
      title="Klikni za zatvaranje"
    >
      <span className="sf-construction__dot" aria-hidden />
      <span className="sf-construction__text">
        Stranica je u izradi — sadržaj i dizajn još se finaliziraju.
      </span>
      <span className="sf-construction__close" aria-hidden>✕</span>
    </div>
  )
}
