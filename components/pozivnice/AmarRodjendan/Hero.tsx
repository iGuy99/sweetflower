export default function Hero() {
  return (
    <section className="hero">
      <img
        className="hero-img"
        src="/pozivnice/AmarRodjendan/hero.jpg"
        alt="Amar — prva godina"
      />
      <div className="hero-fade-top" />
      <header className="heading">
        <div className="eyebrow" data-aos="fade-down" data-aos-offset="0" data-aos-delay="200">
          draga porodico i prijatelji
        </div>
        <h1 className="name" data-aos="fade-down" data-aos-offset="0" data-aos-delay="350">
          Amar
        </h1>
        <div className="subtitle" data-aos="fade-up" data-aos-offset="0" data-aos-delay="500">
          <span className="rule" />
          <span>navršava</span>
          <span className="num">1</span>
          <span>godinu</span>
          <span className="rule" />
        </div>
      </header>
      <div className="hint" data-aos="fade" data-aos-offset="0" data-aos-delay="800">
        <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
          <path d="M10 3v14M4 11l6 6 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </section>
  )
}
