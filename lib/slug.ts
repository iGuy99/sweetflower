// Slug: mala slova, brojevi i crtice. Koristi se u URL-u galerije (ide na QR).

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Pretvori proizvoljan tekst u validan slug (npr. "Amila & Emir" -> "amila-emir").
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/đ/g, 'd') // Đ/đ se ne razlaže kroz NFD — ručno
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // ukloni dijakritike (č -> c, š -> s ...)
    .replace(/[^a-z0-9]+/g, '-') // sve ostalo u crtice
    .replace(/^-+|-+$/g, '') // trim crtice s krajeva
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && slug.length >= 2 && slug.length <= 100
}
