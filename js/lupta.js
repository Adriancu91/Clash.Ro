'use strict';
// ====================================================================
//  LUPTA (v2): oșteni de pământ și din aer, stropire, capcane ascunse,
//  vrăji, eroi cu abilități, apărători din Cetatea Clanului.
// ====================================================================

const Lupta = (() => {
  const DURATA = 180;
  const PAS = 1 / 30;
  let L = null, cv, g, T = 12, W = 360, raf = 0, ultim = 0, acc = 0, nid = 1;
  const el = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b, x, y) => Math.hypot(a - x, b - y);
  const centru = b => [b.x + b.size / 2, b.y + b.size / 2];

  function curataCladiri(lista) {
    const ok = [];
    for (const c of lista || []) {
      const d = CLADIRI[c && c.tip]; if (!d) continue;
      const n = c.nivel | 0; if (n < 1) continue;
      const x = c.x | 0, y = c.y | 0; if (x < 0 || y < 0 || x + d.size > GRID || y + d.size > GRID) continue;
      ok.push({ tip: c.tip, nivel: Math.min(n, d.max), x, y });
    }
    return ok;
  }
  const curataTrupe = l => (Array.isArray(l) ? l : []).filter(t => t && OSTENI[t.tip] && !OSTENI[t.tip].ascuns).map(t => ({ tip: t.tip, nivel: clamp(t.nivel | 0 || 1, 1, OSTENI[t.tip].max) })).slice(0, 60);

  // ---------------------------------------------------------------- start
  function start(opt) {
    cv = el('lc'); g = cv.getContext('2d');
    const toate = curataCladiri(opt.cladiri);
    const cladiri = [], capcane = [];
    for (const c of toate) {
      const d = CLADIRI[c.tip];
      if (d.capcana) capcane.push({ ...c, size: 1, folosita: false });
      else cladiri.push({ ...c, size: d.size, hp: d.hp[c.nivel - 1], max: d.hp[c.nivel - 1], dead: false, cd: 0.5, unghi: null, ingheata: 0, focTinta: null, focT: 0 });
    }
    const zidLa = new Map(); for (const b of cladiri) if (b.tip === 'zid') zidLa.set(b.y * GRID + b.x, b);
    const S = Joc.stare();
    L = {
      opt, cladiri, capcane, zidLa, unitati: [], aparatori: [], vraji: [], proiectile: [], efecte: [], t: 0,
      timp: DURATA, start: false, terminat: false, inchis: false,
      rest: { ...S.armata }, restVraji: { ...(S.vraji || {}) },
      eroi: Joc.eroiDisponibili(), eroiTrimisi: {}, cetate: Joc.cetateMea(), cetateTrimisa: false,
      sel: null, procent: 0, stele: 0, primarie: false,
      total: Math.max(1, cladiri.filter(b => b.tip !== 'zid').length), distruse: 0,
      apasat: null, flash: 0, mesaj: '', mesajT: 0, infoVechi: '',
      cetateAparare: curataTrupe(opt.cetateAparare), cetateDeclansata: false,
      folositeVraji: {}, folositCetate: false,
    };
    // eroii apărătorului
    for (const e of opt.eroiAparare || []) {
      const altar = cladiri.find(b => CLADIRI[b.tip].erou === e.e);
      if (!altar || !EROI[e.e]) continue;
      const [ax, ay] = centru(altar); const n = clamp(e.nivel | 0 || 1, 1, 40);
      L.aparatori.push(unitate('erou:' + e.e, ax, ay + 1.5, n, true, { erou: e.e, garda: { x: ax, y: ay, r: 5 } }));
      altar.erouPlecat = true;
    }
    L.sel = primaSelectie();
    el('l-nume').textContent = opt.nume;
    el('l-sub').innerHTML = opt.sub || '';
    const lt = opt.loot || {};
    el('l-loot-disp').innerHTML = opt.razboi ? 'Război: fără pradă — lupți pentru stelele clanului.' : `Pradă posibilă: <i class="ico lei"></i>${fmt(lt.lei)} <i class="ico grau"></i>${fmt(lt.grau)}${lt.sare ? ` <i class="ico sare"></i>${fmt(lt.sare)}` : ''}`;
    el('l-rezultat').hidden = true;
    el('l-iesi').hidden = false; el('l-urmator').hidden = !opt.cautare; el('l-termina').hidden = true;
    el('lupta').hidden = false;
    redim(); randeazaPaleta(); actualizeazaInfo(true); leaga();
    ultim = performance.now(); acc = 0;
    cancelAnimationFrame(raf); raf = requestAnimationFrame(bucla);
  }

  function primaSelectie() {
    const t = Object.keys(L.rest).find(k => L.rest[k] > 0 && OSTENI[k]); if (t) return 't:' + t;
    const e = L.eroi.find(e => !L.eroiTrimisi[e.e]); if (e) return 'e:' + e.e;
    if (L.cetate.length && !L.cetateTrimisa) return 'c:cetate';
    const v = Object.keys(L.restVraji).find(k => L.restVraji[k] > 0); if (v) return 'v:' + v;
    return null;
  }

  // creează un luptător (oștean sau erou)
  function unitate(tip, x, y, nivel, inamic, extra = {}) {
    let d, hp, dps;
    if (tip.startsWith('erou:')) {
      const e = tip.slice(5); d = { ...EROI[e], loc: 0, tinta: 'oricare' }; hp = erouHp(e, nivel); dps = erouDps(e, nivel);
    } else { d = OSTENI[tip]; hp = Math.round(d.hp * multNivel(nivel)); dps = d.dps * multNivel(nivel); }
    return {
      id: nid++, tip, d, nivel, x, y, hp, max: hp, dmg: dps * d.interval, cd: 0.3 + Math.random() * 0.3,
      tinta: null, zid: null, dead: false, dir: 0, lovit: 0, aer: !!d.aer, inamic: !!inamic,
      furie: 1, invizibilPana: 0, bonusPana: 0, bonusMult: 1, chemaCd: 4, ...extra,
    };
  }

  function redim() {
    const sc = el('l-scena');
    const disp = window.innerHeight - el('l-sus').offsetHeight - el('l-info').offsetHeight - el('l-osteni').offsetHeight - el('l-butoane').offsetHeight - el('l-loot-disp').offsetHeight - 20;
    W = Math.max(240, Math.min(sc.clientWidth - 8, 620, disp)); T = W / GRID;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(W * dpr); cv.height = Math.round(W * dpr); cv.style.width = W + 'px'; cv.style.height = W + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  let legat = false;
  function leaga() {
    if (legat) return; legat = true;
    const poz = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / T, y: (e.clientY - r.top) / T }; };
    cv.addEventListener('pointerdown', e => {
      if (!L || L.terminat) return; e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (_) { /* */ }
      const p = poz(e); L.apasat = { x: p.x, y: p.y, ultim: performance.now() }; trimite();
    });
    cv.addEventListener('pointermove', e => { if (L && L.apasat) { const p = poz(e); L.apasat.x = p.x; L.apasat.y = p.y; } });
    const sus = () => { if (L) L.apasat = null; };
    cv.addEventListener('pointerup', sus); cv.addEventListener('pointercancel', sus); cv.addEventListener('pointerleave', sus);
    el('l-osteni').addEventListener('click', e => {
      const b = e.target.closest('[data-sel]'); if (!b || !L) return;
      const s = b.dataset.sel;
      if (s.startsWith('e:') && L.eroiTrimisi[s.slice(2)]) return abilitate(s.slice(2));
      L.sel = s; randeazaPaleta();
    });
    el('l-iesi').addEventListener('click', () => inchide());
    el('l-urmator').addEventListener('click', () => { inchide(); Joc.cautaAdversar(); });
    el('l-termina').addEventListener('click', async () => { if (L && !L.terminat && await Joc.confirma('Termini lupta acum?')) termina(); });
    el('l-inapoi').addEventListener('click', () => inchide());
    window.addEventListener('resize', () => { if (L && !L.inchis) redim(); });
  }

  function randeazaPaleta() {
    const S = Joc.stare(); const b = [];
    for (const t of OSTENI_ANTRENABILI) {
      const n = L.rest[t] || 0; if (!n && !(S.armata[t] > 0) && !L.unitati.some(u => u.tip === t)) continue;
      b.push(`<button class="l-osten ${L.sel === 't:' + t ? 'activ' : ''} ${n ? '' : 'gol'}" data-sel="t:${t}"><canvas data-mini="${t}" data-fel="osten"></canvas><b>×${n}</b><small>${OSTENI[t].nume}</small><i class="niv">${Joc.nivelOsten(t)}</i></button>`);
    }
    for (const e of L.eroi) {
      const trimis = L.eroiTrimisi[e.e]; const u = trimis && L.unitati.find(x => x.id === trimis);
      const poateAb = trimis && u && !u.dead && !u.abFolosita && e.nivel >= EROI[e.e].abilitateDe;
      b.push(`<button class="l-osten erou ${L.sel === 'e:' + e.e ? 'activ' : ''} ${trimis && !poateAb ? 'gol' : ''} ${poateAb ? 'abilitate' : ''}" data-sel="e:${e.e}"><canvas data-mini="${e.e}" data-fel="erou"></canvas><b>${poateAb ? '⚡' : trimis ? '' : '×1'}</b><small>${poateAb ? 'Abilitate!' : EROI[e.e].nume.split(' ')[0]}</small><i class="niv">${e.nivel}</i></button>`);
    }
    if (L.cetate.length) b.push(`<button class="l-osten ${L.sel === 'c:cetate' ? 'activ' : ''} ${L.cetateTrimisa ? 'gol' : ''}" data-sel="c:cetate"><canvas data-mini="cetateClan" data-fel="cladire"></canvas><b>×${L.cetateTrimisa ? 0 : L.cetate.length}</b><small>Cetatea</small></button>`);
    for (const v of Object.keys(VRAJI)) {
      const n = L.restVraji[v] || 0; if (!n && !(S.vraji && S.vraji[v] > 0) && !L.folositeVraji[v]) continue;
      b.push(`<button class="l-osten vraja ${L.sel === 'v:' + v ? 'activ' : ''} ${n ? '' : 'gol'}" data-sel="v:${v}"><canvas data-mini="${v}" data-fel="vraja"></canvas><b>×${n}</b><small>${VRAJI[v].nume}</small></button>`);
    }
    el('l-osteni').innerHTML = b.join('') || '<p class="nota">Nu ai oșteni. Antrenează din Armată.</p>';
    for (const c of el('l-osteni').querySelectorAll('canvas')) deseneazaMini(c, c.dataset.mini, c.dataset.fel === 'cladire' ? false : c.dataset.fel === 'osten' ? true : c.dataset.fel);
  }

  function permis(x, y) {
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return false;
    for (const b of L.cladiri) {
      if (b.dead) continue;
      if (x >= b.x - 1 && x < b.x + b.size + 1 && y >= b.y - 1 && y < b.y + b.size + 1) return false;
    }
    return true;
  }
  function spune(m) { L.mesaj = m; L.mesajT = 1.6; }
  function incepe() {
    if (L.start) return; L.start = true;
    el('l-iesi').hidden = true; el('l-urmator').hidden = true; el('l-termina').hidden = false;
  }

  function trimite() {
    if (!L || L.terminat || !L.apasat || !L.sel) { if (L && !L.sel) spune('Nu mai ai nimic de trimis'); return; }
    const [fel, tip] = L.sel.split(':'); const { x, y } = L.apasat;
    if (fel === 'v') {
      if (!(L.restVraji[tip] > 0)) return spune('Nu mai ai această vrajă');
      if (performance.now() - (L.ultimaVraja || 0) < 350) return; L.ultimaVraja = performance.now();
      aruncaVraja(tip, x, y); L.restVraji[tip]--; L.folositeVraji[tip] = (L.folositeVraji[tip] || 0) + 1; Joc.consumaVraja(tip);
      L.apasat = null; incepe(); if (!(L.restVraji[tip] > 0)) L.sel = primaSelectie(); randeazaPaleta(); return;
    }
    if (!permis(x, y)) { L.flash = 1; spune('Nu poți trimite în zona roșie'); return; }
    if (fel === 't') {
      if (!(L.rest[tip] > 0)) { spune(`Nu mai ai ${OSTENI[tip].nume}`); return; }
      L.unitati.push(unitate(tip, x + (Math.random() - 0.5) * 0.3, y + (Math.random() - 0.5) * 0.3, Joc.nivelOsten(tip), false));
      L.rest[tip]--; Joc.consumaOsten(tip);
      if (!(L.rest[tip] > 0)) L.sel = primaSelectie();
    } else if (fel === 'e') {
      const e = L.eroi.find(z => z.e === tip); if (!e || L.eroiTrimisi[tip]) return;
      const u = unitate('erou:' + tip, x, y, e.nivel, false, { erou: tip }); L.unitati.push(u); L.eroiTrimisi[tip] = u.id; L.apasat = null;
      L.sel = primaSelectie();
    } else if (fel === 'c') {
      if (L.cetateTrimisa) return;
      L.cetate.forEach((t, i) => L.unitati.push(unitate(t.tip, x + Math.cos(i) * 0.4, y + Math.sin(i) * 0.4, t.nivel, false)));
      L.cetateTrimisa = true; L.folositCetate = true; L.apasat = null; L.sel = primaSelectie();
    }
    incepe(); randeazaPaleta();
  }

  function aruncaVraja(tip, x, y) {
    const v = VRAJI[tip]; const n = Joc.nivelVraja(tip);
    L.efecte.push({ x, y, t: 0, dur: 0.6, r: v.raza, cul: v.culoare, cerc: true });
    if (tip === 'fulger') {
      for (const b of L.cladiri) {
        if (b.dead) continue;
        const dx = Math.max(b.x - x, 0, x - (b.x + b.size)), dy = Math.max(b.y - y, 0, y - (b.y + b.size));
        if (Math.hypot(dx, dy) <= v.raza) loveste(b, v.dmg[n - 1]);
      }
      L.efecte.push({ x, y, t: 0, dur: 0.35, fulger: true });
      return;
    }
    const durata = Array.isArray(v.durata) ? v.durata[n - 1] : v.durata;
    if (tip === 'inghet') {
      for (const b of L.cladiri) { const [cx, cy] = centru(b); if (!b.dead && dist(cx, cy, x, y) <= v.raza + b.size / 2) b.ingheata = L.t + durata; }
      for (const u of L.aparatori) if (!u.dead && dist(u.x, u.y, x, y) <= v.raza) u.ingheata = L.t + durata;
    }
    L.vraji.push({ tip, x, y, raza: v.raza, pana: L.t + durata, n, cul: v.culoare });
  }

  function abilitate(e) {
    const id = L.eroiTrimisi[e]; const u = L.unitati.find(x => x.id === id);
    const niv = (L.eroi.find(z => z.e === e) || {}).nivel || 1;
    if (!u || u.dead || u.abFolosita || niv < EROI[e].abilitateDe) return;
    u.abFolosita = true; const k = 2 + Math.floor(niv / 5) * 2;
    if (e === 'voievod') { u.hp = Math.min(u.max, u.hp + u.max * 0.35); u.bonusPana = L.t + 10; u.bonusMult = 1.6; spune('Furia Voievodului!'); }
    else { u.invizibilPana = L.t + 4; u.bonusPana = L.t + 4; u.bonusMult = 2.5; spune('Vălul Domniței!'); }
    for (let i = 0; i < k; i++) L.unitati.push(unitate(EROI[e].cheama, u.x + Math.cos(i * 1.3) * 0.7, u.y + Math.sin(i * 1.3) * 0.7, Joc.nivelOsten(EROI[e].cheama), false));
    L.efecte.push({ x: u.x, y: u.y, t: 0, dur: 0.8, r: 1.6, cul: '#FCD116', cerc: true });
    randeazaPaleta();
  }

  // ---------------------------------------------------------------- simulare
  function distRect(x, y, b) {
    const dx = Math.max(b.x - x, 0, x - (b.x + b.size)), dy = Math.max(b.y - y, 0, y - (b.y + b.size));
    return Math.hypot(dx, dy);
  }
  function inVraja(tip, x, y) { return L.vraji.find(v => v.tip === tip && v.pana > L.t && dist(v.x, v.y, x, y) <= v.raza); }

  function alegeTinta(u) {
    const tinta = u.d.tinta;
    if (tinta === 'ziduri') {
      let best = null, bd = 1e9;
      for (const b of L.cladiri) if (!b.dead && b.tip === 'zid') { const d = distRect(u.x, u.y, b); if (d < bd) { bd = d; best = b; } }
      if (best) return best;
    }
    let cand = L.cladiri.filter(b => !b.dead && b.tip !== 'zid');
    if (TINTE[tinta]) { const p = cand.filter(b => TINTE[tinta].includes(b.tip)); if (p.length) cand = p; }
    let best = null, bd = 1e9;
    for (const b of cand) { const d = distRect(u.x, u.y, b); if (d < bd) { bd = d; best = b; } }
    return best;
  }

  function loveste(b, dmg) {
    if (b.dead) return;
    b.hp -= dmg;
    if (b.hp <= 0) {
      b.dead = true; b.hp = 0;
      L.efecte.push({ x: b.x + b.size / 2, y: b.y + b.size / 2, t: 0, dur: 0.7, r: b.size * 0.7 });
      if (b.tip !== 'zid') {
        L.distruse++; L.procent = Math.floor(L.distruse / L.total * 100);
        if (b.tip === 'primarie') L.primarie = true;
        L.stele = (L.procent >= 50 ? 1 : 0) + (L.primarie ? 1 : 0) + (L.procent >= 100 ? 1 : 0);
      }
    }
  }
  function lovesteZonaCladiri(x, y, r, dmg, siZiduri) {
    for (const b of L.cladiri) {
      if (b.dead || (b.tip === 'zid' && !siZiduri)) continue;
      if (distRect(x, y, b) <= r) loveste(b, dmg);
    }
  }
  function lovesteUnitate(u, dmg) {
    if (u.dead) return;
    u.hp -= dmg;
    if (u.hp <= 0) moare(u);
  }
  function moare(u) {
    if (u.dead) return; u.dead = true;
    L.efecte.push({ x: u.x, y: u.y, t: 0, dur: 0.5, r: 0.35, osten: true });
    if (u.d.seRupe) for (let i = 0; i < 2; i++) (u.inamic ? L.aparatori : L.unitati).push(unitate(u.d.seRupe, u.x + (i ? 0.5 : -0.5), u.y, u.nivel, u.inamic));
    if (u.tip === 'aerostat' && !u.inamic) lovesteZonaCladiri(u.x, u.y, 0.8, u.dmg, false);
  }

  function pasUnitate(u, dt) {
    const d = u.d;
    if (u.lovit > 0) u.lovit -= dt;
    if (u.ingheata && u.ingheata > L.t) return;
    const furie = inVraja('furie', u.x, u.y);
    const mult = (furie ? VRAJI.furie.bonus[furie.n - 1] : 1) * (u.bonusPana > L.t ? u.bonusMult : 1);
    const viteza = d.viteza * (furie ? 1.3 : 1);
    const vind = inVraja('vindecare', u.x, u.y);
    if (vind && !u.aer) u.hp = Math.min(u.max, u.hp + VRAJI.vindecare.vindecaTotal[vind.n - 1] / VRAJI.vindecare.durata * dt);

    // zâna: vindecă oștenii de pe pământ
    if (d.vindecator) {
      let best = null, bd = 1e9;
      for (const o of L.unitati) if (!o.dead && !o.aer && o !== u && o.hp < o.max) { const dd = dist(u.x, u.y, o.x, o.y); if (dd < bd) { bd = dd; best = o; } }
      if (!best) best = L.unitati.find(o => !o.dead && !o.aer && o !== u);
      if (!best) return;
      if (bd > d.raza) misca(u, best.x, best.y, viteza * dt, true);
      else { u.cd -= dt; if (u.cd <= 0) { u.cd = d.interval; for (const o of L.unitati) if (!o.dead && !o.aer && dist(o.x, o.y, best.x, best.y) < 1.5) o.hp = Math.min(o.max, o.hp + u.dmg * multNivel(1)); L.efecte.push({ x: best.x, y: best.y, t: 0, dur: 0.3, r: 0.6, cul: '#f2e6a6', cerc: true }); } }
      return;
    }
    // Baba Cloanța cheamă oseminte
    if (d.cheama && !u.inamic) {
      u.chemaCd -= dt;
      if (u.chemaCd <= 0) { u.chemaCd = 7; const vii = L.unitati.filter(o => o.parinte === u.id && !o.dead).length;
        for (let i = 0; i < Math.min(3, 9 - vii); i++) L.unitati.push(unitate('os', u.x + Math.cos(i * 2.1) * 0.6, u.y + Math.sin(i * 2.1) * 0.6, 1, false, { parinte: u.id })); }
    }

    // apărătorii din cetate îi atacă — ne apărăm întâi
    let tinta = null, esteUnitate = false;
    const adversari = u.inamic ? L.unitati : L.aparatori;
    let bu = null, bud = 1e9;
    for (const a of adversari) {
      if (a.dead || (a.invizibilPana > L.t)) continue;
      if (a.aer && !u.aer && d.raza < 1 && !u.inamic) continue;
      if (a.aer && !u.aer && d.raza < 1) continue;
      const dd = dist(u.x, u.y, a.x, a.y); if (dd < bud) { bud = dd; bu = a; }
    }
    if (u.inamic) {
      if (u.garda && bu && dist(bu.x, bu.y, u.garda.x, u.garda.y) > u.garda.r + 2) bu = null;
      if (!bu) { if (u.garda) misca(u, u.garda.x, u.garda.y + 1.5, viteza * dt, true); return; }
      tinta = bu; esteUnitate = true;
    } else if (bu && bud < Math.max(d.raza, 1) + 1.2) { tinta = bu; esteUnitate = true; }

    if (!tinta) {
      if (u.zid && u.zid.dead) u.zid = null;
      if (!u.tinta || u.tinta.dead) { u.tinta = alegeTinta(u); u.zid = null; }
      if (!u.tinta) return;
      tinta = u.zid || u.tinta;
    }
    const tx = esteUnitate ? tinta.x : tinta.x + tinta.size / 2, ty = esteUnitate ? tinta.y : tinta.y + tinta.size / 2;
    const dd = esteUnitate ? dist(u.x, u.y, tinta.x, tinta.y) : distRect(u.x, u.y, tinta);
    if (dd <= d.raza + (esteUnitate ? 0.3 : 0)) {
      u.dir = Math.atan2(ty - u.y, tx - u.x);
      u.cd -= dt;
      if (u.cd <= 0) {
        u.cd = d.interval; u.lovit = 0.12; const dmg = u.dmg * mult;
        if (d.raza > 1) L.proiectile.push({ x1: u.x, y1: u.y - (u.aer ? 0.45 : 0), x2: tx, y2: ty, t: 0, dur: 0.25, tip: d.stropire ? 'foc' : 'sageata' });
        if (esteUnitate) {
          if (d.stropire) { for (const a of adversari) if (!a.dead && dist(a.x, a.y, tx, ty) <= d.stropire) lovesteUnitate(a, dmg); }
          else lovesteUnitate(tinta, dmg);
        } else if (d.kamikaze) {
          lovesteZonaCladiri(u.x, u.y, d.stropire, dmg * d.kamikaze, true); L.efecte.push({ x: u.x, y: u.y, t: 0, dur: 0.5, r: d.stropire }); moare(u);
        } else if (d.stropire) {
          const [sx, sy] = d.inJur ? [u.x, u.y] : [tx, ty];
          lovesteZonaCladiri(sx, sy, d.stropire + (d.inJur ? 0 : 0), dmg, false);
          if (tinta.tip === 'zid') loveste(tinta, dmg);
        } else {
          loveste(tinta, dmg * (d.dubluResurse && TINTE.resurse.includes(tinta.tip) ? 2 : 1));
        }
      }
    } else {
      misca(u, esteUnitate ? tinta.x : clamp(u.x, tinta.x, tinta.x + tinta.size), esteUnitate ? tinta.y : clamp(u.y, tinta.y, tinta.y + tinta.size), viteza * dt, false, tinta);
    }
  }

  function misca(u, px, py, pas, liber, tinta) {
    const dx = px - u.x, dy = py - u.y, len = Math.hypot(dx, dy) || 1;
    const step = Math.min(len, pas);
    const nx = u.x + dx / len * step, ny = u.y + dy / len * step;
    u.dir = Math.atan2(dy, dx);
    if (!liber && !u.aer && !u.inamic && !u.d.sarePesteZid && !inVraja('saritura', u.x, u.y)) {
      const tx = Math.floor(nx), ty = Math.floor(ny);
      const z = L.zidLa.get(ty * GRID + tx);
      if (z && !z.dead && z !== tinta && !(Math.floor(u.x) === tx && Math.floor(u.y) === ty)) { u.zid = z; return; }
    }
    u.x = clamp(nx, 0, GRID - 0.01); u.y = clamp(ny, 0, GRID - 0.01);
  }

  function pasAparare(b, dt) {
    const d = CLADIRI[b.tip];
    if (b.ingheata > L.t) return;
    b.cd -= dt; if (b.cd > 0) return;
    const [cx, cy] = centru(b);
    let best = null, bd = d.raza;
    for (const u of L.unitati) {
      if (u.dead || u.invizibilPana > L.t) continue;
      if (d.tinte === 'sol' && u.aer) continue;
      if (d.tinte === 'aer' && !u.aer) continue;
      const dd = Math.hypot(u.x - cx, u.y - cy);
      if (d.razaMin && dd < d.razaMin) continue;
      if (dd <= bd) { bd = dd; best = u; }
    }
    if (!best) { b.cd = 0.1; b.focTinta = null; return; }
    b.cd = d.interval; b.unghi = Math.atan2(best.y - cy, best.x - cx);
    let dmg = d.dps[b.nivel - 1] * d.interval;
    if (d.crestere) {
      if (b.focTinta === best.id) b.focT += d.interval; else { b.focTinta = best.id; b.focT = 0; }
      const k = Math.min(1, b.focT / 5); dmg = (d.dps[b.nivel - 1] + (d.dpsMax[b.nivel - 1] - d.dps[b.nivel - 1]) * k) * d.interval;
      L.proiectile.push({ x1: cx, y1: cy, x2: best.x, y2: best.y - (best.aer ? 0.45 : 0), t: 0, dur: d.interval, tip: 'raza' });
    } else {
      L.proiectile.push({ x1: cx, y1: cy, x2: best.x, y2: best.y - (best.aer ? 0.45 : 0), t: 0, dur: b.tip === 'mortier' ? 0.9 : 0.22, tip: b.tip === 'tun' || b.tip === 'mortier' ? 'ghiulea' : b.tip === 'turnSolomonar' ? 'foc' : 'sageata' });
    }
    if (d.stropire) {
      for (const u of L.unitati) {
        if (u.dead) continue; if (d.tinte === 'sol' && u.aer) continue; if (d.tinte === 'aer' && !u.aer) continue;
        if (dist(u.x, u.y, best.x, best.y) <= d.stropire) lovesteUnitate(u, dmg);
      }
      L.efecte.push({ x: best.x, y: best.y, t: 0, dur: 0.4, r: d.stropire * 0.8, cul: b.tip === 'mortier' ? '#6b5a48' : '#f2a03a', cerc: true });
    } else lovesteUnitate(best, dmg);
  }

  function pasCapcane() {
    for (const c of L.capcane) {
      if (c.folosita) continue;
      const d = CLADIRI[c.tip]; const cx = c.x + 0.5, cy = c.y + 0.5;
      const declansata = L.unitati.some(u => !u.dead && (d.tinte === 'aer' ? u.aer : !u.aer) && dist(u.x, u.y, cx, cy) <= d.declansare);
      if (!declansata) continue;
      c.folosita = true;
      if (c.tip === 'tepi') {
        let loc = d.capacitate[c.nivel - 1];
        const vict = L.unitati.filter(u => !u.dead && !u.aer && !u.erou && dist(u.x, u.y, cx, cy) <= 0.9).sort((a, b) => dist(a.x, a.y, cx, cy) - dist(b.x, b.y, cx, cy));
        for (const u of vict) { const l = u.d.loc || 1; if (l > loc) continue; loc -= l; moare(u); }
        L.efecte.push({ x: cx, y: cy, t: 0, dur: 0.6, r: 0.8, cul: '#8a6a40', cerc: true });
      } else {
        for (const u of L.unitati) if (!u.dead && (d.tinte === 'aer' ? u.aer : !u.aer) && dist(u.x, u.y, cx, cy) <= d.stropire) lovesteUnitate(u, d.dmg[c.nivel - 1]);
        L.efecte.push({ x: cx, y: cy, t: 0, dur: 0.6, r: d.stropire, cul: d.tinte === 'aer' ? '#9fe8ff' : '#f29d0c', cerc: true });
      }
    }
  }

  function pas(dt) {
    L.t += dt; L.timp -= dt;
    // apărătorii din cetate ies când se apropie cineva
    if (!L.cetateDeclansata && L.cetateAparare.length) {
      const cc = L.cladiri.find(b => b.tip === 'cetateClan');
      if (cc) {
        const [cx, cy] = centru(cc);
        if (L.unitati.some(u => !u.dead && dist(u.x, u.y, cx, cy) < 6)) {
          L.cetateDeclansata = true; spune('Ies apărătorii din cetate!');
          L.cetateAparare.forEach((t, i) => L.aparatori.push(unitate(t.tip, cx + Math.cos(i) * 0.8, cy + Math.sin(i) * 0.8 + 1, t.nivel, true)));
        }
      }
    }
    for (const u of L.unitati) if (!u.dead) pasUnitate(u, dt);
    for (const a of L.aparatori) if (!a.dead) pasUnitate(a, dt);
    for (const b of L.cladiri) if (!b.dead && CLADIRI[b.tip].aparare) pasAparare(b, dt);
    pasCapcane();
    for (const p of L.proiectile) p.t += dt;
    L.proiectile = L.proiectile.filter(p => p.t < p.dur);
    for (const e of L.efecte) e.t += dt;
    L.efecte = L.efecte.filter(e => e.t < e.dur);
    L.vraji = L.vraji.filter(v => v.pana > L.t);
    if (L.unitati.length > 120) L.unitati = L.unitati.filter(u => !u.dead || Object.values(L.eroiTrimisi).includes(u.id));
    if (L.aparatori.length > 60) L.aparatori = L.aparatori.filter(u => !u.dead);

    const vii = L.unitati.some(u => !u.dead);
    const ramase = Object.values(L.rest).some(n => n > 0) || L.eroi.some(e => !L.eroiTrimisi[e.e]) || (L.cetate.length && !L.cetateTrimisa);
    if (L.timp <= 0 || L.procent >= 100 || (!vii && !ramase)) termina();
  }

  function bucla(t) {
    if (!L || L.inchis) return;
    const dt = Math.min(0.1, (t - ultim) / 1000); ultim = t;
    if (L.apasat && t - L.apasat.ultim > 140) { L.apasat.ultim = t; trimite(); }
    if (L.flash > 0) L.flash -= dt * 1.5;
    if (L.mesajT > 0) L.mesajT -= dt;
    if (L.start && !L.terminat) { acc += dt; let n = 0; while (acc >= PAS && !L.terminat && n++ < 6) { pas(PAS); acc -= PAS; } if (n >= 6) acc = 0; }
    deseneaza(t); actualizeazaInfo();
    raf = requestAnimationFrame(bucla);
  }

  // ---------------------------------------------------------------- desen
  function deseneaza(t) {
    g.clearRect(0, 0, W, W);
    deseneazaTeren(g, T, true);
    if (!L.terminat) {
      const a = 0.12 + Math.max(0, L.flash) * 0.3;
      g.fillStyle = `rgba(206,17,38,${a})`;
      for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (!permis(x + 0.5, y + 0.5)) g.fillRect(x * T, y * T, T + 0.5, T + 0.5);
    }
    for (const v of L.vraji) {
      g.fillStyle = v.cul + '33'; g.strokeStyle = v.cul; g.lineWidth = 2;
      g.beginPath(); g.arc(v.x * T, v.y * T, v.raza * T, 0, 7); g.fill(); g.stroke();
    }
    for (const c of L.capcane) if (c.folosita) { g.fillStyle = 'rgba(40,30,20,.5)'; g.beginPath(); g.arc((c.x + 0.5) * T, (c.y + 0.5) * T, T * 0.35, 0, 7); g.fill(); }
    const ord = L.cladiri.slice().sort((a, b) => (a.dead - b.dead) || (a.y + a.size - b.y - b.size));
    for (const b of ord) {
      deseneazaCladire(g, T, b.tip, b.nivel, b.x, b.y, { t, distrus: b.dead, viata: b.hp / b.max, unghi: b.unghi, erouPlecat: b.erouPlecat });
      if (!b.dead && b.ingheata > L.t) { g.fillStyle = 'rgba(159,232,255,.45)'; g.fillRect(b.x * T, b.y * T, b.size * T, b.size * T); }
    }
    const toti = L.unitati.concat(L.aparatori).filter(u => !u.dead).sort((a, b) => (a.aer - b.aer) || (a.y - b.y));
    for (const u of toti) {
      const o = { dir: u.dir, lovit: u.lovit > 0, viata: u.hp / u.max, inamic: u.inamic, invizibil: u.invizibilPana > L.t, t };
      if (u.erou) deseneazaErou(g, T, u.erou, u.x, u.y, o); else deseneazaOsten(g, T, u.tip, u.x, u.y, o);
    }
    for (const p of L.proiectile) {
      const k = Math.min(1, p.t / p.dur), x = (p.x1 + (p.x2 - p.x1) * k) * T, y = (p.y1 + (p.y2 - p.y1) * k) * T;
      if (p.tip === 'raza') { g.strokeStyle = 'rgba(255,120,40,.85)'; g.lineWidth = Math.max(2, T * 0.18); g.beginPath(); g.moveTo(p.x1 * T, p.y1 * T); g.lineTo(p.x2 * T, p.y2 * T); g.stroke(); }
      else if (p.tip === 'ghiulea') { g.fillStyle = '#1b1b1b'; g.beginPath(); g.arc(x, y - Math.sin(k * Math.PI) * T * 1.2, T * 0.2, 0, 7); g.fill(); }
      else if (p.tip === 'foc') { g.fillStyle = '#f2a03a'; g.beginPath(); g.arc(x, y, T * 0.22, 0, 7); g.fill(); }
      else { const a = Math.atan2(p.y2 - p.y1, p.x2 - p.x1); g.strokeStyle = '#f5ecd2'; g.lineWidth = Math.max(1, T * 0.08); g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(a) * T * 0.5, y - Math.sin(a) * T * 0.5); g.stroke(); }
    }
    for (const e of L.efecte) {
      const k = e.t / e.dur;
      if (e.fulger) { g.strokeStyle = `rgba(200,225,255,${1 - k})`; g.lineWidth = 3; g.beginPath(); g.moveTo(e.x * T, 0); for (let i = 1; i <= 6; i++) g.lineTo((e.x + (Math.random() - 0.5) * 0.8) * T, e.y * T * i / 6); g.stroke(); continue; }
      if (e.cerc) { g.strokeStyle = e.cul; g.globalAlpha = 1 - k; g.lineWidth = 3; g.beginPath(); g.arc(e.x * T, e.y * T, T * e.r * (0.5 + k * 0.5), 0, 7); g.stroke(); g.globalAlpha = 1; continue; }
      g.fillStyle = e.osten ? `rgba(255,255,255,${0.7 * (1 - k)})` : `rgba(90,80,70,${0.6 * (1 - k)})`;
      g.beginPath(); g.arc(e.x * T, e.y * T, T * e.r * (0.6 + k), 0, 7); g.fill();
    }
    if (L.mesajT > 0) {
      g.font = `800 ${Math.max(13, T * 1.1)}px Nunito, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.7)'; g.fillStyle = '#fff'; g.globalAlpha = Math.min(1, L.mesajT);
      g.strokeText(L.mesaj, W / 2, T * 1.8); g.fillText(L.mesaj, W / 2, T * 1.8); g.globalAlpha = 1;
    }
  }

  function lootCurent() {
    const lt = L.opt.loot || {}; const k = L.procent / 100;
    return { lei: Math.floor((lt.lei || 0) * k), grau: Math.floor((lt.grau || 0) * k), sare: Math.floor((lt.sare || 0) * k) };
  }
  function actualizeazaInfo(fortat) {
    const s = Math.max(0, Math.ceil(L.timp)); const l = lootCurent();
    const cheie = [s, L.procent, L.stele, l.lei, l.grau, l.sare, L.start].join('|');
    if (!fortat && cheie === L.infoVechi) return; L.infoVechi = cheie;
    el('l-timp').textContent = L.start ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : 'Cercetare';
    el('l-procent').textContent = L.procent + '%';
    el('l-stele').innerHTML = [0, 1, 2].map(i => `<span class="${i < L.stele ? 'plina' : ''}">★</span>`).join('');
    el('l-loot').innerHTML = `<i class="ico lei"></i>${fmt(l.lei)} <i class="ico grau"></i>${fmt(l.grau)}${(L.opt.loot || {}).sare ? ` <i class="ico sare"></i>${fmt(l.sare)}` : ''}`;
  }

  async function termina() {
    if (L.terminat) return; L.terminat = true; L.apasat = null;
    el('l-termina').hidden = true;
    const box = el('l-rezultat'); box.hidden = false;
    const victorie = L.stele > 0;
    box.querySelector('.rez-titlu').textContent = victorie ? 'Victorie!' : 'Înfrângere';
    box.querySelector('.rez-titlu').className = 'rez-titlu ' + (victorie ? 'victorie' : 'infrangere');
    box.querySelector('.rez-stele').innerHTML = [0, 1, 2].map(i => `<span class="${i < L.stele ? 'plina' : ''}">★</span>`).join('');
    box.querySelector('.rez-detalii').innerHTML = `<p>Distrus: <b>${L.procent}%</b></p><p class="nota">Se salvează…</p>`;
    el('l-inapoi').disabled = true;
    const eroiHp = {};
    for (const [e, id] of Object.entries(L.eroiTrimisi)) { const u = L.unitati.find(x => x.id === id); eroiHp[e] = u ? Math.max(0, u.hp / u.max) : 0; }
    let r;
    try { r = await Joc.finalLupta({ opt: L.opt, stele: L.stele, procent: L.procent, loot: lootCurent(), eroiHp, folositCetate: L.folositCetate }); }
    catch (e) { r = { mesaj: e.message, lei: 0, grau: 0, sare: 0, lootLei: 0, lootGrau: 0, lootSare: 0, trofee: 0 }; }
    let h = `<p>Distrus: <b>${L.procent}%</b></p>`;
    if (!L.opt.razboi) h += `<p class="rez-prada">Pradă: <i class="ico lei"></i><b>+${fmt(r.lei)}</b> <i class="ico grau"></i><b>+${fmt(r.grau)}</b>${r.sare || r.lootSare ? ` <i class="ico sare"></i><b>+${fmt(r.sare)}</b>` : ''}</p>`;
    if (r.lei < r.lootLei || r.grau < r.lootGrau || (r.sare || 0) < (r.lootSare || 0)) h += '<p class="nota">Depozitele tale sunt pline — o parte din pradă s-a pierdut.</p>';
    if (r.bonusLiga) h += `<p class="nota">Bonus de ligă inclus: ${fmt(r.bonusLiga)} lei și grâu.</p>`;
    if (r.trofee) h += `<p>Trofee: <b class="${r.trofee > 0 ? 'plus' : 'minus'}">${r.trofee > 0 ? '+' : ''}${r.trofee}</b></p>`;
    if (r.extra) h += `<p class="nota">${r.extra}</p>`;
    if (r.mesaj) h += `<p class="eroare">${esc(r.mesaj)}</p>`;
    box.querySelector('.rez-detalii').innerHTML = h;
    el('l-inapoi').disabled = false;
  }

  function inchide() {
    if (!L) return;
    L.inchis = true; cancelAnimationFrame(raf);
    el('lupta').hidden = true; L = null;
    Joc.dupaLupta();
  }

  return { start, activa: () => !!L };
})();
