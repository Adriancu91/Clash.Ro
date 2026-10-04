'use strict';
// Harta României (SVG desenat din cod)

const Harta = (() => {
  const P = (lon, lat) => [+((lon - 20) * 100).toFixed(1), +((48.45 - lat) * 144).toFixed(1)];
  const cale = pts => pts.map((p, i) => (i ? 'L' : 'M') + P(p[0], p[1]).join(',')).join(' ');

  function cetateDeblocata(i, campanie) { return i === 0 || (campanie[CETATI[i - 1].id] || 0) >= 1 || CETATI[i].th === 1; }

  function svg(campanie, numar) {
    let s = '<svg viewBox="40 0 960 715" class="harta-svg" xmlns="http://www.w3.org/2000/svg">';
    s += `<path d="${cale(MAREA_NEAGRA)}Z" fill="#9cc3e0"/>`;
    const [mx, my] = P(29.55, 44.1);
    s += `<text x="${mx}" y="${my}" class="h-mare" transform="rotate(-70 ${mx} ${my})">Marea Neagră</text>`;
    s += `<path d="${cale(CONTUR_RO)}Z" fill="#efe3c0" stroke="#7a5c3a" stroke-width="5" stroke-linejoin="round"/>`;
    s += `<path d="${cale(CARPATI)}" fill="none" stroke="#9db27a" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>`;
    s += `<path d="${cale(APUSENI)}" fill="none" stroke="#9db27a" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/>`;
    // munți mici
    for (const [lon, lat] of CARPATI.concat(APUSENI)) {
      const [x, y] = P(lon, lat);
      s += `<path d="M${x - 11},${y + 7} L${x},${y - 10} L${x + 11},${y + 7} Z" fill="#7d6a4f" opacity=".7"/>`;
    }
    s += `<path d="${cale(DUNAREA)}" fill="none" stroke="#4a86c5" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
    // regiuni
    for (const r of REGIUNI) {
      const [x, y] = P(r.lon, r.lat); const n = (numar && numar[r.id]) || 0;
      s += `<g class="h-reg" data-act="regiune" data-id="${r.id}">
        <circle cx="${x}" cy="${y}" r="27" fill="#002B7F" stroke="#FCD116" stroke-width="5"/>
        <text x="${x}" y="${y + 9}" class="h-nr">${n}</text>
        <text x="${x}" y="${y + 58}" class="h-nume">${r.nume}</text></g>`;
    }
    // cetăți
    CETATI.forEach((c, i) => {
      const [x, y] = P(c.lon, c.lat); const st = campanie[c.id] || 0; const desc = cetateDeblocata(i, campanie);
      const cul = !desc ? '#9a9387' : st >= 3 ? '#e2b53a' : st > 0 ? '#d07a2c' : '#CE1126';
      s += `<g class="h-cet" data-act="cetate" data-id="${c.id}" transform="translate(${x},${y})">
        <rect x="-26" y="-26" width="52" height="52" fill="transparent"/>
        <path d="M-14,14 V-6 H-14 V-14 H-8 V-8 H-3 V-14 H3 V-8 H8 V-14 H14 V14 Z" fill="${cul}" stroke="#3b2a18" stroke-width="3" stroke-linejoin="round"/>
        <rect x="-4" y="3" width="8" height="11" fill="#3b2a18"/>
        ${st ? `<text y="-20" class="h-stele">${'★'.repeat(st)}</text>` : ''}</g>`;
    });
    s += '</svg>';
    return s;
  }
  return { svg, cetateDeblocata };
})();
