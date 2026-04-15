import './ConstructionBanner.css'

export default function ConstructionBanner() {
  return (
    <div className="sf-construction" role="status" aria-live="polite">
      <span className="sf-construction__dot" aria-hidden />
      <span className="sf-construction__text">
        Stranica je u izradi — sadržaj i dizajn još se finaliziraju.
      </span>
    </div>
  )
}
