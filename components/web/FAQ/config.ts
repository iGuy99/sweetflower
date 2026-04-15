export interface FaqItem {
  question: string
  answer: string
}

export const faqConfig = {
  eyebrow: 'FAQ',
  title: 'Česta pitanja',
  lede: 'Najčešća pitanja koja dobijamo prije zakazivanja termina.',
  placeholder:
    'Lista pitanja i odgovora (accordion) — punimo u sljedećem koraku.',
  items: [] as FaqItem[],
} as const
