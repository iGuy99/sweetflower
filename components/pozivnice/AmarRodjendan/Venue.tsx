export default function Venue() {
  return (
    <section className="venue-section">
      <div className="sec-eyebrow" style={{ color: 'var(--ink-soft)' }} data-aos="fade-down">
        gdje slavimo
      </div>
      <h2 className="sec-title" style={{ color: 'var(--ink)', marginBottom: 4 }} data-aos="fade-down" data-aos-delay="80">
        Lokacija
      </h2>
      <p className="sec-sub" style={{ color: 'var(--ink-soft)', marginBottom: 28 }} data-aos="fade" data-aos-delay="150">
        Pridružite nam se u prelijepom ambijentu
      </p>

      <div className="venue-card" data-aos="fade-up" data-aos-delay="200">
        <div className="venue-card-body">
          <div className="venue-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 1C6.24 1 4 3.24 4 6c0 3.75 5 11 5 11s5-7.25 5-11c0-2.76-2.24-5-5-5z"
                stroke="#3a2e22" strokeWidth="1.4" fill="none"
              />
              <circle cx="9" cy="6" r="1.8" stroke="#3a2e22" strokeWidth="1.4" />
            </svg>
          </div>
          <div className="venue-name">Dedina Luka</div>
          <div className="venue-time">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="5.5" stroke="#5a4836" strokeWidth="1.3" />
              <path d="M6.5 3.5v3.2l2 1.3" stroke="#5a4836" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Početak slavlja: 15h
          </div>
        </div>

        <iframe
          className="venue-map"
          src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d218.85613354270276!2d18.25829419412686!3d43.998206996965315!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2sba!4v1779702464405!5m2!1sen!2sba"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Lokacija — Dedina Luka"
        />

        <div className="venue-contact">
          Za više info kako do lokacije kontaktirajte<br />
          <strong>Ismeta i Atidu</strong>
        </div>

        <a
          className="venue-maps-btn"
          href="https://www.google.com/maps?q=43.998206996965315,18.25829419412686"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1C4.79 1 3 2.79 3 5c0 2.9 4 8 4 8s4-5.1 4-8c0-2.21-1.79-4-4-4z" stroke="#3a2e22" strokeWidth="1.3" fill="none"/>
            <circle cx="7" cy="5" r="1.4" stroke="#3a2e22" strokeWidth="1.3"/>
          </svg>
          Otvori Google Maps
        </a>
      </div>
    </section>
  )
}
