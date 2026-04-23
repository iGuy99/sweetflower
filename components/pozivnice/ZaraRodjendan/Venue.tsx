'use client'

import { MapPin, Clock } from 'lucide-react'

export default function Venue() {
  return (
    <section className="zara-section">
      <h2 className="zara-section-title" data-aos="fade-down">Gdje Slavimo</h2>
      <p className="zara-section-subtitle" data-aos="fade" data-aos-delay="100">
        Pridruži nam se na ovom posebnom mjestom!
      </p>

      <div className="zara-venue-card" data-aos="fade-up" data-aos-delay="200">
        <div className="zara-venue-icon" data-aos="flip-down" data-aos-delay="300">
          <MapPin size={22} />
        </div>

        <h3 className="zara-venue-name">B&amp;G Caffe &amp; Restaurant Breza</h3>

        <div className="zara-venue-time">
          <Clock size={15} />
          <span>Početak slavlja: 17h</span>
        </div>

        <div className="zara-map-container">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2870.03105201842!2d18.253633076195225!3d44.00008397108776!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x475f2d9876622d5b%3A0x91e937c561f0778f!2sB%26g%20caffe%20restaurant!5e0!3m2!1sen!2sba!4v1776974150944!5m2!1sen!2sba"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Mapa lokacije"
          />
        </div>

        <a
          href="https://www.google.com/maps/search/B%26G+Caffe+Restaurant+Breza"
          target="_blank"
          rel="noopener noreferrer"
          className="zara-map-btn"
        >
          <MapPin size={16} />
          Otvori u Google Maps
        </a>
      </div>
    </section>
  )
}
