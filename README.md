# Clash of România

Joc de strategie pentru telefon: îți ridici satul, antrenezi haiduci, cucerești cetățile României și ataci satele altor jucători. Totul e gratuit — contul servește doar ca să-ți păstreze progresul. Galbenii (moneda „premium”) se cer gratuit din Târg și îi aprobă adminul din panoul de control.

## Ce e în joc (v2 — reguli ca în Clash of Clans)

- **Primăria până la nivelul 15**, sat de 40×40 cu zoom din două degete.
- **Comenzi rapide**: Strânge tot, ziduri în linie (trage cu degetul), îmbunătățire multiplă (tot rândul de ziduri, toate clădirile de un fel sau alese de tine).
- **Resurse**: lei, grâu și **sare** (de la Primăria 7, pentru eroi și Bârlog). Galbenii se cer gratuit din Târg și îi aprobă adminul.
- **Clădiri**: mori, mine, saline, hambare, vistierii, depozit de sare, tabere, cazarmă, Bârlog, Laborator, Atelier de vrăji, Cetatea Clanului, altarele eroilor.
- **Apărări**: tun, turnul arcașilor, mortier, balistă (anti-aer), Turnul Solomonarului, arbaleta uriașă, turnul de foc, Vulturul Carpaților, Catapulta, ziduri.
- **Capcane ascunse**: butoiul cu pulbere, groapa cu țepi, capcana de cer, bomba mare.
- **17 oșteni**: Haiduc, Arcaș, Pandur, Călăreț, Berbec, Aerostat, Solomonar, Zâna, Zmeul, Căpcăunul, Ortacul, Balaurul; din Bârlog (cu sare): Strigoi, Hăitașul, Ielele, Moroiul, Baba Cloanța.
- **5 vrăji**: Fulger, Vindecare, Furie, Săritură, Îngheț.
- **Eroi**: Voievodul, Domnița Arcașă și Vraciul, cu niveluri și abilitate specială; apără satul când nu atacă.
- **Laborator**: îmbunătățești oștenii și vrăjile.
- **Lupte**: 3 minute, 3 stele, trofee și scut ca în CoC (30% → 12h, 60% → 14h, 90% → 16h), ligi cu bonus la victorie.
- **Clanuri**: chat, cereri și donații de oșteni pentru Cetatea Clanului, roluri (lider, colider, bătrân, membru).
- **Războaie între clanuri**: o oră de pregătire, 23 de ore de luptă, 2 atacuri de fiecare, câștigă clanul cu mai multe stele.
- **Harta României**: 9 regiuni cu jucătorii lor și 19 cetăți de cucerit pe rând.
- **Harta Europei**: 12 țări cu câte 2 cetăți (puterea 8–15), deblocate după Târgoviște.
- **Panou admin** (`admin.html`): aprobi / pui în așteptare / respingi cererile de galbeni.

## Cum îl pui online (o singură dată)

### 1. Baza de date (Supabase)
1. Intră în proiectul tău Supabase → **SQL Editor** → **New query**.
2. Copiază tot conținutul fișierului `supabase.sql`, lipește-l și apasă **Run**.
3. Apoi, într-un query nou, fă la fel cu fișierul **`supabase_v2.sql`** (clanuri, războaie, sare). Se poate rula de mai multe ori fără probleme.
4. (Recomandat) **Authentication → Sign In / Providers → Email**: oprește **Confirm email**, ca prietenii să intre în joc imediat după ce își fac cont.

### 2. Legătura joc ↔ Supabase
1. Supabase → **Project Settings → API** (sau butonul **Connect**).
2. Copiază **Project URL** și cheia **anon public** (sau **publishable**).
3. Deschide `js/config.js` și pune-le între ghilimele.
   ⚠️ Nu pune niciodată cheia `service_role` / `secret`.

### 3. GitHub Pages
Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)` → **Save**.
După 1–2 minute jocul e la: `https://adriancu91.github.io/clash.ro/`
Panoul de admin: `https://adriancu91.github.io/clash.ro/admin.html`

### 4. Fă-te admin
1. Deschide jocul și fă-ți cont cu emailul tău.
2. În Supabase → SQL Editor rulează fișierul `admin.sql` (dacă ai alt email, schimbă-l în fișier).
3. Intră în `admin.html` cu același email și parolă.

## Pe telefon
- Android (Chrome): meniul ⋮ → „Adaugă pe ecranul de pornire”.
- iPhone (Safari): Partajează → „Adaugă pe ecranul principal”.

## Mod demo
Dacă `js/config.js` e gol, jocul merge fără server: progresul se salvează doar pe acel telefon, iar `admin.html` deschis pe același telefon îți arată cererile tale (bun pentru teste).

## Unde schimbi echilibrul jocului
Tot în `js/date.js`: prețuri, timpi de construcție, viață, daune, câte clădiri pe nivel de Primărie, pachetele de galbeni.

## Securitate
Galbenii, trofeele și scutul se modifică doar pe server (prin funcțiile din `supabase.sql`). Un jucător nu-și poate da singur galbeni și nu poate aproba cereri. Resursele obișnuite (lei, grâu) și clădirile se salvează din telefon — pentru un joc între prieteni e suficient.
