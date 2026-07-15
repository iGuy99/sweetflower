# Plan: Online galerija za svadbe (QR upload)

> Status: PLAN — dogovoren 2026-07-10, implementacija nije počela.

## Koncept

Gosti na svadbi skeniraju QR kod (štampan na karticama za stolove) koji vodi na
`https://sweetflowerevents.com/galerija/[slug]`. Tu uploaduju slike i snimke sa
svog mobitela. SweetFlower admini kreiraju galerije za svaku svadbu kroz
centralni admin panel. Mladenci dobiju svoj link + šifru za pregled i download.

## Dogovorene odluke (interview 2026-07-10)

| Odluka | Izbor |
|---|---|
| Storage | Hetzner Object Storage (S3-kompatibilan), privatni bucket — POTVRĐENO |
| Upload | Direktno s mobitela na bucket (presigned multipart URL), zaobilazi server i Cloudflare 100MB limit |
| Upload klijent | **Vlastita implementacija** (bez Uppy-ja) — odluka radi pune kontrole; spec ispod |
| Tipovi fajlova | Slike (JPG/PNG/HEIC/WebP) + video (MP4/MOV), **max 1 GB po fajlu** |
| Model | Samostalna tabela `galleries`, opcionalni FK na `invitations` |
| Zaštita uploada | Samo QR link s nepogodivim slugom (bez PIN-a) |
| Ime gosta | Opcionalno polje prije uploada (evidencija ko je šta poslao) |
| Vidljivost | Po galeriji: javna (gosti vide sve) ili privatna (gosti samo uploaduju) |
| Download gostiju | Da, na javnim galerijama mogu skidati slike |
| Mladenci | Poseban link `/galerija/[slug]/mladenci` + šifra; pregled, download (ZIP), brisanje |
| Admin panel | `/admin`, jedan zajednički nalog (bcrypt + JWT cookie, postojeći pattern) |
| QR kod | Panel daje samo link — QR radi grafički dizajner |
| Brisanje | Samo ručno — admin briše galeriju kad prođe rok (3-6 mj.), bez automatike |

## Postojeće stanje (scan)

- Next.js 16.2.3 App Router + React 19 + Tailwind 4 + TS.
  **Pažnja:** AGENTS.md — prije kodiranja čitati docs iz `node_modules/next/dist/docs/`.
- MySQL 8 preko `mysql2` pool-a (`db/connection.ts`), ručne SQL migracije u `db/migrations/`.
- Postojeći pattern za repliciranje: `invitations` (slug + component_name),
  dinamička ruta `app/pozivnice/[slug]/`, per-slug admin login
  (`app/api/auth/invitation-login/route.ts`: bcrypt → JWT → httpOnly cookie).
- Deploy: Docker Compose (app + mysql + nginx) iza Cloudflare-a.
  nginx `client_max_body_size 50M` — **nije problem** jer upload ide direktno na bucket.

## Arhitektura

### Baza — nova migracija `004_galleries.sql`

```sql
CREATE TABLE galleries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,          -- npr. 'amila-emir-x7k2' (random sufiks)
    title VARCHAR(200) NOT NULL,                -- 'Amila & Emir'
    event_date DATE DEFAULT NULL,
    invitation_id INT DEFAULT NULL,             -- opcionalni FK na invitations
    is_public BOOLEAN DEFAULT FALSE,            -- TRUE = gosti vide galeriju
    couple_password VARCHAR(255) NOT NULL,      -- bcrypt hash, za mladence
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE SET NULL
);

CREATE TABLE gallery_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gallery_id INT NOT NULL,
    object_key VARCHAR(500) NOT NULL,           -- putanja u bucketu
    thumb_key VARCHAR(500) DEFAULT NULL,        -- thumbnail (klijentski generisan)
    file_name VARCHAR(300) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    media_type ENUM('image','video') NOT NULL,
    uploader_name VARCHAR(200) DEFAULT NULL,    -- opcionalno ime gosta
    status ENUM('uploading','ready') DEFAULT 'uploading',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
    INDEX idx_gallery_status (gallery_id, status)
);

CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Storage — Hetzner Object Storage

- Privatni bucket, sve preko presigned URL-ova (`@aws-sdk/client-s3` +
  `@aws-sdk/s3-request-presigner`, custom endpoint).
- Struktura ključeva: `galleries/{slug}/{uuid}.{ext}` + `galleries/{slug}/thumbs/{uuid}.jpg`.
- Upload: **S3 multipart** (chunk ~50 MB, retry po chunku, progress bar) za 1 GB fajlove.
- CORS na bucketu: dozvoliti PUT/GET sa `sweetflowerevents.com`.
- Pregled: kratkotrajni presigned GET URL-ovi (npr. 1 h), batch generisani uz listing.
- Brisanje galerije = obriši sve objekte pod prefiksom + red u bazi (potvrda u panelu).
- Env: `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`.

### Custom upload klijent — specifikacija

Vlastiti multipart uploader (TypeScript modul, npr. `lib/upload/`), bez vanjskih
biblioteka. Obavezan obim (MVP — bez ovoga upload NIJE spreman za produkciju):

1. **Chunking**: `file.slice()`, veličina chunka 50 MB (konstanta), redoslijed i
   `(partNumber, ETag)` knjigovodstvo za `CompleteMultipartUpload`.
2. **Paralelizam s limitom**: max 3 chunka istovremeno, queue za ostale.
3. **Retry po chunku**: max 4 pokušaja, exponential backoff + jitter
   (1s → 2s → 4s → 8s ± random). Retry SAMO na mrežne greške i 5xx.
4. **Razlikovanje grešaka**: 403 (istekao presigned URL) → zatraži novi potpis
   od servera pa nastavi, NE retry istog URL-a; 4xx (osim 403) → fail fajla
   s porukom, bez retry-ja.
5. **Progress**: `XMLHttpRequest` (fetch nema upload progress), agregiran po
   fajlu; na retry chunka progress se ne vraća unazad (računati potvrđene bajte).
6. **Abort/cleanup**: otkazivanje fajla → server poziva `AbortMultipartUpload`;
   plus bucket lifecycle pravilo za abort nedovršenih multipart uploada
   nakon 24-48h (napušteni chunkovi se inače naplaćuju).
7. **Nastavak nakon prekida veze** (WiFi→LTE, zaključan ekran): stanje uploada
   (uploadId + potvrđeni partovi) drži se u memoriji; na grešku se nastavlja
   od zadnjeg potvrđenog chunka, ne od nule.

Faza 2 (polish, NIJE MVP): preživljavanje refresha stranice — snimanje stanja
u IndexedDB i nuđenje "Nastavi upload" za isti fajl.

**Obavezno testiranje na lošoj mreži**: Chrome DevTools network throttling +
prekidi usred uploada + test na stvarnom mobitelu preko mobilne mreže.
Ovo je dio definicije "gotovo" za Fazu 3, ne opcija.

### Thumbnaili — klijentski (bez opterećenja servera)

- Slike: canvas resize (~400 px) u browseru prije uploada, upload uz original.
- Video: poster frame preko `<video>` + canvas; fallback generička ikona.

### URL struktura i flow (dogovoreno 2026-07-10)

| Ruta | Namjena |
|---|---|
| `/galerija/[slug]` | Gost: upload (ime opcionalno, multi-file, progress) + grid ako je `is_public` |
| `/galerija/[slug]/mladenci` | Login šifrom → puni pregled, download sve (ZIP), brisanje pojedinačno |
| `/admin` | Login → lista galerija (broj fajlova, zauzeće), kreiranje/uređivanje/brisanje, kopiranje linkova |

- **Slug**: admin ga bira pri kreiranju galerije. Kad mladenci imaju i pozivnicu
  i galeriju, koristi se **isti slug** radi konzistentnosti (npr.
  `/pozivnice/amila-emir` + `/galerija/amila-emir`); galerija može postojati
  i samostalno sa svojim slugom. Slug mora biti jedinstven u `galleries`.
- **Guest flow — jedna stranica, bez međukoraka**: na vrhu imena mladenaca i
  datum (brendirano, u stilu pozivnica), odmah ispod veliko "Dodajte vaše
  slike" dugme s opcionalnim poljem za ime, a ispod toga grid galerije ako je
  `is_public`. QR → upload u 2 takta.
- **Link s pozivnice**: ako galerija ima povezanu pozivnicu (`invitation_id`),
  na pozivnici se prikaže dugme "Galerija" — gosti koji izgube QR karticu
  dolaze preko pozivnice koju već imaju u telefonu.

### API

| Endpoint | Namjena |
|---|---|
| `POST /api/auth/admin-login` | Admin login (bcrypt + JWT cookie `admin-token`) |
| `POST /api/auth/couple-login` | Mladenci login po slugu (JWT cookie `couple-token`) |
| `GET/POST /api/admin/galleries` | Lista + kreiranje (admin) |
| `PATCH/DELETE /api/admin/galleries/[id]` | Uređivanje / brisanje s bucket cleanup (admin) |
| `POST /api/galerija/[slug]/upload` | Init multipart → presigned part URL-ovi (validacija tipa/veličine) |
| `POST /api/galerija/[slug]/complete` | Complete multipart → `status='ready'` u bazi |
| `GET /api/galerija/[slug]/media` | Listing s presigned GET URL-ovima (poštuje vidljivost/auth) |
| `GET /api/galerija/[slug]/download` | ZIP stream (samo mladenci/admin) |

Rate limiting na upload endpointima (jednostavan in-memory limiter po IP-u).

## Faze implementacije

1. **Temelji** — ✅ GOTOVO (2026-07-10): migracija 004 primijenjena na produkciji
   (tabele `galleries`, `gallery_media`, `admins`); `lib/s3.ts` sa multipart
   helperima; `db/queries/galleries.ts` + `db/queries/admin.ts`;
   `db/create-admin.mjs`; bucket testiran (fsn1), SDK instaliran, env sređen.
   PREOSTAJE: kreirati admin nalog `ismetcosic` (nakon deploya, preko
   `create-admin.mjs` u app kontejneru — da lozinka ne prolazi kroz chat).
2. **Admin panel** — ✅ GOTOVO I DEPLOYANO NA PRODUKCIJU (verifikovano 2026-07):
   prijava/kreiranje/linkovi/brisanje testirani uživo na /admin. Admin nalog
   `ismetcosic` kreiran.
   NAPOMENA (deploy gotcha): Dockerfile koristi Next standalone → `bcryptjs`/`mysql2`
   su bundlovani, NISU u `/app/node_modules`, pa `db/create-admin.mjs` NE radi u
   kontejneru. Admin nalog se kreira: (1) hash lokalno
   `node -e "console.log(require('bcryptjs').hashSync(process.argv[1],10))" "LOZINKA"`,
   (2) upis preko db kontejnera `docker exec -i sweetflower-db-1 mysql ... << 'SQL' INSERT INTO admins ...`.
   S3_* varijable su dodane i u `docker-compose.yml` (app env) i u server `.env`.
   Detaljno (kod, lokalno; deploy):
   (`/api/auth/admin-login` + rate limit), `/admin` stranica, `GalleriesDashboard`
   (lista sa statistikom, kreiranje preko modala, kopiranje linkova, brisanje sa
   bucket cleanupom), CRUD API rute sa admin auth guardom. Typecheck prolazi.
   Review: security-reviewer (pun izvještaj) + React review (inline, agent pao na
   API grešci). Popravljeno: JWT_SECRET fail-fast (auth-bypass rizik), rate limit
   na login, `isPublic` striktna koercija, timing anti-enumeracija, path-traversal
   guardovi u s3 ključevima, validacija (title/date/invitationId), logout cookie
   path, delete error UX, a11y aria-label. Odgođeno (nije blocker): htmlFor
   label asocijacija, rate limit na couple-login (ruta dolazi u Fazi 4).
3. **Guest upload** — ✅ IZGRAĐENO (agenti backend+frontend, lokalno; build zelen;
   NIJE još deployano): `/galerija/[slug]` (imena/datum, upload dugme, ime opciono,
   javni grid+lightbox), custom multipart uploader (lib/upload/), klijentski
   thumbnaili, 5 API ruta (init/sign-part/complete/abort/media). Stil usklađen s
   glavnim sajtom (peach paleta, Cormorant/Plus Jakarta).
   Review (security-reviewer + typescript-reviewer): 2 CRITICAL + više HIGH nađeno
   i POPRAVLJENO — abort IDOR (provjera vlasništva+status), server-side cap veličine
   (sign-part limit dijelova + HeadObject na complete), rate limit na sve upload rute,
   stall watchdog na XHR, ograničen 403 re-sign, complete retry + idempotentnost,
   klasifikacija trajnih 4xx, length caps, unmount zaustavlja queue, cancel status.
   Bucket: CORS (ExposeHeaders ETag) + lifecycle (abort nedovršenih nakon 2 dana).
   ODGOĐENO (nije blocker): otkazivanje sibling in-flight dijelova na fatalnu grešku
   (samo bandwidth), resume preko sessionStorage nakon refresha (polish), LOW kozmetika.
4. **Pregled** — javni grid + lightbox (lazy load, paginacija); mladenci stranica
   (login, pregled, brisanje, download pojedinačno + ZIP).
5. **Polish + deploy** — OG meta tagovi, testiranje na iOS/Android (HEIC!),
   bucket CORS, produkcijski env, smoke test na produkciji.

## Custom teme galerija (plan dogovoren 2026-07-14, interview 2026-07-14)

> Status: ✅ IZGRAĐENO LOKALNO (2026-07-14, Sonnet agent po
> `galerija-teme-sonnet-plan.md`; tsc + build zeleni; theme=NULL putanja
> potvrđeno identična starom izgledu — 11/11 hex vrijednosti).
> Review (security-reviewer + react-reviewer, paralelno): bez CRITICAL;
> POPRAVLJENO — HIGH: postMessage payload revalidacija (validateTheme +
> resolveTheme + e.source check u preview listeneru); MEDIUM: `Object.hasOwn`
> umjesto `in TEMPLATES` (3 mjesta); MEDIUM a11y: aria-pressed na template
> kartice + role="group" umjesto orphaned label u create modalu.
> ODGOĐENO (nije blocker): demo grid vidljiv i gostima na privatnoj galeriji
> uz ?preview=1 (bez curenja medija — samo kozmetika); nepotrebni useCallback
> wrapperi u ThemeEditor; teorijska iframe onLoad race (fix: sf-theme-ready
> handshake ako se ikad pojavi "prva promjena se ne vidi").
> PREOSTAJE: migracija 005 NIJE primijenjena (ni lokalno — Docker ugašen — ni
> na produkciji!); manuelna browser verifikacija (editor, tamna tema,
> dekoracije); NIJE pushano.

Cilj: admin može po galeriji mijenjati boje, fontove, tekstove i dekoracije,
birati između 5 gotovih templatea, uz **live preview** na posebnoj stranici za
uređivanje. Layout ostaje isti.

### Odluke iz interviewa (2026-07-14)

| Pitanje | Odluka |
|---|---|
| Obim editora | Boje + fontovi + **tekstovi** (tagline, dobrodošlica, dugme) + **dekoracije on/off**. Bez monograma/slike (kasnije po potrebi). |
| Kontrola boja | **Proširena paleta (~10 tokena)** — ne samo 5 semantičkih |
| Ko edituje | **Samo admin** — mladenci vide gotovo |
| Save flow | **Odmah live** — Sačuvaj = vidljivo gostima (preview u editoru prije snimanja) |
| Templatei | Zlatna klasika (default), Blush ruža, Botanika, Noćna elegancija, **Pastelno zelena** (novi, umjesto ranije predložene Moderne minimal) |
| Preview | **Telefon-okvir + desktop toggle** (QR publika je mobilna) |
| Izbor templatea | Već **u create modalu** (swatch picker), fino podešavanje u editoru |

### 1. Model podataka — migracija `005_gallery_theme.sql`

```sql
ALTER TABLE galleries ADD COLUMN theme JSON DEFAULT NULL;
```

`NULL` = default tema (trenutna "Zlatna klasika"). Oblik JSON-a:

```json
{
  "template": "zlatna-klasika",
  "colors": {
    "bg": "#fbf5ea",         // pozadina stranice
    "bgSoft": "#f6ead9",     // atmosfera/gradijent vrha
    "surface": "#fffdf9",    // kartice, upload panel
    "accent": "#b8863f",     // zlatna — okvir, ornamenti, akcenti
    "accentDeep": "#96692b", // hover/tamnija varijanta akcenta
    "text": "#241a12",       // glavni tekst
    "textSoft": "#4a3c30",   // podnaslovi
    "muted": "#8a7a68",      // sekundarni/meta tekst
    "button": "#2f2018",     // upload dugme
    "lightbox": "#120c08"    // lightbox/overlay pozadina
  },
  "fonts": { "display": "cormorant", "body": "jakarta", "script": "parisienne" },
  "texts": {
    "tagline": "Galerija uspomena",          // podnaslov heroa (max 120)
    "welcome": "Podijelite vaše slike...",   // poruka dobrodošlice (max 400)
    "buttonLabel": "Dodajte vaše slike"      // tekst upload dugmeta (max 60)
  },
  "decor": {
    "viewportFrame": true,   // zlatni okvir oko viewporta
    "ornaments": true,       // linija+romb razdjelnici
    "scriptAmp": true        // script '&' u imenima
  }
}
```

`template` je polazna tačka; sve ostalo su overridi preko templatea. Nijanse
koje nisu u paleti (linije, washes, sjene, success/error hover) se i dalje
**deriviraju** iz ovih 10 tokena preko `color-mix()`.

### 2. Refaktor tokena u `gallery.css` (preduslov)

Trenutno su derivirane boje hardkodirane (`rgba(184,134,63,0.35)` itd.) pa
promjena `--gold` ne bi propagirala. Refaktor na semantičke tokene +
`color-mix()` derivacije:

- Editabilni (10): `--t-bg`, `--t-bg-soft`, `--t-surface`, `--t-accent`,
  `--t-accent-deep`, `--t-text`, `--t-text-soft`, `--t-muted`, `--t-button`,
  `--t-lightbox`
- Derivirani: `--gold-line: color-mix(in srgb, var(--t-accent) 35%, transparent)`,
  `--btn-hover` = mix button↔black, sjene iz text boje s alfa, itd.
- Dark-safe: `--t-lightbox` i sjene su dio palete, da tamni template radi.
- Dekoracije: `viewportFrame`/`ornaments`/`scriptAmp` se gase data-atributima
  na `.sf-gallery-root` (npr. `[data-no-frame] .sf-gallery::after { display:none }`).

`color-mix()` je podržan u svim browserima od 2023 — OK za našu publiku.

### 3. Fontovi — kurirana lista preko next/font

`next/font` mora biti statički deklarisan, pa se **cijela kurirana lista**
deklariše u `app/galerija/layout.tsx`, ali sa `preload: false` za sve osim
defaulta — browser skida font fajl tek kad se stvarno koristi (lazy @font-face).
Tema bira mapiranje font-id → `--font-display/--font-body/--font-script`.

| Slot | Opcije (default prvi) |
|---|---|
| Display | Cormorant Garamond, Playfair Display, Marcellus, EB Garamond |
| Body | Plus Jakarta Sans, Inter, Lora, Montserrat |
| Script (&) | Parisienne, Great Vibes, Dancing Script |

### 4. Templatei (5)

1. **Zlatna klasika** — trenutni izgled (ivory + gold + espresso) = default
2. **Blush ruža** — blush/rose pozadina, bordo akcenat, Playfair
3. **Botanika** — krem + dublji sage/maslinasti akcenat, EB Garamond
4. **Noćna elegancija** — midnight tamna pozadina + zlato (dark luxury)
5. **Pastelno zelena** — svijetla pastel menta/eukaliptus pozadina, mekši
   zeleni akcenat, prozračno (razlika od Botanike: pastelna i svjetlija,
   Botanika je zasićenija/zemljanija)

Template = imenovani theme JSON preset u `lib/gallery-themes.ts` (jedan izvor
istine, koristi ga i editor i server render). "Moderna minimal" izbačena iz
prve verzije (lako se doda kasnije kao novi preset).

### 5. Primjena na stranici galerije

- `app/galerija/[slug]/page.tsx` (server) čita `gallery.theme`, **validira**
  (hex regex, font-id allowlist — zaštita od CSS injectiona) i renderuje
  inline `style` sa CSS varijablama + data-atribute za dekoracije na
  `.sf-gallery-root` wrapperu. Tekstovi (tagline/welcome/buttonLabel) idu kao
  props u GalleryClient — React ih escapuje, čuvaju se kao čisti tekst.
- Bez FOUC-a: boje dolaze u SSR HTML-u, ništa se ne "prešaltava" klijentski.

### 6. Editor stranica — `/admin/galerije/[id]/izgled`

Posebna stranica iza admin autha. Layout: lijevo kontrole, desno live preview.

- **Template picker**: 5 kartica sa mini swatch-ovima (bg/accent/text + naziv fonta)
- **Boje**: 10 pickera (`<input type="color">` + hex polje), grupisano
  (Pozadine / Akcenat / Tekst / Dugme / Lightbox)
- **Fontovi**: 3 dropdowna, svaka opcija renderovana u svom fontu
- **Tekstovi**: 3 polja (tagline ≤120, welcome ≤400, buttonLabel ≤60) sa
  placeholderom = default vrijednost
- **Dekoracije**: 3 toggla (okvir viewporta, ornamenti, script '&')
- **Preview**: `<iframe src="/galerija/[slug]?preview=1">` u **telefon-okviru**
  (~390px, zaobljeni okvir) + toggle na desktop širinu. Prava stranica, pravi
  podaci. Editor šalje theme preko `postMessage` (uz origin check), preview
  live postavlja CSS varijable/atribute/tekstove.
- Preview mode: ako je galerija prazna ili privatna (media API vrati 403),
  prikazati demo pločice da se vidi kako grid izgleda.
- Akcije: **Sačuvaj** (PATCH — odmah live), **Vrati na template** (briše
  override-e), **Vrati na default** (theme = NULL). Upozorenje na napuštanje
  stranice s nesnimljenim promjenama.

### 7. API + dashboard + create modal

- `PATCH /api/admin/galleries/[id]` proširiti sa `theme` poljem — striktna
  validacija: template ∈ enum, boje `^#[0-9a-f]{6}$`, fontovi ∈ allowlist,
  tekstovi length caps, decor booleani.
- `GalleriesDashboard`: dugme "Izgled" na svakoj kartici → editor stranica.
- **Create modal**: red template swatch kartica (default: Zlatna klasika) —
  POST prima `theme.template`, bez ostalih override-a pri kreiranju.

### Faze izrade

- **A — Infrastruktura** (~pola dana): token refaktor gallery.css (10 tokena +
  derivacije + decor data-atributi), migracija 005, `lib/gallery-themes.ts`
  (5 preseta + validacija), server-side primjena boja/fontova/tekstova/dekora.
  Provjerljivo ručnim upisom theme JSON-a u bazu.
- **B — Editor** (~dan i po): editor stranica (telefon-okvir preview +
  postMessage live update, boje/fontovi/tekstovi/dekoracije), PATCH API,
  dugme "Izgled" u dashboardu, template picker u create modalu,
  5 templatea finalizirano.
- **C — Polish** (~pola dana): QA svih 5 templatea na mobitelu (posebno
  Noćna elegancija — lightbox/overlay/sjene), responsive editor, upozorenje
  na nesnimljene promjene; kasnije: mladenci stranica (Faza 4) nasljeđuje temu.

Nezavisno od Faze 4 (mladenci) — može prije ili poslije.

### Rizici specifični za teme

- **Tamni template** traži šire pokrivanje tokena (sjene, lightbox, overlay) —
  zato je u fazi A obavezan "dark-safe" refaktor, ne samo zamjena 5 boja.
- **CSS injection**: theme vrijednosti idu u inline style → server-side stroga
  validacija formata, nikad slobodan string.
- **Font perf**: `preload: false` drži budžet — skida se samo ono što tema koristi.

## Rizici / stvari za provjeriti tokom izrade

- **Next 16 breaking changes** — čitati `node_modules/next/dist/docs/` prije svake faze.
- **HEIC s iPhone-a**: browseri ne prikazuju HEIC; iOS obično konvertuje u JPEG pri
  web uploadu, ali testirati. Fallback: prihvatiti HEIC, thumb iz canvasa neće raditi
  → generička ikona, konverzija tek ako se pokaže potrebnom.
- **Hetzner S3 kompatibilnost**: multipart + CORS podržani, ali provjeriti u praksi
  (presigned URL-ovi na custom endpointu).
- **ZIP za 50 GB galerije**: streaming ZIP je OK za slike, ali ogromne galerije mogu
  trajati — MVP: ZIP + upozorenje o veličini; alternativa kasnije po potrebi.
- **Upload preko mobilnih mreža**: chunk retry je ključan; testirati prekid/resume.
