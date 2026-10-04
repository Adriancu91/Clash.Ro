'use strict';
// ====================================================================
//  DATELE JOCULUI — aici schimbi prețuri, timpi, puteri.
//  pret = cât costă fiecare nivel, timp = secunde pentru fiecare nivel
// ====================================================================

const GRID = 20; // satul are 20 x 20 pătrățele

const CLADIRI = {
  primarie: {
    nume: 'Primăria', desc: 'Inima satului. Ridic-o ca să deblochezi clădiri și niveluri noi.',
    size: 3, max: 6, cost: 'lei',
    pret: [0, 1000, 4000, 12000, 30000, 70000],
    timp: [0, 60, 300, 900, 2400, 5400],
    hp: [1500, 1900, 2400, 3000, 3700, 4500],
    stoc: [1000, 2500, 5000, 10000, 20000, 40000],
  },
  moara: {
    nume: 'Moara', desc: 'Macină grâu pentru oșteni. Atinge-o ca să strângi.',
    size: 2, max: 6, cost: 'lei', res: 'grau',
    pret: [150, 300, 700, 1400, 3000, 6000],
    timp: [10, 30, 90, 240, 600, 1500],
    hp: [300, 360, 420, 500, 600, 720],
    prod: [200, 400, 700, 1000, 1400, 1900],
    cap: [500, 1000, 2000, 4000, 7000, 10000],
  },
  mina: {
    nume: 'Mina de aur', desc: 'Scoate lei din munte. Atinge-o ca să strângi.',
    size: 2, max: 6, cost: 'grau', res: 'lei',
    pret: [150, 300, 700, 1400, 3000, 6000],
    timp: [10, 30, 90, 240, 600, 1500],
    hp: [300, 360, 420, 500, 600, 720],
    prod: [200, 400, 700, 1000, 1400, 1900],
    cap: [500, 1000, 2000, 4000, 7000, 10000],
  },
  hambar: {
    nume: 'Hambarul', desc: 'Păstrează grâul. Mai multe hambare = mai mult grâu.',
    size: 2, max: 6, cost: 'lei', res: 'grau',
    pret: [300, 750, 1500, 3000, 6000, 12000],
    timp: [10, 60, 180, 480, 1200, 2400],
    hp: [400, 500, 620, 760, 920, 1100],
    stoc: [1500, 3000, 6000, 12000, 25000, 50000],
  },
  vistierie: {
    nume: 'Vistieria', desc: 'Păstrează leii. Mai multe vistierii = mai mulți lei.',
    size: 2, max: 6, cost: 'grau', res: 'lei',
    pret: [300, 750, 1500, 3000, 6000, 12000],
    timp: [10, 60, 180, 480, 1200, 2400],
    hp: [400, 500, 620, 760, 920, 1100],
    stoc: [1500, 3000, 6000, 12000, 25000, 50000],
  },
  cazarma: {
    nume: 'Cazarma', desc: 'Aici se antrenează oștenii. Nivel mai mare = armată mai mare și oșteni noi.',
    size: 3, max: 5, cost: 'grau',
    pret: [200, 1000, 3000, 8000, 20000],
    timp: [10, 120, 600, 1800, 3600],
    hp: [400, 500, 600, 720, 860],
    capacitate: [20, 30, 45, 60, 80],
  },
  tun: {
    nume: 'Tunul', desc: 'Lovește foarte tare, dar doar de aproape.',
    size: 2, max: 6, cost: 'lei', aparare: true,
    pret: [250, 1000, 4000, 8000, 16000, 32000],
    timp: [10, 120, 600, 1500, 3000, 5400],
    hp: [420, 470, 540, 620, 720, 840],
    dmg: [30, 40, 52, 66, 82, 100], interval: 1.6, raza: 4.5,
  },
  turn: {
    nume: 'Turnul arcașilor', desc: 'Trage cu săgeți de departe, des.',
    size: 2, max: 6, cost: 'lei', aparare: true,
    pret: [1000, 2000, 5000, 10000, 20000, 40000],
    timp: [60, 180, 600, 1500, 3000, 5400],
    hp: [400, 450, 520, 600, 700, 820],
    dmg: [9, 12, 16, 21, 27, 34], interval: 0.8, raza: 6,
  },
  zid: {
    nume: 'Zid de piatră', desc: 'Oprește oștenii dușmani. Se construiește pe loc.',
    size: 1, max: 6, cost: 'lei',
    pret: [50, 200, 600, 1500, 3000, 6000],
    timp: [0, 0, 0, 0, 0, 0],
    hp: [300, 500, 800, 1300, 2000, 3000],
  },
};

// Câte clădiri de fiecare fel poți avea, după nivelul Primăriei (1..6)
const LIMITE = {
  primarie:  [1, 1, 1, 1, 1, 1],
  moara:     [2, 3, 4, 5, 6, 7],
  mina:      [2, 3, 4, 5, 6, 7],
  hambar:    [1, 1, 2, 2, 3, 3],
  vistierie: [1, 1, 2, 2, 3, 3],
  cazarma:   [1, 1, 1, 1, 1, 1],
  tun:       [2, 2, 3, 3, 4, 4],
  turn:      [0, 1, 1, 2, 2, 3],
  zid:       [10, 25, 50, 75, 100, 125],
};

const ORDINE_CONSTRUIRE = ['moara', 'mina', 'hambar', 'vistierie', 'tun', 'turn', 'zid', 'cazarma'];

const OSTENI = {
  haiduc:  { nume: 'Haiduc',  desc: 'Luptă cu bâta. Atacă orice clădire.',             hp: 55,  dmg: 11, interval: 1,   raza: 0.6, viteza: 1.1, loc: 1, pret: 25,  timp: 4,  tinta: 'oricare', cazarma: 1, culoare: '#7a4a2a' },
  arcas:   { nume: 'Arcaș',   desc: 'Trage de departe, dar e fragil.',                  hp: 22,  dmg: 8,  interval: 1,   raza: 3.2, viteza: 1.3, loc: 1, pret: 50,  timp: 6,  tinta: 'oricare', cazarma: 2, culoare: '#3d7a3a' },
  calaret: { nume: 'Călăreț', desc: 'Rapid. Vânează morile, minele, hambarele.',        hp: 140, dmg: 22, interval: 1.2, raza: 0.6, viteza: 2.0, loc: 3, pret: 150, timp: 15, tinta: 'resurse', cazarma: 3, culoare: '#c08a2a' },
  pandur:  { nume: 'Pandur',  desc: 'Greu de doborât. Merge drept la tunuri și turnuri.', hp: 420, dmg: 18, interval: 1.5, raza: 0.6, viteza: 0.8, loc: 5, pret: 300, timp: 25, tinta: 'aparare', cazarma: 4, culoare: '#2a4d8f' },
};
const TINTE = { resurse: ['moara', 'mina', 'hambar', 'vistierie'], aparare: ['turn', 'tun'] };

const REGIUNI = [
  { id: 'maramures',    nume: 'Maramureș',    lon: 23.9,  lat: 47.72 },
  { id: 'crisana',      nume: 'Crișana',      lon: 21.95, lat: 47.0  },
  { id: 'banat',        nume: 'Banat',        lon: 21.35, lat: 45.7  },
  { id: 'transilvania', nume: 'Transilvania', lon: 24.25, lat: 46.62 },
  { id: 'bucovina',     nume: 'Bucovina',     lon: 25.5,  lat: 47.62 },
  { id: 'moldova',      nume: 'Moldova',      lon: 27.35, lat: 46.85 },
  { id: 'muntenia',     nume: 'Muntenia',     lon: 25.9,  lat: 44.62 },
  { id: 'oltenia',      nume: 'Oltenia',      lon: 23.65, lat: 44.48 },
  { id: 'dobrogea',     nume: 'Dobrogea',     lon: 28.35, lat: 44.42 },
];

// Cetățile de cucerit (campania). th = cât de puternică e.
const CETATI = [
  { id: 'neamt',      nume: 'Cetatea Neamțului',       lon: 26.33, lat: 47.2,  th: 1 },
  { id: 'rupea',      nume: 'Cetatea Rupea',           lon: 25.22, lat: 46.03, th: 1 },
  { id: 'deva',       nume: 'Cetatea Devei',           lon: 22.9,  lat: 45.88, th: 2 },
  { id: 'sighisoara', nume: 'Cetatea Sighișoarei',     lon: 24.79, lat: 46.22, th: 2 },
  { id: 'histria',    nume: 'Cetatea Histria',         lon: 28.77, lat: 44.55, th: 3 },
  { id: 'suceava',    nume: 'Cetatea de Scaun Suceava', lon: 26.28, lat: 47.64, th: 3 },
  { id: 'alba',       nume: 'Cetatea Alba Carolina',   lon: 23.57, lat: 46.07, th: 4 },
  { id: 'fagaras',    nume: 'Cetatea Făgărașului',     lon: 24.97, lat: 45.84, th: 4 },
  { id: 'severin',    nume: 'Cetatea Severinului',     lon: 22.66, lat: 44.63, th: 5 },
  { id: 'poienari',   nume: 'Cetatea Poienari',        lon: 24.63, lat: 45.35, th: 5 },
  { id: 'sarmis',     nume: 'Sarmizegetusa Regia',     lon: 23.31, lat: 45.62, th: 6 },
];

// Pachete de galbeni gratuite (le aprobă adminul)
const PACHETE = [
  { id: 'mana',    nume: 'Mână de galbeni',   suma: 80 },
  { id: 'punga',   nume: 'Pungă de galbeni',  suma: 500 },
  { id: 'chimir',  nume: 'Chimir',            suma: 1200 },
  { id: 'lada',    nume: 'Ladă de zestre',    suma: 2500 },
  { id: 'comoara', nume: 'Comoara haiducilor', suma: 6500 },
];
const PRET_MESTER = { 2: 250, 3: 500, 4: 1000 }; // prețul următorului meșter, după câți ai
const MAX_MESTERI = 5;

const NUME_SATE = ['Valea Lupului', 'Pădureni', 'Dealu Mare', 'Fântânele', 'Izvoarele', 'Satu Nou', 'Poiana Haiducilor',
  'Brădet', 'Stejaru', 'Măgura', 'Piatra Albă', 'Cireșoaia', 'Lunca Mare', 'Valea Seacă', 'Codrii Vechi', 'Râu Vadului'];

// Conturul României (longitudine, latitudine) — simplificat
const CONTUR_RO = [
  [20.26, 46.11], [20.75, 46.25], [21.17, 46.4], [21.26, 46.6], [21.6, 46.95], [21.85, 47.3], [22.0, 47.5], [22.3, 47.75],
  [22.7, 47.9], [22.9, 47.97], [23.15, 48.0], [23.5, 47.97], [24.0, 47.95], [24.4, 47.95], [24.85, 47.75], [25.2, 47.88],
  [25.8, 47.95], [26.2, 48.05], [26.6, 48.25], [26.95, 48.15], [27.25, 47.85], [27.5, 47.5], [27.8, 47.25], [28.1, 46.95],
  [28.22, 46.5], [28.1, 46.0], [28.15, 45.55], [28.3, 45.4], [28.7, 45.25], [29.4, 45.42], [29.7, 45.2], [29.65, 44.85],
  [29.0, 44.75], [28.8, 44.45], [28.65, 44.2], [28.6, 43.75], [28.0, 43.75], [27.5, 44.0], [27.0, 44.15], [26.5, 44.05],
  [26.0, 43.9], [25.4, 43.65], [24.9, 43.7], [24.4, 43.75], [23.8, 43.8], [23.3, 43.85], [22.9, 43.95], [22.65, 44.2],
  [22.5, 44.5], [22.2, 44.5], [22.0, 44.6], [21.6, 44.75], [21.4, 44.85], [21.55, 45.1], [21.45, 45.2], [21.1, 45.3],
  [20.9, 45.55], [20.6, 45.8],
];
const DUNAREA = [[21.4, 44.85], [21.6, 44.75], [22.0, 44.6], [22.2, 44.5], [22.5, 44.5], [22.65, 44.2], [22.9, 43.95],
  [23.3, 43.85], [23.8, 43.8], [24.4, 43.75], [24.9, 43.7], [25.4, 43.65], [26.0, 43.9], [26.5, 44.05], [27.0, 44.15],
  [27.3, 44.12], [27.85, 44.4], [27.95, 44.8], [27.95, 45.2], [28.1, 45.42], [28.7, 45.25], [29.2, 45.3], [29.68, 45.2]];
const CARPATI = [[24.1, 47.85], [25.0, 47.5], [25.7, 47.1], [26.05, 46.5], [26.15, 46.0], [25.9, 45.62], [25.3, 45.45],
  [24.5, 45.48], [23.5, 45.4], [22.7, 45.33], [22.3, 45.1], [22.05, 44.85]];
const APUSENI = [[22.35, 46.95], [22.9, 46.6], [23.2, 46.25], [23.1, 45.95]];
const MAREA_NEAGRA = [[29.0, 44.75], [29.65, 44.85], [29.7, 45.2], [30.1, 45.2], [30.1, 43.4], [28.6, 43.4], [28.6, 43.75],
  [28.65, 44.2], [28.8, 44.45]];

// ---------- generator de sate (pentru adversari și cetăți) ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashText(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

function genereazaSat(th, seed, cetate) {
  const r = rng(seed); const cl = []; let id = 1;
  const liber = (x, y, s) => {
    if (x < 1 || y < 1 || x + s > GRID - 1 || y + s > GRID - 1) return false;
    for (const c of cl) {
      const cs = CLADIRI[c.tip].size;
      if (x < c.x + cs && x + s > c.x && y < c.y + cs && y + s > c.y) return false;
    }
    return true;
  };
  const niv = tip => {
    const mx = tip === 'primarie' ? th : Math.min(CLADIRI[tip].max, th);
    return Math.max(1, mx - (r() < (cetate ? 0.2 : 0.5) ? 1 : 0));
  };
  cl.push({ id: id++, tip: 'primarie', nivel: th, x: 8, y: 8 });
  const lista = []; const L = t => LIMITE[t][th - 1];
  for (const t of ['tun', 'turn']) for (let i = 0; i < L(t) + (cetate && th >= 2 ? 1 : 0); i++) lista.push([t, true]);
  for (const t of ['hambar', 'vistierie', 'moara', 'mina', 'cazarma']) {
    let n = L(t); if (!cetate && (t === 'moara' || t === 'mina')) n = Math.max(1, Math.ceil(n * 0.7));
    for (let i = 0; i < n; i++) lista.push([t, false]);
  }
  for (const [t, aproape] of lista) {
    const s = CLADIRI[t].size;
    for (let k = 0; k < 400; k++) {
      const raza = aproape ? 2.8 + r() * 3 : 3 + r() * 6.5; const ang = r() * Math.PI * 2;
      const x = Math.round(9.5 + Math.cos(ang) * raza - s / 2), y = Math.round(9.5 + Math.sin(ang) * raza - s / 2);
      if (liber(x, y, s)) { cl.push({ id: id++, tip: t, nivel: niv(t), x, y }); break; }
    }
  }
  let ziduri = cetate ? (th === 1 ? 0 : L('zid') + 24) : (th === 1 ? 0 : L('zid'));
  if (ziduri > 0) {
    const core = cl.filter(c => c.tip === 'primarie' || CLADIRI[c.tip].aparare);
    let x0 = GRID, y0 = GRID, x1 = 0, y1 = 0;
    for (const c of core) { const s = CLADIRI[c.tip].size; x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x + s); y1 = Math.max(y1, c.y + s); }
    x0 = Math.max(1, x0 - 1); y0 = Math.max(1, y0 - 1); x1 = Math.min(GRID - 2, x1); y1 = Math.min(GRID - 2, y1);
    const inel = [];
    for (let x = x0; x <= x1; x++) { inel.push([x, y0]); inel.push([x, y1]); }
    for (let y = y0 + 1; y < y1; y++) { inel.push([x0, y]); inel.push([x1, y]); }
    const nz = niv('zid');
    for (const [x, y] of inel) { if (ziduri <= 0) break; if (liber(x, y, 1)) { cl.push({ id: id++, tip: 'zid', nivel: nz, x, y }); ziduri--; } }
  }
  return cl;
}
