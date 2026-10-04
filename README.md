# Clash of România

Joc de strategie pentru telefon: îți ridici satul, antrenezi haiduci, cucerești cetățile României și ataci satele altor jucători. Totul e gratuit — contul servește doar ca să-ți păstreze progresul. Galbenii (moneda „premium”) se cer gratuit din Târg și îi aprobă adminul din panoul de control.

## Ce e în joc

- **Satul** (20×20): Primăria, Mori (grâu), Mine de aur (lei), Hambare, Vistierii, Cazarma, Tunuri, Turnuri de arcași, Ziduri.
- **Oșteni**: Haiduc, Arcaș, Călăreț, Pandur.
- **Harta României**: 9 regiuni (vezi câți jucători sunt în fiecare și îi poți ataca) + 11 cetăți de cucerit pe rând (de la Cetatea Neamțului la Sarmizegetusa).
- **Lupte**: 3 minute, 3 stele, pradă din resursele adversarului, trofee, scut după ce ești atacat.
- **Târg**: ceri galbeni gratuit (pachete sau sumă aleasă), îi cheltui pe meșteri, grăbire, umplere depozite, scut.
- **Panou admin** (`admin.html`): Aprobă / Pune în așteptare / Respinge cereri, dai sau iei galbeni, blochezi jucători, vezi jurnalul de galbeni.

## Cum îl pui online (o singură dată)

### 1. Baza de date (Supabase)
1. Intră în proiectul tău Supabase → **SQL Editor** → **New query**.
2. Copiază tot conținutul fișierului `supabase.sql`, lipește-l și apasă **Run**.
3. (Recomandat) **Authentication → Sign In / Providers → Email**: oprește **Confirm email**, ca prietenii să intre în joc imediat după ce își fac cont.

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
