'use client'

import { Clock, MapPin, Car } from 'lucide-react'
import { PiForkKnifeBold } from 'react-icons/pi'

interface Props {
  venue: {
    name: string
    subname: string
    address: string
    mapUrl: string
    mapsLink: string
  }
  date: { ceremonyTime: string; banquetTime: string }
  parkingInfo: string
}

export default function Venue({ venue, date, parkingInfo }: Props) {
  return (
    <section className="venue-section">
      <h2 className="section-title" data-aos="fade-down">Gdje Slavimo</h2>
      <p className="section-subtitle" data-aos="fade" data-aos-delay="100">
        Mjesto gdje svi skupa slavimo naše sudbonosno DA
      </p>
      <div className="venue-card" data-aos="fade-up" data-aos-delay="200">
        <div className="venue-icon" data-aos="flip-down" data-aos-delay="400">
          <MapPin size={24} />
        </div>
        <h3 className="venue-name">{venue.name}</h3>
        <p className="venue-subname">{venue.subname}</p>
        <div className="venue-times">
          <div className="venue-time">
            <Clock size={16} />
            <span>Ceremonija: {date.ceremonyTime}</span>
          </div>
          <div className="venue-time">
            <PiForkKnifeBold size={16} />
            <span>Večera: {date.banquetTime}</span>
          </div>
        </div>
        <p className="venue-address">{venue.address}</p>
        <div className="map-container">
          <iframe
            src={venue.mapUrl}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Mapa lokacije"
          />
        </div>
        <a href={venue.mapsLink} target="_blank" rel="noopener noreferrer" className="map-button">
          <MapPin size={18} />
          Otvori u Google Maps
        </a>
        <div className="parking-info">
          <Car size={18} />
          <span>{parkingInfo}</span>
        </div>
      </div>
    </section>
  )
}
