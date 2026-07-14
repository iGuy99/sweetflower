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
2. **Admin panel** — ✅ GOTOVO (kod, lokalno; nije još deployano): login
   (`/api/auth/admin-login` + rate limit), `/admin` stranica, `GalleriesDashboard`
   (lista sa statistikom, kreiranje preko modala, kopiranje linkova, brisanje sa
   bucket cleanupom), CRUD API rute sa admin auth guardom. Typecheck prolazi.
   Review: security-reviewer (pun izvještaj) + React review (inline, agent pao na
   API grešci). Popravljeno: JWT_SECRET fail-fast (auth-bypass rizik), rate limit
   na login, `isPublic` striktna koercija, timing anti-enumeracija, path-traversal
   guardovi u s3 ključevima, validacija (title/date/invitationId), logout cookie
   path, delete error UX, a11y aria-label. Odgođeno (nije blocker): htmlFor
   label asocijacija, rate limit na couple-login (ruta dolazi u Fazi 4).
3. **Guest upload** — `/galerija/[slug]`: multi-file picker, klijentski thumb,
   custom multipart uploader po spec-u iznad; mobile-first dizajn.
   Definicija "gotovo" uključuje testove na throttled mreži i prekidima.
4. **Pregled** — javni grid + lightbox (lazy load, paginacija); mladenci stranica
   (login, pregled, brisanje, download pojedinačno + ZIP).
5. **Polish + deploy** — OG meta tagovi, testiranje na iOS/Android (HEIC!),
   bucket CORS, produkcijski env, smoke test na produkciji.

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
