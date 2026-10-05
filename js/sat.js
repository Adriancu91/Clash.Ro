'use strict';
// ====================================================================
//  CLASH OF ROMÂNIA — satul tău, meniurile, salvarea
// ====================================================================

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const acum = () => Date.now();
const fmt = n => Math.floor(n || 0).toLocaleString('ro-RO');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NUME_RES = { lei: 'lei', grau: 'grâu', sare: 'sare', galbeni: 'galbeni' };
const ico = r => `<i class="ico ${r}"></i>`;
const cost = (r, n) => `${ico(r)}${fmt(n)}`;
function fmtTimp(sec) {
  sec = Math.max(0, Math.ceil(sec));
  if (sec < 60) return sec + 's';
  if (sec < 3600) { const m = Math.floor(sec / 60), s = sec % 60; return m + 'm' + (s ? ' ' + s + 's' : ''); }
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60); return h + 'h' + (m ? ' ' + m + 'm' : '');
}
function fmtScurt(n) {
  n = Math.floor(n || 0);
  if (n >= 1e6) return (n / 1e6).toLocaleString('ro-RO', { maximumFractionDigits: n >= 1e7 ? 1 : 2 }) + 'M';
  if (n >= 1e5) return Math.floor(n / 1e3) + 'k';
  return n.toLocaleString('ro-RO');
}
function toast(msg, tip = '') {
  const d = document.createElement('div'); d.className = 'toast ' + tip; d.textContent = msg;
  $('#toasturi').appendChild(d);
  setTimeout(() => d.classList.add('dispare'), 2800); setTimeout(() => d.remove(), 3300);
}

let J = null;   // rândul jucătorului de pe server (nume, galbeni, trofee...)
let S = null;   // progresul (clădiri, resurse, armată)
let selectat = null, plasare = null, foaie = null;
const plutitoare = [];

// ------------------------------------------------------------ modal
function modal(html) {
  return new Promise(res => {
    const m = $('#modal'); $('.modal-card', m).innerHTML = html; m.hidden = false;
    const gata = v => { m.hidden = true; m.onclick = null; res(v); };
    m.onclick = e => {
      const b = e.target.closest('[data-raspuns]');
      if (b) gata(b.dataset.raspuns === 'da' ? ($('input', m) ? $('input', m).value : true) : false);
      else if (e.target === m) gata(false);
    };
  });
}
const confirma = (text, da = 'Da', nu = 'Nu') => modal(`<p>${text}</p><div class="rand-butoane"><button class="btn" data-raspuns="nu">${nu}</button><button class="btn verde" data-raspuns="da">${da}</button></div>`);
const anunta = (titlu, text) => modal(`<h3>${titlu}</h3>${text}<div class="rand-butoane"><button class="btn verde" data-raspuns="da">Bine</button></div>`);

// ------------------------------------------------------------ autentificare
let modAuth = 'intra';
function randeazaAuth(mesaj) {
  const f = $('#form-auth'); const reg = REGIUNI.map(r => `<option value="${r.id}">${r.nume}</option>`).join('');
  $('#eroare-auth').textContent = mesaj || '';
  $('#demo-info').hidden = !NET.demo;
  const pastrat = (() => { try { return JSON.parse(localStorage.getItem('cor_inreg') || '{}'); } catch (e) { return {}; } })();
  if (NET.demo || modAuth === 'creare') {
    f.innerHTML = `${modAuth === 'creare' ? '<p class="nota">Încă un pas: alege-ți numele și regiunea.</p>' : ''}
      <label>Numele tău în joc<input id="a-nume" maxlength="20" autocomplete="nickname" placeholder="ex: Adrian cel Viteaz" value="${esc(pastrat.nume || '')}"></label>
      <label>Regiunea ta<select id="a-reg">${reg}</select></label>
      <button class="btn mare galben" id="a-ok">Începe jocul</button>`;
    if (pastrat.regiune) $('#a-reg').value = pastrat.regiune;
    $('#a-ok').onclick = () => actiuneAuth('creare');
    return;
  }
  const nou = modAuth === 'nou';
  f.innerHTML = `<div class="tab-uri"><button class="${nou ? '' : 'activ'}" data-mod="intra">Am cont</button><button class="${nou ? 'activ' : ''}" data-mod="nou">Cont nou</button></div>
    ${nou ? `<label>Numele tău în joc<input id="a-nume" maxlength="20" autocomplete="nickname" placeholder="ex: Adrian cel Viteaz"></label>
      <label>Regiunea ta<select id="a-reg">${reg}</select></label>` : ''}
    <label>Email<input id="a-email" type="email" autocomplete="email" placeholder="email@exemplu.ro"></label>
    <label>Parolă<input id="a-parola" type="password" autocomplete="${nou ? 'new-password' : 'current-password'}" placeholder="minim 6 caractere"></label>
    <button class="btn mare galben" id="a-ok">${nou ? 'Creează contul' : 'Intră în joc'}</button>
    <p class="nota mic">Contul e gratuit și servește doar ca să-ți păstreze progresul.</p>`;
  $$('[data-mod]', f).forEach(b => b.onclick = () => { modAuth = b.dataset.mod; randeazaAuth(); });
  $('#a-ok').onclick = () => actiuneAuth(modAuth);
  $('#a-parola').onkeydown = e => { if (e.key === 'Enter') actiuneAuth(modAuth); };
}

async function actiuneAuth(mod) {
  const btn = $('#a-ok'); const val = id => ($('#' + id) ? $('#' + id).value.trim() : '');
  $('#eroare-auth').textContent = '';
  const nume = val('a-nume'), regiune = val('a-reg'), email = val('a-email'), parola = $('#a-parola') ? $('#a-parola').value : '';
  if ((mod === 'nou' || mod === 'creare') && (nume.length < 3 || nume.length > 20)) { $('#eroare-auth').textContent = 'Numele trebuie să aibă între 3 și 20 de caractere.'; return; }
  if (mod !== 'creare' && (!email || parola.length < 6)) { $('#eroare-auth').textContent = 'Completează emailul și o parolă de minim 6 caractere.'; return; }
  btn.disabled = true; btn.textContent = 'Așteaptă…';
  try {
    if (mod === 'intra') {
      await NET.intra(email, parola);
      const p = await NET.jucator();
      if (p) return intraInJoc(p);
      modAuth = 'creare'; randeazaAuth(); return;
    }
    if (mod === 'nou') {
      localStorage.setItem('cor_inreg', JSON.stringify({ nume, regiune }));
      await NET.inregistrare(email, parola);
    }
    const p = await NET.creeazaJucator(nume, regiune);
    localStorage.removeItem('cor_inreg');
    intraInJoc(p);
  } catch (e) {
    if (e.confirmare) { modAuth = 'intra'; randeazaAuth(); $('#eroare-auth').className = 'info'; }
    $('#eroare-auth').textContent = e.message;
    if (btn.isConnected) { btn.disabled = false; btn.textContent = mod === 'nou' ? 'Creează contul' : mod === 'intra' ? 'Intră în joc' : 'Începe jocul'; }
  }
}

// ------------------------------------------------------------ stare
function stareInitiala() {
  const t = acum(); let id = 1;
  const c = (tip, x, y) => ({ id: id++, tip, nivel: 1, x, y, upg: null, acc: 0, last: t });
  return {
    v: 3, res: { lei: 1000, grau: 1000, sare: 0 }, mesteri: 2,
    cladiri: [c('primarie', 18, 18), c('moara', 13, 13), c('mina', 25, 13), c('hambar', 13, 25), c('vistierie', 25, 25), c('cazarma', 13, 18), c('tabara', 22, 14), c('tun', 22, 19)],
    armata: { haiduc: 15 }, coada: [], vraji: {}, coadaVraji: [], lab: {}, labUpg: null, eroi: {},
    campanie: {}, jurnal: [], nextId: id,
  };
}

// trecerea salvărilor vechi (harta 20x20) la v2 (harta 30x30, tabere, sare, laborator)
function migreaza(s) {
  if ((s.v | 0) < 2) migreazaV2(s);
  if ((s.v | 0) < 3) {
    for (const c of s.cladiri) { c.x += 5; c.y += 5; }
    s.v = 3;
    setTimeout(() => anunta('Satul a crescut iar!', `<ul class="lista-simpla">
      <li>Primăria merge acum până la <b>nivelul 15</b>, iar satul are 40×40.</li>
      <li>Nou: <b>Vulturul Carpaților</b>, <b>Catapulta</b>, eroul <b>Vraciul</b>, oștenii <b>Ortacul</b> și <b>Balaurul</b>.</li>
      <li><b>Harta Europei</b>: 12 țări și 24 de cetăți (din Atacă → Europa).</li>
      <li>Ziduri în linie (trage cu degetul), îmbunătățire multiplă și butonul <b>Strânge tot</b>.</li></ul>`), 700);
  }
  return s;
}
function migreazaV2(s) {
  for (const c of s.cladiri) { c.x += 5; c.y += 5; }
  s.res.sare = 0; s.vraji = {}; s.coadaVraji = []; s.lab = {}; s.labUpg = null; s.eroi = {};
  const caz = s.cladiri.find(c => c.tip === 'cazarma');
  const vechi = caz ? [20, 30, 45, 60, 80][Math.max(0, Math.min(4, (caz.nivel || 1) - 1))] : 20;
  S = s;
  const th = nivPrimarie(); const n = CLADIRI.tabara.lim[th - 1], mx = CLADIRI.tabara.maxTH[th - 1];
  let niv = 1; while (niv < mx && n * CLADIRI.tabara.capacitate[niv - 1] < vechi) niv++;
  for (let i = 0; i < n; i++) {
    const p = locLiber(3); if (!p) break;
    s.cladiri.push({ id: s.nextId++, tip: 'tabara', nivel: niv, x: p.x, y: p.y, upg: null, acc: 0, last: acum() });
  }
  s.v = 2;
  if (0) setTimeout(() => anunta('Jocul s-a mărit!', `<ul class="lista-simpla">
    <li>Primăria merge acum până la <b>nivelul 10</b>, iar satul e mai mare (30×30, cu zoom din două degete).</li>
    <li>Ai primit <b>tabere</b> pentru armată, la fel de mare ca înainte.</li>
    <li>Nou: Laborator, vrăji, mortier, balistă, capcane, Turnul Solomonarului, eroi, sare și <b>clanuri</b> cu războaie.</li>
    <li>Oștenii noi se deblochează din Cazarmă: Berbec, Aerostat, Solomonar, Zână, Zmeu, Căpcăun.</li></ul>`), 600);
  return s;
}

function repara(s) {
  s.res = s.res || {}; for (const r of ['lei', 'grau', 'sare']) s.res[r] = +s.res[r] || 0;
  s.mesteri = Math.min(MAX_MESTERI, Math.max(2, s.mesteri | 0));
  s.armata = s.armata || {}; s.coada = s.coada || []; s.campanie = s.campanie || {}; s.jurnal = s.jurnal || [];
  s.vraji = s.vraji || {}; s.coadaVraji = s.coadaVraji || []; s.lab = s.lab || {}; s.eroi = s.eroi || {};
  if (s.labUpg === undefined) s.labUpg = null;
  s.cladiri = (s.cladiri || []).filter(c => CLADIRI[c.tip]);
  s.nextId = Math.max(s.nextId | 0, ...s.cladiri.map(c => c.id + 1), 1);
  for (const c of s.cladiri) { if (c.acc == null) c.acc = 0; if (!c.last) c.last = acum(); c.nivel = Math.min(c.nivel | 0, CLADIRI[c.tip].max); }
  if (!s.cladiri.some(c => c.tip === 'primarie')) s.cladiri.push({ id: s.nextId++, tip: 'primarie', nivel: 1, x: 18, y: 18, upg: null, acc: 0, last: acum() });
  return s;
}

const def = tip => CLADIRI[tip];
const gaseste = id => S.cladiri.find(c => c.id === id);
const nivPrimarie = () => { const p = S.cladiri.find(c => c.tip === 'primarie'); return p ? Math.max(1, p.nivel) : 1; };
const numar = tip => S.cladiri.filter(c => c.tip === tip).length;
const limita = tip => def(tip).lim[nivPrimarie() - 1] || 0;
const nivelMaxPermis = tip => Math.min(def(tip).max, def(tip).maxTH[nivPrimarie() - 1] || 0);
const nivelCladire = tip => S.cladiri.filter(c => c.tip === tip).reduce((m, c) => Math.max(m, c.nivel), 0);
const mesteriOcupati = () => S.cladiri.filter(c => c.upg && def(c.tip).timp[c.upg.la - 1] > 0).length + Object.values(S.eroi).filter(e => e.upg).length;
function capacitate(res) {
  let cap = 0;
  for (const c of S.cladiri) {
    if (c.nivel < 1) continue; const d = def(c.tip);
    if (c.tip === 'primarie') cap += res === 'sare' ? d.stocSare[c.nivel - 1] : d.stoc[c.nivel - 1];
    else if (d.stoc && d.res === res) cap += d.stoc[c.nivel - 1];
  }
  return cap;
}
const sumaCap = tip => S.cladiri.filter(c => c.tip === tip && c.nivel > 0).reduce((s, c) => s + def(tip).capacitate[c.nivel - 1], 0);
const capArmata = () => sumaCap('tabara');
const capVraji = () => sumaCap('atelier');
function locuriFolosite() {
  let n = 0; for (const t in S.armata) if (OSTENI[t]) n += (S.armata[t] || 0) * OSTENI[t].loc;
  for (const q of S.coada) n += OSTENI[q.tip].loc; return n;
}
const vrajiFolosite = () => Object.values(S.vraji).reduce((a, b) => a + (b || 0), 0) + S.coadaVraji.length;
const nivelOsten = tip => Math.max(1, Math.min((S.lab[tip] || 1), (OSTENI[tip] || {}).max || 1));
const nivelVraja = tip => Math.max(1, Math.min((S.lab[tip] || 1), VRAJI[tip].max));
const nivelLab = () => nivelCladire('laborator');
function acumulat(c) {
  const d = def(c.tip); if (!d.prod || c.nivel < 1) return 0;
  return Math.min(d.cap[c.nivel - 1], (c.acc || 0) + (acum() - (c.last || acum())) * d.prod[c.nivel - 1] / 3600000);
}
function aseaza(c) { c.acc = acumulat(c); c.last = acum(); }
function adauga(res, n) {
  const loc = Math.max(0, capacitate(res) - S.res[res]); const pus = Math.max(0, Math.min(loc, Math.floor(n || 0)));
  S.res[res] += pus; return pus;
}
const ridicaPrimaria = n => `Ridică Primăria la nivelul ${n}`;
function primulTHcu(tip, conditie) { const i = def(tip).maxTH.findIndex(conditie); return i >= 0 ? i + 1 : null; }

function proceseazaTimp() {
  let schimbat = false;
  for (const c of S.cladiri) {
    if (c.upg && acum() >= c.upg.pana) {
      if (def(c.tip).prod) aseaza(c);
      const nou = c.nivel === 0; c.nivel = c.upg.la; c.upg = null; c.last = acum(); schimbat = true;
      toast(nou ? `${def(c.tip).nume} e gata!` : `${def(c.tip).nume} a ajuns la nivelul ${c.nivel}!`, 'bun');
      if (def(c.tip).erou && !S.eroi[def(c.tip).erou]) S.eroi[def(c.tip).erou] = { nivel: 1, upg: null, odihna: 0 };
      reimprospateaza();
    }
  }
  for (const [e, st] of Object.entries(S.eroi)) {
    if (st.upg && acum() >= st.upg.pana) { st.nivel = st.upg.la; st.upg = null; st.odihna = 0; schimbat = true; toast(`${EROI[e].nume} a ajuns la nivelul ${st.nivel}!`, 'bun'); reimprospateaza(); }
  }
  if (S.labUpg && acum() >= S.labUpg.pana) {
    S.lab[S.labUpg.tip] = S.labUpg.la; const n = (OSTENI[S.labUpg.tip] || VRAJI[S.labUpg.tip]).nume;
    toast(`Laboratorul a terminat: ${n} nivel ${S.labUpg.la}!`, 'bun'); S.labUpg = null; schimbat = true; reimprospateaza();
  }
  let a = 0;
  while (S.coada.length && S.coada[0].pana <= acum()) { const q = S.coada.shift(); S.armata[q.tip] = (S.armata[q.tip] || 0) + 1; a++; }
  while (S.coadaVraji.length && S.coadaVraji[0].pana <= acum()) { const q = S.coadaVraji.shift(); S.vraji[q.tip] = (S.vraji[q.tip] || 0) + 1; a++; }
  if (a) { schimbat = true; if (foaie && foaie.tip === 'armata') deschideArmata(foaie.tab); }
  if (schimbat) { salveaza(); actualizeazaBara(); }
}
function reimprospateaza() {
  if (!foaie) return;
  if (foaie.tip === 'cladire') { const c = gaseste(foaie.id); if (c) deschideCladire(c); }
  else if (foaie.tip === 'construieste') deschideConstruieste(foaie.cat);
  else if (foaie.tip === 'laborator') deschideLaborator();
  else if (foaie.tip === 'erou') deschideErou(foaie.e);
  else if (foaie.tip === 'armata') deschideArmata(foaie.tab);
}

// ------------------------------------------------------------ salvare & server
let tSalv = 0;
function salveaza() { clearTimeout(tSalv); tSalv = setTimeout(salveazaAcum, 1500); }
async function salveazaAcum() {
  clearTimeout(tSalv); if (!S) return;
  for (const r of ['lei', 'grau', 'sare']) S.res[r] = Math.floor(S.res[r]);
  try { await NET.salveaza(S); $('#offline').hidden = true; }
  catch (e) { $('#offline').hidden = false; tSalv = setTimeout(salveazaAcum, 10000); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden && S) salveazaAcum(); else if (!document.hidden && S) sincronizeaza(); });

async function sincronizeaza() {
  try {
    const p = await NET.jucator(); if (!p) return;
    const schimbat = p.galbeni !== J.galbeni;
    if (p.galbeni > J.galbeni) toast(`Ai primit ${fmt(p.galbeni - J.galbeni)} galbeni!`, 'bun');
    Object.assign(J, { galbeni: p.galbeni, trofee: p.trofee, scut_pana: p.scut_pana, blocat: p.blocat, cetate: p.cetate || [], clan_id: p.clan_id });
    actualizeazaBara(); await revendicaAtacuri();
    if (foaie && foaie.tip === 'targ') { if (schimbat) deschideTarg(); else incarcaCereri(); }
  } catch (e) { /* fără net */ }
}

async function revendicaAtacuri() {
  let lista = [];
  try { lista = await NET.revendica(); } catch (e) { return; }
  if (!lista || !lista.length) return;
  let pl = 0, pg = 0, ps = 0;
  for (const a of lista) {
    S.res.lei = Math.max(0, S.res.lei - a.lei); S.res.grau = Math.max(0, S.res.grau - a.grau); S.res.sare = Math.max(0, S.res.sare - (a.sare || 0));
    pl += a.lei; pg += a.grau; ps += a.sare || 0;
    S.jurnal.unshift({ cand: a.creat, nume: a.atacator_nume, stele: a.stele, procent: a.procent, lei: a.lei, grau: a.grau, sare: a.sare || 0, trofee: -a.trofee });
  }
  S.jurnal = S.jurnal.slice(0, 30); salveaza(); actualizeazaBara();
  const rand = lista.map(a => `<li><b>${esc(a.atacator_nume)}</b> — ${'★'.repeat(a.stele) || '0 stele'}, ${a.procent}% distrus</li>`).join('');
  anunta('Ai fost atacat!', `<ul class="lista-simpla">${rand}</ul><p>Ai pierdut ${cost('lei', pl)} ${cost('grau', pg)}${ps ? ' ' + cost('sare', ps) : ''}.</p>${lista.some(a => a.procent >= 30) ? '<p class="nota">Ai primit un scut — nimeni nu te poate ataca o vreme.</p>' : ''}`);
}

// ------------------------------------------------------------ pornire
async function intraInJoc(p) {
  J = p; J.cetate = p.cetate || [];
  const nou = !(p.state && p.state.cladiri);
  S = repara(nou ? stareInitiala() : p.state);
  migreaza(S);
  $('#ecran-start').hidden = true; $('#joc').hidden = false;
  $('#nume-sat').textContent = 'Satul lui ' + J.nume;
  proceseazaTimp(); redimensioneaza(); actualizeazaBara();
  requestAnimationFrame(bucla);
  setInterval(tick, 1000); setInterval(sincronizeaza, 30000);
  await salveazaAcum();
  if (nou) setTimeout(bunVenit, 400);
  revendicaAtacuri();
  if (J.blocat) anunta('Cont blocat', '<p>Contul tău a fost blocat de admin.</p>');
}
function bunVenit() {
  anunta('Bine ai venit, ' + esc(J.nume) + '!', `<ul class="lista-simpla">
    <li>Atinge <b>Moara</b> și <b>Mina</b> ca să strângi grâu și lei.</li>
    <li>Atinge orice clădire ca s-o <b>îmbunătățești</b>. Două degete = zoom.</li>
    <li>Din <b>Armată</b> antrenezi oșteni, apoi <b>Atacă</b> cetăți sau alți jucători.</li>
    <li>Intră într-un <b>Clan</b> ca să primești oșteni dăruiți și să lupți în războaie.</li>
    <li>Galbenii sunt gratuiți: îi ceri din <b>Târg</b> și adminul îi aprobă.</li></ul>`);
}

function tick() {
  if (!S) return; proceseazaTimp(); actualizeazaBara();
  $('#strange-tot').hidden = !ceVaStrange();
  for (const e of $$('[data-pana]')) e.textContent = fmtTimp((+e.dataset.pana - acum()) / 1000);
  for (const e of $$('[data-acum]')) { const c = gaseste(+e.dataset.acum); if (c) e.textContent = fmt(acumulat(c)); }
  for (const e of $$('[data-galbeni-pana]')) e.textContent = galbeniPentruTimp((+e.dataset.galbeniPana - acum()) / 1000);
  const scut = J.scut_pana && Date.parse(J.scut_pana) > acum();
  $('#scut').hidden = !scut; if (scut) $('#scut b').textContent = fmtTimp((Date.parse(J.scut_pana) - acum()) / 1000);
}

function actualizeazaBara() {
  if (!S) return;
  for (const r of ['lei', 'grau', 'sare']) {
    const cap = capacitate(r), v = S.res[r];
    $(`#r-${r}`).hidden = r === 'sare' && !cap && !v;
    $(`#r-${r} b`).textContent = fmtScurt(v);
    $(`#r-${r} .umplere span`).style.width = Math.min(100, cap ? v / cap * 100 : 0) + '%';
    $(`#r-${r} small`).textContent = 'max ' + fmtScurt(cap);
  }
  $('#r-galbeni b').textContent = fmtScurt(J.galbeni); $('#r-trofee b').textContent = fmt(J.trofee);
  $('#mesteri').innerHTML = `Meșteri: <b>${S.mesteri - mesteriOcupati()}/${S.mesteri}</b>`;
}

// ------------------------------------------------------------ desen sat + cameră (zoom)
const cv = $('#sat'), g = cv.getContext('2d');
let T = 12, W = 360;
const cam = { s: 1, ox: 0, oy: 0, init: false };
function redimensioneaza() {
  const sc = $('#scena');
  const disp = window.innerHeight - $('#bara').offsetHeight - $('#meniu').offsetHeight - $('#info-sat').offsetHeight - 14;
  W = Math.max(240, Math.min(sc.clientWidth - 8, 640, disp)); T = W / GRID;
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(W * dpr); cv.height = Math.round(W * dpr); cv.style.width = W + 'px'; cv.style.height = W + 'px';
  if (!cam.init) { cam.init = true; cam.s = 1.35; cam.ox = cam.oy = -(W * cam.s - W) / 2; }
  limiteazaCam();
  document.documentElement.style.setProperty('--meniu-h', $('#meniu').offsetHeight + 'px');
}
window.addEventListener('resize', () => { if (S) redimensioneaza(); });
function limiteazaCam() {
  cam.s = Math.max(1, Math.min(3, cam.s));
  cam.ox = Math.min(0, Math.max(W - W * cam.s, cam.ox)); cam.oy = Math.min(0, Math.max(W - W * cam.s, cam.oy));
}
const laTile = (sx, sy) => ({ x: (sx - cam.ox) / cam.s / T, y: (sy - cam.oy) / cam.s / T });

function bucla(t) {
  if (S && !Lupta.activa() && !document.hidden) deseneazaSat(t);
  requestAnimationFrame(bucla);
}

function deseneazaSat(t) {
  const dpr = window.devicePixelRatio || 1;
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, W);
  g.setTransform(dpr * cam.s, 0, 0, dpr * cam.s, dpr * cam.ox, dpr * cam.oy);
  deseneazaTeren(g, T, false);
  const lista = S.cladiri.slice().sort((a, b) => (def(a.tip).size - def(b.tip).size === 0 ? 0 : (def(a.tip).capcana ? -1 : def(b.tip).capcana ? 1 : 0)) || ((a.y + def(a.tip).size) - (b.y + def(b.tip).size)));
  for (const c of lista) {
    if (plasare && plasare.mutaId === c.id) continue;
    const o = { t, sel: selectat === c.id || (multi && multi.has(c.id)) };
    if (c.upg) { const tot = def(c.tip).timp[c.upg.la - 1] * 1000 || 1; o.constructie = true; o.progres = 1 - (c.upg.pana - acum()) / tot; }
    const d = def(c.tip);
    if (d.erou) { const e = S.eroi[d.erou]; o.erouPlecat = !e || e.upg; }
    deseneazaCladire(g, T, c.tip, Math.max(1, c.nivel), c.x, c.y, o);
    if (d.prod && c.nivel > 0) {
      const a = acumulat(c);
      if (a >= Math.max(5, d.cap[c.nivel - 1] * 0.04)) {
        const bx = (c.x + d.size / 2) * T, by = c.y * T - T * 0.15 + Math.sin(t / 300 + c.id) * T * 0.08;
        g.fillStyle = '#fff'; g.strokeStyle = '#4a3520'; g.lineWidth = 1.5;
        g.beginPath(); g.arc(bx, by, T * 0.6, 0, 7); g.fill(); g.stroke();
        iconRes(g, d.res, bx, by, T * 0.42);
      }
    }
  }
  if (plasare && plasare.linie) {
    for (const p of plasare.linie) {
      const ok = p.ok; g.fillStyle = ok ? 'rgba(80,220,90,.35)' : 'rgba(230,40,40,.4)'; g.fillRect(p.x * T, p.y * T, T, T);
      if (ok) { g.globalAlpha = 0.85; deseneazaCladire(g, T, 'zid', 1, p.x, p.y, { t }); g.globalAlpha = 1; }
    }
  } else if (plasare) {
    const d = def(plasare.tip), ok = locValid(plasare.x, plasare.y, d.size, plasare.mutaId);
    g.fillStyle = ok ? 'rgba(80,220,90,.35)' : 'rgba(230,40,40,.4)';
    g.fillRect(plasare.x * T, plasare.y * T, d.size * T, d.size * T);
    g.globalAlpha = 0.85; deseneazaCladire(g, T, plasare.tip, plasare.mutaId ? Math.max(1, gaseste(plasare.mutaId).nivel) : 1, plasare.x, plasare.y, { t });
    g.globalAlpha = 1;
    g.strokeStyle = ok ? '#2fbf3a' : '#e23b2e'; g.lineWidth = 2; g.strokeRect(plasare.x * T + 1, plasare.y * T + 1, d.size * T - 2, d.size * T - 2);
    if (d.raza) { g.strokeStyle = 'rgba(255,255,255,.6)'; g.setLineDash([4, 4]); g.beginPath(); g.arc((plasare.x + d.size / 2) * T, (plasare.y + d.size / 2) * T, d.raza * T, 0, 7); g.stroke(); g.setLineDash([]); }
  }
  if (selectat && !plasare) {
    const c = gaseste(selectat); const d = c && def(c.tip);
    if (d && d.raza) { g.strokeStyle = 'rgba(255,255,255,.55)'; g.setLineDash([4, 4]); g.lineWidth = 1.5; g.beginPath(); g.arc((c.x + d.size / 2) * T, (c.y + d.size / 2) * T, d.raza * T, 0, 7); g.stroke(); g.setLineDash([]); }
  }
  for (let i = plutitoare.length - 1; i >= 0; i--) {
    const p = plutitoare[i]; if (p.t0 == null) p.t0 = t;
    const k = (t - p.t0) / 1200;
    if (k >= 1) { plutitoare.splice(i, 1); continue; }
    g.globalAlpha = 1 - k; g.font = `800 ${Math.max(12, T * 1.1)}px Nunito, Arial, sans-serif`; g.textAlign = 'center';
    g.lineWidth = 4; g.strokeStyle = '#3a2a1a'; g.fillStyle = p.res === 'lei' ? '#e8eef2' : p.res === 'sare' ? '#ffffff' : '#ffd84a';
    g.strokeText(p.text, p.x * T, (p.y - k * 1.5) * T); g.fillText(p.text, p.x * T, (p.y - k * 1.5) * T); g.globalAlpha = 1;
  }
}

function locValid(x, y, s, ignora) {
  if (x < 0 || y < 0 || x + s > GRID || y + s > GRID) return false;
  for (const c of S.cladiri) {
    if (c.id === ignora) continue; const cs = def(c.tip).size;
    if (x < c.x + cs && x + s > c.x && y < c.y + cs && y + s > c.y) return false;
  }
  return true;
}
function cladireLa(x, y) {
  let gasit = null;
  for (const c of S.cladiri) { const s = def(c.tip).size; if (x >= c.x && x < c.x + s && y >= c.y && y < c.y + s) { if (!gasit || s < def(gasit.tip).size) gasit = c; } }
  return gasit;
}

// atingeri: un deget = apasă / trage; două degete = zoom
const degete = new Map(); let apasare = null, ciupire = null;
cv.addEventListener('pointerdown', e => {
  try { cv.setPointerCapture(e.pointerId); } catch (_) { /* */ }
  degete.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  if (degete.size === 2) {
    const [a, b] = [...degete.values()];
    ciupire = { d: Math.hypot(a.x - b.x, a.y - b.y), s: cam.s, ox: cam.ox, oy: cam.oy, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; apasare = null;
  } else if (degete.size === 1) apasare = { sx: e.offsetX, sy: e.offsetY, ox: cam.ox, oy: cam.oy, mutat: false, t0: laTile(e.offsetX, e.offsetY) };
});
cv.addEventListener('pointermove', e => {
  if (!degete.has(e.pointerId)) return;
  degete.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  if (ciupire && degete.size >= 2) {
    const [a, b] = [...degete.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
    const s = Math.max(1, Math.min(3, ciupire.s * d / (ciupire.d || 1)));
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    cam.ox = mx - (ciupire.mx - ciupire.ox) * s / ciupire.s; cam.oy = my - (ciupire.my - ciupire.oy) * s / ciupire.s; cam.s = s; limiteazaCam();
    return;
  }
  if (!apasare) return;
  const dx = e.offsetX - apasare.sx, dy = e.offsetY - apasare.sy;
  if (Math.hypot(dx, dy) > 8) apasare.mutat = true;
  if (!apasare.mutat) return;
  if (plasare && plasare.tip === 'zid' && !plasare.mutaId) { const p = laTile(e.offsetX, e.offsetY); seteazaLinie(apasare.t0, p); }
  else if (plasare) { const p = laTile(e.offsetX, e.offsetY); seteazaGhost(p.x, p.y); }
  else { cam.ox = apasare.ox + dx; cam.oy = apasare.oy + dy; limiteazaCam(); }
});
function ridica(e) {
  degete.delete(e.pointerId);
  if (ciupire) { if (degete.size < 2) ciupire = null; apasare = null; return; }
  if (!apasare) return;
  const p = laTile(e.offsetX, e.offsetY); const mutat = apasare.mutat; apasare = null;
  if (plasare) { if (!mutat) { plasare.linie = null; seteazaGhost(p.x, p.y); arataPlasare(); } return; }
  if (!mutat) { if (multi) comutaMulti(p.x, p.y); else atinge(p.x, p.y); }
}
cv.addEventListener('pointerup', ridica);
cv.addEventListener('pointercancel', e => { degete.delete(e.pointerId); apasare = null; ciupire = null; });
cv.addEventListener('wheel', e => {
  e.preventDefault(); const s = Math.max(1, Math.min(3, cam.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
  cam.ox = e.offsetX - (e.offsetX - cam.ox) * s / cam.s; cam.oy = e.offsetY - (e.offsetY - cam.oy) * s / cam.s; cam.s = s; limiteazaCam();
}, { passive: false });

function atinge(x, y) {
  const c = cladireLa(Math.floor(x), Math.floor(y));
  if (!c) { selectat = null; inchideFoaie(); return; }
  if (def(c.tip).prod && c.nivel > 0) colecteaza(c, true);
  selectat = c.id; deschideCladire(c);
}

// ---------- selecție multiplă ----------
let multi = null;
function startMulti(ids) { multi = new Set(ids); selectat = null; deschideMulti(); }
function comutaMulti(x, y) {
  const c = cladireLa(Math.floor(x), Math.floor(y)); if (!c) return;
  if (multi.has(c.id)) multi.delete(c.id); else multi.add(c.id);
  deschideMulti();
}
function randZid(c) {
  const la = (x, y) => S.cladiri.find(z => z.tip === 'zid' && z.x === x && z.y === y && z.nivel === c.nivel && !z.upg);
  const ids = new Set([c.id]);
  for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const linie = [c.id];
    for (const sg of [1, -1]) { let x = c.x + dx * sg, y = c.y + dy * sg, z; while ((z = la(x, y))) { linie.push(z.id); x += dx * sg; y += dy * sg; } }
    if (linie.length > 1) linie.forEach(i => ids.add(i));
  }
  return [...ids];
}
function costMulti() {
  const tot = { lei: 0, grau: 0, sare: 0 }; let n = 0, timp = 0;
  for (const id of multi) {
    const c = gaseste(id); if (!c || c.upg) continue; const d = def(c.tip);
    if (c.nivel >= d.max || c.nivel + 1 > nivelMaxPermis(c.tip)) continue;
    tot[d.cost] += d.pret[c.nivel]; n++; if (d.timp[c.nivel] > 0) timp++;
  }
  return { tot, n, timp };
}
function deschideMulti() {
  foaie = { tip: 'multi' };
  const grupe = {};
  for (const id of multi) { const c = gaseste(id); if (!c) continue; const k = def(c.tip).nume + ' nv ' + c.nivel; grupe[k] = (grupe[k] || 0) + 1; }
  const { tot, n, timp } = costMulti();
  const costTxt = ['lei', 'grau', 'sare'].filter(r => tot[r]).map(r => cost(r, tot[r])).join(' ') || '—';
  const liberi = S.mesteri - mesteriOcupati();
  deschideFoaie(`Selectate: ${multi.size}`, `<p class="nota">Atinge clădiri pe hartă ca să le adaugi sau să le scoți din selecție.</p>
    <p>${Object.entries(grupe).map(([k, v]) => `<span class="eticheta">${k} ×${v}</span>`).join(' ') || '<span class="nota">Nimic selectat.</span>'}</p>
    <div class="statistici">${stat('Se pot îmbunătăți', n)}${stat('Cost total', costTxt)}${stat('Au nevoie de meșter', timp)}${stat('Meșteri liberi', liberi)}</div>
    ${timp > liberi ? `<p class="nota">Doar ${liberi} lucrări pot începe acum (zidurile și capcanele se fac pe loc). Restul rămân selectate.</p>` : ''}
    <button class="btn mare verde" data-act="multi-up" ${n ? '' : 'disabled'}>Îmbunătățește tot</button>
    <div class="rand-butoane"><button class="btn" data-act="multi-gol">Golește</button><button class="btn" data-act="multi-gata">Gata</button></div>`, 'mica multi');
}
function imbunatatesteMulti() {
  const lista = [...multi].map(gaseste).filter(Boolean).sort((a, b) => def(a.tip).pret[a.nivel] - def(b.tip).pret[b.nivel]);
  let ok = 0, faraBani = 0, faraMester = 0;
  for (const c of lista) {
    const d = def(c.tip), n = c.nivel;
    if (c.upg || n >= d.max || n + 1 > nivelMaxPermis(c.tip)) continue;
    const pret = d.pret[n], t = d.timp[n];
    if (S.res[d.cost] < pret) { faraBani++; continue; }
    if (t > 0 && mesteriOcupati() >= S.mesteri) { faraMester++; continue; }
    S.res[d.cost] -= pret; if (d.prod) aseaza(c);
    if (t <= 0) c.nivel = n + 1; else c.upg = { la: n + 1, pana: acum() + t * 1000 };
    ok++; if (t > 0 || c.nivel >= nivelMaxPermis(c.tip)) multi.delete(c.id);
  }
  salveaza(); actualizeazaBara();
  toast(`Am pornit ${ok} îmbunătățiri${faraBani ? `, ${faraBani} fără resurse` : ''}${faraMester ? `, ${faraMester} așteaptă meșteri` : ''}.`, ok ? 'bun' : 'eroare');
  deschideMulti();
}
function strangeTot() {
  const sum = { lei: 0, grau: 0, sare: 0 }; let plin = false;
  for (const c of S.cladiri) {
    const d = def(c.tip); if (!d.prod || c.nivel < 1) continue;
    aseaza(c); const loc = capacitate(d.res) - S.res[d.res]; const luat = Math.max(0, Math.min(Math.floor(c.acc), Math.floor(loc)));
    if (luat > 0) { S.res[d.res] += luat; c.acc -= luat; sum[d.res] += luat; plutitoare.push({ x: c.x + d.size / 2, y: c.y, text: '+' + fmtScurt(luat), res: d.res, t0: null }); }
    if (c.acc >= 1) plin = true;
  }
  salveaza(); actualizeazaBara();
  const txt = ['lei', 'grau', 'sare'].filter(r => sum[r]).map(r => `+${fmt(sum[r])} ${NUME_RES[r]}`).join(', ');
  toast(txt ? 'Ai strâns ' + txt + (plin ? ' (depozite pline!)' : '') : plin ? 'Depozitele sunt pline!' : 'Nimic de strâns încă.', txt ? 'bun' : 'eroare');
}
function ceVaStrange() {
  for (const c of S.cladiri) { const d = def(c.tip); if (d.prod && c.nivel > 0 && acumulat(c) >= Math.max(5, d.cap[c.nivel - 1] * 0.04)) return true; }
  return false;
}

function colecteaza(c, tacut) {
  const d = def(c.tip); aseaza(c);
  const loc = capacitate(d.res) - S.res[d.res];
  const luat = Math.max(0, Math.min(Math.floor(c.acc), Math.floor(loc)));
  if (luat > 0) {
    S.res[d.res] += luat; c.acc -= luat;
    plutitoare.push({ x: c.x + d.size / 2, y: c.y, text: '+' + fmt(luat), res: d.res, t0: null });
    salveaza(); actualizeazaBara();
  } else if (c.acc >= 1) toast(`Depozitele de ${NUME_RES[d.res]} sunt pline! Îmbunătățește-le.`, 'eroare');
  else if (!tacut) toast('Nu e nimic de strâns încă.');
  return luat;
}

// ------------------------------------------------------------ foaia de jos
let ultimTitlu = '';
function deschideFoaie(titlu, html, cls = '') {
  const f = $('#foaie'); f.className = cls; $('.foaie-cap h2', f).textContent = titlu;
  const corp = $('.foaie-corp', f); const scroll = !f.hidden && ultimTitlu === titlu ? corp.scrollTop : 0;
  corp.innerHTML = html; f.hidden = false; corp.scrollTop = scroll; ultimTitlu = titlu;
  for (const c of $$('canvas[data-mini]', f)) deseneazaMini(c, c.dataset.mini, c.dataset.fel ? (c.dataset.fel === 'osten' ? true : c.dataset.fel) : false);
  $$('#meniu button').forEach(b => b.classList.toggle('activ', !!foaie && b.dataset.nav === foaie.tip));
}
function inchideFoaie() {
  $('#foaie').hidden = true; foaie = null; selectat = null; multi = null;
  if (plasare) plasare = null;
  if (window.Clan) Clan.inchis();
  $$('#meniu button').forEach(b => b.classList.remove('activ'));
}
$('#foaie .inchide').addEventListener('click', () => inchideFoaie());
$('#strange-tot').addEventListener('click', () => strangeTot());

function stat(et, val) { return `<div class="stat"><span>${et}</span><b>${val}</b></div>`; }
const butonGrabire = (act, id, pana, extra = '') => `<button class="btn mare galben" data-act="${act}" data-id="${id}" ${extra}>Termină acum<small>${ico('galbeni')}<span data-galbeni-pana="${pana}">${galbeniPentruTimp((pana - acum()) / 1000)}</span> galbeni</small></button>`;

function deschideCladire(c) {
  foaie = { tip: 'cladire', id: c.id };
  const d = def(c.tip), n = c.nivel; const r = []; const nv = Math.max(1, n);
  r.push(`<div class="cap-cladire"><canvas data-mini="${c.tip}"></canvas><div><p class="desc">${d.desc}</p><p class="nivel">${n > 0 ? 'Nivel ' + n + ' / ' + d.max : 'În construcție'}</p></div></div><div class="statistici">`);
  if (d.hp) r.push(stat('Viață', fmt(d.hp[nv - 1])));
  if (d.prod) { r.push(stat('Producție', `${cost(d.res, d.prod[nv - 1])}/oră`)); r.push(stat('Strâns', `<span data-acum="${c.id}">${fmt(acumulat(c))}</span> / ${fmt(d.cap[nv - 1])}`)); }
  if (d.stoc) r.push(stat('Depozit', c.tip === 'primarie' ? `${cost('lei', d.stoc[nv - 1])} ${cost('grau', d.stoc[nv - 1])}${d.stocSare[nv - 1] ? ' ' + cost('sare', d.stocSare[nv - 1]) : ''}` : cost(d.res, d.stoc[nv - 1])));
  if (d.capacitate) r.push(stat(c.tip === 'atelier' ? 'Vrăji' : c.tip === 'tepi' ? 'Înghite' : 'Locuri', d.capacitate[nv - 1]));
  if (d.dps) { r.push(stat('Daune/sec', d.crestere ? `${d.dps[nv - 1]}→${d.dpsMax[nv - 1]}` : fmt(d.dps[nv - 1]))); r.push(stat('Rază', d.raza + (d.razaMin ? ` (min ${d.razaMin})` : ''))); r.push(stat('Lovește', d.tinte === 'sol' ? 'pământ' : d.tinte === 'aer' ? 'aer' : 'aer și pământ')); }
  if (d.dmg) { r.push(stat('Daune', d.dmg[nv - 1])); r.push(stat('Lovește', d.tinte === 'aer' ? 'aer' : 'pământ')); }
  if (c.tip === 'cazarma' || c.tip === 'barlog') {
    const urm = OSTENI_ANTRENABILI.find(t => OSTENI[t].cladire === c.tip && OSTENI[t].nivelCladire === n + 1);
    r.push(stat('Oșteni', OSTENI_ANTRENABILI.filter(t => OSTENI[t].cladire === c.tip && OSTENI[t].nivelCladire <= n).map(t => OSTENI[t].nume).join(', ') || '—'));
    if (urm) r.push(stat('Următorul', OSTENI[urm].nume));
  }
  r.push('</div>');
  if (c.upg) {
    const tot = d.timp[c.upg.la - 1] * 1000 || 1, p = Math.round(100 * (1 - (c.upg.pana - acum()) / tot));
    r.push(`<div class="progres"><div style="width:${p}%"></div></div>
      <p class="centru">${n === 0 ? 'Se construiește' : 'Se îmbunătățește la nivelul ' + c.upg.la} — gata în <b data-pana="${c.upg.pana}">${fmtTimp((c.upg.pana - acum()) / 1000)}</b></p>
      ${butonGrabire('termina', c.id, c.upg.pana)}`);
  } else if (n < d.max) {
    if (n + 1 > nivelMaxPermis(c.tip)) { const th = primulTHcu(c.tip, v => v >= n + 1); r.push(`<p class="nota">${th ? ridicaPrimaria(th) + ' ca să poți îmbunătăți mai departe.' : 'Nivel maxim pentru Primăria ta.'}</p>`); }
    else {
      const pret = d.pret[n], t = d.timp[n], ok = S.res[d.cost] >= pret;
      let extra = '';
      if (c.tip === 'primarie') {
        const noi = ORDINE_CONSTRUIRE.filter(x => (def(x).lim[n] || 0) > (def(x).lim[n - 1] || 0)).map(x => def(x).nume);
        extra = `<p class="nota">Nivelul ${n + 1} deblochează: ${noi.join(', ') || 'niveluri noi'} și niveluri mai mari pentru clădiri.</p>`;
      }
      if (c.tip === 'cazarma' || c.tip === 'barlog') { const nou = OSTENI_ANTRENABILI.find(t => OSTENI[t].cladire === c.tip && OSTENI[t].nivelCladire === n + 1); if (nou) extra = `<p class="nota">Nivelul ${n + 1} deblochează: <b>${OSTENI[nou].nume}</b>.</p>`; }
      if (c.tip === 'atelier') { const nou = Object.keys(VRAJI).find(v => VRAJI[v].nivelAtelier === n + 1); if (nou) extra = `<p class="nota">Nivelul ${n + 1} deblochează: <b>${VRAJI[nou].nume}</b>.</p>`; }
      r.push(`${extra}<button class="btn mare ${ok ? 'verde' : 'gri'}" data-act="imbunatateste" data-id="${c.id}">Îmbunătățește la nivelul ${n + 1}<small>${cost(d.cost, pret)} · ${t ? fmtTimp(t) : 'pe loc'}</small></button>`);
    }
  } else r.push('<p class="nota centru">Nivel maxim atins. Bravo!</p>');
  const b = [];
  if (d.prod && n > 0) b.push(`<button class="btn" data-act="colecteaza" data-id="${c.id}">Strânge</button>`);
  if ((c.tip === 'cazarma' || c.tip === 'barlog' || c.tip === 'tabara') && n > 0) b.push('<button class="btn" data-act="nav" data-nav="armata">Antrenează</button>');
  if (c.tip === 'atelier' && n > 0) b.push('<button class="btn" data-act="armata-tab" data-tab="vraji">Vrăji</button>');
  if (c.tip === 'laborator' && n > 0) b.push('<button class="btn galben" data-act="laborator">Cercetează</button>');
  if (d.erou && n > 0) b.push(`<button class="btn galben" data-act="erou" data-e="${d.erou}">${EROI[d.erou].nume}</button>`);
  if (c.tip === 'cetateClan' && n > 0) b.push('<button class="btn" data-act="nav" data-nav="clan">Clanul</button>');
  b.push(`<button class="btn" data-act="muta" data-id="${c.id}">Mută</button>`);
  r.push(`<div class="rand-butoane">${b.join('')}</div>`);
  const m = [`<button class="btn mic" data-act="multi-start" data-id="${c.id}">☑ Selectează mai multe</button>`];
  if (c.tip === 'zid') { m.push(`<button class="btn mic" data-act="multi-rand" data-id="${c.id}">Tot rândul</button>`); m.push(`<button class="btn mic" data-act="multi-tip" data-id="${c.id}">Toate zidurile nv ${n}</button>`); }
  else if (numar(c.tip) > 1) m.push(`<button class="btn mic" data-act="multi-tip" data-id="${c.id}">Toate (${numar(c.tip)})</button>`);
  r.push(`<div class="rand-butoane multi-b">${m.join('')}</div>`);
  if (c.tip === 'cetateClan' && n > 0) {
    const tr = J.cetate || []; const cap = d.capacitate[n - 1]; const fol = tr.reduce((s, t) => s + (OSTENI[t.tip] ? OSTENI[t.tip].loc : 0), 0);
    r.push(`<h3>În cetate: ${fol}/${cap}</h3><p class="nota">${tr.length ? tr.map(t => `${OSTENI[t.tip] ? OSTENI[t.tip].nume : t.tip} (nv ${t.nivel})`).join(', ') : 'Goală. Cere oșteni din clan.'}</p>`);
  }
  deschideFoaie(d.nume, r.join(''));
}

function imbunatateste(c) {
  const d = def(c.tip), n = c.nivel;
  if (c.upg || n >= d.max) return;
  if (n + 1 > nivelMaxPermis(c.tip)) return toast('Ridică întâi Primăria.', 'eroare');
  const pret = d.pret[n], t = d.timp[n];
  if (S.res[d.cost] < pret) return lipsaResurse(d.cost, pret - S.res[d.cost]);
  if (t > 0 && mesteriOcupati() >= S.mesteri) return toast('Toți meșterii sunt ocupați. Așteaptă sau ia încă un meșter din Târg.', 'eroare');
  S.res[d.cost] -= pret;
  if (d.prod) aseaza(c);
  if (t <= 0) { c.nivel = n + 1; toast(`${d.nume} — nivel ${c.nivel}`, 'bun'); }
  else c.upg = { la: n + 1, pana: acum() + t * 1000 };
  salveaza(); actualizeazaBara(); deschideCladire(c);
}
async function lipsaResurse(res, lipsa) {
  const pret = galbeniPentruRes(res, lipsa);
  if (await confirma(`Îți lipsesc ${cost(res, lipsa)} ${NUME_RES[res]}. Le cumperi cu ${ico('galbeni')}<b>${fmt(pret)}</b> galbeni?`, 'Cumpără', 'Nu')) {
    if (J.galbeni < pret) return toast('Nu ai destui galbeni. Cere din Târg.', 'eroare');
    if (capacitate(res) < S.res[res] + lipsa) return toast('Depozitele tale nu au loc pentru atât.', 'eroare');
    try { J.galbeni = await NET.cheltuie(pret, 'Resurse: ' + NUME_RES[res]); S.res[res] += lipsa; salveaza(); actualizeazaBara(); reimprospateaza(); }
    catch (e) { toast(e.message, 'eroare'); }
  }
}

async function platesteGrabire(pana, motiv) {
  const pret = galbeniPentruTimp((pana - acum()) / 1000);
  if (J.galbeni < pret) { if (await confirma(`Îți trebuie ${fmt(pret)} galbeni și ai ${fmt(J.galbeni)}. Vrei să ceri galbeni gratuit?`, 'Mergi la Târg', 'Nu')) deschideTarg(); return false; }
  if (!await confirma(`Termini acum pentru ${ico('galbeni')}<b>${fmt(pret)}</b> galbeni?`)) return false;
  try { J.galbeni = await NET.cheltuie(pret, 'Grăbire: ' + motiv); actualizeazaBara(); return true; }
  catch (e) { toast(e.message, 'eroare'); return false; }
}
async function terminaAcum(c) {
  if (!c.upg) return;
  if (await platesteGrabire(c.upg.pana, def(c.tip).nume)) { c.upg.pana = acum(); proceseazaTimp(); }
}

// ------------------------------------------------------------ construire & mutare
function deschideConstruieste(cat) {
  cat = cat || (foaie && foaie.cat) || 'resurse';
  foaie = { tip: 'construieste', cat };
  const th = nivPrimarie();
  const tab = CATEGORII.map(([k, n]) => `<button class="${k === cat ? 'activ' : ''}" data-act="cat" data-cat="${k}">${n}</button>`).join('');
  const lista = CATEGORII.find(c => c[0] === cat)[2];
  const h = lista.map(t => {
    const d = def(t), n = numar(t), l = limita(t), plin = n >= l;
    let urm = ''; if (plin) { const i = d.lim.findIndex(v => v > n); urm = i >= 0 ? `Mai multe la Primăria nivel ${i + 1}` : 'Ai numărul maxim'; }
    return `<button class="card-cl ${plin ? 'blocat' : ''}" data-act="construieste" data-tip="${t}" ${plin ? 'disabled' : ''}>
      <canvas data-mini="${t}"></canvas>
      <div><b>${d.nume} <span class="nr">${n}/${l}</span></b><small>${d.desc}</small>
      ${plin ? `<em>${urm}</em>` : `<span class="pret">${cost(d.cost, d.pret[0])} · ${d.timp[0] ? fmtTimp(d.timp[0]) : 'pe loc'}</span>`}</div></button>`;
  }).join('');
  deschideFoaie('Construiește', `<div class="tab-uri mic">${tab}</div><p class="nota">Primăria nivel ${th} · Meșteri liberi: <b>${S.mesteri - mesteriOcupati()}/${S.mesteri}</b></p><div class="lista">${h}</div>`, 'inalta');
}

function locLiber(s) {
  let best = null, bd = 1e9; const C = GRID / 2;
  for (let y = 0; y <= GRID - s; y++) for (let x = 0; x <= GRID - s; x++) {
    if (!locValid(x, y, s)) continue; const d = Math.hypot(x + s / 2 - C, y + s / 2 - C);
    if (d < bd) { bd = d; best = { x, y }; }
  }
  return best;
}
function locLiberLanga(x0, y0, s) {
  for (let r = 1; r < GRID; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    if (locValid(x0 + dx, y0 + dy, s)) return { x: x0 + dx, y: y0 + dy };
  }
  return locLiber(s);
}
function startPlasare(tip, mutaId, pozitie) {
  const d = def(tip);
  if (!mutaId) {
    if (numar(tip) >= limita(tip)) return toast('Ai numărul maxim de ' + d.nume.toLowerCase() + '.', 'eroare');
    if (S.res[d.cost] < d.pret[0]) return lipsaResurse(d.cost, d.pret[0] - S.res[d.cost]);
    if (d.timp[0] > 0 && mesteriOcupati() >= S.mesteri) return toast('Toți meșterii sunt ocupați.', 'eroare');
  }
  const c = mutaId ? gaseste(mutaId) : null;
  const pos = c ? { x: c.x, y: c.y } : (pozitie || locLiber(d.size));
  if (!pos) return toast('Nu mai e loc în sat!', 'eroare');
  plasare = { tip, mutaId, x: pos.x, y: pos.y, cat: foaie && foaie.cat }; selectat = null;
  arataPlasare();
}
function arataPlasare() {
  const d = def(plasare.tip), ok = locValid(plasare.x, plasare.y, d.size, plasare.mutaId);
  foaie = { tip: 'plasare' };
  if (plasare.linie) {
    const n = plasare.linie.filter(p => p.ok).length;
    return deschideFoaie('Linie de ziduri', `<p class="nota">${n} ${n === 1 ? 'zid' : 'ziduri'} · cost ${cost(d.cost, n * d.pret[0])}. Trage din nou ca să schimbi linia.</p>
      <div class="rand-butoane"><button class="btn" data-act="plasare-nu">✕ Anulează</button><button class="btn verde" data-act="plasare-da" ${n ? '' : 'disabled'}>✓ Ridică ${n}</button></div>`, 'mica');
  }
  if (plasare.tip === 'zid' && !plasare.mutaId) {
    return deschideFoaie('Așază: ' + d.nume, `<p class="nota">Atinge ca să pui un zid sau <b>trage cu degetul</b> ca să ridici o linie întreagă. Cost: ${cost(d.cost, d.pret[0])}/zid.</p>
      <div class="rand-butoane"><button class="btn" data-act="plasare-nu">✕ Anulează</button><button class="btn verde" data-act="plasare-da" ${ok ? '' : 'disabled'}>✓ Construiește</button></div>`, 'mica');
  }
  deschideFoaie(plasare.mutaId ? 'Mută: ' + d.nume : 'Așază: ' + d.nume,
    `<p class="nota">Atinge sau trage pe hartă ca să alegi locul.${!plasare.mutaId ? ' Cost: ' + cost(d.cost, d.pret[0]) : ''}</p>
     <div class="rand-butoane"><button class="btn" data-act="plasare-nu">✕ Anulează</button><button class="btn verde" data-act="plasare-da" ${ok ? '' : 'disabled'}>✓ ${plasare.mutaId ? 'Mută aici' : 'Construiește'}</button></div>`, 'mica');
}
function seteazaGhost(x, y) {
  const s = def(plasare.tip).size;
  plasare.x = Math.max(0, Math.min(GRID - s, Math.floor(x - s / 2 + 0.5)));
  plasare.y = Math.max(0, Math.min(GRID - s, Math.floor(y - s / 2 + 0.5)));
  const b = $('[data-act="plasare-da"]'); if (b) b.disabled = !locValid(plasare.x, plasare.y, s, plasare.mutaId);
}
function seteazaLinie(a, b) {
  const x0 = Math.floor(a.x), y0 = Math.floor(a.y), x1 = Math.floor(b.x), y1 = Math.floor(b.y);
  const oriz = Math.abs(x1 - x0) >= Math.abs(y1 - y0); const lin = [];
  const n = oriz ? Math.abs(x1 - x0) : Math.abs(y1 - y0); const pas = (oriz ? Math.sign(x1 - x0) : Math.sign(y1 - y0)) || 1;
  const d = def('zid'); let ramase = limita('zid') - numar('zid'), bani = S.res[d.cost];
  for (let i = 0; i <= n; i++) {
    const x = oriz ? x0 + i * pas : x0, y = oriz ? y0 : y0 + i * pas;
    let ok = locValid(x, y, 1);
    if (ok && (ramase <= 0 || bani < d.pret[0])) ok = false;
    if (ok) { ramase--; bani -= d.pret[0]; }
    lin.push({ x, y, ok });
  }
  plasare.linie = lin; plasare.x = x1; plasare.y = y1;
  arataPlasare();
}
function construiesteLinie() {
  const d = def('zid'); let n = 0;
  for (const p of plasare.linie) {
    if (!p.ok || !locValid(p.x, p.y, 1) || numar('zid') >= limita('zid') || S.res[d.cost] < d.pret[0]) continue;
    S.res[d.cost] -= d.pret[0]; S.cladiri.push({ id: S.nextId++, tip: 'zid', nivel: 1, x: p.x, y: p.y, upg: null, acc: 0, last: acum() }); n++;
  }
  plasare = null; salveaza(); actualizeazaBara();
  toast(n ? `Ai ridicat ${n} ${n === 1 ? 'zid' : 'ziduri'}.` : 'Niciun zid nu a încăput.', n ? 'bun' : 'eroare');
  if (n && numar('zid') < limita('zid') && S.res[d.cost] >= d.pret[0]) startPlasare('zid'); else inchideFoaie();
}
function confirmaPlasare() {
  if (plasare.linie) return construiesteLinie();
  const p = plasare, d = def(p.tip);
  if (!locValid(p.x, p.y, d.size, p.mutaId)) return toast('Locul e ocupat.', 'eroare');
  if (p.mutaId) { const c = gaseste(p.mutaId); c.x = p.x; c.y = p.y; plasare = null; salveaza(); inchideFoaie(); toast(d.nume + ' a fost mutat.'); return; }
  if (numar(p.tip) >= limita(p.tip)) { plasare = null; inchideFoaie(); return toast('Ai numărul maxim.', 'eroare'); }
  if (S.res[d.cost] < d.pret[0]) return lipsaResurse(d.cost, d.pret[0] - S.res[d.cost]);
  if (d.timp[0] > 0 && mesteriOcupati() >= S.mesteri) return toast('Toți meșterii sunt ocupați.', 'eroare');
  S.res[d.cost] -= d.pret[0];
  const c = { id: S.nextId++, tip: p.tip, nivel: 0, x: p.x, y: p.y, upg: null, acc: 0, last: acum() };
  if (d.timp[0] > 0) c.upg = { la: 1, pana: acum() + d.timp[0] * 1000 }; else { c.nivel = 1; if (d.erou && !S.eroi[d.erou]) S.eroi[d.erou] = { nivel: 1, upg: null, odihna: 0 }; }
  S.cladiri.push(c); salveaza(); actualizeazaBara();
  if ((p.tip === 'zid' || d.capcana) && numar(p.tip) < limita(p.tip) && S.res[d.cost] >= d.pret[0]) {
    const urm = locLiberLanga(p.x, p.y, 1); plasare = null;
    if (urm) { startPlasare(p.tip, null, urm); return; }
  }
  plasare = null; selectat = c.id; deschideCladire(c);
}

// ------------------------------------------------------------ armată: oșteni / vrăji / eroi
function deschideArmata(tab) {
  tab = tab || (foaie && foaie.tip === 'armata' && foaie.tab) || 'osteni';
  foaie = { tip: 'armata', tab };
  const tabs = [['osteni', 'Oșteni'], ['vraji', 'Vrăji'], ['eroi', 'Eroi']].map(([k, n]) => `<button class="${k === tab ? 'activ' : ''}" data-act="armata-tab" data-tab="${k}">${n}</button>`).join('');
  let h = '';
  if (tab === 'osteni') {
    const cap = capArmata(), fol = locuriFolosite();
    const carduri = OSTENI_ANTRENABILI.map(t => {
      const o = OSTENI[t]; const nvC = nivelCladire(o.cladire); const desc = nvC >= o.nivelCladire; const n = S.armata[t] || 0;
      const nume = o.cladire === 'barlog' ? 'Bârlogul' : 'Cazarma';
      return `<div class="osten ${desc ? '' : 'blocat'}"><canvas data-mini="${t}" data-fel="osten"></canvas>
        <div class="osten-info"><b>${o.nume} <span class="nr">×${n}</span> <span class="niv-mic">nv ${nivelOsten(t)}</span></b><small>${o.desc}</small>
        <small class="mic">Viață ${Math.round(o.hp * multNivel(nivelOsten(t)))} · Daune/s ${Math.round(o.dps * multNivel(nivelOsten(t)))} · ${o.loc} loc${o.loc > 1 ? 'uri' : ''}${o.aer ? ' · zboară' : ''}</small></div>
        ${desc ? `<div class="osten-btn"><button class="btn mic verde" data-act="antreneaza" data-tip="${t}" data-n="1">+1<small>${cost(o.cost, o.pret)}</small></button>
          <button class="btn mic" data-act="antreneaza" data-tip="${t}" data-n="5">+5</button></div>` : `<em>${nume} nivel ${o.nivelCladire}</em>`}</div>`;
    }).join('');
    const coada = S.coada.length ? `<h3>Se antrenează</h3><ul class="coada">${S.coada.slice(0, 30).map((q, i) =>
      `<li><span>${OSTENI[q.tip].nume}</span><b data-pana="${q.pana}">${fmtTimp((q.pana - acum()) / 1000)}</b><button class="btn mic" data-act="anuleaza" data-i="${i}">✕</button></li>`).join('')}</ul>
      ${butonGrabire('grabeste-coada', 0, S.coada[S.coada.length - 1].pana)}` : '';
    h = `<div class="bara-armata"><span>Locuri în tabere</span><b>${fol} / ${cap}</b><div class="progres"><div style="width:${cap ? Math.min(100, fol / cap * 100) : 0}%"></div></div></div>
      ${!cap ? '<p class="nota">Construiește o Tabără ca să ai unde ține oștenii.</p>' : ''}<div class="lista">${carduri}</div>${coada}`;
  } else if (tab === 'vraji') {
    const cap = capVraji(), fol = vrajiFolosite(), nvA = nivelCladire('atelier');
    if (!nvA) h = `<p class="nota">${numar('atelier') ? 'Atelierul de vrăji se construiește.' : `Construiește Atelierul de vrăji (Primăria nivel ${CLADIRI.atelier.lim.findIndex(v => v > 0) + 1}).`}</p>`;
    else {
      h = `<div class="bara-armata"><span>Vrăji pregătite</span><b>${fol} / ${cap}</b><div class="progres"><div style="width:${Math.min(100, fol / cap * 100)}%"></div></div></div><div class="lista">` +
        Object.entries(VRAJI).map(([k, v]) => { const desc = nvA >= v.nivelAtelier; return `<div class="osten ${desc ? '' : 'blocat'}"><canvas data-mini="${k}" data-fel="vraja"></canvas>
          <div class="osten-info"><b>${v.nume} <span class="nr">×${S.vraji[k] || 0}</span> <span class="niv-mic">nv ${nivelVraja(k)}</span></b><small>${v.desc}</small></div>
          ${desc ? `<div class="osten-btn"><button class="btn mic verde" data-act="prepara" data-tip="${k}">+1<small>${cost('grau', v.pret)}</small></button></div>` : `<em>Atelier nivel ${v.nivelAtelier}</em>`}</div>`; }).join('') + '</div>';
      if (S.coadaVraji.length) h += `<h3>Se prepară</h3><ul class="coada">${S.coadaVraji.map((q, i) => `<li><span>${VRAJI[q.tip].nume}</span><b data-pana="${q.pana}">${fmtTimp((q.pana - acum()) / 1000)}</b><button class="btn mic" data-act="anuleaza-vraja" data-i="${i}">✕</button></li>`).join('')}</ul>`;
    }
  } else {
    const lista = Object.keys(EROI).map(e => {
      const st = S.eroi[e]; const altarTH = CLADIRI[EROI[e].altar].lim.findIndex(v => v > 0) + 1;
      if (!st) return `<div class="osten blocat"><canvas data-mini="${e}" data-fel="erou"></canvas><div class="osten-info"><b>${EROI[e].nume}</b><small>${EROI[e].desc}</small></div><em>Primăria nivel ${altarTH}</em></div>`;
      const stare = st.upg ? 'Se îmbunătățește' : st.odihna > acum() ? `Se odihnește <b data-pana="${st.odihna}"></b>` : 'Gata de luptă';
      return `<div class="osten"><canvas data-mini="${e}" data-fel="erou"></canvas><div class="osten-info"><b>${EROI[e].nume} <span class="niv-mic">nv ${st.nivel}</span></b><small>${stare}</small></div>
        <div class="osten-btn"><button class="btn mic galben" data-act="erou" data-e="${e}">Detalii</button></div></div>`;
    }).join('');
    h = `<div class="lista">${lista}</div>`;
  }
  deschideFoaie('Armata', `<div class="tab-uri mic">${tabs}</div>${h}`, 'inalta');
}
function antreneaza(tip, n) {
  const o = OSTENI[tip]; let facuti = 0, motiv = '';
  for (let i = 0; i < n; i++) {
    if (locuriFolosite() + o.loc > capArmata()) { motiv = 'Taberele sunt pline. Construiește sau îmbunătățește tabere.'; break; }
    if (S.res[o.cost] < o.pret) { motiv = `Nu ai destul${o.cost === 'sare' ? 'ă sare' : ' grâu'}.`; break; }
    S.res[o.cost] -= o.pret;
    const start = Math.max(acum(), S.coada.length ? S.coada[S.coada.length - 1].pana : 0);
    S.coada.push({ tip, pana: start + o.timp * 1000 }); facuti++;
  }
  if (motiv) toast(motiv, 'eroare');
  if (facuti) { salveaza(); actualizeazaBara(); deschideArmata('osteni'); }
}
function anuleazaCoada(i) {
  const q = S.coada[i]; if (!q) return; const o = OSTENI[q.tip];
  S.coada.splice(i, 1); S.res[o.cost] += o.pret;
  for (let j = i; j < S.coada.length; j++) S.coada[j].pana -= o.timp * 1000;
  salveaza(); actualizeazaBara(); deschideArmata('osteni');
}
function prepara(tip) {
  const v = VRAJI[tip];
  if (vrajiFolosite() + 1 > capVraji()) return toast('Atelierul e plin.', 'eroare');
  if (S.res.grau < v.pret) return lipsaResurse('grau', v.pret - S.res.grau);
  S.res.grau -= v.pret;
  const start = Math.max(acum(), S.coadaVraji.length ? S.coadaVraji[S.coadaVraji.length - 1].pana : 0);
  S.coadaVraji.push({ tip, pana: start + v.timp * 1000 });
  salveaza(); actualizeazaBara(); deschideArmata('vraji');
}
function anuleazaVraja(i) {
  const q = S.coadaVraji[i]; if (!q) return; const v = VRAJI[q.tip];
  S.coadaVraji.splice(i, 1); S.res.grau += v.pret;
  for (let j = i; j < S.coadaVraji.length; j++) S.coadaVraji[j].pana -= v.timp * 1000;
  salveaza(); actualizeazaBara(); deschideArmata('vraji');
}

// ------------------------------------------------------------ laborator
function deschideLaborator() {
  foaie = { tip: 'laborator' };
  const nvL = nivelLab();
  if (!nvL) return deschideFoaie('Laboratorul', '<p class="nota">Laboratorul se construiește încă.</p>');
  const linie = (k, d, tipCl, nivDeblocat) => {
    const n = S.lab[k] || 1; const mx = nivelMaxLab(d, nvL);
    const deblocat = nivDeblocat;
    if (!deblocat) return '';
    let dr;
    if (S.labUpg && S.labUpg.tip === k) dr = `<em>în lucru</em>`;
    else if (n >= d.max) dr = '<em>maxim</em>';
    else if (n >= mx) dr = `<em>Lab nv ${n}</em>`;
    else { const pret = labPret(d.labBaza, n + 1); const res = d.cost === 'sare' ? 'sare' : 'grau';
      dr = `<button class="btn mic ${S.res[res] >= pret && !S.labUpg ? 'verde' : 'gri'}" data-act="lab" data-tip="${k}" ${S.labUpg ? 'disabled' : ''}>nv ${n + 1}<small>${cost(res, pret)} · ${fmtTimp(labTimp(n + 1))}</small></button>`; }
    return `<div class="osten"><canvas data-mini="${k}" data-fel="${tipCl}"></canvas><div class="osten-info"><b>${d.nume} <span class="niv-mic">nv ${n}/${d.max}</span></b></div><div class="osten-btn">${dr}</div></div>`;
  };
  const nvC = nivelCladire('cazarma'), nvB = nivelCladire('barlog'), nvA = nivelCladire('atelier');
  let h = `<p class="nota">Laboratorul nivel ${nvL}: poți ridica oștenii și vrăjile până la nivelul ${nvL + 1}. Se cercetează un singur lucru odată.</p>`;
  if (S.labUpg) {
    const d = OSTENI[S.labUpg.tip] || VRAJI[S.labUpg.tip];
    h += `<div class="bara-armata"><span>Se cercetează: ${d.nume} nv ${S.labUpg.la}</span><b data-pana="${S.labUpg.pana}">${fmtTimp((S.labUpg.pana - acum()) / 1000)}</b></div>${butonGrabire('lab-grabeste', 0, S.labUpg.pana)}`;
  }
  h += '<h3>Oșteni</h3><div class="lista">' + OSTENI_ANTRENABILI.map(k => linie(k, OSTENI[k], 'osten', (OSTENI[k].cladire === 'barlog' ? nvB : nvC) >= OSTENI[k].nivelCladire)).join('') + '</div>';
  if (nvA) h += '<h3>Vrăji</h3><div class="lista">' + Object.keys(VRAJI).map(k => linie(k, { ...VRAJI[k], cost: 'grau' }, 'vraja', nvA >= VRAJI[k].nivelAtelier)).join('') + '</div>';
  deschideFoaie('Laboratorul', h, 'inalta');
}
function cerceteaza(tip) {
  if (S.labUpg) return toast('Laboratorul e ocupat.', 'eroare');
  const d = OSTENI[tip] || VRAJI[tip]; const n = S.lab[tip] || 1;
  if (n >= nivelMaxLab(d, nivelLab())) return toast('Îmbunătățește întâi Laboratorul.', 'eroare');
  const res = d.cost === 'sare' ? 'sare' : 'grau'; const pret = labPret(d.labBaza, n + 1);
  if (S.res[res] < pret) return lipsaResurse(res, pret - S.res[res]);
  S.res[res] -= pret; S.labUpg = { tip, la: n + 1, pana: acum() + labTimp(n + 1) * 1000 };
  salveaza(); actualizeazaBara(); deschideLaborator();
}

// ------------------------------------------------------------ eroi
function deschideErou(e) {
  foaie = { tip: 'erou', e };
  const st = S.eroi[e]; const d = EROI[e];
  if (!st) return deschideFoaie(d.nume, `<p class="nota">Construiește ${CLADIRI[d.altar].nume}.</p>`);
  const th = nivPrimarie(); const mx = d.maxTH[th - 1] || 1; const n = st.nivel;
  let h = `<div class="cap-cladire"><canvas data-mini="${e}" data-fel="erou"></canvas><div><p class="desc">${d.desc}</p><p class="nivel">Nivel ${n} / ${mx}</p></div></div>
    <div class="statistici">${stat('Viață', fmt(erouHp(e, n)))}${stat('Daune/s', fmt(erouDps(e, n)))}${stat('Abilitate', n >= d.abilitateDe ? 'Da' : 'de la nv ' + d.abilitateDe)}${stat('Stare', st.upg ? 'Se îmbunătățește' : st.odihna > acum() ? 'Se odihnește' : 'Gata')}</div>`;
  if (st.odihna > acum() && !st.upg) h += `<p class="centru">Se odihnește încă <b data-pana="${st.odihna}">${fmtTimp((st.odihna - acum()) / 1000)}</b></p>${butonGrabire('erou-odihna', 0, st.odihna, `data-e="${e}"`)}`;
  if (st.upg) h += `<p class="centru">Ajunge la nivelul ${st.upg.la} în <b data-pana="${st.upg.pana}">${fmtTimp((st.upg.pana - acum()) / 1000)}</b></p>${butonGrabire('erou-grabeste', 0, st.upg.pana, `data-e="${e}"`)}`;
  else if (n < mx) h += `<button class="btn mare ${S.res.sare >= erouPret(e, n) ? 'verde' : 'gri'}" data-act="erou-up" data-e="${e}">Îmbunătățește la nivelul ${n + 1}<small>${cost('sare', erouPret(e, n))} · ${fmtTimp(erouTimp(n))}</small></button><p class="nota">În timpul îmbunătățirii eroul nu luptă și nu apără satul.</p>`;
  else h += `<p class="nota centru">${n >= d.maxTH[d.maxTH.length - 1] ? 'Nivel maxim.' : 'Ridică Primăria ca să crești eroul mai departe.'}</p>`;
  deschideFoaie(d.nume, h);
}
function cresteErou(e) {
  const st = S.eroi[e]; if (!st || st.upg) return; const n = st.nivel; const pret = erouPret(e, n);
  if (n >= (EROI[e].maxTH[nivPrimarie() - 1] || 1)) return;
  if (S.res.sare < pret) return lipsaResurse('sare', pret - S.res.sare);
  if (mesteriOcupati() >= S.mesteri) return toast('Toți meșterii sunt ocupați.', 'eroare');
  S.res.sare -= pret; st.upg = { la: n + 1, pana: acum() + erouTimp(n) * 1000 };
  salveaza(); actualizeazaBara(); deschideErou(e);
}

// ------------------------------------------------------------ hartă & atac
function deschideHartaEuropa() {
  foaie = { tip: 'harta', tab: 'eu' };
  const rand = TARI.map((t, ti) => `<h3 class="tara">${t.nume}</h3>` + t.cetati.map(([id]) => {
    const c = CETATI_EUROPA.find(x => x.id === id); const st = S.campanie[id] || 0, desc = Harta.cetateEuropaDeblocata(c.idx, S.campanie);
    return `<div class="rand-cet ${desc ? '' : 'blocat'}"><div><b>${c.nume}</b><small>Putere ${c.th} · Pradă ${cost('lei', prazaCetate(c))} ${cost('grau', prazaCetate(c))} ${cost('sare', prazaSare(c))}</small></div>
      <span class="stele">${[0, 1, 2].map(k => `<span class="${k < st ? 'plina' : ''}">★</span>`).join('')}</span>
      ${desc ? `<button class="btn mic rosu" data-act="cetate-eu" data-id="${c.id}">Atacă</button>` : '<em>Blocată</em>'}</div>`;
  }).join('')).join('');
  const total = CETATI_EUROPA.filter(c => (S.campanie[c.id] || 0) > 0).length;
  deschideFoaie('Harta Europei', `<div class="tab-uri mic"><button data-act="harta-tab" data-tab="ro">România</button><button class="activ" data-act="harta-tab" data-tab="eu">Europa</button></div>
    <div class="harta-wrap">${Harta.svgEuropa(S.campanie)}</div>
    <p class="nota">Cucerite: <b>${total}/${CETATI_EUROPA.length}</b>. ${(S.campanie.targoviste || 0) ? 'Cucerește-le pe rând, țară după țară.' : 'Se deschide după ce cucerești Curtea Domnească Târgoviște.'}</p>${rand}`, 'inalta');
}
const prazaSare = c => c.th >= 7 ? c.th * c.th * 25 : 0;
async function atacaCetateEu(id) {
  const c = CETATI_EUROPA.find(x => x.id === id);
  if (!c || !Harta.cetateEuropaDeblocata(c.idx, S.campanie)) return toast('Cucerește întâi cetatea de dinainte.', 'eroare');
  if (!areArmata()) return;
  inchideFoaie(); await salveazaAcum();
  const tara = TARI.find(t => t.id === c.tara);
  Lupta.start({ tip: 'cetate', id: c.id, nume: c.nume, sub: `${tara.nume} · putere ${c.th}`, cladiri: genereazaSat(c.th, hashText(c.id), true),
    loot: { lei: prazaCetate(c), grau: prazaCetate(c), sare: prazaSare(c) }, cautare: false });
}

async function deschideHarta(tab) {
  if (tab === 'eu') return deschideHartaEuropa();
  foaie = { tip: 'harta', tab: 'ro' };
  const cet = CETATI.map((c, i) => {
    const st = S.campanie[c.id] || 0, desc = Harta.cetateDeblocata(i, S.campanie);
    return `<div class="rand-cet ${desc ? '' : 'blocat'}"><div><b>${c.nume}</b><small>Putere ${c.th} · Pradă ${cost('lei', prazaCetate(c))} ${cost('grau', prazaCetate(c))}</small></div>
      <span class="stele">${[0, 1, 2].map(k => `<span class="${k < st ? 'plina' : ''}">★</span>`).join('')}</span>
      ${desc ? `<button class="btn mic rosu" data-act="cetate" data-id="${c.id}">Atacă</button>` : '<em>Blocată</em>'}</div>`;
  }).join('');
  deschideFoaie('Harta României', `<div class="tab-uri mic"><button class="activ" data-act="harta-tab" data-tab="ro">România</button><button data-act="harta-tab" data-tab="eu">Europa 🇪🇺</button></div><div class="harta-wrap">${Harta.svg(S.campanie, {})}</div>
    <button class="btn mare rosu" data-act="cauta">⚔ Caută un adversar</button>
    <div id="lista-regiune"></div>
    <h3>Cetățile țării</h3><p class="nota">Cucerește-le pe rând. Fiecare cetate cucerită o deblochează pe următoarea.</p><div class="lista">${cet}</div>`, 'inalta');
  try { const nr = await NET.regiuni(); if (foaie && foaie.tip === 'harta') $('.harta-wrap').innerHTML = Harta.svg(S.campanie, nr); } catch (e) { /* */ }
}
const prazaCetate = c => 250 + 400 * c.th * c.th * (c.th > 6 ? c.th - 5 : 1);

async function arataRegiune(id) {
  const r = REGIUNI.find(x => x.id === id); const box = $('#lista-regiune'); if (!box) return;
  box.innerHTML = `<h3>${r.nume}</h3><p class="nota">Se încarcă…</p>`;
  try {
    const l = await NET.jucatoriRegiune(id);
    box.innerHTML = `<h3>Jucători din ${r.nume}</h3>` + (l.length ? '<div class="lista">' + l.map(p => {
      const eu = p.id === NET.idCurent(); const scut = p.scut_pana && Date.parse(p.scut_pana) > acum();
      return `<div class="rand-cet"><div><b>${esc(p.nume)}${eu ? ' (tu)' : ''}</b><small>${ico('trofeu')} ${fmt(p.trofee)} · ${liga(p.trofee).nume}</small></div>
        ${eu ? '' : scut ? '<em>Are scut</em>' : `<button class="btn mic rosu" data-act="ataca-jucator" data-id="${p.id}">Atacă</button>`}</div>`;
    }).join('') + '</div>' : '<p class="nota">Încă nu e nimeni aici. Cheamă-ți prietenii!</p>');
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) { box.innerHTML = `<p class="eroare">${esc(e.message)}</p>`; }
}

function eroiDisponibili() {
  return Object.entries(S.eroi).filter(([, st]) => st && !st.upg && !(st.odihna > acum())).map(([e, st]) => ({ e, nivel: st.nivel }));
}
function areArmata() {
  if (Object.values(S.armata).some(n => n > 0) || eroiDisponibili().length || (J.cetate || []).length) return true;
  confirma('Nu ai niciun oștean. Antrenezi acum?', 'La Armată', 'Nu').then(v => { if (v) deschideArmata('osteni'); });
  return false;
}
function eroiDinStare(st) {
  return Object.entries((st && st.eroi) || {}).filter(([e, x]) => EROI[e] && x && !x.upg).map(([e, x]) => ({ e, nivel: x.nivel | 0 || 1 }));
}

async function cautaAdversar(tinta) {
  if (!areArmata()) return;
  if (J.scut_pana && Date.parse(J.scut_pana) > acum() && !NET.demo && !cautaAdversar._avertizat) {
    if (!await confirma('Ai scut activ. Dacă ataci un jucător, scutul tău dispare. Continui?', 'Continui', 'Nu')) return;
    cautaAdversar._avertizat = true;
  }
  let o = null;
  try { o = await NET.adversar(tinta); } catch (e) { return toast(e.message, 'eroare'); }
  inchideFoaie(); await salveazaAcum();
  if (o) {
    Lupta.start({ tip: 'jucator', aparatorId: o.id, nume: o.nume, sub: `${ico('trofeu')} ${fmt(o.trofee)} · ${liga(o.trofee).nume}`,
      cladiri: (o.state && o.state.cladiri) || [], loot: { lei: o.lei, grau: o.grau, sare: o.sare || 0 }, cautare: !tinta,
      cetateAparare: o.cetate || [], eroiAparare: eroiDinStare(o.state) });
  } else {
    const th = Math.max(1, Math.min(MAX_TH, nivPrimarie() + Math.floor(Math.random() * 3) - 1));
    const seed = (Math.random() * 1e9) | 0; const r = rng(seed);
    const baza = (300 + 900 * th * th) * (0.7 + r() * 0.6);
    Lupta.start({ tip: 'bot', nume: NUME_SATE[seed % NUME_SATE.length], sub: `Sat părăsit · Primăria ${th}${NET.demo ? '' : ' · nu sunt jucători liberi acum'}`,
      cladiri: genereazaSat(th, seed, false), loot: { lei: Math.round(baza), grau: Math.round(baza * (0.8 + r() * 0.4)), sare: th >= 7 ? Math.round(th * 150 * (0.5 + r())) : 0 }, cautare: true });
  }
}
async function atacaCetate(id) {
  const i = CETATI.findIndex(c => c.id === id); const c = CETATI[i];
  if (!c || !Harta.cetateDeblocata(i, S.campanie)) return toast('Cucerește întâi cetatea de dinainte.', 'eroare');
  if (!areArmata()) return;
  inchideFoaie(); await salveazaAcum();
  Lupta.start({ tip: 'cetate', id: c.id, nume: c.nume, sub: `Cetate · putere ${c.th}`, cladiri: genereazaSat(c.th, hashText(c.id), true),
    loot: { lei: prazaCetate(c), grau: prazaCetate(c), sare: prazaSare(c) }, cautare: false });
}

// apelate din lupta.js și clan.js
const Joc = {
  stare: () => S,
  jucator: () => J,
  confirma, toast, anunta, salveazaAcum, nivPrimarie,
  cautaAdversar: () => cautaAdversar(),
  nivelOsten, nivelVraja, eroiDisponibili,
  cetateMea: () => (J.cetate || []).filter(t => OSTENI[t.tip]),
  consumaOsten(tip) { if (S.armata[tip] > 0) S.armata[tip]--; salveaza(); },
  consumaVraja(tip) { if (S.vraji[tip] > 0) S.vraji[tip]--; salveaza(); },
  doneaza(tip) { if (!(S.armata[tip] > 0)) return false; S.armata[tip]--; salveaza(); actualizeazaBara(); return true; },
  async finalLupta({ opt, stele, procent, loot, eroiHp, folositCetate }) {
    let lei = loot.lei, grau = loot.grau, sare = loot.sare || 0, trofee = 0, extra = '', bonusLiga = 0;
    for (const [e, frac] of Object.entries(eroiHp || {})) if (S.eroi[e]) S.eroi[e].odihna = acum() + Math.round((1 - frac) * 15 * 60 * 1000);
    if (folositCetate) { try { await NET.folosesteCetate(); } catch (e) { /* */ } J.cetate = []; }
    if (opt.tip === 'razboi') {
      const r = await NET.atacRazboi(opt.razboiId, opt.tintaId, stele, procent);
      const n = r ? r.stele_noi : 0;
      return { lei: 0, grau: 0, sare: 0, lootLei: 0, lootGrau: 0, trofee: 0, extra: n > 0 ? `Ai adus clanului ${n === 1 ? 'o stea nouă' : n + ' stele noi'}!` : 'Nicio stea nouă pentru clan.' };
    }
    if (opt.tip === 'jucator') {
      if (stele > 0) { const lg = liga(J.trofee); bonusLiga = lg.bonus; }
      const r = await NET.atac(opt.aparatorId, stele, procent, lei, grau, sare);
      lei = r.lei; grau = r.grau; sare = r.sare || 0; trofee = r.trofee; J.trofee = Math.max(0, J.trofee + trofee); J.scut_pana = null;
      if (bonusLiga) { lei += bonusLiga; grau += bonusLiga; sare += liga(J.trofee).bonusSare; }
    }
    if (opt.tip === 'cetate') {
      const vechi = S.campanie[opt.id] || 0;
      if (stele > vechi) { S.campanie[opt.id] = stele; extra = stele >= 1 && vechi === 0 ? 'Cetate cucerită! Următoarea cetate s-a deblocat.' : 'Record nou de stele!'; }
    }
    const pl = adauga('lei', lei), pg = adauga('grau', grau), ps = adauga('sare', sare);
    await salveazaAcum(); actualizeazaBara();
    return { lei: pl, grau: pg, sare: ps, lootLei: lei, lootGrau: grau, lootSare: sare, trofee, extra, bonusLiga };
  },
  dupaLupta() { actualizeazaBara(); redimensioneaza(); if (window.Clan && Clan.dupaLupta) Clan.dupaLupta(); },
};

// ------------------------------------------------------------ târg (galbeni)
function deschideTarg() {
  foaie = { tip: 'targ' };
  const pachete = PACHETE.map(p => `<button class="pachet" data-act="cere-pachet" data-id="${p.id}"><i class="ico galbeni mare"></i><b>${fmt(p.suma)}</b><span>${p.nume}</span><small>Gratuit</small></button>`).join('');
  const magazin = [];
  if (S.mesteri < MAX_MESTERI) magazin.push(['mester', 'Încă un meșter', `Construiești ${S.mesteri + 1} lucruri deodată.`, PRET_MESTER[S.mesteri]]);
  for (const r of ['lei', 'grau', 'sare']) {
    const lipsa = Math.max(0, capacitate(r) - S.res[r]);
    if (lipsa >= 1) magazin.push(['umple-' + r, `Umple depozitele de ${NUME_RES[r]}`, `+${fmt(lipsa)} ${NUME_RES[r]}`, galbeniPentruRes(r, lipsa)]);
  }
  if (S.coada.length) magazin.push(['grabeste-armata', 'Antrenează tot acum', `${S.coada.length} oșteni în așteptare`, galbeniPentruTimp((S.coada[S.coada.length - 1].pana - acum()) / 1000)]);
  if (!NET.demo) { magazin.push(['scut-24', 'Scut o zi', 'Nimeni nu te poate ataca 24 de ore.', 100]); magazin.push(['scut-72', 'Scut 3 zile', 'Nimeni nu te poate ataca 72 de ore.', 250]); }
  deschideFoaie('Târgul', `
    <div class="sold">Ai ${ico('galbeni')} <b>${fmt(J.galbeni)}</b> galbeni</div>
    <h3>Cere galbeni — gratuit</h3>
    <p class="nota">Alege un pachet. Cererea ajunge la admin, care o aprobă. Poți avea cel mult 3 cereri în așteptare.</p>
    <div class="pachete">${pachete}</div>
    <details class="alta-suma"><summary>Altă sumă</summary>
      <label>Câți galbeni?<input id="c-suma" type="number" min="1" max="100000" inputmode="numeric" placeholder="ex: 300"></label>
      <label>Pentru ce? (opțional)<input id="c-motiv" maxlength="200" placeholder="ex: vreau să termin Primăria"></label>
      <button class="btn verde" data-act="cere-suma">Trimite cererea</button></details>
    <h3>Cererile mele</h3><div id="lista-cereri"><p class="nota">Se încarcă…</p></div>
    <h3>Cumpără cu galbeni</h3>
    <div class="lista">${magazin.map(([id, n, desc, pret]) => `<div class="rand-cet"><div><b>${n}</b><small>${desc}</small></div>
      <button class="btn mic galben" data-act="cumpara" data-id="${id}" data-pret="${pret}">${ico('galbeni')}${fmt(pret)}</button></div>`).join('')}</div>`, 'inalta');
  incarcaCereri();
}
const STATUS = { nou: ['Trimisă', 'nou'], asteptare: ['În așteptare', 'asteptare'], aprobat: ['Aprobată ✓', 'aprobat'], respins: ['Respinsă', 'respins'] };
async function incarcaCereri() {
  const box = $('#lista-cereri'); if (!box) return;
  try {
    const l = await NET.cererileMele();
    if (!$('#lista-cereri')) return;
    box.innerHTML = l.length ? '<ul class="cereri">' + l.map(c => `<li><div><b>${ico('galbeni')}${fmt(c.suma)}</b> <small>${esc(c.pachet || c.motiv || '')}</small>
      ${c.nota ? `<small class="nota-admin">Admin: ${esc(c.nota)}</small>` : ''}</div><span class="status ${STATUS[c.status][1]}">${STATUS[c.status][0]}</span></li>`).join('') + '</ul>'
      : '<p class="nota">Nu ai trimis nicio cerere.</p>';
  } catch (e) { box.innerHTML = `<p class="eroare">${esc(e.message)}</p>`; }
}
async function cereGalbeni(suma, motiv, pachet) {
  if (!(suma >= 1 && suma <= 100000)) return toast('Alege o sumă între 1 și 100.000.', 'eroare');
  if (!await confirma(`Trimiți cererea pentru ${ico('galbeni')}<b>${fmt(suma)}</b> galbeni?`, 'Trimite', 'Nu')) return;
  try { await NET.cere(suma, motiv, pachet); toast('Cerere trimisă! Adminul o va verifica.', 'bun'); incarcaCereri(); }
  catch (e) { toast(e.message, 'eroare'); }
}
async function cumpara(id, pret) {
  if (J.galbeni < pret) return toast(`Îți trebuie ${fmt(pret)} galbeni. Cere din pachetele de mai sus.`, 'eroare');
  if (!await confirma(`Plătești ${ico('galbeni')}<b>${fmt(pret)}</b>?`, 'Plătesc', 'Nu')) return;
  try {
    if (id.startsWith('scut')) {
      J.scut_pana = await NET.cumparaScut(id === 'scut-24' ? 24 : 72);
      const p = await NET.jucator(); if (p) J.galbeni = p.galbeni; toast('Scut activat!', 'bun');
    } else {
      J.galbeni = await NET.cheltuie(pret, id === 'mester' ? 'Meșter nou' : id.startsWith('umple') ? 'Umple depozitele' : 'Grăbire armată');
      if (id === 'mester') { S.mesteri = Math.min(MAX_MESTERI, S.mesteri + 1); toast('Ai un meșter nou!', 'bun'); }
      if (id.startsWith('umple-')) { const r = id.slice(6); S.res[r] = capacitate(r); }
      if (id === 'grabeste-armata') { for (const q of S.coada) q.pana = acum(); proceseazaTimp(); }
      await salveazaAcum();
    }
    actualizeazaBara(); deschideTarg();
  } catch (e) { toast(e.message, 'eroare'); }
}

// ------------------------------------------------------------ profil & clasament
async function deschideProfil() {
  foaie = { tip: 'profil' };
  const reg = (REGIUNI.find(r => r.id === J.regiune) || {}).nume || '';
  const scut = J.scut_pana && Date.parse(J.scut_pana) > acum(); const lg = liga(J.trofee);
  const jurnal = S.jurnal.length ? '<ul class="cereri">' + S.jurnal.slice(0, 10).map(a => `<li><div><b>${esc(a.nume)}</b> <small>${'★'.repeat(a.stele) || '0 stele'} · ${a.procent}%</small>
     <small>Ai pierdut ${cost('lei', a.lei)} ${cost('grau', a.grau)}${a.sare ? ' ' + cost('sare', a.sare) : ''}</small></div><span class="status ${a.stele ? 'respins' : 'aprobat'}">${a.stele ? 'Pierdută' : 'Apărat!'}</span></li>`).join('') + '</ul>'
    : '<p class="nota">Nimeni nu te-a atacat încă.</p>';
  deschideFoaie('Profil', `<div class="profil-cap"><div class="blazon">${esc(J.nume.slice(0, 1).toUpperCase())}</div>
      <div><b>${esc(J.nume)}</b><small>${reg} · Primăria nivel ${nivPrimarie()}</small><small>${ico('trofeu')} ${fmt(J.trofee)} trofee · ${lg.nume}</small><small>${scut ? 'Scut activ' : 'Fără scut'}</small></div></div>
    <h3>Clasamentul țării</h3><div id="clasament"><p class="nota">Se încarcă…</p></div>
    <h3>Apărări</h3>${jurnal}
    <h3>Ligi</h3><p class="nota">${LIGI.slice(1).map(l => `${l[1]}: ${fmt(l[0])}+`).join(' · ')}. La fiecare victorie primești un bonus după ligă.</p>
    <h3>Pune jocul pe ecranul telefonului</h3>
    <p class="nota">Android (Chrome): meniul ⋮ → „Adaugă pe ecranul de pornire”.<br>iPhone (Safari): butonul Partajează → „Adaugă pe ecranul principal”.</p>
    <div id="buton-admin"></div>
    <div class="rand-butoane">${NET.demo ? '<button class="btn rosu" data-act="reset-demo">Șterge progresul demo</button>' : '<button class="btn" data-act="iesi">Ieși din cont</button>'}</div>`, 'inalta');
  NET.esteAdmin().then(da => { const b = $('#buton-admin'); if (da && b && !NET.demo) b.innerHTML = '<a class="btn mare galben" href="admin.html">⚙ Panou admin</a>'; }).catch(() => {});
  try {
    const l = await NET.clasament(); const box = $('#clasament'); if (!box) return;
    box.innerHTML = '<ol class="clasament">' + l.map((p, i) => `<li class="${p.id === NET.idCurent() ? 'eu' : ''}"><span class="loc">${i + 1}</span><b>${esc(p.nume)}</b>
      <small>${liga(p.trofee).nume} · ${(REGIUNI.find(r => r.id === p.regiune) || {}).nume || ''}</small><span>${ico('trofeu')}${fmt(p.trofee)}</span></li>`).join('') + '</ol>';
  } catch (e) { const box = $('#clasament'); if (box) box.innerHTML = `<p class="eroare">${esc(e.message)}</p>`; }
}

// ------------------------------------------------------------ acțiuni (butoane)
$('#foaie').addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const a = b.dataset.act, id = b.dataset.id, c = id ? gaseste(+id) : null;
  switch (a) {
    case 'imbunatateste': if (c) imbunatateste(c); break;
    case 'termina': if (c) terminaAcum(c); break;
    case 'colecteaza': if (c) colecteaza(c); break;
    case 'muta': if (c) startPlasare(c.tip, c.id); break;
    case 'cat': deschideConstruieste(b.dataset.cat); break;
    case 'construieste': startPlasare(b.dataset.tip); break;
    case 'plasare-da': confirmaPlasare(); break;
    case 'plasare-nu': { const cat = plasare && plasare.cat; plasare = null; if (cat) deschideConstruieste(cat); else inchideFoaie(); break; }
    case 'antreneaza': antreneaza(b.dataset.tip, +b.dataset.n); break;
    case 'anuleaza': anuleazaCoada(+b.dataset.i); break;
    case 'prepara': prepara(b.dataset.tip); break;
    case 'anuleaza-vraja': anuleazaVraja(+b.dataset.i); break;
    case 'armata-tab': deschideArmata(b.dataset.tab); break;
    case 'grabeste-coada': if (S.coada.length && await platesteGrabire(S.coada[S.coada.length - 1].pana, 'Armată')) { for (const q of S.coada) q.pana = acum(); proceseazaTimp(); deschideArmata('osteni'); } break;
    case 'laborator': deschideLaborator(); break;
    case 'lab': cerceteaza(b.dataset.tip); break;
    case 'lab-grabeste': if (S.labUpg && await platesteGrabire(S.labUpg.pana, 'Laborator')) { S.labUpg.pana = acum(); proceseazaTimp(); } break;
    case 'erou': deschideErou(b.dataset.e); break;
    case 'erou-up': cresteErou(b.dataset.e); break;
    case 'erou-grabeste': { const st = S.eroi[b.dataset.e]; if (st && st.upg && await platesteGrabire(st.upg.pana, EROI[b.dataset.e].nume)) { st.upg.pana = acum(); proceseazaTimp(); } break; }
    case 'erou-odihna': { const st = S.eroi[b.dataset.e]; if (st && await platesteGrabire(st.odihna, 'Odihnă erou')) { st.odihna = 0; salveaza(); deschideErou(b.dataset.e); } break; }
    case 'nav': navigheaza(b.dataset.nav); break;
    case 'cauta': cautaAdversar(); break;
    case 'cetate': atacaCetate(id); break;
    case 'cetate-eu': atacaCetateEu(id); break;
    case 'harta-tab': deschideHarta(b.dataset.tab); break;
    case 'multi-start': if (c) startMulti([c.id]); break;
    case 'multi-rand': if (c) startMulti(randZid(c)); break;
    case 'multi-tip': if (c) startMulti(S.cladiri.filter(x => x.tip === c.tip && (c.tip !== 'zid' || x.nivel === c.nivel)).map(x => x.id)); break;
    case 'multi-up': imbunatatesteMulti(); break;
    case 'multi-gol': multi = new Set(); deschideMulti(); break;
    case 'multi-gata': multi = null; inchideFoaie(); break;
    case 'regiune': arataRegiune(id); break;
    case 'ataca-jucator': cautaAdversar(id); break;
    case 'cere-pachet': { const p = PACHETE.find(x => x.id === id); if (p) cereGalbeni(p.suma, '', p.nume); break; }
    case 'cere-suma': cereGalbeni(parseInt($('#c-suma').value, 10), $('#c-motiv').value.trim(), ''); break;
    case 'cumpara': cumpara(id, +b.dataset.pret); break;
    case 'iesi': confirma('Ieși din cont?').then(async v => { if (v) { await salveazaAcum(); await NET.iesi(); location.reload(); } }); break;
    case 'reset-demo': confirma('Ștergi tot progresul din modul demo?', 'Șterge', 'Nu').then(v => { if (v) { NET.resetDemo(); location.reload(); } }); break;
    default: if (window.Clan) Clan.actiune(a, b);
  }
});

function navigheaza(n) {
  if (plasare) plasare = null;
  if (foaie && foaie.tip === n) return inchideFoaie();
  selectat = null;
  if (n === 'clan') { foaie = { tip: 'clan' }; return Clan.deschide(); }
  ({ construieste: () => deschideConstruieste(), armata: () => deschideArmata(), harta: deschideHarta, targ: deschideTarg, profil: deschideProfil })[n]();
}
$$('#meniu button').forEach(b => b.addEventListener('click', () => navigheaza(b.dataset.nav)));

// ------------------------------------------------------------ start
(async function porneste() {
  randeazaAuth();
  try {
    const u = await NET.sesiune();
    if (!u) return;
    const p = await NET.jucator();
    if (p) intraInJoc(p); else if (!NET.demo) { modAuth = 'creare'; randeazaAuth(); }
  } catch (e) { randeazaAuth(e.message); }
})();
