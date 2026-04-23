'use client'

import { Heart } from 'lucide-react'

export default function Closing() {
  return (
    <section className="zara-closing">
      <h2 className="zara-closing-title" data-aos="zoom-in">
        Vidimo se uskoro!
      </h2>

      <p className="zara-closing-text" data-aos="fade" data-aos-delay="150">
        Veselim se da zajedno proslavimo ovaj poseban dan!
      </p>

      <div data-aos="zoom-in" data-aos-delay="250">
        <Heart size={28} className="zara-closing-heart" fill="currentColor" />
      </div>
    </section>
  )
}
