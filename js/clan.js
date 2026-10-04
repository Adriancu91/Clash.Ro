'use strict';
// ====================================================================
//  CLANUL: căutare / întemeiere, chat, donații, membri, războaie
// ====================================================================

window.Clan = (() => {
  let tab = 'chat', clan = null, mesaje = [], ultimId = 0, cronometru = 0, membri = [];
  const ROLURI = { lider: 'Lider', colider: 'Colider', batran: 'Bătrân', membru: 'Membru' };
  const rang = r => ({ lider: 3, colider: 2, batran: 1, membru: 0 }[r] || 0);
  const ora = d => new Date(d).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  const PRET_CLAN = 40000;
  const steagHtml = s => { s = s || {}; const c = s.culori || ['#002B7F', '#FCD116', '#CE1126']; return `<span class="steag-clan" style="background:linear-gradient(90deg,${c[0]} 33%,${c[1]} 33% 66%,${c[2]} 66%)">${esc(s.semn || '')}</span>`; };
  const STEAGURI = [['#002B7F', '#FCD116', '#CE1126'], ['#2a4d8f', '#ffffff', '#2a4d8f'], ['#7a1a12', '#1b1b1b', '#7a1a12'], ['#2f6e2b', '#f4ead4', '#2f6e2b'], ['#5b3a8c', '#e2b53a', '#5b3a8c'], ['#1b1b1b', '#d4af37', '#1b1b1b']];

  function opreste() { clearInterval(cronometru); cronometru = 0; }

  async function deschide(t) {
    if (t) tab = t;
    if (NET.demo) return deschideFoaie('Clan', '<p class="nota">Clanurile merg doar online, cu prietenii. În modul demo nu sunt alți jucători.</p>');
    if (!(await NET.areClanuri().catch(() => false))) return deschideFoaie('Clan', '<p class="info">Clanurile se pornesc imediat ce adminul aplică actualizarea bazei de date (fișierul <b>supabase_v2.sql</b>).</p>');
    const p = await NET.jucator().catch(() => null); if (p) Object.assign(J, { clan_id: p.clan_id, clan_rol: p.clan_rol, cetate: p.cetate || [] });
    if (!J.clan_id) return faraClan();
    clan = await NET.clan(J.clan_id).catch(() => null);
    if (!clan) { J.clan_id = null; return faraClan(); }
    const tabs = [['chat', 'Chat'], ['membri', 'Membri'], ['razboi', 'Război'], ['info', 'Info']].map(([k, n]) => `<button class="${k === tab ? 'activ' : ''}" data-act="clan-tab" data-tab="${k}">${n}</button>`).join('');
    const cap = `<div class="clan-cap">${steagHtml(clan.steag)}<div><b>${esc(clan.nume)}</b><small>${ROLURI[J.clan_rol] || ''} · ${clan.victorii} războaie câștigate</small></div></div><div class="tab-uri mic">${tabs}</div>`;
    opreste();
    if (tab === 'chat') {
      deschideFoaie('Clan', cap + `<div id="clan-mesaje" class="clan-mesaje"><p class="nota">Se încarcă…</p></div>
        <div class="clan-scrie"><input id="clan-text" maxlength="300" placeholder="Scrie clanului…" autocomplete="off"><button class="btn mic verde" data-act="clan-trimite">Trimite</button></div>
        <button class="btn mare" data-act="clan-cere">🛡 Cere oșteni pentru cetate</button>`, 'inalta clan');
      $('#clan-text').onkeydown = e => { if (e.key === 'Enter') trimite(); };
      mesaje = []; ultimId = 0; await incarcaMesaje(true);
      cronometru = setInterval(() => incarcaMesaje(false), 4000);
    } else if (tab === 'membri') {
      deschideFoaie('Clan', cap + '<div id="clan-membri"><p class="nota">Se încarcă…</p></div>', 'inalta clan');
      await randeazaMembri();
    } else if (tab === 'razboi') {
      deschideFoaie('Clan', cap + '<div id="clan-razboi"><p class="nota">Se încarcă…</p></div>', 'inalta clan');
      await randeazaRazboi();
      cronometru = setInterval(() => { if ($('#clan-razboi')) randeazaRazboi(true); }, 20000);
    } else {
      const poate = rang(J.clan_rol) >= 2;
      deschideFoaie('Clan', cap + `<p>${esc(clan.descriere) || '<span class="nota">Fără descriere.</span>'}</p>
        <div class="statistici">${stat('Intrare', clan.tip === 'deschis' ? 'Oricine' : 'Cu aprobare')}${stat('Trofee minime', fmt(clan.trofee_min))}${stat('Victorii', clan.victorii)}${stat('Rolul tău', ROLURI[J.clan_rol])}</div>
        ${poate ? `<details class="alta-suma"><summary>Modifică clanul</summary>
          <label>Descriere<input id="ce-desc" maxlength="200" value="${esc(clan.descriere)}"></label>
          <label>Intrare<select id="ce-tip"><option value="deschis">Oricine poate intra</option><option value="inchis" ${clan.tip === 'inchis' ? 'selected' : ''}>Cu aprobare</option></select></label>
          <label>Trofee minime<input id="ce-trofee" type="number" min="0" value="${clan.trofee_min}"></label>
          <button class="btn verde" data-act="clan-salveaza">Salvează</button></details>` : ''}
        <div class="rand-butoane"><button class="btn rosu" data-act="clan-paraseste">Părăsește clanul</button></div>`, 'inalta clan');
    }
  }

  // -------------------------------------------------- fără clan
  async function faraClan(text) {
    opreste();
    deschideFoaie('Clan', `<p class="nota">Într-un clan primești oșteni dăruiți pentru Cetatea Clanului, vorbești cu prietenii și lupți în războaie.</p>
      ${!numar('cetateClan') ? `<p class="info">Construiește <b>Cetatea Clanului</b> (de la Primăria 3) ca să poți primi oșteni.</p>` : ''}
      <div class="clan-scrie"><input id="clan-caut" placeholder="Caută clan după nume" value="${esc(text || '')}"><button class="btn mic" data-act="clan-cauta">Caută</button></div>
      <div id="clan-lista" class="lista"><p class="nota">Se încarcă…</p></div>
      <h3>Întemeiază un clan</h3>
      <label>Numele clanului<input id="cc-nume" maxlength="20" placeholder="ex: Haiducii Moldovei"></label>
      <label>Descriere<input id="cc-desc" maxlength="200" placeholder="ex: Clan de prieteni, activi seara"></label>
      <label>Intrare<select id="cc-tip"><option value="deschis">Oricine poate intra</option><option value="inchis">Cu aprobare</option></select></label>
      <label>Steag</label><div class="steaguri">${STEAGURI.map((c, i) => `<button class="steag-alege ${i ? '' : 'activ'}" data-act="clan-steag" data-i="${i}">${steagHtml({ culori: c })}</button>`).join('')}</div>
      <button class="btn mare galben" data-act="clan-creeaza">Întemeiază clanul<small>${cost('lei', PRET_CLAN)}</small></button>`, 'inalta clan');
    try {
      const l = await NET.cautaClanuri(text || '');
      const box = $('#clan-lista'); if (!box) return;
      box.innerHTML = l.length ? l.map(c => `<div class="rand-cet"><div class="clan-rand">${steagHtml(c.steag)}<div><b>${esc(c.nume)}</b><small>${c.membri}/50 membri · ${ico('trofeu')}${fmt(c.trofee)} · ${c.tip === 'deschis' ? 'deschis' : 'cu aprobare'}${c.trofee_min ? ' · min ' + c.trofee_min : ''}</small>${c.descriere ? `<small>${esc(c.descriere)}</small>` : ''}</div></div>
        <button class="btn mic verde" data-act="clan-intra" data-id="${c.id}">${c.tip === 'deschis' ? 'Intră' : 'Cere'}</button></div>`).join('') : '<p class="nota">Niciun clan încă. Întemeiază tu primul!</p>';
    } catch (e) { const box = $('#clan-lista'); if (box) box.innerHTML = `<p class="eroare">${esc(e.message)}</p>`; }
  }

  // -------------------------------------------------- chat & donații
  async function incarcaMesaje(prima) {
    if (!$('#clan-mesaje')) return opreste();
    try {
      const noi = await NET.mesaje(clan.id, prima ? 0 : ultimId);
      const deschise = mesaje.filter(m => m.tip === 'donatie' && !(m.date || {}).inchis).map(m => m.id);
      if (!prima && deschise.length) { for (const u of await NET.mesajeActualizate(clan.id, deschise)) { const m = mesaje.find(x => x.id === u.id); if (m) m.date = u.date; } }
      if (prima) mesaje = noi; else mesaje = mesaje.concat(noi).slice(-80);
      if (noi.length) ultimId = Math.max(ultimId, ...noi.map(m => m.id));
      randeazaMesaje(prima || noi.length > 0);
    } catch (e) { const b = $('#clan-mesaje'); if (b && prima) b.innerHTML = `<p class="eroare">${esc(e.message)}</p>`; }
  }
  function randeazaMesaje(jos) {
    const box = $('#clan-mesaje'); if (!box) return;
    const eu = NET.idCurent(); const S = Joc.stare();
    const laFund = box.scrollTop + box.clientHeight >= box.scrollHeight - 30;
    box.innerHTML = mesaje.map(m => {
      if (m.tip === 'sistem') return `<div class="msg sistem">${esc(m.text)}</div>`;
      if (m.tip === 'donatie') {
        const d = m.date || {}; const primit = d.primit || []; const mie = m.player_id === eu; const plin = d.inchis || d.umplut >= d.cap;
        const ale = OSTENI_ANTRENABILI.filter(t => (S.armata[t] || 0) > 0 && (d.umplut || 0) + OSTENI[t].loc <= (d.cap || 0));
        return `<div class="msg donatie ${mie ? 'eu' : ''}"><b>${esc(m.nume)}</b> <small>${ora(m.creat)}</small><p>${esc(m.text)}</p>
          <div class="progres"><div style="width:${Math.min(100, (d.umplut || 0) / (d.cap || 1) * 100)}%"></div></div><small>${d.umplut || 0}/${d.cap} locuri${primit.length ? ' · ' + primit.slice(-6).map(p => `${OSTENI[p.tip] ? OSTENI[p.tip].nume : p.tip} de la ${esc(p.de)}`).join(', ') : ''}</small>
          ${!mie && !plin ? `<div class="doneaza">${ale.length ? ale.map(t => `<button class="btn mic" data-act="clan-doneaza" data-id="${m.id}" data-tip="${t}"><canvas data-mini="${t}" data-fel="osten"></canvas>×${S.armata[t]}</button>`).join('') : '<small class="nota">Nu ai oșteni potriviți de dăruit.</small>'}</div>` : ''}
          ${plin ? '<small class="plin">Cetate plină ✓</small>' : ''}</div>`;
      }
      return `<div class="msg ${m.player_id === eu ? 'eu' : ''}"><b>${esc(m.nume)}</b> <small>${ora(m.creat)}</small><p>${esc(m.text)}</p></div>`;
    }).join('') || '<p class="nota">Niciun mesaj încă. Salută-ți clanul!</p>';
    for (const c of box.querySelectorAll('canvas[data-mini]')) { deseneazaMini(c, c.dataset.mini, true); c.style.width = '22px'; c.style.height = '22px'; }
    if (jos || laFund) box.scrollTop = box.scrollHeight;
  }
  async function trimite() {
    const i = $('#clan-text'); const t = i.value.trim(); if (!t) return;
    i.value = '';
    try { await NET.trimiteMesaj(t); await incarcaMesaje(false); } catch (e) { Joc.toast(e.message, 'eroare'); i.value = t; }
  }
  async function cereOsteni() {
    const cc = Joc.stare().cladiri.find(c => c.tip === 'cetateClan' && c.nivel > 0);
    if (!cc) return Joc.toast('Construiește întâi Cetatea Clanului.', 'eroare');
    const cap = CLADIRI.cetateClan.capacitate[cc.nivel - 1];
    const text = await modal(`<h3>Cere oșteni</h3><p>Cetatea ta are ${cap} locuri.</p><input maxlength="120" placeholder="ex: Vreau arcași și pandur!"><div class="rand-butoane"><button class="btn" data-raspuns="nu">Anulează</button><button class="btn verde" data-raspuns="da">Cere</button></div>`);
    if (text === false) return;
    try { await NET.cereTrupe(text || '', cap); Joc.toast('Cererea a ajuns în chat.', 'bun'); await incarcaMesaje(false); } catch (e) { Joc.toast(e.message, 'eroare'); }
  }
  async function doneaza(id, tip) {
    if (!Joc.doneaza(tip)) return Joc.toast('Nu mai ai acest oștean.', 'eroare');
    try { const d = await NET.doneaza(id, tip, Joc.nivelOsten(tip)); const m = mesaje.find(x => x.id === id); if (m) m.date = d; randeazaMesaje(false); Joc.toast(`Ai dăruit un ${OSTENI[tip].nume}.`, 'bun'); }
    catch (e) { Joc.stare().armata[tip] = (Joc.stare().armata[tip] || 0) + 1; Joc.toast(e.message, 'eroare'); await incarcaMesaje(false); }
  }

  // -------------------------------------------------- membri
  async function randeazaMembri() {
    const box = $('#clan-membri'); if (!box) return;
    try {
      membri = await NET.membri(clan.id);
      let cereri = [];
      if (rang(J.clan_rol) >= 1) cereri = await NET.cereriClan(clan.id).catch(() => []);
      const eu = NET.idCurent();
      box.innerHTML = (cereri.length ? `<h3>Vor să intre</h3><div class="lista">${cereri.map(q => `<div class="rand-cet"><div><b>${esc(q.nume)}</b></div>
          <button class="btn mic verde" data-act="clan-cerere" data-id="${q.id}" data-da="1">Primește</button><button class="btn mic" data-act="clan-cerere" data-id="${q.id}" data-da="0">Refuză</button></div>`).join('')}</div>` : '') +
        `<h3>${membri.length}/50 membri</h3><ol class="clasament">${membri.map((p, i) => `<li class="${p.id === eu ? 'eu' : ''}" ${p.id !== eu && rang(J.clan_rol) >= 2 && rang(p.clan_rol) < rang(J.clan_rol) ? `data-act="clan-membru" data-id="${p.id}"` : ''}>
          <span class="loc">${i + 1}</span><b>${esc(p.nume)}</b><small>${ROLURI[p.clan_rol] || ''} · ${liga(p.trofee).nume}</small><span>${ico('trofeu')}${fmt(p.trofee)}</span></li>`).join('')}</ol>
        ${rang(J.clan_rol) >= 2 ? '<p class="nota">Atinge un membru ca să-i schimbi rolul sau să-l dai afară.</p>' : ''}`;
    } catch (e) { box.innerHTML = `<p class="eroare">${esc(e.message)}</p>`; }
  }
  async function actiuneMembru(id) {
    const p = membri.find(x => x.id === id); if (!p) return;
    const opt = [];
    if (J.clan_rol === 'lider') opt.push(['lider', 'Fă-l lider (tu devii colider)']);
    if (J.clan_rol === 'lider' && p.clan_rol !== 'colider') opt.push(['colider', 'Fă-l colider']);
    if (p.clan_rol !== 'batran' && rang(J.clan_rol) > 1) opt.push(['batran', 'Fă-l bătrân']);
    if (p.clan_rol !== 'membru') opt.push(['membru', 'Fă-l membru']);
    opt.push(['afara', 'Dă-l afară din clan']);
    const r = await modal(`<h3>${esc(p.nume)}</h3>${opt.map(([k, n]) => `<button class="btn mare ${k === 'afara' ? 'rosu' : ''}" data-raspuns="da" onclick="this.closest('.modal-card').dataset.ales='${k}'">${n}</button>`).join('')}<div class="rand-butoane"><button class="btn" data-raspuns="nu">Închide</button></div>`);
    const ales = $('#modal .modal-card').dataset.ales; delete $('#modal .modal-card').dataset.ales;
    if (!r || !ales) return;
    try { await NET.schimbaRol(id, ales); Joc.toast('Gata.', 'bun'); if (ales === 'lider') J.clan_rol = 'colider'; randeazaMembri(); } catch (e) { Joc.toast(e.message, 'eroare'); }
  }

  // -------------------------------------------------- război
  let razboi = null, rMembri = [], rAtacuri = [];
  async function randeazaRazboi(tacut) {
    const box = $('#clan-razboi'); if (!box) return;
    try {
      razboi = await NET.razboiCurent();
      const conducere = rang(J.clan_rol) >= 2;
      const activ = razboi && razboi.id && !razboi.terminat;
      if (!activ) {
        const caut = await NET.cautareRazboi(clan.id).catch(() => null);
        let h = '';
        if (razboi && razboi.id) h += await htmlRezultat();
        if (caut) h += `<div class="info">Căutăm un clan pentru război ${caut.marime} contra ${caut.marime}… Când alt clan caută și el, războiul începe.</div>${conducere ? '<button class="btn mare" data-act="clan-razboi-anuleaza">Oprește căutarea</button>' : ''}`;
        else if (conducere) h += `<h3>Pornește un război</h3><p class="nota">Războiul are o zi de pregătire (1 oră), apoi 23 de ore de luptă. Fiecare luptător are 2 atacuri; câștigă clanul cu mai multe stele.</p>
          <label>Câți luptători din fiecare clan?<select id="r-marime">${[1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50].map(n => `<option ${n === 5 ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <button class="btn mare rosu" data-act="clan-razboi-cauta">⚔ Caută război</button>`;
        else h += '<p class="nota">Liderul sau un colider poate porni un război.</p>';
        box.innerHTML = h; return;
      }
      rMembri = await NET.razboiMembri(razboi.id); rAtacuri = await NET.razboiAtacuri(razboi.id);
      const noi = J.clan_id === razboi.clan_a ? 'a' : 'b', ei = noi === 'a' ? 'b' : 'a';
      const prep = Date.parse(razboi.start) > Date.now();
      const eu = rMembri.find(m => m.player_id === NET.idCurent());
      const stele = Object.fromEntries(rMembri.map(m => [m.player_id, Math.max(0, ...rAtacuri.filter(a => a.tinta === m.player_id).map(a => a.stele))]));
      const linie = (m, dusman) => `<div class="rand-cet razboi-m"><span class="loc">${m.pozitie}</span><div><b>${esc(m.nume)}</b><small>Primăria ${m.th} · atacuri ${m.atacuri}/2</small></div>
        <span class="stele">${[0, 1, 2].map(k => `<span class="${k < stele[m.player_id] ? 'plina' : ''}">★</span>`).join('')}</span>
        ${dusman && !prep && eu && eu.atacuri < 2 ? `<button class="btn mic rosu" data-act="clan-razboi-ataca" data-id="${m.player_id}">Atacă</button>` : ''}</div>`;
      box.innerHTML = `<div class="razboi-scor"><div><b>${esc(razboi['nume_' + noi])}</b><span class="mare">${razboi['stele_' + noi]}★</span><small>${(+razboi['procent_' + noi]).toFixed(1)}%</small></div>
          <div class="vs">${prep ? 'Pregătire' : 'Luptă'}<small data-pana="${Date.parse(prep ? razboi.start : razboi.sfarsit)}">${fmtTimp((Date.parse(prep ? razboi.start : razboi.sfarsit) - Date.now()) / 1000)}</small></div>
          <div><b>${esc(razboi['nume_' + ei])}</b><span class="mare">${razboi['stele_' + ei]}★</span><small>${(+razboi['procent_' + ei]).toFixed(1)}%</small></div></div>
        ${prep ? '<p class="nota">Ziua de pregătire: antrenează-ți armata și umple-ți cetatea. Atacurile încep după cronometru.</p>' : eu ? `<p class="nota">Ai ${2 - eu.atacuri} atacuri rămase. Alege o țintă din clanul advers.</p>` : '<p class="nota">Nu faci parte din acest război.</p>'}
        <h3>Ei</h3><div class="lista">${rMembri.filter(m => m.clan_id === razboi['clan_' + ei]).map(m => linie(m, true)).join('')}</div>
        <h3>Noi</h3><div class="lista">${rMembri.filter(m => m.clan_id === razboi['clan_' + noi]).map(m => linie(m, false)).join('')}</div>
        ${rAtacuri.length ? `<h3>Atacuri</h3><ul class="cereri">${rAtacuri.slice().reverse().slice(0, 20).map(a => `<li><div><b>${esc(a.atacator_nume)}</b> → ${esc(a.tinta_nume)}<small>${a.procent}% · ${a.stele_noi} stele noi</small></div><span class="stele">${'★'.repeat(a.stele) || '–'}</span></li>`).join('')}</ul>` : ''}`;
    } catch (e) { if (!tacut) box.innerHTML = `<p class="eroare">${esc(e.message)}</p>`; }
  }
  async function htmlRezultat() {
    const r = razboi; const noi = J.clan_id === r.clan_a ? 'a' : 'b', ei = noi === 'a' ? 'b' : 'a';
    const castig = r.castigator === J.clan_id, egal = r.castigator == null;
    const S = Joc.stare(); S.razboaiRevendicate = S.razboaiRevendicate || [];
    let premiu = '';
    if (!S.razboaiRevendicate.includes(r.id)) {
      const at = await NET.razboiAtacuri(r.id).catch(() => []); const mele = at.filter(a => a.atacator === NET.idCurent());
      if (mele.length) premiu = `<button class="btn mare galben" data-act="clan-premiu" data-id="${r.id}" data-stele="${mele.reduce((s, a) => s + a.stele_noi, 0)}" data-castig="${castig ? 1 : egal ? 0.75 : 0.5}">Ia prada de război</button>`;
    }
    return `<div class="razboi-scor terminat"><div><b>${esc(r['nume_' + noi])}</b><span class="mare">${r['stele_' + noi]}★</span></div>
      <div class="vs">${castig ? 'VICTORIE' : egal ? 'EGAL' : 'ÎNFRÂNGERE'}</div><div><b>${esc(r['nume_' + ei])}</b><span class="mare">${r['stele_' + ei]}★</span></div></div>${premiu}`;
  }
  async function atacaRazboi(tinta) {
    const m = rMembri.find(x => x.player_id === tinta); if (!m || !razboi) return;
    const S = Joc.stare();
    if (!Object.values(S.armata).some(n => n > 0) && !Joc.eroiDisponibili().length) return Joc.toast('Antrenează întâi oșteni.', 'eroare');
    const b = m.baza || {};
    opreste(); inchideFoaie(); await Joc.salveazaAcum();
    Lupta.start({ tip: 'razboi', razboi: true, razboiId: razboi.id, tintaId: tinta, nume: `${m.pozitie}. ${m.nume}`, sub: `Război · Primăria ${m.th}`,
      cladiri: b.cladiri || [], loot: {}, cautare: false, cetateAparare: b.cetate || [],
      eroiAparare: Object.entries(b.eroi || {}).filter(([e, x]) => EROI[e] && x && !x.upg).map(([e, x]) => ({ e, nivel: x.nivel | 0 || 1 })) });
    dupaLuptaRazboi = true;
  }
  let dupaLuptaRazboi = false;

  // -------------------------------------------------- acțiuni
  async function actiune(a, b) {
    try {
      switch (a) {
        case 'clan-tab': return deschide(b.dataset.tab);
        case 'clan-cauta': return faraClan($('#clan-caut').value.trim());
        case 'clan-steag': $$('.steag-alege').forEach(x => x.classList.toggle('activ', x === b)); return;
        case 'clan-creeaza': {
          const nume = $('#cc-nume').value.trim(); if (nume.length < 3) return Joc.toast('Numele clanului: 3–20 caractere.', 'eroare');
          const S = Joc.stare(); if (S.res.lei < PRET_CLAN) return Joc.toast(`Îți trebuie ${fmt(PRET_CLAN)} lei.`, 'eroare');
          const i = +(($('.steag-alege.activ') || {}).dataset || {}).i || 0;
          await NET.creeazaClan(nume, $('#cc-desc').value.trim(), $('#cc-tip').value, 0, { culori: STEAGURI[i], semn: nume[0].toUpperCase() });
          S.res.lei -= PRET_CLAN; Joc.salveazaAcum(); Joc.toast('Clanul a fost întemeiat!', 'bun'); tab = 'chat'; return deschide();
        }
        case 'clan-intra': { const r = await NET.intraInClan(+b.dataset.id); Joc.toast(r === 'cerere' ? 'Cererea a fost trimisă liderilor.' : 'Bine ai venit în clan!', 'bun'); tab = 'chat'; return deschide(); }
        case 'clan-trimite': return trimite();
        case 'clan-cere': return cereOsteni();
        case 'clan-doneaza': return doneaza(+b.dataset.id, b.dataset.tip);
        case 'clan-membru': return actiuneMembru(b.dataset.id);
        case 'clan-cerere': await NET.raspundeCerere(+b.dataset.id, b.dataset.da === '1'); return randeazaMembri();
        case 'clan-razboi-cauta': { const r = await NET.cautaRazboi(+$('#r-marime').value); Joc.toast(r === 'gasit' ? 'Război găsit! Începe ziua de pregătire.' : 'Căutăm un adversar…', 'bun'); return randeazaRazboi(); }
        case 'clan-razboi-anuleaza': await NET.anuleazaCautareRazboi(); return randeazaRazboi();
        case 'clan-razboi-ataca': return atacaRazboi(b.dataset.id);
        case 'clan-premiu': {
          const S = Joc.stare(); const th = Joc.nivPrimarie(); const st = +b.dataset.stele; const k = +b.dataset.castig;
          const suma = Math.round((st + 1) * 1500 * th * th * k);
          S.razboaiRevendicate = (S.razboaiRevendicate || []).concat(+b.dataset.id).slice(-20);
          const pl = adauga('lei', suma), pg = adauga('grau', suma), ps = th >= 7 ? adauga('sare', Math.round(suma / 100)) : 0;
          await Joc.salveazaAcum(); actualizeazaBara();
          Joc.anunta('Prada de război', `<p>Ai primit ${cost('lei', pl)} ${cost('grau', pg)}${ps ? ' ' + cost('sare', ps) : ''}.</p>`);
          return randeazaRazboi();
        }
        case 'clan-salveaza': await NET.editeazaClan($('#ce-desc').value, $('#ce-tip').value, +$('#ce-trofee').value || 0, clan.steag); Joc.toast('Salvat.', 'bun'); return deschide('info');
        case 'clan-paraseste':
          if (!await Joc.confirma(J.clan_rol === 'lider' ? 'Ești liderul. Dacă pleci, conducerea trece la altcineva (sau clanul se închide dacă ești singur). Pleci?' : 'Părăsești clanul?', 'Plec', 'Rămân')) return;
          await NET.parasesteClan(); J.clan_id = null; J.clan_rol = null; Joc.toast('Ai părăsit clanul.'); return deschide();
      }
    } catch (e) { Joc.toast(e.message, 'eroare'); }
  }

  return {
    deschide, actiune,
    inchis: opreste,
    dupaLupta() { if (dupaLuptaRazboi) { dupaLuptaRazboi = false; foaie = { tip: 'clan' }; tab = 'razboi'; deschide('razboi'); } },
  };
})();
