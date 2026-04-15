export interface PortfolioItem {
  slug: string
  title: string
  category: string
  cover: string
  excerpt: string
}

export const portfolioConfig = {
  eyebrow: 'Portfolio',
  title: 'Naša ostvarenja',
  lede: 'Pogledajte odabrana vjenčanja i proslave koje smo organizovali i uredili.',
  placeholder:
    'Portfolio kartice — punimo nakon setapa admin panela i baze portfolio_items.',
  items: [] as PortfolioItem[],
} as const
