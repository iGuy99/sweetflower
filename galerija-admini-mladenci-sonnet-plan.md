# Implementacioni plan: Admin role + Mladenci stranica (za izvršioca)

> Kontekst: `galerija-plan.md` (Faza 4 = mladenci; admin sistem postoji sa
> jednim nalogom). Interview odluke 2026-07-14:
> - Obični admin: SVE osim upravljanja adminima
> - Superadmin (samo postojeći nalog `ismetcosic`): + dodavanje admina,
>   brisanje admina, reset lozinke. BEZ unapređenja u superadmina (super je
>   zauvijek samo jedan).
> - Mladenci (`/galerija/[slug]/mladenci`, prijava šifrom): pregled svega +
>   lightbox + pojedinačni download, pojedinačno brisanje, selekcija više
>   odjednom (obriši/preuzmi selektovano), ZIP download svega.
> - Mladenci UI: ISTA tema kao guest galerija (boje/fontovi te galerije) +
>   diskretna akciona traka.

## Obavezna pravila (ista kao u `galerija-teme-sonnet-plan.md`)

1. Next.js 16: `params`/`searchParams` su Promise — čitaj docs u
   `node_modules/next/dist/docs/` prije rutnih fajlova.
2. NE diraj upload logiku (`lib/upload/*`, upload API rute).
3. Komentari/UI na bosanskom, bez console.log (osim `console.error` u catch).
4. Poslije svake faze `npx tsc --noEmit` zeleno + commit. Na kraju `npm run build`.
5. NE pushati. Migracije samo kreirati (primjena na prod je deploy korak).
6. Postojeći patterni su zakon: rate limiting (`lib/rate-limit.ts` —
   `rateLimit(key, max, windowMs)` + `clientIp(req)`), JWT (`lib/auth.ts`
   `signToken`/`verifyToken`), bcrypt cost 10, httpOnly cookies.

---

## FAZA A — Admin role: backend

### A.1 `db/migrations/006_admin_roles.sql` (novi fajl)

```sql
-- Role za admine: 'super' upravlja adminima, 'admin' sve ostalo.
ALTER TABLE admins ADD COLUMN role ENUM('super','admin') NOT NULL DEFAULT 'admin';
-- Postojeći (jedini) nalog postaje superadmin.
UPDATE admins SET role = 'super';
```

### A.2 `db/queries/admin.ts` (izmjena)

- `verifyAdmin`: SELECT proširi sa `role`; return `{ id, username, role }`.
- Novo:
  ```ts
  export interface AdminAccount { id: number; username: string; role: 'super' | 'admin'; created_at: string }
  export async function listAdmins(): Promise<AdminAccount[]>          // bez password_hash!
  export async function createAdmin(username: string, password: string): Promise<number>  // bcrypt 10, role='admin'
  export async function getAdminById(id: number): Promise<AdminAccount | null>
  export async function deleteAdmin(id: number): Promise<void>
  export async function updateAdminPassword(id: number, password: string): Promise<void>  // bcrypt 10
  ```

### A.3 `lib/admin-auth.ts` (izmjena)

- `getAdminSession` ostaje isti (stari tokeni bez `role` i dalje vrijede kao
  obični admin — superadmin se mora ponovo prijaviti da token dobije role).
- Dodaj:
  ```ts
  export function isSuperSession(payload: { role?: unknown } | null): boolean {
    return payload?.role === 'super'
  }
  ```

### A.4 `app/api/auth/admin-login/route.ts` (izmjena)

U `signToken` payload dodaj `role: admin.role` i `adminId: admin.id`
(pored postojećeg `type: 'admin'` i username-a — pogledaj kako sada izgleda
i samo proširi).

### A.5 Nove API rute

`app/api/admin/admins/route.ts`:
- GET — lista admina. Guard: `getAdminSession` + `isSuperSession`, inače 403
  (401 ako nema sesije). Vraća `{ admins: AdminAccount[] }`.
- POST — kreiranje. Super only. Rate limit `admin-manage:${ip}` 20/10min.
  Validacija: username `/^[a-z0-9_.-]{3,50}$/` (lowercase-uj input), password
  ≥ 8 znakova. Duplikat username → 409. Vraća 201 `{ id }`.

`app/api/admin/admins/[id]/route.ts`:
- DELETE — super only, rate limit isti ključ. Zabrane: ne smije obrisati
  nalog sa `role='super'` (ni samog sebe — super je uvijek super) → 400 sa
  porukom. Nepostojeći → 404.
- PATCH — reset lozinke, super only. Body `{ password }` ≥ 8. Radi i na
  vlastitom nalogu (promjena svoje lozinke).

**Commit A**: `feat: admin roles backend (super/admin, manage API)`

---

## FAZA B — Admin role: UI

### B.1 `app/admin/page.tsx` (izmjena)

Payload iz tokena već imaš — proslijedi `isSuper={payload.role === 'super'}`
u `GalleriesDashboard`.

### B.2 `app/admin/GalleriesDashboard.tsx` + `admin.css` (izmjena)

- U header pored "Odjava": dugme "Admini" (lucide `Users`) — VIDLJIVO SAMO
  kad `isSuper`.
- Klik otvara modal (isti stil kao create-gallery modal): 
  - Lista admina: username + role badge ("superadmin" zlatni badge) + datum;
    uz svaki `admin` (ne-super) nalog dugmad: "Reset lozinke" (prompt-polje
    u redu — input koji se pokaže inline + potvrda) i "Obriši" (potvrda).
  - Ispod: forma za novog admina (username + lozinka + potvrda lozinke,
    client-side ista validacija kao server).
  - Sve greške servera prikazati u modalu (409 duplikat itd.).
- Ako korisnik NIJE super: nema dugmeta, i to je sve (API ionako brani).

**Commit B**: `feat: admin management UI (superadmin only)`

---

## FAZA C — Mladenci: auth + API + ekstrakcija Lightboxa

### C.1 `lib/couple-auth.ts` (novi fajl)

```ts
import type { NextRequest } from 'next/server'
import { verifyToken } from './auth'
export const COUPLE_COOKIE = 'couple-token'

// Sesija mladenaca vrijedi SAMO za slug za koji je izdana.
// Admin sesija se također prihvata (admin može sve što i mladenci).
export async function getCoupleOrAdminSession(req: NextRequest, slug: string): Promise<'couple' | 'admin' | null>
```
Implementacija: prvo probaj `couple-token` (payload.type === 'couple' &&
payload.slug === slug), pa `admin-token` (payload.type === 'admin').
Vrati koji je tip prošao ili null.

### C.2 `app/api/auth/couple-login/route.ts` (novi fajl)

- POST body `{ slug, password }`. **Rate limit** (ovo je odgođena stavka iz
  Faze 2 — OBAVEZNO): `couple-login:${clientIp(req)}` 5 pokušaja / 15 min →
  429 + Retry-After.
- `verifyCouplePassword(slug, password)` (postoji u `db/queries/galleries.ts`).
  Pogrešna šifra ili nepostojeća galerija → ISTA poruka i status 401
  (anti-enumeracija).
- Uspjeh: `signToken({ type: 'couple', slug }, '30d')`, cookie `couple-token`
  httpOnly, secure (production), sameSite 'lax', path '/', maxAge 30 dana.

`app/api/auth/couple-logout/route.ts` — POST, obriši cookie (path '/').
Kopiraj pattern iz admin-logout.

### C.3 `app/api/galerija/[slug]/mladenci/media/route.ts` (novi fajl)

- GET. Auth: `getCoupleOrAdminSession(req, slug)` → 401. Rate limit 120/min.
- Vraća SVE ready medije (i za privatne galerije — mladenci vide sve), isti
  oblik kao javni media endpoint (thumbUrl/url/downloadUrl/uploaderName/...).
  Iskoristi postojeću logiku iz `app/api/galerija/[slug]/media/route.ts` —
  izdvoji mapiranje redova u zajedničku funkciju (npr. u `db/queries` NE —
  nego mali helper u `lib/media-payload.ts`) da nema copy-paste drifta.

### C.4 `app/api/galerija/[slug]/mladenci/delete/route.ts` (novi fajl)

- POST (ne DELETE — body sa listom). Body `{ ids: number[] }`, max 200,
  svi moraju biti pozitivni integeri. Auth isti. Rate limit 30/10min.
- Za svaki id: `getMediaById` → preskoči ako ne postoji ILI
  `media.gallery_id !== gallery.id` (vlasništvo!). Skupi `object_key` +
  `thumb_key` svih validnih → JEDAN `deleteKeys(keys)` poziv (batch) → tek
  onda obriši DB redove. Vrati `{ deleted: n }`.

### C.5 Ekstrakcija Lightboxa (izmjena `GalleryClient.tsx` + novi fajl)

- Presele: `Lightbox` komponentu (i njene pomoćne tipove/konstante
  SWIPE_THRESHOLD_PX itd.) iz `GalleryClient.tsx` u novi
  `app/galerija/[slug]/Lightbox.tsx` — **čisto premještanje, bez promjene
  logike**. `MediaItem` interfejs premjesti u `Lightbox.tsx` i exportuj
  (GalleryClient ga importuje).
- Body scroll-lock: trenutni effect u GalleryClient veže
  `lightboxIndex !== null || overlayVisible`. Podijeli: Lightbox.tsx dobija
  VLASTITI mount/unmount scroll-lock effect (ista position:fixed tehnika),
  a GalleryClient-ov effect ostaje samo za `overlayVisible`. Pazi da se
  ne dupliraju (lightbox otvoren dok je overlay aktivan nije moguć slučaj
  u praksi, ali kod mora biti no-op siguran: drugi lock preskače ako je
  body već fiksiran — provjeri `document.body.style.position === 'fixed'`).
- Nakon ekstrakcije: guest stranica MORA raditi identično (lightbox,
  swipe, strelice, download dugme, scroll-lock na iOS-u).

**Commit C**: `feat: couple auth + media/delete API, extract shared Lightbox`

---

## FAZA D — Mladenci: stranica

### D.1 `app/galerija/[slug]/mladenci/page.tsx` (novi fajl, server)

- `force-dynamic`. `await params`. `getGalleryBySlug` → `notFound()`.
- Tema: `resolveTheme(parseThemeColumn(gallery.theme))` — ISTA kao guest.
- Server-side provjera cookie-ja (`cookies()` + verifyToken + type/slug):
  - nema validne sesije → renderuj `<CoupleLogin slug title theme />`
  - ima → `<CoupleGallery slug title eventDate theme />`

### D.2 `app/galerija/[slug]/mladenci/CoupleLogin.tsx` (novi fajl, client)

Tematizovan (style vars na rootu kao GalleryClient): imena mladenaca (isti
hero stil, manji), jedno polje za šifru + dugme "Uđi u galeriju", greška
ispod polja ("Pogrešna šifra. Pokušajte ponovo."), na 429 prikaži poruku o
previše pokušaja. Na uspjeh: `window.location.reload()`.

### D.3 `app/galerija/[slug]/mladenci/CoupleGallery.tsx` (novi fajl, client)

Struktura (drži < 500 linija; stilove u `couple.css` sa `sf-couple__`
prefiksom, koristi ISTE `--t-*`/derivirane tokene iz gallery.css — importuj
`../gallery.css` u mladenci/page.tsx da tokeni postoje):

- Header: imena + datum (kompaktniji hero), diskretno "Odjava" dugme.
- Akciona traka (sticky top ispod headera): 
  - "Preuzmi sve (ZIP)" → link na ZIP rutu (Faza E; do tada disabled)
  - "Selektuj" → uključi selection mod; tada traka pokazuje broj
    selektovanih + "Preuzmi selektovano" + "Obriši selektovano" + "Otkaži"
- Grid: kao guest MediaGallery (thumbUrl, lazy, aspect 1/1). U selection
  modu klik na pločicu toggluje selekciju (checkbox overlay, accent boja);
  van selection moda klik otvara Lightbox (shared komponenta iz Faze C).
- Brisanje: confirm modal ("Obrisati N slika? Ovo je trajno.") → POST na
  delete rutu → ukloni iz lokalnog state-a. Greške prikaži u modalu.
- "Preuzmi selektovano": za ≤ 5 fajlova sekvencijalno okini `downloadUrl`
  linkove (kreiraj <a download> pa click); za > 5 koristi ZIP rutu sa
  `?ids=` (Faza E).
- Prazna galerija: poruka "Još nema slika — podijelite QR kod sa gostima."

**Commit D**: `feat: couple gallery page (login, themed view, select/delete)`

---

## FAZA E — ZIP download

### E.1 Dependency

`npm install archiver` + `npm install -D @types/archiver`. (Standalone
build ga bundluje — nema dodatnih deploy koraka.)

### E.2 `lib/s3.ts` (izmjena)

```ts
// Node Readable stream objekta — za streaming ZIP-a.
export async function getObjectStream(key: string): Promise<Readable>
```
(GetObjectCommand → `res.Body as Readable`; import type { Readable } from 'node:stream'.)

### E.3 `app/api/galerija/[slug]/mladenci/zip/route.ts` (novi fajl)

- GET. Auth `getCoupleOrAdminSession`. Rate limit `couple-zip:${ip}` 5/10min
  (skupa operacija). `force-dynamic`.
- Query `?ids=1,2,3` opcionalno (cap 500, integeri) — inače svi ready mediji.
  Ownership: ids filtriraj kroz getReadyMedia(gallery.id) rezultat (ne
  pojedinačne getMediaById upite).
- `archiver('zip', { zlib: { level: 0 } })` — level 0 (store): slike/video su
  već komprimovani, štedi CPU i vrijeme.
- Za svaki medij: `archive.append(await getObjectStream(row.object_key),
  { name: fileName })` — imena unikatna: prefiks rednim brojem
  `001-IMG_1234.jpg` (sanitizuj ime: `replace(/[^\w.\- ]/g, '_')`, max 100).
  Append SEKVENCIJALNO (ne sve odjednom — archiver ionako serijalizuje, ali
  ne otvaraj 500 S3 streamova unaprijed: dohvataj stream tek u `entry`
  redoslijedu — najjednostavnije: koristi async petlju koja append-uje jedan
  po jedan i awaita 'entry' event, ili archiver.append sa lazy funkcijom —
  provjeri archiver docs; prihvatljivo je i append-ovati redom bez čekanja
  jer archiver čita streamove tek kad na njih dođe red, ali S3 idle timeout
  može zatvoriti davno otvorene streamove — zato LAZY dohvat).
- Response: Node stream → web: `Readable.toWeb(archive) as ReadableStream`,
  headers: `Content-Type: application/zip`,
  `Content-Disposition: attachment; filename="<slug>-galerija.zip"`,
  `Cache-Control: no-store`, `X-Accel-Buffering: no` (nginx da ne buffira).
- Greška usred streama se ne može pretvoriti u status kod — loguj
  `console.error` i `archive.abort()`.

### E.4 `CoupleGallery.tsx` (izmjena)

Aktiviraj "Preuzmi sve (ZIP)" (`<a href={...}/zip>` — običan link, browser
preuzima) i "Preuzmi selektovano" za > 5 (`.../zip?ids=...`).

**Commit E**: `feat: streaming ZIP download for couple gallery`

---

## FAZA F — Verifikacija (bez pusha)

1. `npx tsc --noEmit` + `npm run build` zeleno.
2. Statički: grep da nijedna nova ruta ne koristi `getAdminSession` bez
   provjere rezultata; da couple rute sve imaju rate limit; da mladenci
   media/delete/zip rute sve zovu `getCoupleOrAdminSession`.
3. Guest stranica: potvrdi diff-om da je Lightbox ekstrakcija čisto
   premještanje (git diff bez logičkih promjena).
4. Završni izvještaj: status faza + commit hashevi + odstupanja + šta ostaje
   za browser test + podsjetnik da migracija 006 ide na prod PRIJE pusha.

## Sažetak novih/izmijenjenih fajlova

| Fajl | Akcija |
|---|---|
| `db/migrations/006_admin_roles.sql` | novo |
| `db/queries/admin.ts` | izmjena (role + CRUD) |
| `lib/admin-auth.ts` | izmjena (isSuperSession) |
| `lib/couple-auth.ts` | novo |
| `lib/media-payload.ts` | novo (zajedničko mapiranje media redova) |
| `lib/s3.ts` | izmjena (getObjectStream) |
| `app/api/auth/admin-login/route.ts` | izmjena (role u tokenu) |
| `app/api/auth/couple-login/route.ts` + `couple-logout` | novo |
| `app/api/admin/admins/route.ts` + `[id]/route.ts` | novo |
| `app/api/galerija/[slug]/media/route.ts` | izmjena (koristi media-payload helper) |
| `app/api/galerija/[slug]/mladenci/media|delete|zip/route.ts` | novo (3 rute) |
| `app/galerija/[slug]/Lightbox.tsx` | novo (ekstrakcija) |
| `app/galerija/[slug]/GalleryClient.tsx` | izmjena (import Lightbox, scroll-lock split) |
| `app/galerija/[slug]/mladenci/page.tsx` + `CoupleLogin.tsx` + `CoupleGallery.tsx` + `couple.css` | novo |
| `app/admin/page.tsx` | izmjena (isSuper prop) |
| `app/admin/GalleriesDashboard.tsx` + `admin.css` | izmjena (Admini modal) |
| `package.json` | izmjena (archiver) |
