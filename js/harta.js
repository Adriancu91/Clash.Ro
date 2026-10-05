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
  // ---------------- Harta Europei ----------------
  const PE = (lon, lat) => [+((lon + 6) * 20).toFixed(1), +((56 - lat) * 30).toFixed(1)];
  const caleE = pts => pts.map((p, i) => (i ? 'L' : 'M') + PE(p[0], p[1]).join(',')).join(' ') + 'Z';
  const USCAT = [[-9, 43.2], [-9.3, 38.8], [-8.9, 37], [-6, 36.2], [-2, 36.7], [0, 38.7], [3.2, 42], [3, 43.3], [6, 43.1], [8, 43.8], [10, 44],
    [12.3, 41.8], [15.6, 38], [16.6, 39.5], [18.5, 40.1], [17, 41], [14, 42.5], [12.4, 44.3], [12.3, 45.4], [13.7, 45.6], [15, 44.5], [17, 43.1],
    [19.4, 41.9], [20, 39.6], [21, 38.4], [22.5, 36.5], [23, 37.8], [24, 38.2], [23, 39.5], [23.7, 40.3], [26, 40.8], [26.2, 40], [26, 38.5],
    [27.2, 37], [28.5, 36.7], [30.5, 36.3], [36, 36.2], [42, 36.5], [42, 56], [21, 56], [21, 55.8], [20, 54.6], [18, 54.8], [14.2, 53.9],
    [11, 54], [9.9, 54.8], [8.6, 55.5], [8.5, 53.5], [7, 53.5], [4.6, 52.5], [3.6, 51.3], [1.6, 50.9], [1.5, 50], [-1.5, 49.7], [-1.6, 48.6],
    [-4.7, 48.4], [-2.3, 47.2], [-1.2, 46], [-1.8, 43.4]];
  const INSULE = [
    [[-5.7, 50], [1.4, 51.2], [1.7, 52.7], [0, 53.5], [-1.6, 55.6], [-3, 56], [-4.8, 54.8], [-3, 53.4], [-4.7, 52.8], [-5.2, 51.7]],
    [[12.4, 38.1], [15.6, 38.2], [15.1, 36.7]], [[8.4, 41.1], [9.8, 41], [9.6, 39.2], [8.5, 39]], [[8.6, 42.9], [9.5, 43], [9.4, 41.4], [8.8, 41.5]]];
  const NEAGRA = [[28, 41.3], [29, 41.2], [31, 41.2], [35, 42], [38, 41], [41.5, 41.5], [41.5, 42.5], [40, 43.5], [38, 44.4], [36.6, 45.3], [35, 45],
    [33.5, 44.5], [32.5, 45.4], [33.5, 46], [31, 46.6], [30.2, 45.8], [29.6, 45], [28.6, 43.8], [27.9, 43], [28, 41.9]];

  function cetateEuropaDeblocata(i, campanie) { return i === 0 ? (campanie.targoviste || 0) >= 1 : (campanie[CETATI_EUROPA[i - 1].id] || 0) >= 1; }

  function steag(t, x, y, r) {
    const id = 'st-' + t.id; const [a, b, c] = t.steag;
    const benzi = t.oriz
      ? `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r / 3}" fill="${a}"/><rect x="${x - r}" y="${y - r / 3}" width="${2 * r}" height="${2 * r / 3}" fill="${b}"/><rect x="${x - r}" y="${y + r / 3}" width="${2 * r}" height="${2 * r / 3}" fill="${c}"/>`
      : `<rect x="${x - r}" y="${y - r}" width="${2 * r / 3}" height="${2 * r}" fill="${a}"/><rect x="${x - r / 3}" y="${y - r}" width="${2 * r / 3}" height="${2 * r}" fill="${b}"/><rect x="${x + r / 3}" y="${y - r}" width="${2 * r / 3}" height="${2 * r}" fill="${c}"/>`;
    return `<clipPath id="${id}"><circle cx="${x}" cy="${y}" r="${r}"/></clipPath><g clip-path="url(#${id})">${benzi}</g><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#3b2a18" stroke-width="4"/>`;
  }

  function svgEuropa(campanie) {
    let s = '<svg viewBox="0 0 960 600" class="harta-svg" xmlns="http://www.w3.org/2000/svg"><rect width="960" height="600" fill="#9cc3e0"/>';
    s += `<path d="${caleE(USCAT)}" fill="#e9dcb5" stroke="#8a6c48" stroke-width="3" stroke-linejoin="round"/>`;
    for (const i of INSULE) s += `<path d="${caleE(i)}" fill="#e9dcb5" stroke="#8a6c48" stroke-width="3" stroke-linejoin="round"/>`;
    s += `<path d="${caleE(NEAGRA)}" fill="#9cc3e0" stroke="#8a6c48" stroke-width="3" stroke-linejoin="round"/>`;
    s += `<path d="${caleE(CONTUR_RO)}" fill="#f6e7b0" stroke="#002B7F" stroke-width="4" stroke-linejoin="round"/>`;
    const [rx, ry] = PE(25, 45.9);
    s += `<text x="${rx}" y="${ry + 8}" class="h-nume mic">România</text>`;
    // drumul cuceririlor
    let drum = `M${rx},${ry}`; for (const t of TARI) { const [x, y] = PE(t.lon, t.lat); drum += ` L${x},${y}`; }
    s += `<path d="${drum}" fill="none" stroke="#7a1a12" stroke-width="4" stroke-dasharray="10 8" opacity=".55"/>`;
    TARI.forEach((t, ti) => {
      const [x, y] = PE(t.lon, t.lat);
      s += steag(t, x, y, 20) + `<text x="${x}" y="${y + 42}" class="h-nume mic">${t.scurt || t.nume}</text>`;
      t.cetati.forEach(([id], j) => {
        const c = CETATI_EUROPA[ti * 2 + j]; const st = campanie[id] || 0; const desc = cetateEuropaDeblocata(c.idx, campanie);
        const cul = !desc ? '#9a9387' : st >= 3 ? '#e2b53a' : st > 0 ? '#d07a2c' : '#CE1126';
        const cx = x + (j ? 34 : -34), cy = y - 6;
        s += `<g class="h-cet" data-act="cetate-eu" data-id="${id}" transform="translate(${cx},${cy}) scale(.85)">
          <rect x="-24" y="-24" width="48" height="48" fill="transparent"/>
          <path d="M-14,14 V-6 H-14 V-14 H-8 V-8 H-3 V-14 H3 V-8 H8 V-14 H14 V14 Z" fill="${cul}" stroke="#3b2a18" stroke-width="3" stroke-linejoin="round"/>
          <rect x="-4" y="3" width="8" height="11" fill="#3b2a18"/>${st ? `<text y="-20" class="h-stele">${'★'.repeat(st)}</text>` : ''}</g>`;
      });
    });
    return s + '</svg>';
  }

  return { svg, cetateDeblocata, svgEuropa, cetateEuropaDeblocata };
})();
