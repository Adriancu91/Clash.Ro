'use strict';
// Lupta: trimiți oșteni peste satul dușman și încerci să-l distrugi.

const Lupta = (() => {
  const DURATA = 180; // secunde
  const PAS = 1 / 30;
  let L = null, cv, g, T = 16, W = 320, raf = 0, ultim = 0, acc = 0;
  const el = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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

  function start(opt) {
    cv = el('lc'); g = cv.getContext('2d');
    const cladiri = curataCladiri(opt.cladiri).map(c => {
      const d = CLADIRI[c.tip];
      return { ...c, size: d.size, hp: d.hp[c.nivel - 1], max: d.hp[c.nivel - 1], dead: false, cd: 0.6, unghi: null };
    });
    const zidLa = new Map(); for (const b of cladiri) if (b.tip === 'zid') zidLa.set(b.y * GRID + b.x, b);
    const armata = { ...Joc.stare().armata };
    L = {
      opt, cladiri, zidLa, unitati: [], proiectile: [], efecte: [], timp: DURATA, start: false, terminat: false, inchis: false,
      rest: armata, sel: null, procent: 0, stele: 0, primarie: false,
      total: Math.max(1, cladiri.filter(b => b.tip !== 'zid').length), distruse: 0,
      apasat: null, flash: 0, mesaj: '', mesajT: 0, infoVechi: '',
    };
    L.sel = Object.keys(OSTENI).find(t => L.rest[t] > 0) || null;
    el('l-nume').textContent = opt.nume;
    el('l-sub').textContent = opt.sub || '';
    el('l-loot-disp').innerHTML = `Pradă posibilă: <i class="ico lei"></i>${fmt(opt.loot.lei)} <i class="ico grau"></i>${fmt(opt.loot.grau)}`;
    el('l-rezultat').hidden = true;
    el('l-iesi').hidden = false; el('l-urmator').hidden = !opt.cautare; el('l-termina').hidden = true;
    el('lupta').hidden = false;
    redim(); randeazaOsteni(); actualizeazaInfo(true);
    leaga();
    ultim = performance.now(); acc = 0;
    cancelAnimationFrame(raf); raf = requestAnimationFrame(bucla);
  }

  function redim() {
    const sc = el('l-scena');
    const disp = window.innerHeight - el('l-sus').offsetHeight - el('l-osteni').offsetHeight - el('l-butoane').offsetHeight - 24;
    W = Math.max(240, Math.min(sc.clientWidth, 560, disp)); T = W / GRID;
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
      const b = e.target.closest('[data-osten]'); if (!b || !L) return;
      L.sel = b.dataset.osten; randeazaOsteni();
    });
    el('l-iesi').addEventListener('click', () => inchide());
    el('l-urmator').addEventListener('click', () => { inchide(); Joc.cautaAdversar(); });
    el('l-termina').addEventListener('click', async () => { if (L && !L.terminat && await Joc.confirma('Termini lupta acum?')) termina(); });
    el('l-inapoi').addEventListener('click', () => inchide());
    window.addEventListener('resize', () => { if (L && !L.inchis) redim(); });
  }

  function randeazaOsteni() {
    const h = Object.keys(OSTENI).filter(t => (L.rest[t] || 0) > 0 || (Joc.stare().armata[t] || 0) > 0 || L.unitati.some(u => u.tip === t)).map(t => {
      const n = L.rest[t] || 0;
      return `<button class="l-osten ${L.sel === t ? 'activ' : ''} ${n ? '' : 'gol'}" data-osten="${t}"><canvas data-mini-osten="${t}"></canvas><b>×${n}</b><small>${OSTENI[t].nume}</small></button>`;
    }).join('');
    el('l-osteni').innerHTML = h || '<p class="nota">Nu ai oșteni. Antrenează din Cazarmă.</p>';
    for (const c of el('l-osteni').querySelectorAll('canvas')) deseneazaMini(c, c.dataset.miniOsten, true);
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

  function trimite() {
    if (!L || L.terminat || !L.apasat) return;
    const tip = L.sel;
    if (!tip || !(L.rest[tip] > 0)) { spune(tip ? `Nu mai ai ${OSTENI[tip].nume.toLowerCase()}i` : 'Nu mai ai oșteni'); return; }
    const { x, y } = L.apasat;
    if (!permis(x, y)) { L.flash = 1; spune('Nu poți trimite oșteni în zona roșie'); return; }
    const o = OSTENI[tip];
    L.unitati.push({ tip, x: x + (Math.random() - 0.5) * 0.3, y: y + (Math.random() - 0.5) * 0.3, hp: o.hp, max: o.hp, cd: 0.2, tinta: null, zid: null, dead: false, dir: 0, lovit: 0 });
    L.rest[tip]--; Joc.consumaOsten(tip);
    if (!L.start) { L.start = true; el('l-iesi').hidden = true; el('l-urmator').hidden = true; el('l-termina').hidden = false; }
    if (!(L.rest[tip] > 0)) L.sel = Object.keys(OSTENI).find(t => L.rest[t] > 0) || tip;
    randeazaOsteni();
  }

  function distRect(x, y, b) {
    const dx = Math.max(b.x - x, 0, x - (b.x + b.size)), dy = Math.max(b.y - y, 0, y - (b.y + b.size));
    return Math.hypot(dx, dy);
  }

  function alegeTinta(u) {
    const o = OSTENI[u.tip];
    let cand = L.cladiri.filter(b => !b.dead && b.tip !== 'zid');
    if (o.tinta !== 'oricare') { const p = cand.filter(b => TINTE[o.tinta].includes(b.tip)); if (p.length) cand = p; }
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

  function pas(dt) {
    L.timp -= dt;
    for (const u of L.unitati) {
      if (u.dead) continue;
      const o = OSTENI[u.tip];
      if (u.lovit > 0) u.lovit -= dt;
      if (u.zid && u.zid.dead) u.zid = null;
      if (!u.tinta || u.tinta.dead) { u.tinta = alegeTinta(u); u.zid = null; }
      if (!u.tinta) continue;
      const tinta = u.zid || u.tinta;
      const d = distRect(u.x, u.y, tinta);
      if (d <= o.raza) {
        u.cd -= dt;
        u.dir = Math.atan2(tinta.y + tinta.size / 2 - u.y, tinta.x + tinta.size / 2 - u.x);
        if (u.cd <= 0) {
          u.cd = o.interval; u.lovit = 0.12;
          if (o.raza > 1) L.proiectile.push({ x1: u.x, y1: u.y, x2: tinta.x + tinta.size / 2, y2: tinta.y + tinta.size / 2, t: 0, dur: 0.25, tip: 'sageata' });
          loveste(tinta, o.dmg);
        }
      } else {
        const px = clamp(u.x, tinta.x, tinta.x + tinta.size), py = clamp(u.y, tinta.y, tinta.y + tinta.size);
        const dx = px - u.x, dy = py - u.y, len = Math.hypot(dx, dy) || 1;
        const step = Math.min(len, o.viteza * dt);
        const nx = u.x + dx / len * step, ny = u.y + dy / len * step;
        const tx = Math.floor(nx), ty = Math.floor(ny);
        const z = L.zidLa.get(ty * GRID + tx);
        if (z && !z.dead && z !== tinta && !(Math.floor(u.x) === tx && Math.floor(u.y) === ty)) { u.zid = z; }
        else { u.x = clamp(nx, 0, GRID - 0.01); u.y = clamp(ny, 0, GRID - 0.01); }
        u.dir = Math.atan2(dy, dx);
      }
    }
    for (const b of L.cladiri) {
      if (b.dead || !CLADIRI[b.tip].aparare) continue;
      const d = CLADIRI[b.tip]; b.cd -= dt; if (b.cd > 0) continue;
      const cx = b.x + b.size / 2, cy = b.y + b.size / 2;
      let best = null, bd = d.raza;
      for (const u of L.unitati) { if (u.dead) continue; const dd = Math.hypot(u.x - cx, u.y - cy); if (dd <= bd) { bd = dd; best = u; } }
      if (!best) { b.cd = 0.1; continue; }
      b.cd = d.interval; b.unghi = Math.atan2(best.y - cy, best.x - cx);
      best.hp -= d.dmg[b.nivel - 1];
      L.proiectile.push({ x1: cx, y1: cy, x2: best.x, y2: best.y, t: 0, dur: b.tip === 'tun' ? 0.3 : 0.2, tip: b.tip === 'tun' ? 'ghiulea' : 'sageata' });
      if (best.hp <= 0) { best.dead = true; L.efecte.push({ x: best.x, y: best.y, t: 0, dur: 0.5, r: 0.35, osten: true }); }
    }
    for (const p of L.proiectile) p.t += dt;
    L.proiectile = L.proiectile.filter(p => p.t < p.dur);
    for (const e of L.efecte) e.t += dt;
    L.efecte = L.efecte.filter(e => e.t < e.dur);
    if (L.unitati.length > 60) L.unitati = L.unitati.filter(u => !u.dead);

    const vii = L.unitati.some(u => !u.dead);
    const ramase = Object.values(L.rest).some(n => n > 0);
    if (L.timp <= 0 || L.procent >= 100 || (!vii && !ramase)) termina();
  }

  function bucla(t) {
    if (!L || L.inchis) return;
    const dt = Math.min(0.1, (t - ultim) / 1000); ultim = t;
    if (L.apasat && t - L.apasat.ultim > 140) { L.apasat.ultim = t; trimite(); }
    if (L.flash > 0) L.flash -= dt * 1.5;
    if (L.mesajT > 0) L.mesajT -= dt;
    if (L.start && !L.terminat) { acc += dt; while (acc >= PAS && !L.terminat) { pas(PAS); acc -= PAS; } }
    deseneaza(t); actualizeazaInfo();
    raf = requestAnimationFrame(bucla);
  }

  function deseneaza(t) {
    g.clearRect(0, 0, W, W);
    deseneazaTeren(g, T, true);
    if (!L.terminat) {
      const a = 0.13 + Math.max(0, L.flash) * 0.3;
      g.fillStyle = `rgba(206,17,38,${a})`;
      for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (!permis(x + 0.5, y + 0.5)) g.fillRect(x * T, y * T, T + 0.5, T + 0.5);
    }
    const ord = L.cladiri.slice().sort((a, b) => (a.dead - b.dead) || (a.y + a.size - b.y - b.size));
    for (const b of ord) deseneazaCladire(g, T, b.tip, b.nivel, b.x, b.y, { t, distrus: b.dead, viata: b.hp / b.max, unghi: b.unghi });
    for (const u of L.unitati) if (!u.dead) deseneazaOsten(g, T, u.tip, u.x, u.y, { dir: u.dir, lovit: u.lovit > 0, viata: u.hp / u.max });
    for (const p of L.proiectile) {
      const k = p.t / p.dur, x = (p.x1 + (p.x2 - p.x1) * k) * T, y = (p.y1 + (p.y2 - p.y1) * k) * T;
      if (p.tip === 'ghiulea') { g.fillStyle = '#1b1b1b'; g.beginPath(); g.arc(x, y, T * 0.16, 0, 7); g.fill(); }
      else { const a = Math.atan2(p.y2 - p.y1, p.x2 - p.x1); g.strokeStyle = '#f5ecd2'; g.lineWidth = Math.max(1, T * 0.07); g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(a) * T * 0.4, y - Math.sin(a) * T * 0.4); g.stroke(); }
    }
    for (const e of L.efecte) {
      const k = e.t / e.dur; g.fillStyle = e.osten ? `rgba(255,255,255,${0.7 * (1 - k)})` : `rgba(90,80,70,${0.6 * (1 - k)})`;
      g.beginPath(); g.arc(e.x * T, e.y * T, T * e.r * (0.6 + k), 0, 7); g.fill();
    }
    if (L.mesajT > 0) {
      g.font = `800 ${Math.max(12, T * 0.75)}px Nunito, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.7)'; g.fillStyle = '#fff'; g.globalAlpha = Math.min(1, L.mesajT);
      g.strokeText(L.mesaj, W / 2, T * 1.2); g.fillText(L.mesaj, W / 2, T * 1.2); g.globalAlpha = 1;
    }
  }

  function lootCurent() {
    return { lei: Math.floor(L.opt.loot.lei * L.procent / 100), grau: Math.floor(L.opt.loot.grau * L.procent / 100) };
  }

  function actualizeazaInfo(fortat) {
    const s = Math.max(0, Math.ceil(L.timp)); const l = lootCurent();
    const cheie = [s, L.procent, L.stele, l.lei, l.grau, L.start].join('|');
    if (!fortat && cheie === L.infoVechi) return; L.infoVechi = cheie;
    el('l-timp').textContent = L.start ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : 'Cercetare';
    el('l-procent').textContent = L.procent + '%';
    el('l-stele').innerHTML = [0, 1, 2].map(i => `<span class="${i < L.stele ? 'plina' : ''}">★</span>`).join('');
    el('l-loot').innerHTML = `<i class="ico lei"></i>${fmt(l.lei)} <i class="ico grau"></i>${fmt(l.grau)}`;
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
    let r;
    try { r = await Joc.finalLupta({ opt: L.opt, stele: L.stele, procent: L.procent, loot: lootCurent() }); }
    catch (e) { r = { mesaj: e.message, lei: 0, grau: 0, lootLei: 0, lootGrau: 0, trofee: 0 }; }
    let h = `<p>Distrus: <b>${L.procent}%</b></p>`;
    h += `<p class="rez-prada">Pradă: <i class="ico lei"></i><b>+${fmt(r.lei)}</b> <i class="ico grau"></i><b>+${fmt(r.grau)}</b></p>`;
    if (r.lei < r.lootLei || r.grau < r.lootGrau) h += '<p class="nota">Depozitele tale sunt pline — o parte din pradă s-a pierdut. Construiește vistierii și hambare.</p>';
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
