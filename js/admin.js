'use strict';
// Panoul adminului: aprobi / pui în așteptare / respingi cererile de galbeni.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = n => Math.floor(n || 0).toLocaleString('ro-RO');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ico = r => `<i class="ico ${r}"></i>`;
const data = d => d ? new Date(d).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
function toast(msg, tip = '') {
  const d = document.createElement('div'); d.className = 'toast ' + tip; d.textContent = msg; $('#toasturi').appendChild(d);
  setTimeout(() => d.classList.add('dispare'), 2600); setTimeout(() => d.remove(), 3100);
}
function modal(html) {
  return new Promise(res => {
    const m = $('#modal'); $('.modal-card', m).innerHTML = html; m.hidden = false;
    const inp = $('input', m); if (inp) setTimeout(() => inp.focus(), 50);
    m.onclick = e => {
      const b = e.target.closest('[data-raspuns]');
      if (b || e.target === m) { m.hidden = true; m.onclick = null; res(b && b.dataset.raspuns === 'da' ? (inp ? inp.value : true) : false); }
    };
  });
}

const PRAG_IMPLICIT = 1000;
const prag = () => +(localStorage.getItem('adm_prag') || PRAG_IMPLICIT);
let tab = 'cereri', filtru = 'nou', jucatori = [], cautare = '';

async function porneste() {
  $('#demo-adm').hidden = !NET.demo;
  try {
    if (NET.demo || await NET.sesiune()) return verificaAdmin();
  } catch (e) { /* */ }
  $('#login-adm').hidden = false;
}
$('#b-intra').onclick = async () => {
  $('#e-eroare').textContent = '';
  try { await NET.intra($('#e-email').value.trim(), $('#e-parola').value); verificaAdmin(); }
  catch (e) { $('#e-eroare').textContent = e.message; }
};
$('#e-parola').onkeydown = e => { if (e.key === 'Enter') $('#b-intra').click(); };
$('#b-iesi').onclick = async () => { await NET.iesi(); location.reload(); };

async function verificaAdmin() {
  let ok = false;
  try { ok = await NET.esteAdmin(); } catch (e) { $('#e-eroare').textContent = e.message; }
  if (!ok) {
    $('#login-adm').hidden = false;
    $('#e-eroare').textContent = 'Contul acesta nu este admin. Rulează fișierul admin.sql în Supabase cu emailul tău.';
    return;
  }
  $('#login-adm').hidden = true; $('#panou').hidden = false; $('#b-iesi').hidden = NET.demo;
  randeaza(); actualizeazaBulina();
  setInterval(() => { actualizeazaBulina(); if (tab === 'cereri' && !document.querySelector('.cerere input:focus') && $('#modal').hidden) randeaza(true); }, 20000);
}

async function actualizeazaBulina() {
  try {
    const n = await NET.numarCereri(); const b = $('#nr-noi');
    b.hidden = !n; b.textContent = n; document.title = (n ? `(${n}) ` : '') + 'Panou admin — Clash of România';
  } catch (e) { /* */ }
}

$$('.tab-adm button').forEach(b => b.onclick = () => {
  tab = b.dataset.tab; $$('.tab-adm button').forEach(x => x.classList.toggle('activ', x === b)); randeaza();
});

async function randeaza(tacut) {
  const c = $('#continut');
  if (!tacut) c.innerHTML = '<p class="gol">Se încarcă…</p>';
  try {
    if (tab === 'cereri') await randeazaCereri(c);
    else if (tab === 'jucatori') await randeazaJucatori(c);
    else if (tab === 'jurnal') await randeazaJurnal(c);
    else randeazaSetari(c);
  } catch (e) { c.innerHTML = `<p class="eroare">${esc(e.message)}</p>`; }
}

const FILTRE = [['nou', 'Noi'], ['asteptare', 'În așteptare'], ['aprobat', 'Aprobate'], ['respins', 'Respinse']];
async function randeazaCereri(c) {
  const l = await NET.cereriAdmin(filtru);
  const p = prag();
  const carduri = l.map(r => {
    const mult = r.suma >= p, deschisa = r.status === 'nou' || r.status === 'asteptare';
    return `<div class="cerere ${mult && deschisa ? 'mult' : ''}" data-id="${r.id}">
      <div class="sus"><div><span class="cine">${esc(r.nume)}</span>${mult ? '<span class="avert">MULT</span>' : ''}
        <small>${esc(r.pachet || '')}${r.pachet && r.motiv ? ' · ' : ''}${esc(r.motiv || '')}</small>
        <small>${data(r.creat)}${r.decis ? ' · decis ' + data(r.decis) : ''}</small>
        ${r.nota ? `<small class="nota-admin">Notă: ${esc(r.nota)}</small>` : ''}</div>
        <div class="suma">${ico('galbeni')}${fmt(r.suma)}</div></div>
      ${deschisa ? `<input class="nota-in" maxlength="200" placeholder="Notă pentru jucător (opțional)">
        <div class="rand-butoane">
          <button class="btn verde" data-dec="aprobat">✓ Aprobă</button>
          ${r.status === 'nou' ? '<button class="btn galben" data-dec="asteptare">⏸ Așteptare</button>' : ''}
          <button class="btn rosu" data-dec="respins">✕ Respinge</button>
        </div>` : ''}</div>`;
  }).join('');
  c.innerHTML = `<div class="filtre">${FILTRE.map(([k, n]) => `<button data-f="${k}" class="${filtru === k ? 'activ' : ''}">${n}</button>`).join('')}</div>
    <p class="nota mic">Cererile de ${ico('galbeni')}${fmt(p)} sau mai mult sunt marcate cu <span class="avert">MULT</span>. Pragul se schimbă din Setări.</p>
    ${carduri || '<p class="gol">Nicio cerere aici.</p>'}`;
  $$('[data-f]', c).forEach(b => b.onclick = () => { filtru = b.dataset.f; randeaza(); });
  $$('[data-dec]', c).forEach(b => b.onclick = () => decide(b));
}

async function decide(b) {
  const card = b.closest('.cerere'); const id = +card.dataset.id; const status = b.dataset.dec;
  const nota = $('.nota-in', card).value.trim();
  const suma = $('.suma', card).textContent; const cine = $('.cine', card).textContent;
  const text = { aprobat: `Aprobi <b>${suma}</b> galbeni pentru <b>${esc(cine)}</b>?`, asteptare: `Pui cererea lui <b>${esc(cine)}</b> în așteptare?`, respins: `Respingi cererea lui <b>${esc(cine)}</b>?` }[status];
  if (!await modal(`<p>${text}</p><div class="rand-butoane"><button class="btn" data-raspuns="nu">Nu</button><button class="btn verde" data-raspuns="da">Da</button></div>`)) return;
  $$('button', card).forEach(x => x.disabled = true);
  try {
    await NET.decide(id, status, nota);
    toast({ aprobat: 'Aprobat! Galbenii au fost trimiși.', asteptare: 'Pusă în așteptare.', respins: 'Respinsă.' }[status], status === 'respins' ? 'eroare' : 'bun');
    randeaza(true); actualizeazaBulina();
  } catch (e) { toast(e.message, 'eroare'); $$('button', card).forEach(x => x.disabled = false); }
}

async function randeazaJucatori(c) {
  jucatori = await NET.jucatoriAdmin();
  const lista = () => {
    const q = cautare.toLowerCase();
    const f = jucatori.filter(j => !q || j.nume.toLowerCase().includes(q));
    return f.map(j => `<div class="jucator ${j.blocat ? 'blocat' : ''}" data-id="${j.id}">
      <div><b>${esc(j.nume)}</b>${j.blocat ? ' <span class="avert" style="background:#b3201a">BLOCAT</span>' : ''}
      <small>${(REGIUNI.find(r => r.id === j.regiune) || {}).nume || ''} · ${ico('trofeu')}${fmt(j.trofee)} · activ ${data(j.actualizat)}</small></div>
      <b>${ico('galbeni')}${fmt(j.galbeni)}</b>
      <button class="btn mic galben" data-a="da">±</button>
      <button class="btn mic ${j.blocat ? 'verde' : 'rosu'}" data-a="bloc">${j.blocat ? 'Deblochează' : 'Blochează'}</button></div>`).join('') || '<p class="gol">Niciun jucător.</p>';
  };
  c.innerHTML = `<label>Caută jucător<input id="cauta" value="${esc(cautare)}" placeholder="nume…"></label><p class="nota mic">${jucatori.length} jucători în total</p><div id="lj">${lista()}</div>`;
  $('#cauta').oninput = e => { cautare = e.target.value; $('#lj').innerHTML = lista(); };
  $('#lj').onclick = async e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const j = jucatori.find(x => x.id === b.closest('.jucator').dataset.id); if (!j) return;
    try {
      if (b.dataset.a === 'da') {
        const v = await modal(`<h3>Galbeni pentru ${esc(j.nume)}</h3><p>Scrie suma. Cu minus (ex: -100) iei galbeni înapoi.</p><input type="number" inputmode="numeric" placeholder="ex: 200">
          <div class="rand-butoane"><button class="btn" data-raspuns="nu">Anulează</button><button class="btn verde" data-raspuns="da">Trimite</button></div>`);
        const n = parseInt(v, 10); if (!v || !n) return;
        j.galbeni = await NET.daGalbeni(j.id, n, n > 0 ? 'Cadou de la admin' : 'Retras de admin');
        toast(`${j.nume} are acum ${fmt(j.galbeni)} galbeni.`, 'bun');
      } else {
        if (!await modal(`<p>${j.blocat ? 'Deblochezi' : 'Blochezi'} jucătorul <b>${esc(j.nume)}</b>?${j.blocat ? '' : ' Nu va mai putea cere galbeni sau ataca.'}</p><div class="rand-butoane"><button class="btn" data-raspuns="nu">Nu</button><button class="btn ${j.blocat ? 'verde' : 'rosu'}" data-raspuns="da">Da</button></div>`)) return;
        await NET.blocheaza(j.id, !j.blocat); j.blocat = !j.blocat;
      }
      $('#lj').innerHTML = lista();
    } catch (err) { toast(err.message, 'eroare'); }
  };
}

async function randeazaJurnal(c) {
  const l = await NET.jurnal();
  c.innerHTML = l.length ? '<ul class="cereri jurnal">' + l.map(r => `<li><div><b>${esc((r.players && r.players.nume) || '?')}</b><small>${esc(r.motiv || '')} · ${data(r.creat)}</small></div>
    <b class="${r.delta > 0 ? 'plus' : 'minus'}">${r.delta > 0 ? '+' : ''}${fmt(r.delta)}</b></li>`).join('') + '</ul>' : '<p class="gol">Încă nu s-au mișcat galbeni.</p>';
}

function randeazaSetari(c) {
  c.innerHTML = `<label>Prag „cerere mare” (galbeni)<input id="s-prag" type="number" min="1" value="${prag()}"></label>
    <p class="nota">Cererile peste prag apar marcate cu <span class="avert">MULT</span>, ca să le vezi ușor și să le pui în așteptare.</p>
    <button class="btn verde" id="s-salv">Salvează</button>
    <h3 style="font-family:var(--font-titlu);color:var(--albastru)">Cum funcționează</h3>
    <ul class="lista-simpla">
      <li><b>Aprobă</b> — galbenii ajung imediat în contul jucătorului.</li>
      <li><b>Așteptare</b> — cererea rămâne deschisă; o poți aproba sau respinge mai târziu.</li>
      <li><b>Respinge</b> — jucătorul vede că i s-a refuzat (și nota ta, dacă ai scris una).</li>
      <li>Un jucător poate avea cel mult 3 cereri deschise deodată.</li>
    </ul>`;
  $('#s-salv').onclick = () => { const v = parseInt($('#s-prag').value, 10); if (v > 0) { localStorage.setItem('adm_prag', v); toast('Salvat.', 'bun'); } };
}

porneste();
