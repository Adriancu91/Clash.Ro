'use strict';
// ====================================================================
//  CLASH OF ROMÂNIA — satul tău, meniurile, salvarea
// ====================================================================

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const acum = () => Date.now();
const fmt = n => Math.floor(n || 0).toLocaleString('ro-RO');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NUME_RES = { lei: 'lei', grau: 'grâu', galbeni: 'galbeni' };
const ico = r => `<i class="ico ${r}"></i>`;
const cost = (r, n) => `${ico(r)}${fmt(n)}`;
function fmtTimp(sec) {
  sec = Math.max(0, Math.ceil(sec));
  if (sec < 60) return sec + 's';
  if (sec < 3600) { const m = Math.floor(sec / 60), s = sec % 60; return m + 'm' + (s ? ' ' + s + 's' : ''); }
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60); return h + 'h' + (m ? ' ' + m + 'm' : '');
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
    v: 1, res: { lei: 1000, grau: 1000 }, mesteri: 2,
    cladiri: [c('primarie', 8, 8), c('moara', 3, 3), c('mina', 15, 3), c('hambar', 3, 15), c('vistierie', 15, 15), c('cazarma', 2, 8), c('tun', 12, 9)],
    armata: { haiduc: 15 }, coada: [], campanie: {}, jurnal: [], nextId: id,
  };
}
function repara(s) {
  s.res = s.res || { lei: 0, grau: 0 }; s.res.lei = +s.res.lei || 0; s.res.grau = +s.res.grau || 0;
  s.mesteri = Math.min(MAX_MESTERI, Math.max(2, s.mesteri | 0));
  s.armata = s.armata || {}; s.coada = s.coada || []; s.campanie = s.campanie || {}; s.jurnal = s.jurnal || [];
  s.cladiri = (s.cladiri || []).filter(c => CLADIRI[c.tip]);
  s.nextId = Math.max(s.nextId | 0, ...s.cladiri.map(c => c.id + 1), 1);
  for (const c of s.cladiri) { if (c.acc == null) c.acc = 0; if (!c.last) c.last = acum(); }
  if (!s.cladiri.some(c => c.tip === 'primarie')) s.cladiri.push({ id: s.nextId++, tip: 'primarie', nivel: 1, x: 8, y: 8, upg: null, acc: 0, last: acum() });
  return s;
}

const def = tip => CLADIRI[tip];
const gaseste = id => S.cladiri.find(c => c.id === id);
const nivPrimarie = () => { const p = S.cladiri.find(c => c.tip === 'primarie'); return p ? Math.max(1, p.nivel) : 1; };
const numar = tip => S.cladiri.filter(c => c.tip === tip).length;
const limita = tip => LIMITE[tip][nivPrimarie() - 1];
const nivelMaxPermis = tip => tip === 'primarie' ? CLADIRI.primarie.max : Math.min(def(tip).max, nivPrimarie());
const mesteriOcupati = () => S.cladiri.filter(c => c.upg && def(c.tip).timp[c.upg.la - 1] > 0).length;
function capacitate(res) {
  let cap = 0;
  for (const c of S.cladiri) {
    if (c.nivel < 1) continue; const d = def(c.tip);
    if (c.tip === 'primarie') cap += d.stoc[c.nivel - 1];
    else if (d.stoc && d.res === res) cap += d.stoc[c.nivel - 1];
  }
  return cap;
}
function capArmata() { const c = S.cladiri.find(x => x.tip === 'cazarma'); return c && c.nivel > 0 ? def('cazarma').capacitate[c.nivel - 1] : 0; }
function locuriFolosite() {
  let n = 0; for (const t in S.armata) n += (S.armata[t] || 0) * OSTENI[t].loc;
  for (const q of S.coada) n += OSTENI[q.tip].loc; return n;
}
function acumulat(c) {
  const d = def(c.tip); if (!d.prod || c.nivel < 1) return 0;
  return Math.min(d.cap[c.nivel - 1], (c.acc || 0) + (acum() - (c.last || acum())) * d.prod[c.nivel - 1] / 3600000);
}
function aseaza(c) { c.acc = acumulat(c); c.last = acum(); }
function adauga(res, n) {
  const loc = Math.max(0, capacitate(res) - S.res[res]); const pus = Math.max(0, Math.min(loc, Math.floor(n)));
  S.res[res] += pus; return pus;
}

function proceseazaTimp() {
  let schimbat = false;
  for (const c of S.cladiri) {
    if (c.upg && acum() >= c.upg.pana) {
      if (def(c.tip).prod) aseaza(c);
      const nou = c.nivel === 0; c.nivel = c.upg.la; c.upg = null; c.last = acum(); schimbat = true;
      toast(nou ? `${def(c.tip).nume} e gata!` : `${def(c.tip).nume} a ajuns la nivelul ${c.nivel}!`, 'bun');
      if (foaie && foaie.tip === 'cladire' && foaie.id === c.id) deschideCladire(c);
      if (foaie && foaie.tip === 'construieste') deschideConstruieste();
    }
  }
  let antrenati = 0;
  while (S.coada.length && S.coada[0].pana <= acum()) { const q = S.coada.shift(); S.armata[q.tip] = (S.armata[q.tip] || 0) + 1; antrenati++; schimbat = true; }
  if (antrenati && foaie && foaie.tip === 'armata') deschideArmata();
  if (schimbat) { salveaza(); actualizeazaBara(); }
}

// ------------------------------------------------------------ salvare & server
let tSalv = 0;
function salveaza() { clearTimeout(tSalv); tSalv = setTimeout(salveazaAcum, 1500); }
async function salveazaAcum() {
  clearTimeout(tSalv); if (!S) return;
  S.res.lei = Math.floor(S.res.lei); S.res.grau = Math.floor(S.res.grau);
  try { await NET.salveaza(S); $('#offline').hidden = true; }
  catch (e) { $('#offline').hidden = false; tSalv = setTimeout(salveazaAcum, 10000); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden && S) salveazaAcum(); else if (!document.hidden && S) sincronizeaza(); });

async function sincronizeaza() {
  try {
    const p = await NET.jucator(); if (!p) return;
    const schimbat = p.galbeni !== J.galbeni;
    if (p.galbeni > J.galbeni) toast(`Ai primit ${fmt(p.galbeni - J.galbeni)} galbeni!`, 'bun');
    Object.assign(J, { galbeni: p.galbeni, trofee: p.trofee, scut_pana: p.scut_pana, blocat: p.blocat });
    actualizeazaBara(); await revendicaAtacuri();
    if (foaie && foaie.tip === 'targ') { if (schimbat) deschideTarg(); else incarcaCereri(); }
  } catch (e) { /* fără net, reîncercăm mai târziu */ }
}

async function revendicaAtacuri() {
  let lista = [];
  try { lista = await NET.revendica(); } catch (e) { return; }
  if (!lista || !lista.length) return;
  let pl = 0, pg = 0;
  for (const a of lista) {
    S.res.lei = Math.max(0, S.res.lei - a.lei); S.res.grau = Math.max(0, S.res.grau - a.grau); pl += a.lei; pg += a.grau;
    S.jurnal.unshift({ cand: a.creat, nume: a.atacator_nume, stele: a.stele, procent: a.procent, lei: a.lei, grau: a.grau, trofee: -a.trofee });
  }
  S.jurnal = S.jurnal.slice(0, 30); salveaza(); actualizeazaBara();
  const rand = lista.map(a => `<li><b>${esc(a.atacator_nume)}</b> — ${'★'.repeat(a.stele) || '0 stele'}, ${a.procent}% distrus</li>`).join('');
  anunta('Ai fost atacat!', `<ul class="lista-simpla">${rand}</ul><p>Ai pierdut ${cost('lei', pl)} și ${cost('grau', pg)}.</p>${lista.some(a => a.stele > 0) ? '<p class="nota">Ai primit un scut — nimeni nu te poate ataca o vreme.</p>' : ''}`);
}

// ------------------------------------------------------------ pornire
async function intraInJoc(p) {
  J = p; const nou = !(p.state && p.state.cladiri);
  S = repara(nou ? stareInitiala() : p.state);
  $('#ecran-start').hidden = true; $('#joc').hidden = false;
  $('#nume-sat').textContent = 'Satul lui ' + J.nume;
  proceseazaTimp(); redimensioneaza(); actualizeazaBara();
  requestAnimationFrame(bucla);
  setInterval(tick, 1000); setInterval(sincronizeaza, 30000);
  if (nou) { await salveazaAcum(); setTimeout(bunVenit, 400); }
  revendicaAtacuri();
  if (J.blocat) anunta('Cont blocat', '<p>Contul tău a fost blocat de admin.</p>');
}
function bunVenit() {
  anunta('Bine ai venit, ' + esc(J.nume) + '!', `<ul class="lista-simpla">
    <li>Atinge <b>Moara</b> și <b>Mina</b> ca să strângi grâu și lei.</li>
    <li>Atinge orice clădire ca s-o <b>îmbunătățești</b>.</li>
    <li>Din <b>Armată</b> antrenezi haiduci, apoi <b>Atacă</b> cetăți sau alți jucători.</li>
    <li>Galbenii sunt gratuiți: îi ceri din <b>Târg</b> și adminul îi aprobă.</li></ul>`);
}

function tick() {
  if (!S) return; proceseazaTimp(); actualizeazaBara();
  for (const e of $$('[data-pana]')) e.textContent = fmtTimp((+e.dataset.pana - acum()) / 1000);
  for (const e of $$('[data-acum]')) { const c = gaseste(+e.dataset.acum); if (c) e.textContent = fmt(acumulat(c)); }
  for (const e of $$('[data-pret-termina]')) { const c = gaseste(+e.dataset.pretTermina); if (c && c.upg) e.textContent = pretTermina(c); }
  const scut = J.scut_pana && Date.parse(J.scut_pana) > acum();
  $('#scut').hidden = !scut; if (scut) $('#scut b').textContent = fmtTimp((Date.parse(J.scut_pana) - acum()) / 1000);
}

function actualizeazaBara() {
  if (!S) return;
  for (const r of ['lei', 'grau']) {
    const cap = capacitate(r), v = S.res[r];
    $(`#r-${r} b`).textContent = fmt(v);
    $(`#r-${r} .umplere span`).style.width = Math.min(100, cap ? v / cap * 100 : 0) + '%';
    $(`#r-${r} small`).textContent = 'max ' + fmt(cap);
  }
  $('#r-galbeni b').textContent = fmt(J.galbeni); $('#r-trofee b').textContent = fmt(J.trofee);
  $('#mesteri').innerHTML = `Meșteri: <b>${S.mesteri - mesteriOcupati()}/${S.mesteri}</b>`;
}

// ------------------------------------------------------------ desen sat
const cv = $('#sat'), g = cv.getContext('2d');
let T = 16, W = 320;
function redimensioneaza() {
  const sc = $('#scena');
  const disp = window.innerHeight - $('#bara').offsetHeight - $('#meniu').offsetHeight - $('#info-sat').offsetHeight - 14;
  W = Math.max(240, Math.min(sc.clientWidth - 8, 560, disp)); T = W / GRID;
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(W * dpr); cv.height = Math.round(W * dpr); cv.style.width = W + 'px'; cv.style.height = W + 'px';
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  document.documentElement.style.setProperty('--meniu-h', $('#meniu').offsetHeight + 'px');
}
window.addEventListener('resize', () => { if (S) redimensioneaza(); });

function bucla(t) {
  if (S && !Lupta.activa() && !document.hidden) deseneazaSat(t);
  requestAnimationFrame(bucla);
}

function deseneazaSat(t) {
  g.clearRect(0, 0, W, W);
  deseneazaTeren(g, T, false);
  const lista = S.cladiri.slice().sort((a, b) => (a.y + def(a.tip).size) - (b.y + def(b.tip).size));
  for (const c of lista) {
    if (plasare && plasare.mutaId === c.id) continue;
    const o = { t, sel: selectat === c.id };
    if (c.upg) { const tot = def(c.tip).timp[c.upg.la - 1] * 1000 || 1; o.constructie = true; o.progres = 1 - (c.upg.pana - acum()) / tot; }
    deseneazaCladire(g, T, c.tip, c.nivel, c.x, c.y, o);
    const d = def(c.tip);
    if (d.prod && c.nivel > 0) {
      const a = acumulat(c);
      if (a >= Math.max(5, d.cap[c.nivel - 1] * 0.04)) {
        const bx = (c.x + d.size / 2) * T, by = c.y * T - T * 0.15 + Math.sin(t / 300 + c.id) * T * 0.08;
        g.fillStyle = '#fff'; g.strokeStyle = '#4a3520'; g.lineWidth = 1.5;
        g.beginPath(); g.arc(bx, by, T * 0.55, 0, 7); g.fill(); g.stroke();
        iconRes(g, d.res, bx, by, T * 0.38);
      }
    }
  }
  if (plasare) {
    const d = def(plasare.tip), ok = locValid(plasare.x, plasare.y, d.size, plasare.mutaId);
    g.fillStyle = ok ? 'rgba(80,220,90,.35)' : 'rgba(230,40,40,.4)';
    g.fillRect(plasare.x * T, plasare.y * T, d.size * T, d.size * T);
    g.globalAlpha = 0.85; deseneazaCladire(g, T, plasare.tip, plasare.mutaId ? gaseste(plasare.mutaId).nivel : 1, plasare.x, plasare.y, { t });
    g.globalAlpha = 1;
    g.strokeStyle = ok ? '#2fbf3a' : '#e23b2e'; g.lineWidth = 2; g.strokeRect(plasare.x * T + 1, plasare.y * T + 1, d.size * T - 2, d.size * T - 2);
  }
  for (let i = plutitoare.length - 1; i >= 0; i--) {
    const p = plutitoare[i]; if (p.t0 == null) p.t0 = t;
    const k = (t - p.t0) / 1200;
    if (k >= 1) { plutitoare.splice(i, 1); continue; }
    g.globalAlpha = 1 - k; g.font = `800 ${Math.max(13, T * 0.8)}px Nunito, Arial, sans-serif`; g.textAlign = 'center';
    g.lineWidth = 4; g.strokeStyle = '#3a2a1a'; g.fillStyle = p.res === 'lei' ? '#e8eef2' : '#ffd84a';
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
  for (const c of S.cladiri) { const s = def(c.tip).size; if (x >= c.x && x < c.x + s && y >= c.y && y < c.y + s) return c; }
  return null;
}

// atingeri pe sat
let apasare = null;
const pozitie = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / T, y: (e.clientY - r.top) / T }; };
cv.addEventListener('pointerdown', e => { apasare = { ...pozitie(e), mutat: false }; if (plasare) { try { cv.setPointerCapture(e.pointerId); } catch (_) { /* */ } } });
cv.addEventListener('pointermove', e => {
  if (!apasare) return; const p = pozitie(e);
  if (Math.hypot(p.x - apasare.x, p.y - apasare.y) > 0.4) apasare.mutat = true;
  if (plasare && apasare.mutat) seteazaGhost(p.x, p.y);
});
cv.addEventListener('pointerup', e => {
  if (!apasare) return; const p = pozitie(e); const mutat = apasare.mutat; apasare = null;
  if (plasare) { seteazaGhost(p.x, p.y); return; }
  if (!mutat) atinge(p.x, p.y);
});
cv.addEventListener('pointercancel', () => { apasare = null; });

function atinge(x, y) {
  const c = cladireLa(Math.floor(x), Math.floor(y));
  if (!c) { selectat = null; inchideFoaie(); return; }
  if (def(c.tip).prod && c.nivel > 0) colecteaza(c, true);
  selectat = c.id; deschideCladire(c);
}

function colecteaza(c, tacut) {
  const d = def(c.tip); aseaza(c);
  const loc = capacitate(d.res) - S.res[d.res];
  const luat = Math.max(0, Math.min(Math.floor(c.acc), Math.floor(loc)));
  if (luat > 0) {
    S.res[d.res] += luat; c.acc -= luat;
    plutitoare.push({ x: c.x + d.size / 2, y: c.y, text: '+' + fmt(luat), res: d.res, t0: null });
    salveaza(); actualizeazaBara();
  } else if (c.acc >= 1) toast(d.res === 'lei' ? 'Vistieria e plină! Construiește sau îmbunătățește vistierii.' : 'Hambarul e plin! Construiește sau îmbunătățește hambare.', 'eroare');
  else if (!tacut) toast('Nu e nimic de strâns încă.');
  return luat;
}

// ------------------------------------------------------------ foaia de jos (panouri)
let ultimTitlu = '';
function deschideFoaie(titlu, html, cls = '') {
  const f = $('#foaie'); f.className = cls; $('.foaie-cap h2', f).textContent = titlu;
  const corp = $('.foaie-corp', f); const scroll = !f.hidden && ultimTitlu === titlu ? corp.scrollTop : 0;
  corp.innerHTML = html; f.hidden = false; corp.scrollTop = scroll; ultimTitlu = titlu;
  for (const c of $$('canvas[data-mini]', f)) deseneazaMini(c, c.dataset.mini, false);
  for (const c of $$('canvas[data-mini-osten]', f)) deseneazaMini(c, c.dataset.miniOsten, true);
  $$('#meniu button').forEach(b => b.classList.toggle('activ', foaie && b.dataset.nav === foaie.tip));
}
function inchideFoaie() {
  $('#foaie').hidden = true; foaie = null; selectat = null;
  if (plasare) plasare = null;
  $$('#meniu button').forEach(b => b.classList.remove('activ'));
}
$('#foaie .inchide').addEventListener('click', () => inchideFoaie());

function stat(et, val) { return `<div class="stat"><span>${et}</span><b>${val}</b></div>`; }
const pretTermina = c => Math.max(1, Math.ceil((c.upg.pana - acum()) / 60000));

function deschideCladire(c) {
  foaie = { tip: 'cladire', id: c.id, _titlu: def(c.tip).nume };
  const d = def(c.tip), n = c.nivel; const r = [];
  r.push(`<div class="cap-cladire"><canvas data-mini="${c.tip}"></canvas><div><p class="desc">${d.desc}</p><p class="nivel">${n > 0 ? 'Nivel ' + n + ' / ' + d.max : 'În construcție'}</p></div></div><div class="statistici">`);
  const nv = Math.max(1, n);
  r.push(stat('Viață', fmt(d.hp[nv - 1])));
  if (d.prod) { r.push(stat('Producție', `${cost(d.res, d.prod[nv - 1])}/oră`)); r.push(stat('Strâns', `<span data-acum="${c.id}">${fmt(acumulat(c))}</span> / ${fmt(d.cap[nv - 1])}`)); }
  if (d.stoc) r.push(stat('Depozit', c.tip === 'primarie' ? `${cost('lei', d.stoc[nv - 1])} ${cost('grau', d.stoc[nv - 1])}` : cost(d.res, d.stoc[nv - 1])));
  if (d.capacitate) r.push(stat('Armată', d.capacitate[nv - 1] + ' locuri'));
  if (d.dmg) { r.push(stat('Daune', d.dmg[nv - 1] + ' / lovitură')); r.push(stat('Rază', d.raza + ' pătrățele')); }
  r.push('</div>');
  if (c.upg) {
    const tot = d.timp[c.upg.la - 1] * 1000 || 1, p = Math.round(100 * (1 - (c.upg.pana - acum()) / tot));
    r.push(`<div class="progres"><div style="width:${p}%"></div></div>
      <p class="centru">${n === 0 ? 'Se construiește' : 'Se îmbunătățește la nivelul ' + c.upg.la} — gata în <b data-pana="${c.upg.pana}">${fmtTimp((c.upg.pana - acum()) / 1000)}</b></p>
      <button class="btn mare galben" data-act="termina" data-id="${c.id}">Termină acum<small>${ico('galbeni')}<span data-pret-termina="${c.id}">${pretTermina(c)}</span> galbeni</small></button>`);
  } else if (n < d.max) {
    if (n + 1 > nivelMaxPermis(c.tip)) r.push(`<p class="nota">Ridică Primăria la nivelul ${n + 1} ca să poți îmbunătăți mai departe.</p>`);
    else {
      const pret = d.pret[n], t = d.timp[n], ok = S.res[d.cost] >= pret;
      let extra = '';
      if (c.tip === 'primarie') {
        const noi = ORDINE_CONSTRUIRE.filter(x => LIMITE[x][n] > LIMITE[x][n - 1]).map(x => def(x).nume);
        extra = `<p class="nota">Nivelul ${n + 1} deblochează: ${noi.join(', ')} și niveluri mai mari pentru toate clădirile.</p>`;
      }
      if (c.tip === 'cazarma') { const nou = Object.values(OSTENI).find(o => o.cazarma === n + 1); extra = `<p class="nota">Nivelul ${n + 1}: ${d.capacitate[n]} locuri${nou ? ' și un oștean nou: <b>' + nou.nume + '</b>' : ''}.</p>`; }
      r.push(`${extra}<button class="btn mare ${ok ? 'verde' : 'gri'}" data-act="imbunatateste" data-id="${c.id}">Îmbunătățește la nivelul ${n + 1}<small>${cost(d.cost, pret)} · ${t ? fmtTimp(t) : 'pe loc'}</small></button>`);
    }
  } else r.push('<p class="nota centru">Nivel maxim atins. Bravo!</p>');
  const b = [];
  if (d.prod && n > 0) b.push(`<button class="btn" data-act="colecteaza" data-id="${c.id}">Strânge</button>`);
  if (c.tip === 'cazarma') b.push('<button class="btn" data-act="nav" data-nav="armata">Antrenează oșteni</button>');
  b.push(`<button class="btn" data-act="muta" data-id="${c.id}">Mută</button>`);
  r.push(`<div class="rand-butoane">${b.join('')}</div>`);
  deschideFoaie(`${d.nume}`, r.join(''));
}

async function imbunatateste(c) {
  const d = def(c.tip), n = c.nivel;
  if (c.upg || n >= d.max) return;
  if (n + 1 > nivelMaxPermis(c.tip)) return toast('Ridică întâi Primăria.', 'eroare');
  const pret = d.pret[n], t = d.timp[n];
  if (S.res[d.cost] < pret) return toast(`Îți lipsesc ${fmt(pret - S.res[d.cost])} ${NUME_RES[d.cost]}.`, 'eroare');
  if (t > 0 && mesteriOcupati() >= S.mesteri) return toast('Toți meșterii sunt ocupați. Așteaptă sau ia încă un meșter din Târg.', 'eroare');
  S.res[d.cost] -= pret;
  if (d.prod) aseaza(c);
  if (t <= 0) { c.nivel = n + 1; toast(`${d.nume} — nivel ${c.nivel}`, 'bun'); }
  else c.upg = { la: n + 1, pana: acum() + t * 1000 };
  salveaza(); actualizeazaBara(); deschideCladire(c);
}

async function terminaAcum(c) {
  if (!c.upg) return; const pret = pretTermina(c);
  if (J.galbeni < pret) { if (await confirma(`Îți trebuie ${pret} galbeni și ai ${fmt(J.galbeni)}. Vrei să ceri galbeni gratuit?`, 'Mergi la Târg', 'Nu')) deschideTarg(); return; }
  if (!await confirma(`Termini acum pentru ${ico('galbeni')}<b>${pret}</b> galbeni?`)) return;
  try { J.galbeni = await NET.cheltuie(pret, 'Grăbire: ' + def(c.tip).nume); c.upg.pana = acum(); proceseazaTimp(); actualizeazaBara(); }
  catch (e) { toast(e.message, 'eroare'); }
}

// ------------------------------------------------------------ construire & mutare
function deschideConstruieste() {
  foaie = { tip: 'construieste', _titlu: 'Construiește' };
  const th = nivPrimarie();
  const h = ORDINE_CONSTRUIRE.map(t => {
    const d = def(t), n = numar(t), l = limita(t), plin = n >= l;
    let urm = ''; if (plin) { const i = LIMITE[t].findIndex(v => v > n); if (i >= 0) urm = `Mai multe la Primăria nivel ${i + 1}`; else urm = 'Ai numărul maxim'; }
    return `<button class="card-cl ${plin ? 'blocat' : ''}" data-act="construieste" data-tip="${t}" ${plin ? 'disabled' : ''}>
      <canvas data-mini="${t}"></canvas>
      <div><b>${d.nume} <span class="nr">${n}/${l}</span></b><small>${d.desc}</small>
      ${plin ? `<em>${urm}</em>` : `<span class="pret">${cost(d.cost, d.pret[0])} · ${d.timp[0] ? fmtTimp(d.timp[0]) : 'pe loc'}</span>`}</div></button>`;
  }).join('');
  deschideFoaie('Construiește', `<p class="nota">Primăria nivel ${th} · Meșteri liberi: <b>${S.mesteri - mesteriOcupati()}/${S.mesteri}</b></p><div class="lista">${h}</div>`, 'inalta');
}

function locLiber(s) {
  let best = null, bd = 1e9;
  for (let y = 0; y <= GRID - s; y++) for (let x = 0; x <= GRID - s; x++) {
    if (!locValid(x, y, s)) continue; const d = Math.hypot(x + s / 2 - 10, y + s / 2 - 10);
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
    if (S.res[d.cost] < d.pret[0]) return toast(`Îți lipsesc ${fmt(d.pret[0] - S.res[d.cost])} ${NUME_RES[d.cost]}.`, 'eroare');
    if (d.timp[0] > 0 && mesteriOcupati() >= S.mesteri) return toast('Toți meșterii sunt ocupați.', 'eroare');
  }
  const c = mutaId ? gaseste(mutaId) : null;
  const pos = c ? { x: c.x, y: c.y } : (pozitie || locLiber(d.size));
  if (!pos) return toast('Nu mai e loc în sat!', 'eroare');
  plasare = { tip, mutaId, x: pos.x, y: pos.y }; selectat = null;
  arataPlasare();
}
function arataPlasare() {
  const d = def(plasare.tip), ok = locValid(plasare.x, plasare.y, d.size, plasare.mutaId);
  foaie = { tip: 'plasare', _titlu: 'plasare' };
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
function confirmaPlasare() {
  const p = plasare, d = def(p.tip);
  if (!locValid(p.x, p.y, d.size, p.mutaId)) return toast('Locul e ocupat.', 'eroare');
  if (p.mutaId) { const c = gaseste(p.mutaId); c.x = p.x; c.y = p.y; plasare = null; salveaza(); inchideFoaie(); toast(d.nume + ' a fost mutat.'); return; }
  if (numar(p.tip) >= limita(p.tip)) { plasare = null; inchideFoaie(); return toast('Ai numărul maxim.', 'eroare'); }
  if (S.res[d.cost] < d.pret[0]) return toast(`Îți lipsesc ${fmt(d.pret[0] - S.res[d.cost])} ${NUME_RES[d.cost]}.`, 'eroare');
  if (d.timp[0] > 0 && mesteriOcupati() >= S.mesteri) return toast('Toți meșterii sunt ocupați.', 'eroare');
  S.res[d.cost] -= d.pret[0];
  const c = { id: S.nextId++, tip: p.tip, nivel: 0, x: p.x, y: p.y, upg: null, acc: 0, last: acum() };
  if (d.timp[0] > 0) c.upg = { la: 1, pana: acum() + d.timp[0] * 1000 }; else c.nivel = 1;
  S.cladiri.push(c); salveaza(); actualizeazaBara();
  if (p.tip === 'zid' && numar('zid') < limita('zid') && S.res[d.cost] >= d.pret[0]) {
    const urm = locLiberLanga(p.x, p.y, 1); plasare = null;
    if (urm) { startPlasare('zid', null, urm); return; }
  }
  plasare = null; selectat = c.id; deschideCladire(c);
}

// ------------------------------------------------------------ armată
function deschideArmata() {
  foaie = { tip: 'armata', _titlu: 'Armata' };
  const caz = S.cladiri.find(c => c.tip === 'cazarma'); const nv = caz ? caz.nivel : 0;
  const cap = capArmata(), fol = locuriFolosite();
  const carduri = Object.entries(OSTENI).map(([t, o]) => {
    const desc = nv >= o.cazarma, n = S.armata[t] || 0;
    return `<div class="osten ${desc ? '' : 'blocat'}"><canvas data-mini-osten="${t}"></canvas>
      <div class="osten-info"><b>${o.nume} <span class="nr">×${n}</span></b><small>${o.desc}</small>
      <small class="mic">Viață ${o.hp} · Daune ${o.dmg} · Ocupă ${o.loc} ${o.loc === 1 ? 'loc' : 'locuri'} · ${fmtTimp(o.timp)}</small></div>
      ${desc ? `<div class="osten-btn"><button class="btn mic verde" data-act="antreneaza" data-tip="${t}" data-n="1">+1<small>${cost('grau', o.pret)}</small></button>
        <button class="btn mic" data-act="antreneaza" data-tip="${t}" data-n="5">+5</button></div>` : `<em>Cazarma nivel ${o.cazarma}</em>`}</div>`;
  }).join('');
  const coada = S.coada.length ? `<h3>Se antrenează</h3><ul class="coada">${S.coada.map((q, i) =>
    `<li><span>${OSTENI[q.tip].nume}</span><b data-pana="${q.pana}">${fmtTimp((q.pana - acum()) / 1000)}</b><button class="btn mic" data-act="anuleaza" data-i="${i}">✕</button></li>`).join('')}</ul>` : '';
  deschideFoaie('Armata', `<div class="bara-armata"><span>Locuri în tabără</span><b>${fol} / ${cap}</b><div class="progres"><div style="width:${cap ? Math.min(100, fol / cap * 100) : 0}%"></div></div></div>
    ${!nv ? '<p class="nota">Cazarma se construiește încă.</p>' : ''}<div class="lista">${carduri}</div>${coada}`, 'inalta');
}
function antreneaza(tip, n) {
  const o = OSTENI[tip]; let facuti = 0, motiv = '';
  for (let i = 0; i < n; i++) {
    if (locuriFolosite() + o.loc > capArmata()) { motiv = 'Tabăra e plină. Îmbunătățește Cazarma.'; break; }
    if (S.res.grau < o.pret) { motiv = 'Nu ai destul grâu.'; break; }
    S.res.grau -= o.pret;
    const start = Math.max(acum(), S.coada.length ? S.coada[S.coada.length - 1].pana : 0);
    S.coada.push({ tip, pana: start + o.timp * 1000 }); facuti++;
  }
  if (motiv) toast(motiv, 'eroare');
  if (facuti) { salveaza(); actualizeazaBara(); deschideArmata(); }
}
function anuleazaCoada(i) {
  const q = S.coada[i]; if (!q) return; const o = OSTENI[q.tip];
  S.coada.splice(i, 1); S.res.grau += o.pret;
  for (let j = i; j < S.coada.length; j++) S.coada[j].pana -= o.timp * 1000;
  salveaza(); actualizeazaBara(); deschideArmata();
}

// ------------------------------------------------------------ harta & atac
async function deschideHarta() {
  foaie = { tip: 'harta', _titlu: 'Harta României' };
  const cet = CETATI.map((c, i) => {
    const st = S.campanie[c.id] || 0, desc = Harta.cetateDeblocata(i, S.campanie);
    return `<div class="rand-cet ${desc ? '' : 'blocat'}"><div><b>${c.nume}</b><small>Putere ${c.th} · Pradă ${cost('lei', prazaCetate(c))} ${cost('grau', prazaCetate(c))}</small></div>
      <span class="stele">${[0, 1, 2].map(k => `<span class="${k < st ? 'plina' : ''}">★</span>`).join('')}</span>
      ${desc ? `<button class="btn mic rosu" data-act="cetate" data-id="${c.id}">Atacă</button>` : '<em>Blocată</em>'}</div>`;
  }).join('');
  deschideFoaie('Harta României', `<div class="harta-wrap">${Harta.svg(S.campanie, {})}</div>
    <button class="btn mare rosu" data-act="cauta">⚔ Caută un adversar</button>
    <div id="lista-regiune"></div>
    <h3>Cetățile țării</h3><p class="nota">Cucerește-le pe rând. Fiecare cetate cucerită o deblochează pe următoarea.</p><div class="lista">${cet}</div>`, 'inalta');
  try {
    const nr = await NET.regiuni();
    if (foaie && foaie.tip === 'harta') $('.harta-wrap').innerHTML = Harta.svg(S.campanie, nr);
  } catch (e) { /* fără net */ }
}
const prazaCetate = c => 250 + 350 * c.th * c.th;

async function arataRegiune(id) {
  const r = REGIUNI.find(x => x.id === id); const box = $('#lista-regiune'); if (!box) return;
  box.innerHTML = `<h3>${r.nume}</h3><p class="nota">Se încarcă…</p>`;
  try {
    const l = await NET.jucatoriRegiune(id);
    box.innerHTML = `<h3>Jucători din ${r.nume}</h3>` + (l.length ? '<div class="lista">' + l.map(p => {
      const eu = p.id === NET.idCurent(); const scut = p.scut_pana && Date.parse(p.scut_pana) > acum();
      return `<div class="rand-cet"><div><b>${esc(p.nume)}${eu ? ' (tu)' : ''}</b><small>${ico('trofeu')} ${fmt(p.trofee)}</small></div>
        ${eu ? '' : scut ? '<em>Are scut</em>' : `<button class="btn mic rosu" data-act="ataca-jucator" data-id="${p.id}">Atacă</button>`}</div>`;
    }).join('') + '</div>' : '<p class="nota">Încă nu e nimeni aici. Cheamă-ți prietenii!</p>');
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) { box.innerHTML = `<p class="eroare">${esc(e.message)}</p>`; }
}

function areArmata() {
  if (Object.values(S.armata).some(n => n > 0)) return true;
  confirma('Nu ai niciun oștean. Antrenezi acum?', 'La Cazarmă', 'Nu').then(v => { if (v) deschideArmata(); });
  return false;
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
    Lupta.start({ tip: 'jucator', aparatorId: o.id, nume: o.nume, sub: `${ico('trofeu')} ${fmt(o.trofee)} · ${(REGIUNI.find(r => r.id === o.regiune) || {}).nume || ''}`,
      cladiri: (o.state && o.state.cladiri) || [], loot: { lei: o.lei, grau: o.grau }, cautare: !tinta });
  } else {
    const th = Math.max(1, Math.min(6, nivPrimarie() + Math.floor(Math.random() * 3) - 1));
    const seed = (Math.random() * 1e9) | 0; const r = rng(seed);
    const baza = (300 + 700 * th * th) * (0.7 + r() * 0.6);
    Lupta.start({ tip: 'bot', nume: NUME_SATE[seed % NUME_SATE.length], sub: `Sat părăsit · putere ${th}${NET.demo ? '' : ' · nu sunt jucători liberi acum'}`,
      cladiri: genereazaSat(th, seed, false), loot: { lei: Math.round(baza), grau: Math.round(baza * (0.8 + r() * 0.4)) }, cautare: true });
  }
}
async function atacaCetate(id) {
  const i = CETATI.findIndex(c => c.id === id); const c = CETATI[i];
  if (!c || !Harta.cetateDeblocata(i, S.campanie)) return toast('Cucerește întâi cetatea de dinainte.', 'eroare');
  if (!areArmata()) return;
  inchideFoaie(); await salveazaAcum();
  Lupta.start({ tip: 'cetate', id: c.id, nume: c.nume, sub: `Cetate · putere ${c.th}`, cladiri: genereazaSat(c.th, hashText(c.id), true),
    loot: { lei: prazaCetate(c), grau: prazaCetate(c) }, cautare: false });
}

// apelate din lupta.js
const Joc = {
  stare: () => S,
  confirma,
  cautaAdversar: () => cautaAdversar(),
  consumaOsten(tip) { if (S.armata[tip] > 0) S.armata[tip]--; salveaza(); },
  async finalLupta({ opt, stele, procent, loot }) {
    let lei = loot.lei, grau = loot.grau, trofee = 0, extra = '';
    if (opt.tip === 'jucator') {
      const r = await NET.atac(opt.aparatorId, stele, procent, lei, grau);
      lei = r.lei; grau = r.grau; trofee = r.trofee; J.trofee = Math.max(0, J.trofee + trofee); J.scut_pana = null;
    }
    if (opt.tip === 'cetate') {
      const vechi = S.campanie[opt.id] || 0;
      if (stele > vechi) { S.campanie[opt.id] = stele; extra = stele >= 1 && vechi === 0 ? 'Cetate cucerită! Următoarea cetate s-a deblocat.' : 'Record nou de stele!'; }
    }
    const pl = adauga('lei', lei), pg = adauga('grau', grau);
    await salveazaAcum(); actualizeazaBara();
    return { lei: pl, grau: pg, lootLei: lei, lootGrau: grau, trofee, extra };
  },
  dupaLupta() { actualizeazaBara(); redimensioneaza(); },
};

// ------------------------------------------------------------ târg (galbeni)
function deschideTarg() {
  foaie = { tip: 'targ', _titlu: 'Târgul' };
  const pachete = PACHETE.map(p => `<button class="pachet" data-act="cere-pachet" data-id="${p.id}"><i class="ico galbeni mare"></i><b>${fmt(p.suma)}</b><span>${p.nume}</span><small>Gratuit</small></button>`).join('');
  const lipsaLei = Math.max(0, capacitate('lei') - S.res.lei), lipsaGrau = Math.max(0, capacitate('grau') - S.res.grau);
  const pretUmple = n => Math.max(1, Math.ceil(n / 50));
  const magazin = [];
  if (S.mesteri < MAX_MESTERI) magazin.push(['mester', 'Încă un meșter', `Construiești ${S.mesteri + 1} clădiri deodată.`, PRET_MESTER[S.mesteri]]);
  if (lipsaLei >= 1) magazin.push(['umple-lei', 'Umple vistieria', `+${fmt(lipsaLei)} lei`, pretUmple(lipsaLei)]);
  if (lipsaGrau >= 1) magazin.push(['umple-grau', 'Umple hambarul', `+${fmt(lipsaGrau)} grâu`, pretUmple(lipsaGrau)]);
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
      J.galbeni = await NET.cheltuie(pret, id === 'mester' ? 'Meșter nou' : id === 'umple-lei' ? 'Umple vistieria' : 'Umple hambarul');
      if (id === 'mester') { S.mesteri = Math.min(MAX_MESTERI, S.mesteri + 1); toast('Ai un meșter nou!', 'bun'); }
      if (id === 'umple-lei') S.res.lei = capacitate('lei');
      if (id === 'umple-grau') S.res.grau = capacitate('grau');
      await salveazaAcum();
    }
    actualizeazaBara(); deschideTarg();
  } catch (e) { toast(e.message, 'eroare'); }
}

// ------------------------------------------------------------ profil & clasament
async function deschideProfil() {
  foaie = { tip: 'profil', _titlu: 'Profil' };
  const reg = (REGIUNI.find(r => r.id === J.regiune) || {}).nume || '';
  const scut = J.scut_pana && Date.parse(J.scut_pana) > acum();
  const jurnal = S.jurnal.length ? '<ul class="cereri">' + S.jurnal.slice(0, 10).map(a => `<li><div><b>${esc(a.nume)}</b> <small>${'★'.repeat(a.stele) || '0 stele'} · ${a.procent}%</small>
     <small>Ai pierdut ${cost('lei', a.lei)} ${cost('grau', a.grau)}</small></div><span class="status ${a.stele ? 'respins' : 'aprobat'}">${a.stele ? 'Pierdută' : 'Apărat!'}</span></li>`).join('') + '</ul>'
    : '<p class="nota">Nimeni nu te-a atacat încă.</p>';
  deschideFoaie('Profil', `<div class="profil-cap"><div class="blazon">${esc(J.nume.slice(0, 1).toUpperCase())}</div>
      <div><b>${esc(J.nume)}</b><small>${reg} · Primăria nivel ${nivPrimarie()}</small><small>${ico('trofeu')} ${fmt(J.trofee)} trofee · ${scut ? 'Scut activ' : 'Fără scut'}</small></div></div>
    <h3>Clasamentul țării</h3><div id="clasament"><p class="nota">Se încarcă…</p></div>
    <h3>Apărări</h3>${jurnal}
    <h3>Pune jocul pe ecranul telefonului</h3>
    <p class="nota">Android (Chrome): meniul ⋮ → „Adaugă pe ecranul de pornire”.<br>iPhone (Safari): butonul Partajează → „Adaugă pe ecranul principal”.</p>
    <div class="rand-butoane">${NET.demo ? '<button class="btn rosu" data-act="reset-demo">Șterge progresul demo</button>' : '<button class="btn" data-act="iesi">Ieși din cont</button>'}</div>`, 'inalta');
  try {
    const l = await NET.clasament(); const box = $('#clasament'); if (!box) return;
    box.innerHTML = '<ol class="clasament">' + l.map((p, i) => `<li class="${p.id === NET.idCurent() ? 'eu' : ''}"><span class="loc">${i + 1}</span><b>${esc(p.nume)}</b>
      <small>${(REGIUNI.find(r => r.id === p.regiune) || {}).nume || ''}</small><span>${ico('trofeu')}${fmt(p.trofee)}</span></li>`).join('') + '</ol>';
  } catch (e) { const box = $('#clasament'); if (box) box.innerHTML = `<p class="eroare">${esc(e.message)}</p>`; }
}

// ------------------------------------------------------------ acțiuni (butoane)
$('#foaie').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const a = b.dataset.act, id = b.dataset.id, c = id ? gaseste(+id) : null;
  switch (a) {
    case 'imbunatateste': if (c) imbunatateste(c); break;
    case 'termina': if (c) terminaAcum(c); break;
    case 'colecteaza': if (c) colecteaza(c); break;
    case 'muta': if (c) startPlasare(c.tip, c.id); break;
    case 'construieste': startPlasare(b.dataset.tip); break;
    case 'plasare-da': confirmaPlasare(); break;
    case 'plasare-nu': plasare = null; inchideFoaie(); break;
    case 'antreneaza': antreneaza(b.dataset.tip, +b.dataset.n); break;
    case 'anuleaza': anuleazaCoada(+b.dataset.i); break;
    case 'nav': navigheaza(b.dataset.nav); break;
    case 'cauta': cautaAdversar(); break;
    case 'cetate': atacaCetate(id); break;
    case 'regiune': arataRegiune(id); break;
    case 'ataca-jucator': cautaAdversar(id); break;
    case 'cere-pachet': { const p = PACHETE.find(x => x.id === id); if (p) cereGalbeni(p.suma, '', p.nume); break; }
    case 'cere-suma': cereGalbeni(parseInt($('#c-suma').value, 10), $('#c-motiv').value.trim(), ''); break;
    case 'cumpara': cumpara(id, +b.dataset.pret); break;
    case 'iesi': confirma('Ieși din cont?').then(async v => { if (v) { await salveazaAcum(); await NET.iesi(); location.reload(); } }); break;
    case 'reset-demo': confirma('Ștergi tot progresul din modul demo?', 'Șterge', 'Nu').then(v => { if (v) { NET.resetDemo(); location.reload(); } }); break;
  }
});

function navigheaza(n) {
  if (plasare) plasare = null;
  if (foaie && foaie.tip === n) return inchideFoaie();
  selectat = null;
  ({ construieste: deschideConstruieste, armata: deschideArmata, harta: deschideHarta, targ: deschideTarg, profil: deschideProfil })[n]();
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
