export interface UvodBlock {
  kind: 'paragraph' | 'quote' | 'stat'
  text: string
  label?: string
}

export const uvodConfig = {
  eyebrow: 'Sweet Flower Vjenčanja',
  promiseLabel: 'Zapamtite ovo obećanje',
  headline:
    'Vaše vjenčanje bit će jedinstveno, autentično, besprijekorno organizovano i bez stresa.',
  blocks: [
    {
      kind: 'paragraph',
      text:
        'Naša strast je stvaranje vjenčanja koja se ne zaboravljaju — ne samo zbog estetike, već zbog osjećaja koji ostavljaju. Vjerujemo da svaki detalj ima svoju ulogu, od prvog dojma do posljednjeg trenutka večeri.',
    },
    {
      kind: 'stat',
      label: '10+ godina iskustva',
      text:
        'Sa više od deset godina iskustva u organizaciji i dekoraciji, iza nas su brojni događaji oblikovani s pažnjom, stilom i jasnom vizijom. To iskustvo nam omogućava da svaki proces vodimo sigurno, smireno i precizno — bez improvizacije i stresa.',
    },
    {
      kind: 'paragraph',
      text:
        'Kroz pažljivo osmišljenu organizaciju i sofisticiranu dekoraciju, pretvaramo vašu viziju u iskustvo koje je u potpunosti vaše. Slušamo, razumijemo i oblikujemo svaki element kako bismo kreirali vjenčanje koje odražava vašu priču, stil i emociju.',
    },
    {
      kind: 'quote',
      text:
        'Bilo da zamišljate elegantnu i klasičnu atmosferu, modernu i minimalističku estetiku ili bogatu, romantičnu scenografiju — naš cilj je isti: da sve funkcioniše besprijekorno, izgleda očaravajuće i da vi u svakom trenutku jednostavno uživate.',
    },
    {
      kind: 'paragraph',
      text:
        'Osim vjenčanja, sa jednakom pažnjom i posvećenošću kreiramo i poslovne evente i posebne proslave — uvijek sa fokusom na detalje, estetiku i besprijekornu organizaciju.',
    },
    {
      kind: 'quote',
      text:
        'Jer vjenčanje nije samo događaj. To je doživljaj koji se pamti cijeli život.',
    },
  ] as UvodBlock[],
} as const
