'use strict';
// ====================================================================
//  DATELE JOCULUI (v2) — reguli în stilul Clash of Clans, nume românești.
//  Aici schimbi prețuri, timpi, puteri. Fiecare listă are câte o valoare
//  pentru fiecare nivel. maxTH = nivelul maxim permis la Primăria 1..10,
//  lim = câte clădiri de acel fel poți avea la Primăria 1..10.
// ====================================================================

const GRID = 40;              // satul are 40 x 40 pătrățele
const MAX_TH = 15;
const MIN = 60, ORA = 3600, ZI = 86400;
const G = (b, f, n, r = 1) => Array.from({ length: n }, (_, i) => Math.round(b * Math.pow(f, i) / r) * r);
const L10 = v => Array(10).fill(v);

const CLADIRI = {
  // ---------------- speciale ----------------
  primarie: {
    nume: 'Primăria', desc: 'Inima satului. Fiecare nivel deblochează clădiri și niveluri noi.', cat: 'special',
    size: 3, cost: 'lei', pret: [0, 1000, 4000, 25000, 150000, 500000, 1000000, 2000000, 3000000, 4000000],
    timp: [0, 5 * MIN, 3 * ORA, 8 * ORA, ZI, 2 * ZI, 3 * ZI, 4 * ZI, 5 * ZI, 7 * ZI],
    hp: [1500, 1600, 1850, 2100, 2400, 2800, 3300, 3900, 4600, 5500],
    stoc: [1000, 2500, 10000, 50000, 100000, 300000, 500000, 750000, 1000000, 1500000],
    stocSare: [0, 0, 0, 0, 0, 0, 2500, 5000, 10000, 20000],
    maxTH: L10(10), lim: L10(1),
  },
  cetateClan: {
    nume: 'Cetatea Clanului', desc: 'Ține oștenii dăruiți de clan. Îi poți folosi la atac, iar în apărare ies să lupte.', cat: 'armata',
    size: 3, cost: 'lei', pret: [10000, 100000, 800000, 1800000, 5000000], timp: [10, ZI, 2 * ZI, 3 * ZI, 5 * ZI],
    hp: [1000, 1400, 2000, 2600, 3000], capacitate: [10, 15, 20, 25, 30],
    maxTH: [0, 0, 1, 2, 2, 3, 3, 4, 4, 5], lim: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  // ---------------- resurse ----------------
  moara: {
    nume: 'Moara', desc: 'Macină grâu. Atinge-o ca să strângi.', cat: 'resurse', size: 2, cost: 'lei', res: 'grau',
    pret: [150, 300, 700, 1400, 3000, 7000, 14000, 28000, 56000, 75000],
    timp: [10, MIN, 15 * MIN, ORA, 3 * ORA, 6 * ORA, 12 * ORA, ZI, 2 * ZI, 3 * ZI],
    hp: G(400, 1.08, 10), prod: [200, 400, 600, 800, 1000, 1300, 1600, 1900, 2200, 2500],
    cap: [1000, 2000, 3000, 5000, 10000, 20000, 30000, 50000, 75000, 100000],
    maxTH: [2, 4, 6, 8, 10, 10, 10, 10, 10, 10], lim: [2, 3, 4, 5, 6, 7, 7, 7, 7, 7],
  },
  mina: {
    nume: 'Mina de aur', desc: 'Scoate lei din munte. Atinge-o ca să strângi.', cat: 'resurse', size: 2, cost: 'grau', res: 'lei',
    pret: [150, 300, 700, 1400, 3000, 7000, 14000, 28000, 56000, 75000],
    timp: [10, MIN, 15 * MIN, ORA, 3 * ORA, 6 * ORA, 12 * ORA, ZI, 2 * ZI, 3 * ZI],
    hp: G(400, 1.08, 10), prod: [200, 400, 600, 800, 1000, 1300, 1600, 1900, 2200, 2500],
    cap: [1000, 2000, 3000, 5000, 10000, 20000, 30000, 50000, 75000, 100000],
    maxTH: [2, 4, 6, 8, 10, 10, 10, 10, 10, 10], lim: [2, 3, 4, 5, 6, 7, 7, 7, 7, 7],
  },
  minaSare: {
    nume: 'Salina', desc: 'Scoate sare — resursa rară pentru eroi și oștenii din Bârlog.', cat: 'resurse', size: 2, cost: 'grau', res: 'sare',
    pret: [100000, 150000, 200000, 300000, 400000, 500000], timp: [6 * ORA, 12 * ORA, ZI, 2 * ZI, 3 * ZI, 4 * ZI],
    hp: G(800, 1.08, 6), prod: [20, 30, 45, 60, 80, 100], cap: [120, 240, 450, 720, 1120, 1500],
    maxTH: [0, 0, 0, 0, 0, 0, 2, 4, 6, 6], lim: [0, 0, 0, 0, 0, 0, 1, 2, 2, 3],
  },
  hambar: {
    nume: 'Hambarul', desc: 'Păstrează grâul.', cat: 'resurse', size: 2, cost: 'lei', res: 'grau',
    pret: [300, 750, 1500, 3000, 6000, 12000, 25000, 50000, 100000, 250000],
    timp: [10, 15 * MIN, ORA, 2 * ORA, 3 * ORA, 4 * ORA, 6 * ORA, 8 * ORA, 12 * ORA, ZI],
    hp: G(400, 1.15, 10), stoc: [1500, 3000, 6000, 12000, 25000, 45000, 100000, 225000, 450000, 850000],
    maxTH: [1, 3, 6, 8, 9, 10, 10, 10, 10, 10], lim: [1, 1, 2, 2, 3, 3, 4, 4, 4, 4],
  },
  vistierie: {
    nume: 'Vistieria', desc: 'Păstrează leii.', cat: 'resurse', size: 2, cost: 'grau', res: 'lei',
    pret: [300, 750, 1500, 3000, 6000, 12000, 25000, 50000, 100000, 250000],
    timp: [10, 15 * MIN, ORA, 2 * ORA, 3 * ORA, 4 * ORA, 6 * ORA, 8 * ORA, 12 * ORA, ZI],
    hp: G(400, 1.15, 10), stoc: [1500, 3000, 6000, 12000, 25000, 45000, 100000, 225000, 450000, 850000],
    maxTH: [1, 3, 6, 8, 9, 10, 10, 10, 10, 10], lim: [1, 1, 2, 2, 3, 3, 4, 4, 4, 4],
  },
  depozitSare: {
    nume: 'Depozitul de sare', desc: 'Păstrează sarea.', cat: 'resurse', size: 2, cost: 'grau', res: 'sare',
    pret: [600000, 1200000, 1800000, 2400000, 3000000, 3600000], timp: [ZI, 2 * ZI, 3 * ZI, 4 * ZI, 5 * ZI, 6 * ZI],
    hp: G(2000, 1.1, 6), stoc: [10000, 17500, 40000, 75000, 140000, 180000],
    maxTH: [0, 0, 0, 0, 0, 0, 2, 4, 6, 6], lim: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
  },
  // ---------------- armată ----------------
  tabara: {
    nume: 'Tabăra', desc: 'Aici stau oștenii gata de luptă. Mai multe tabere = armată mai mare.', cat: 'armata', size: 3, cost: 'grau',
    pret: [250, 2500, 10000, 100000, 250000, 750000, 1500000, 2250000],
    timp: [5 * MIN, 15 * MIN, 3 * ORA, 8 * ORA, ZI, 3 * ZI, 4 * ZI, 5 * ZI],
    hp: G(250, 1.1, 8), capacitate: [20, 30, 35, 40, 45, 50, 55, 60],
    maxTH: [1, 2, 3, 4, 5, 6, 6, 7, 7, 8], lim: [1, 1, 2, 2, 3, 3, 4, 4, 4, 4],
  },
  cazarma: {
    nume: 'Cazarma', desc: 'Antrenează oștenii. Fiecare nivel deblochează un oștean nou.', cat: 'armata', size: 3, cost: 'grau',
    pret: [100, 500, 2500, 5000, 10000, 80000, 240000, 700000, 1500000, 2000000],
    timp: [10, 15 * MIN, 2 * ORA, 4 * ORA, 10 * ORA, 16 * ORA, ZI, 2 * ZI, 4 * ZI, 5 * ZI],
    hp: G(250, 1.1, 10), maxTH: [3, 4, 5, 6, 7, 8, 9, 10, 10, 10], lim: L10(1),
  },
  barlog: {
    nume: 'Bârlogul', desc: 'Oștenii întunericului, plătiți cu sare.', cat: 'armata', size: 3, cost: 'grau',
    pret: [750000, 1250000, 1750000, 2250000, 2750000], timp: [2 * ZI, 3 * ZI, 4 * ZI, 5 * ZI, 6 * ZI],
    hp: G(500, 1.1, 5), maxTH: [0, 0, 0, 0, 0, 0, 2, 4, 5, 5], lim: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
  },
  laborator: {
    nume: 'Laboratorul', desc: 'Face oștenii și vrăjile mai puternice.', cat: 'armata', size: 3, cost: 'grau',
    pret: [25000, 50000, 90000, 270000, 500000, 1000000, 2500000], timp: [ORA, 5 * ORA, 12 * ORA, ZI, 2 * ZI, 4 * ZI, 5 * ZI],
    hp: G(500, 1.1, 7), maxTH: [0, 0, 1, 2, 3, 4, 5, 6, 7, 7], lim: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  atelier: {
    nume: 'Atelierul de vrăji', desc: 'Prepară vrăji pentru atac.', cat: 'armata', size: 2, cost: 'grau',
    pret: [150000, 300000, 600000, 1200000, 2400000], timp: [ZI, 2 * ZI, 4 * ZI, 5 * ZI, 6 * ZI],
    hp: G(425, 1.1, 5), capacitate: [2, 4, 6, 8, 10],
    maxTH: [0, 0, 0, 0, 1, 2, 3, 4, 5, 5], lim: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
  },
  altarVoievod: {
    nume: 'Altarul Voievodului', desc: 'Casa eroului Voievod. Îl îmbunătățești cu sare.', cat: 'armata', size: 3, cost: 'sare', erou: 'voievod',
    pret: [5000], timp: [MIN], hp: [250], maxTH: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1], lim: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
  },
  altarDomnita: {
    nume: 'Altarul Domniței', desc: 'Casa eroinei Domnița Arcașă. O îmbunătățești cu sare.', cat: 'armata', size: 3, cost: 'sare', erou: 'domnita',
    pret: [10000], timp: [MIN], hp: [250], maxTH: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1], lim: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
  },
  // ---------------- apărare ----------------
  tun: {
    nume: 'Tunul', desc: 'Lovește oștenii de pe pământ.', cat: 'aparare', size: 2, cost: 'lei', aparare: true,
    pret: [250, 1000, 4000, 16000, 50000, 100000, 200000, 400000, 800000, 1600000],
    timp: [10, 15 * MIN, 2 * ORA, 6 * ORA, 12 * ORA, ZI, 2 * ZI, 3 * ZI, 4 * ZI, 5 * ZI],
    hp: G(420, 1.15, 10), dps: G(9, 1.24, 10), interval: 0.8, raza: 6, tinte: 'sol',
    maxTH: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10], lim: [2, 2, 2, 2, 3, 4, 5, 5, 5, 6],
  },
  turn: {
    nume: 'Turnul arcașilor', desc: 'Trage departe, în oștenii de pe pământ și din aer.', cat: 'aparare', size: 2, cost: 'lei', aparare: true,
    pret: [1000, 2000, 5000, 20000, 80000, 180000, 360000, 720000, 1500000, 2500000],
    timp: [MIN, 15 * MIN, 2 * ORA, 6 * ORA, 12 * ORA, ZI, 2 * ZI, 3 * ZI, 4 * ZI, 5 * ZI],
    hp: G(380, 1.13, 10), dps: G(11, 1.22, 10), interval: 0.5, raza: 6.7, tinte: 'ambele',
    maxTH: [0, 2, 3, 4, 6, 7, 8, 10, 10, 10], lim: [0, 1, 1, 2, 3, 3, 4, 5, 6, 7],
  },
  mortier: {
    nume: 'Mortierul', desc: 'Aruncă ghiulele grele peste ziduri, lovește grupuri. Nu vede de aproape.', cat: 'aparare', size: 2, cost: 'lei', aparare: true,
    pret: [8000, 32000, 120000, 400000, 800000, 1600000, 3200000, 6400000],
    timp: [5 * ORA, 12 * ORA, ZI, 2 * ZI, 3 * ZI, 4 * ZI, 5 * ZI, 6 * ZI],
    hp: G(400, 1.1, 8), dps: G(4, 1.25, 8), interval: 5, raza: 7.3, razaMin: 2.7, stropire: 1.0, tinte: 'sol',
    maxTH: [0, 0, 1, 2, 3, 4, 5, 6, 7, 8], lim: [0, 0, 1, 1, 1, 2, 3, 4, 4, 4],
  },
  balista: {
    nume: 'Balista', desc: 'Doboară tot ce zboară. Nu lovește pământul.', cat: 'aparare', size: 2, cost: 'lei', aparare: true,
    pret: [22500, 90000, 270000, 540000, 1080000, 2160000, 4320000, 7560000],
    timp: [5 * ORA, ZI, 2 * ZI, 3 * ZI, 4 * ZI, 5 * ZI, 6 * ZI, 7 * ZI],
    hp: G(800, 1.08, 8), dps: G(80, 1.2, 8), interval: 1, raza: 6.7, tinte: 'aer',
    maxTH: [0, 0, 0, 2, 3, 4, 5, 6, 7, 8], lim: [0, 0, 0, 1, 1, 1, 2, 3, 3, 3],
  },
  turnSolomonar: {
    nume: 'Turnul Solomonarului', desc: 'Solomonarul aruncă flăcări care ard mai mulți oșteni deodată.', cat: 'aparare', size: 2, cost: 'lei', aparare: true,
    pret: [120000, 220000, 420000, 620000, 840000, 1200000, 1600000, 2000000],
    timp: [12 * ORA, ZI, 2 * ZI, 3 * ZI, 4 * ZI, 5 * ZI, 6 * ZI, 7 * ZI],
    hp: G(620, 1.08, 8), dps: G(11, 1.2, 8), interval: 1.3, raza: 4.7, stropire: 0.7, tinte: 'ambele',
    maxTH: [0, 0, 0, 0, 2, 3, 4, 6, 7, 8], lim: [0, 0, 0, 0, 1, 2, 2, 3, 4, 4],
  },
  arbaleta: {
    nume: 'Arbaleta uriașă', desc: 'Trage încontinuu, foarte departe, în aer și pe pământ.', cat: 'aparare', size: 2, cost: 'lei', aparare: true,
    pret: [3000000, 4000000, 5000000, 6000000], timp: [7 * ZI, 8 * ZI, 9 * ZI, 10 * ZI],
    hp: G(1500, 1.07, 4), dps: G(60, 1.1, 4), interval: 0.25, raza: 7.7, tinte: 'ambele',
    maxTH: [0, 0, 0, 0, 0, 0, 0, 0, 3, 4], lim: [0, 0, 0, 0, 0, 0, 0, 0, 2, 3],
  },
  turnFoc: {
    nume: 'Turnul de foc', desc: 'Arde o singură țintă, tot mai tare cu fiecare secundă.', cat: 'aparare', size: 2, cost: 'lei', aparare: true,
    pret: [5000000, 6500000, 8000000], timp: [8 * ZI, 10 * ZI, 12 * ZI],
    hp: G(1500, 1.1, 3), dps: [30, 36, 42], dpsMax: [800, 900, 1000], interval: 0.25, raza: 6, tinte: 'ambele', crestere: true,
    maxTH: [0, 0, 0, 0, 0, 0, 0, 0, 0, 3], lim: [0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  },
  zid: {
    nume: 'Zid', desc: 'Oprește oștenii dușmani. Se construiește pe loc.', cat: 'zid', size: 1, cost: 'lei',
    pret: [50, 1000, 5000, 10000, 30000, 75000, 200000, 500000, 1000000, 3000000], timp: L10(0),
    hp: [300, 500, 700, 900, 1400, 2000, 2500, 3000, 4000, 5500],
    maxTH: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10], lim: [10, 25, 50, 75, 100, 125, 175, 225, 250, 275],
  },
  // ---------------- capcane (invizibile pentru atacator) ----------------
  capcanaPulbere: {
    nume: 'Butoiul cu pulbere', desc: 'Capcană ascunsă: explodează când trec oșteni pe lângă ea.', cat: 'capcana', size: 1, cost: 'lei', capcana: true,
    pret: [400, 1000, 10000, 100000, 300000, 500000], timp: [0, 0, 0, 0, 0, 0],
    dmg: [20, 24, 29, 35, 42, 54], stropire: 2, declansare: 1.0, tinte: 'sol',
    maxTH: [0, 0, 2, 2, 3, 3, 4, 5, 6, 6], lim: [0, 0, 2, 2, 4, 4, 6, 6, 6, 6],
  },
  tepi: {
    nume: 'Groapa cu țepi', desc: 'Capcana lui Vlad: înghite oștenii de pe pământ (până la o anumită mărime).', cat: 'capcana', size: 1, cost: 'lei', capcana: true,
    pret: [2000, 400000, 800000, 1600000, 3200000], timp: [0, 0, 0, 0, 0],
    capacitate: [15, 16, 17, 18, 19], declansare: 0.6, tinte: 'sol',
    maxTH: [0, 0, 0, 1, 1, 1, 2, 3, 4, 5], lim: [0, 0, 0, 2, 2, 4, 4, 6, 6, 6],
  },
  capcanaAer: {
    nume: 'Capcana de cer', desc: 'Explodează în aer, sub oștenii care zboară.', cat: 'capcana', size: 1, cost: 'lei', capcana: true,
    pret: [4000, 20000, 200000, 1500000], timp: [0, 0, 0, 0],
    dmg: [100, 120, 144, 173], stropire: 2, declansare: 2.5, tinte: 'aer',
    maxTH: [0, 0, 0, 0, 2, 2, 2, 3, 4, 4], lim: [0, 0, 0, 0, 2, 2, 2, 4, 4, 5],
  },
  bombaMare: {
    nume: 'Bomba mare', desc: 'Explozie uriașă pentru grupuri mari.', cat: 'capcana', size: 1, cost: 'lei', capcana: true,
    pret: [12500, 75000, 750000], timp: [0, 0, 0],
    dmg: [175, 200, 225], stropire: 2, declansare: 1.2, tinte: 'sol',
    maxTH: [0, 0, 0, 0, 0, 2, 2, 3, 3, 3], lim: [0, 0, 0, 0, 0, 1, 2, 3, 4, 5],
  },
};

// ---------------- clădiri noi (Primăria 11+) ----------------
Object.assign(CLADIRI, {
  vultur: {
    nume: 'Vulturul Carpaților', desc: 'Artilerie uriașă care bate tot satul. Se trezește după ce dușmanul trimite multă armată.', cat: 'aparare', size: 3, cost: 'lei', aparare: true,
    pret: [6000000, 7500000, 9000000, 10500000, 12000000], timp: [10 * ZI, 11 * ZI, 12 * ZI, 13 * ZI, 14 * ZI],
    hp: G(4000, 1.08, 5), dps: G(30, 1.15, 5), interval: 10, raza: 40, razaMin: 5, stropire: 1.5, tinte: 'ambele', activare: 60,
    maxTH: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 5], lim: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
  },
  catapulta: {
    nume: 'Catapulta', desc: 'Aruncă bolovani care se sparg și lovesc tot ce e în jur, pe pământ și în aer.', cat: 'aparare', size: 2, cost: 'lei', aparare: true,
    pret: [12000000, 13500000, 15000000], timp: [12 * ZI, 13 * ZI, 14 * ZI],
    hp: G(3600, 1.08, 3), dps: [33, 38, 43], interval: 3, raza: 6.7, razaMin: 2, stropire: 1.5, tinte: 'ambele',
    maxTH: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 3], lim: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2],
  },
  altarVraci: {
    nume: 'Altarul Vraciului', desc: 'Casa Vraciului, eroul care îi ocrotește pe ceilalți. Îl îmbunătățești cu galbeni-sare.', cat: 'armata', size: 3, cost: 'sare', erou: 'vraci',
    pret: [20000], timp: [MIN], hp: [250], maxTH: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1], lim: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
  },
});
CLADIRI.altarVraci.desc = 'Casa Vraciului, eroul care îi ocrotește pe ceilalți. Îl îmbunătățești cu sare.';

// ---------------- extinderea la Primăria 15 ----------------
// [niveluri noi, maxTH pentru Primăria 11..15, lim pentru 11..15, capacitate nouă (opțional)]
const EXTINDERE = {
  primarie:      [5, [11, 12, 13, 14, 15], [1, 1, 1, 1, 1]],
  cetateClan:    [3, [6, 7, 7, 8, 8], [1, 1, 1, 1, 1], [35, 40, 45]],
  moara:         [3, [11, 12, 13, 13, 13], [7, 7, 7, 7, 7]],
  mina:          [3, [11, 12, 13, 13, 13], [7, 7, 7, 7, 7]],
  minaSare:      [3, [7, 8, 9, 9, 9], [3, 3, 3, 3, 3]],
  hambar:        [4, [11, 12, 13, 14, 14], [4, 4, 4, 4, 4]],
  vistierie:     [4, [11, 12, 13, 14, 14], [4, 4, 4, 4, 4]],
  depozitSare:   [4, [7, 8, 9, 10, 10], [1, 1, 1, 1, 1]],
  tabara:        [4, [9, 10, 10, 11, 12], [4, 4, 4, 4, 4], [65, 70, 75, 80]],
  cazarma:       [2, [11, 12, 12, 12, 12], [1, 1, 1, 1, 1]],
  barlog:        [2, [6, 7, 7, 7, 7], [1, 1, 1, 1, 1]],
  laborator:     [5, [8, 9, 10, 11, 12], [1, 1, 1, 1, 1]],
  atelier:       [2, [5, 6, 7, 7, 7], [1, 1, 1, 1, 1], [11, 12]],
  altarVoievod:  [0, [1, 1, 1, 1, 1], [1, 1, 1, 1, 1]],
  altarDomnita:  [0, [1, 1, 1, 1, 1], [1, 1, 1, 1, 1]],
  tun:           [5, [11, 12, 13, 14, 15], [7, 7, 7, 7, 7]],
  turn:          [5, [11, 12, 13, 14, 15], [8, 8, 8, 8, 8]],
  mortier:       [4, [9, 10, 11, 12, 12], [4, 4, 4, 4, 4]],
  balista:       [4, [9, 10, 11, 12, 12], [4, 4, 4, 4, 4]],
  turnSolomonar: [4, [9, 10, 11, 12, 12], [5, 5, 5, 5, 5]],
  arbaleta:      [4, [5, 6, 7, 7, 8], [4, 4, 4, 4, 4]],
  turnFoc:       [4, [4, 5, 6, 6, 7], [2, 3, 3, 3, 3]],
  zid:           [5, [11, 12, 13, 14, 15], [300, 300, 325, 325, 350]],
  capcanaPulbere:[3, [7, 7, 8, 8, 9], [7, 7, 7, 7, 7]],
  tepi:          [3, [6, 6, 7, 7, 8], [7, 7, 7, 7, 7]],
  capcanaAer:    [3, [5, 5, 6, 6, 7], [6, 6, 6, 6, 6]],
  bombaMare:     [3, [4, 4, 5, 5, 6], [6, 6, 6, 6, 6]],
};
(function extinde() {
  const creste = (arr, n, f, max) => { for (let i = 0; i < n; i++) { const v = arr[arr.length - 1] * f; arr.push(max ? Math.min(max, Math.round(v)) : (v < 100 ? Math.round(v * 10) / 10 : Math.round(v / 100) * 100 || Math.round(v))); } };
  for (const [k, [n, mx, lim, cap]] of Object.entries(EXTINDERE)) {
    const d = CLADIRI[k];
    if (n) {
      creste(d.pret, n, 1.3); creste(d.timp, n, 1.12, 14 * ZI);
      if (d.hp) creste(d.hp, n, 1.1);
      for (const c of ['dps', 'dpsMax', 'prod', 'dmg']) if (d[c]) creste(d[c], n, 1.12);
      for (const c of ['cap', 'stoc']) if (d[c]) creste(d[c], n, 1.2);
      if (d.stocSare) creste(d.stocSare, n, 1.4);
      if (d.capacitate) { if (cap) d.capacitate.push(...cap); else creste(d.capacitate, n, 1.06); }
    }
    d.maxTH = d.maxTH.concat(mx); d.lim = d.lim.concat(lim);
  }
})();
for (const k in CLADIRI) {
  const d = CLADIRI[k]; d.max = d.pret.length;
  while (d.maxTH.length < MAX_TH) d.maxTH.push(d.maxTH[d.maxTH.length - 1]);
  while (d.lim.length < MAX_TH) d.lim.push(d.lim[d.lim.length - 1]);
}
CLADIRI.primarie.maxTH = Array(MAX_TH).fill(MAX_TH);

// Depozitul maxim posibil la o anumită Primărie (toate depozitele la nivel maxim).
function depozitMaxim(res, th) {
  th = Math.max(1, Math.min(MAX_TH, th));
  let c = res === 'sare' ? CLADIRI.primarie.stocSare[th - 1] : CLADIRI.primarie.stoc[th - 1];
  const tip = res === 'lei' ? 'vistierie' : res === 'grau' ? 'hambar' : 'depozitSare';
  const n = CLADIRI[tip].lim[th - 1], lv = CLADIRI[tip].maxTH[th - 1];
  if (n && lv) c += n * CLADIRI[tip].stoc[lv - 1];
  return c;
}
// Niciun preț nu are voie să depășească 90% din ce încape în depozite când se deblochează nivelul.
const plafon = (pret, res, th) => {
  let c = depozitMaxim(res, th); while (!c && th < MAX_TH) c = depozitMaxim(res, ++th);
  return Math.min(pret, Math.floor(c * 0.9 / 1000) * 1000 || pret);
};
for (const [k, d] of Object.entries(CLADIRI)) {
  for (let L = 1; L <= d.max; L++) {
    const th = k === 'primarie' ? Math.max(1, L - 1) : d.maxTH.findIndex(v => v >= L) + 1;
    if (th > 0) d.pret[L - 1] = plafon(d.pret[L - 1], d.cost, th);
  }
}
const LIMITE = Object.fromEntries(Object.entries(CLADIRI).map(([k, d]) => [k, d.lim]));

const CATEGORII = [
  ['resurse', 'Resurse', ['moara', 'mina', 'hambar', 'vistierie', 'minaSare', 'depozitSare']],
  ['armata', 'Armată', ['tabara', 'cazarma', 'barlog', 'laborator', 'atelier', 'cetateClan', 'altarVoievod', 'altarDomnita', 'altarVraci']],
  ['aparare', 'Apărare', ['tun', 'turn', 'mortier', 'balista', 'turnSolomonar', 'arbaleta', 'turnFoc', 'vultur', 'catapulta', 'zid']],
  ['capcana', 'Capcane', ['capcanaPulbere', 'tepi', 'capcanaAer', 'bombaMare']],
];
const ORDINE_CONSTRUIRE = CATEGORII.flatMap(c => c[2]);

// ---------------- oșteni ----------------
// dps = daune pe secundă la nivelul 1; viteza în pătrățele pe secundă.
const OSTENI = {
  haiduc:   { nume: 'Haiduc', desc: 'Luptă cu bâta. Atacă orice clădire.', hp: 45, dps: 8, interval: 1, raza: 0.6, viteza: 0.9, loc: 1, pret: 25, cost: 'grau', timp: 5, tinta: 'oricare', cladire: 'cazarma', nivelCladire: 1, max: 10, labBaza: 50000, culoare: '#7a4a2a' },
  arcas:    { nume: 'Arcaș', desc: 'Trage peste ziduri, de departe. E fragil.', hp: 20, dps: 7, interval: 1, raza: 2.3, viteza: 1.35, loc: 1, pret: 50, cost: 'grau', timp: 6, tinta: 'oricare', cladire: 'cazarma', nivelCladire: 2, max: 10, labBaza: 50000, culoare: '#3d7a3a' },
  pandur:   { nume: 'Pandur', desc: 'Uriaș și greu de doborât. Merge doar la apărări.', hp: 300, dps: 11, interval: 2, raza: 0.6, viteza: 0.68, loc: 5, pret: 250, cost: 'grau', timp: 30, tinta: 'aparare', cladire: 'cazarma', nivelCladire: 3, max: 10, labBaza: 100000, culoare: '#2a4d8f' },
  calaret:  { nume: 'Călăreț', desc: 'Foarte rapid. Vânează resursele, unde face daune duble.', hp: 25, dps: 11, interval: 1, raza: 0.6, viteza: 1.8, loc: 1, pret: 25, cost: 'grau', timp: 7, tinta: 'resurse', cladire: 'cazarma', nivelCladire: 4, max: 9, labBaza: 50000, culoare: '#c08a2a', dubluResurse: true },
  berbec:   { nume: 'Berbec', desc: 'Aleargă la ziduri și le sparge (daune de 40 de ori).', hp: 20, dps: 6, interval: 1, raza: 0.6, viteza: 1.35, loc: 2, pret: 1000, cost: 'grau', timp: 15, tinta: 'ziduri', cladire: 'cazarma', nivelCladire: 5, max: 9, labBaza: 100000, culoare: '#6b5a48', kamikaze: 40, stropire: 1.3 },
  aerostat: { nume: 'Aerostat', desc: 'Zboară spre apărări și le bombardează.', hp: 150, dps: 25, interval: 3, raza: 0.6, viteza: 0.56, loc: 5, pret: 2000, cost: 'grau', timp: 30, tinta: 'aparare', cladire: 'cazarma', nivelCladire: 6, max: 9, labBaza: 150000, culoare: '#b23a2e', aer: true, stropire: 0.8 },
  solomonar:{ nume: 'Solomonar', desc: 'Aruncă flăcări care lovesc mai multe clădiri deodată.', hp: 75, dps: 50, interval: 1.5, raza: 2, viteza: 0.9, loc: 4, pret: 1500, cost: 'grau', timp: 40, tinta: 'oricare', cladire: 'cazarma', nivelCladire: 7, max: 9, labBaza: 120000, culoare: '#5b3a8c', stropire: 0.5 },
  zana:     { nume: 'Zâna', desc: 'Zboară și vindecă oștenii de pe pământ. Nu atacă.', hp: 500, dps: 35, interval: 0.7, raza: 3.3, viteza: 0.9, loc: 14, pret: 5000, cost: 'grau', timp: 80, tinta: 'vindeca', cladire: 'cazarma', nivelCladire: 8, max: 7, labBaza: 450000, culoare: '#f2e6a6', aer: true, vindecator: true },
  zmeu:     { nume: 'Zmeul', desc: 'Balaur zburător care scuipă foc peste tot satul.', hp: 1900, dps: 140, interval: 1.25, raza: 2, viteza: 0.9, loc: 20, pret: 25000, cost: 'grau', timp: 120, tinta: 'oricare', cladire: 'cazarma', nivelCladire: 9, max: 8, labBaza: 2000000, culoare: '#2f7a4a', aer: true, stropire: 0.5 },
  capcaun:  { nume: 'Căpcăunul', desc: 'Uriașul de fier: lovituri cumplite, dar lente.', hp: 2800, dps: 240, interval: 1.8, raza: 0.6, viteza: 0.9, loc: 25, pret: 28000, cost: 'grau', timp: 180, tinta: 'oricare', cladire: 'cazarma', nivelCladire: 10, max: 8, labBaza: 3000000, culoare: '#3a3f4a' },
  ortac:    { nume: 'Ortacul', desc: 'Miner care sapă pe sub ziduri. Cât sapă, apărările nu-l văd.', hp: 550, dps: 80, interval: 1.7, raza: 0.6, viteza: 1.4, loc: 6, pret: 4200, cost: 'grau', timp: 60, tinta: 'oricare', cladire: 'cazarma', nivelCladire: 11, max: 7, labBaza: 4000000, culoare: '#6a5440', subteran: true },
  balaur:   { nume: 'Balaurul', desc: 'Balaur cu trei capete: fulgerul lui sare de la o clădire la alta.', hp: 3200, dps: 240, interval: 3.5, raza: 2, viteza: 0.65, loc: 30, pret: 36000, cost: 'grau', timp: 180, tinta: 'oricare', cladire: 'cazarma', nivelCladire: 12, max: 5, labBaza: 6000000, culoare: '#3a5a9a', aer: true, lant: 4 },
  // oștenii întunericului (sare)
  strigoi:  { nume: 'Strigoi', desc: 'Zboară repede peste ziduri.', hp: 58, dps: 38, interval: 1, raza: 1.8, viteza: 1.8, loc: 2, pret: 6, cost: 'sare', timp: 18, tinta: 'oricare', cladire: 'barlog', nivelCladire: 1, max: 8, labBaza: 10000, culoare: '#4a5a6a', aer: true },
  haitas:   { nume: 'Hăitașul', desc: 'Pe mistreț, sare peste ziduri drept la apărări.', hp: 270, dps: 60, interval: 1, raza: 0.6, viteza: 1.35, loc: 5, pret: 40, cost: 'sare', timp: 45, tinta: 'aparare', cladire: 'barlog', nivelCladire: 2, max: 8, labBaza: 20000, culoare: '#8a5a3a', sarePesteZid: true },
  iele:     { nume: 'Ielele', desc: 'Dansează cu securea și lovesc tot ce e în jur.', hp: 750, dps: 94, interval: 1.8, raza: 0.6, viteza: 1.35, loc: 8, pret: 70, cost: 'sare', timp: 90, tinta: 'oricare', cladire: 'barlog', nivelCladire: 3, max: 7, labBaza: 50000, culoare: '#c25a8a', stropire: 0.9, inJur: true },
  moroi:    { nume: 'Moroiul', desc: 'Uriaș de piatră. Când moare se rupe în doi moroi mici.', hp: 4500, dps: 35, interval: 2.4, raza: 0.6, viteza: 0.68, loc: 30, pret: 450, cost: 'sare', timp: 300, tinta: 'aparare', cladire: 'barlog', nivelCladire: 4, max: 8, labBaza: 60000, culoare: '#7d7466', seRupe: 'moroiMic' },
  babaCloanta: { nume: 'Baba Cloanța', desc: 'Trezește oseminte care luptă pentru ea.', hp: 300, dps: 100, interval: 0.7, raza: 2.7, viteza: 0.68, loc: 12, pret: 250, cost: 'sare', timp: 120, tinta: 'oricare', cladire: 'barlog', nivelCladire: 5, max: 6, labBaza: 75000, culoare: '#3b2a4a', stropire: 0.3, cheama: 'os' },
  // chemați (nu se antrenează)
  os:       { nume: 'Os', hp: 30, dps: 25, interval: 1, raza: 0.6, viteza: 1.5, loc: 0, tinta: 'oricare', ascuns: true, culoare: '#e8e2d0', max: 1 },
  moroiMic: { nume: 'Moroi mic', hp: 900, dps: 7, interval: 2.4, raza: 0.6, viteza: 0.9, loc: 0, tinta: 'aparare', ascuns: true, culoare: '#9a9182', max: 1 },
};
const TINTE = { resurse: ['moara', 'mina', 'minaSare', 'hambar', 'vistierie', 'depozitSare', 'primarie'], aparare: ['tun', 'turn', 'mortier', 'balista', 'turnSolomonar', 'arbaleta', 'turnFoc', 'vultur', 'catapulta'] };
const OSTENI_ANTRENABILI = Object.keys(OSTENI).filter(k => !OSTENI[k].ascuns);
const multNivel = n => 1 + 0.15 * (Math.max(1, n) - 1);

// ---------------- vrăji ----------------
const VRAJI = {
  fulger:    { nume: 'Fulgerul', desc: 'Lovește din cer o zonă mică.', nivelAtelier: 1, max: 8, pret: 15000, timp: 60, labBaza: 200000, raza: 1.4, dmg: [300, 330, 360, 390, 450, 510, 570, 630], culoare: '#7fb2ff' },
  vindecare: { nume: 'Vindecarea', desc: 'Vindecă oștenii din cerc timp de 12 secunde.', nivelAtelier: 2, max: 7, pret: 15000, timp: 60, labBaza: 300000, raza: 2.6, durata: 12, vindecaTotal: [600, 800, 1000, 1200, 1400, 1600, 1800], culoare: '#f2d14b' },
  furie:     { nume: 'Furia', desc: 'Oștenii din cerc lovesc mai tare și merg mai repede.', nivelAtelier: 3, max: 6, pret: 23000, timp: 90, labBaza: 450000, raza: 2.6, durata: 18, bonus: [1.3, 1.4, 1.5, 1.6, 1.7, 1.8], culoare: '#c43ad1' },
  saritura:  { nume: 'Săritura', desc: 'Oștenii trec peste zidurile din cerc.', nivelAtelier: 4, max: 3, pret: 23000, timp: 90, labBaza: 600000, raza: 2.4, durata: [20, 40, 60], culoare: '#5fd35f' },
  inghet:    { nume: 'Înghețul', desc: 'Îngheață apărările din cerc câteva secunde.', nivelAtelier: 5, max: 7, pret: 26000, timp: 90, labBaza: 1000000, raza: 2.3, durata: [2.5, 3, 3.5, 4, 4.5, 5, 5.5], culoare: '#9fe8ff' },
};

// ---------------- eroi ----------------
const EROI = {
  voievod: { nume: 'Voievodul', desc: 'Luptător neînfricat. Abilitate: Furia Voievodului — se vindecă, se înfurie și cheamă haiduci.', altar: 'altarVoievod',
    hp: 1700, dps: 102, interval: 1.2, raza: 0.6, viteza: 0.9, culoare: '#a8322d', maxTH: [0, 0, 0, 0, 0, 0, 5, 10, 15, 20, 30, 40, 50, 60, 70], abilitateDe: 5, cheama: 'haiduc' },
  domnita: { nume: 'Domnița Arcașă', desc: 'Trage de departe. Abilitate: Vălul Domniței — devine invizibilă, lovește dublu și cheamă arcași.', altar: 'altarDomnita',
    hp: 725, dps: 136, interval: 0.75, raza: 3.3, viteza: 1.35, culoare: '#6b2a7a', maxTH: [0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 30, 40, 50, 60, 70], abilitateDe: 5, cheama: 'arcas' },
  vraci:   { nume: 'Vraciul', desc: 'Vindecă oștenii din jurul lui. Abilitate: Ocrotirea — nimeni din cerc nu poate fi rănit câteva secunde.', altar: 'altarVraci',
    hp: 1000, dps: 70, interval: 1.8, raza: 2.5, viteza: 0.9, culoare: '#2f6e5a', maxTH: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 30, 40, 50, 55], abilitateDe: 5, aura: 3 },
};
const erouHp = (e, n) => Math.round(EROI[e].hp * (1 + 0.05 * (n - 1)));
const erouDps = (e, n) => Math.round(EROI[e].dps * (1 + 0.04 * (n - 1)));
const erouPret = (e, n) => {
  const brut = e === 'voievod' ? 5000 + 1500 * n : e === 'domnita' ? 10000 + 2000 * n : 20000 + 2500 * n;
  const th = EROI[e].maxTH.findIndex(v => v >= n + 1) + 1 || MAX_TH;
  return plafon(brut, 'sare', th);
}; // n = nivel actual -> n+1
const erouTimp = n => Math.min(5 * ZI, 6 * ORA * n);

// ---------------- laborator ----------------
const labTimp = n => [0, 0, 6 * ORA, ZI, 2 * ZI, 3 * ZI, 4 * ZI, 5 * ZI, 6 * ZI, 7 * ZI, 8 * ZI, 9 * ZI, 10 * ZI, 11 * ZI][Math.min(13, n)]; // pentru a ajunge la nivelul n
const labPret = (baza, n, res = 'grau') => {
  const brut = Math.round(baza * Math.pow(3, Math.min(n - 2, 5)) * Math.pow(1.3, Math.max(0, n - 7)) / 100) * 100;
  const th = CLADIRI.laborator.maxTH.findIndex(v => v >= n - 1) + 1 || MAX_TH;
  return plafon(brut, res, th);
}; // pentru a ajunge la nivelul n
const nivelMaxLab = (def, nivLab) => Math.min(def.max, nivLab + 1);

// ---------------- ligi ----------------
const LIGI = [
  [0, 'Fără ligă', 0, 0], [400, 'Liga de Aramă', 2000, 0], [800, 'Liga de Argint', 6000, 0], [1400, 'Liga de Aur', 15000, 0],
  [2000, 'Liga de Cristal', 40000, 200], [2600, 'Liga Maeștrilor', 80000, 500], [3200, 'Liga Campionilor', 150000, 1000],
  [4100, 'Liga Titanilor', 200000, 1500], [5000, 'Liga Legendelor', 250000, 2000],
];
const liga = t => { let l = LIGI[0]; for (const x of LIGI) if (t >= x[0]) l = x; return { prag: l[0], nume: l[1], bonus: l[2], bonusSare: l[3], idx: LIGI.indexOf(l) }; };

// ---------------- galbeni pentru grăbire (ca în CoC) ----------------
function galbeniPentruTimp(sec) {
  if (sec <= 0) return 0;
  const p = [[0, 0], [60, 1], [3600, 20], [86400, 260], [604800, 1000]];
  for (let i = 1; i < p.length; i++) if (sec <= p[i][0]) {
    const [a, ga] = p[i - 1], [b, gb] = p[i]; return Math.max(1, Math.ceil(ga + (gb - ga) * (sec - a) / (b - a)));
  }
  return Math.ceil(1000 * sec / 604800);
}
const galbeniPentruRes = (res, n) => n <= 0 ? 0 : Math.max(1, Math.ceil(res === 'sare' ? n / 4 : n / 100));

// ---------------- regiuni, cetăți, pachete ----------------
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
const CETATI = [
  { id: 'neamt',      nume: 'Cetatea Neamțului',        lon: 26.33, lat: 47.2,  th: 1 },
  { id: 'rupea',      nume: 'Cetatea Rupea',            lon: 25.22, lat: 46.03, th: 1 },
  { id: 'deva',       nume: 'Cetatea Devei',            lon: 22.9,  lat: 45.88, th: 2 },
  { id: 'sighisoara', nume: 'Cetatea Sighișoarei',      lon: 24.79, lat: 46.22, th: 2 },
  { id: 'histria',    nume: 'Cetatea Histria',          lon: 28.77, lat: 44.55, th: 3 },
  { id: 'suceava',    nume: 'Cetatea de Scaun Suceava', lon: 26.28, lat: 47.64, th: 3 },
  { id: 'alba',       nume: 'Cetatea Alba Carolina',    lon: 23.57, lat: 46.07, th: 4 },
  { id: 'fagaras',    nume: 'Cetatea Făgărașului',      lon: 24.97, lat: 45.84, th: 4 },
  { id: 'severin',    nume: 'Cetatea Severinului',      lon: 22.66, lat: 44.63, th: 5 },
  { id: 'poienari',   nume: 'Cetatea Poienari',         lon: 24.63, lat: 45.35, th: 5 },
  { id: 'sarmis',     nume: 'Sarmizegetusa Regia',      lon: 23.31, lat: 45.62, th: 6 },
  { id: 'chioar',     nume: 'Cetatea Chioarului',       lon: 23.48, lat: 47.44, th: 6 },
  { id: 'capidava',   nume: 'Cetatea Capidava',         lon: 28.07, lat: 44.49, th: 7 },
  { id: 'enisala',    nume: 'Cetatea Enisala',          lon: 28.82, lat: 44.89, th: 7 },
  { id: 'bologa',     nume: 'Cetatea Bologa',           lon: 22.88, lat: 46.89, th: 8 },
  { id: 'giurgiu',    nume: 'Cetatea Giurgiului',       lon: 25.97, lat: 43.92, th: 8 },
  { id: 'siria',      nume: 'Cetatea Șiriei',           lon: 21.63, lat: 46.27, th: 9 },
  { id: 'tgmures',    nume: 'Cetatea Târgu Mureș',      lon: 24.56, lat: 46.55, th: 9 },
  { id: 'targoviste', nume: 'Curtea Domnească Târgoviște', lon: 25.46, lat: 44.93, th: 10 },
];
// Harta Europei: se deblochează după Curtea Domnească Târgoviște. Fiecare țară are 2 cetăți.
const TARI = [
  { id: 'md', nume: 'Republica Moldova', scurt: 'Moldova', lon: 28.9, lat: 47.3, steag: ['#0046AE', '#FFD200', '#CC092F'], cetati: [['soroca', 'Cetatea Soroca', 8], ['tighina', 'Cetatea Tighina', 8]] },
  { id: 'bg', nume: 'Bulgaria', lon: 25.2, lat: 42.7, steag: ['#FFFFFF', '#00966E', '#D62612'], oriz: true, cetati: [['tarevet', 'Țarevețul', 9], ['belogradcik', 'Belogradcik', 9]] },
  { id: 'rs', nume: 'Serbia', lon: 20.9, lat: 44.0, steag: ['#C6363C', '#0C4076', '#FFFFFF'], oriz: true, cetati: [['kalemegdan', 'Kalemegdan', 9], ['golubac', 'Cetatea Golubac', 10]] },
  { id: 'hu', nume: 'Ungaria', lon: 19.2, lat: 47.2, steag: ['#CE2939', '#FFFFFF', '#477050'], oriz: true, cetati: [['buda', 'Castelul Buda', 10], ['eger', 'Cetatea Eger', 10]] },
  { id: 'ua', nume: 'Ucraina', lon: 30.5, lat: 49.3, steag: ['#0057B7', '#0057B7', '#FFD700'], oriz: true, cetati: [['hotin', 'Cetatea Hotin', 11], ['kamianets', 'Kameneț-Podolsk', 11]] },
  { id: 'gr', nume: 'Grecia', lon: 22.3, lat: 39.4, steag: ['#0D5EAF', '#FFFFFF', '#0D5EAF'], oriz: true, cetati: [['mystras', 'Mystras', 11], ['monemvasia', 'Monemvasia', 12]] },
  { id: 'tr', nume: 'Turcia', lon: 29.5, lat: 40.6, steag: ['#E30A17', '#E30A17', '#E30A17'], cetati: [['rumeli', 'Rumeli Hisarı', 12], ['yedikule', 'Yedikule', 12]] },
  { id: 'at', nume: 'Austria', lon: 14.5, lat: 47.6, steag: ['#ED2939', '#FFFFFF', '#ED2939'], oriz: true, cetati: [['salzburg', 'Hohensalzburg', 13], ['kreuzenstein', 'Kreuzenstein', 13]] },
  { id: 'pl', nume: 'Polonia', lon: 19.4, lat: 52.0, steag: ['#FFFFFF', '#FFFFFF', '#DC143C'], oriz: true, cetati: [['malbork', 'Castelul Malbork', 13], ['wawel', 'Castelul Wawel', 14]] },
  { id: 'it', nume: 'Italia', lon: 12.6, lat: 42.8, steag: ['#009246', '#FFFFFF', '#CE2B37'], cetati: [['santangelo', 'Castel Sant\'Angelo', 14], ['castelmonte', 'Castel del Monte', 14]] },
  { id: 'de', nume: 'Germania', lon: 10.4, lat: 51.1, steag: ['#000000', '#DD0000', '#FFCE00'], oriz: true, cetati: [['hohenzollern', 'Castelul Hohenzollern', 15], ['neuschwanstein', 'Neuschwanstein', 15]] },
  { id: 'fr', nume: 'Franța', lon: 2.5, lat: 46.6, steag: ['#002395', '#FFFFFF', '#ED2939'], cetati: [['carcassonne', 'Cetatea Carcassonne', 15], ['montsaintmichel', 'Mont-Saint-Michel', 15]] },
];
const CETATI_EUROPA = TARI.flatMap((t, i) => t.cetati.map(([id, nume, th], j) => ({ id, nume, th, tara: t.id, idx: i * 2 + j })));

const PACHETE = [
  { id: 'mana',    nume: 'Mână de galbeni',   suma: 80 },
  { id: 'punga',   nume: 'Pungă de galbeni',  suma: 500 },
  { id: 'chimir',  nume: 'Chimir',            suma: 1200 },
  { id: 'lada',    nume: 'Ladă de zestre',    suma: 2500 },
  { id: 'comoara', nume: 'Comoara haiducilor', suma: 6500 },
];
const PRET_MESTER = { 2: 500, 3: 1000, 4: 2000 };
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

// ---------------- generator de sate (adversari și cetăți) ----------------
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
  const r = rng(seed); const cl = []; let id = 1; const C = GRID / 2;
  const liber = (x, y, s) => {
    if (x < 1 || y < 1 || x + s > GRID - 1 || y + s > GRID - 1) return false;
    for (const c of cl) {
      const cs = CLADIRI[c.tip].size;
      if (x < c.x + cs && x + s > c.x && y < c.y + cs && y + s > c.y) return false;
    }
    return true;
  };
  const niv = tip => {
    const mx = Math.max(1, Math.min(CLADIRI[tip].max, CLADIRI[tip].maxTH[th - 1] || 1));
    return Math.max(1, mx - (r() < (cetate ? 0.25 : 0.55) ? 1 + Math.floor(r() * 2) : 0));
  };
  const pune = (t, rmin, rmax) => {
    const s = CLADIRI[t].size;
    for (let k = 0; k < 500; k++) {
      const raza = rmin + r() * (rmax - rmin), ang = r() * Math.PI * 2;
      const x = Math.round(C + Math.cos(ang) * raza - s / 2), y = Math.round(C + Math.sin(ang) * raza - s / 2);
      if (liber(x, y, s)) { cl.push({ id: id++, tip: t, nivel: niv(t), x, y }); return true; }
    }
    return false;
  };
  cl.push({ id: id++, tip: 'primarie', nivel: th, x: C - 1, y: C - 1 });
  const L = t => CLADIRI[t].lim[th - 1] || 0;
  const plus = cetate && th >= 2 ? 1 : 0;
  for (const t of ['tun', 'turn', 'mortier', 'balista', 'turnSolomonar', 'arbaleta', 'turnFoc'])
    for (let i = 0; i < L(t) + (L(t) ? plus : 0); i++) pune(t, 2.5, 6.5);
  for (const t of ['hambar', 'vistierie', 'depozitSare', 'cetateClan']) for (let i = 0; i < L(t); i++) pune(t, 3, 7);
  for (const t of ['moara', 'mina', 'minaSare', 'tabara', 'cazarma', 'barlog', 'laborator', 'atelier']) {
    let n = L(t); if (!cetate && ['moara', 'mina', 'tabara'].includes(t)) n = Math.max(1, Math.ceil(n * 0.7));
    for (let i = 0; i < n; i++) pune(t, 7, 13);
  }
  // ziduri în jurul nucleului
  let ziduri = th === 1 ? 0 : Math.round(L('zid') * (cetate ? 1 : 0.8)) + (cetate ? 24 : 0);
  if (ziduri > 0) {
    const core = cl.filter(c => c.tip === 'primarie' || CLADIRI[c.tip].aparare || c.tip === 'hambar' || c.tip === 'vistierie' || c.tip === 'depozitSare');
    let x0 = GRID, y0 = GRID, x1 = 0, y1 = 0;
    for (const c of core) { const s = CLADIRI[c.tip].size; x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x + s); y1 = Math.max(y1, c.y + s); }
    x0 = Math.max(1, x0 - 1); y0 = Math.max(1, y0 - 1); x1 = Math.min(GRID - 2, x1); y1 = Math.min(GRID - 2, y1);
    const inel = [];
    for (let x = x0; x <= x1; x++) { inel.push([x, y0]); inel.push([x, y1]); }
    for (let y = y0 + 1; y < y1; y++) { inel.push([x0, y]); inel.push([x1, y]); }
    const nz = niv('zid');
    for (const [x, y] of inel) { if (ziduri <= 0) break; if (liber(x, y, 1)) { cl.push({ id: id++, tip: 'zid', nivel: nz, x, y }); ziduri--; } }
  }
  for (const t of ['capcanaPulbere', 'tepi', 'capcanaAer', 'bombaMare']) for (let i = 0; i < Math.ceil(L(t) * (cetate ? 1 : 0.6)); i++) pune(t, 3, 11);
  return cl;
}
