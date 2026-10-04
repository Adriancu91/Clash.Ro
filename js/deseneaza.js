'use strict';
// Desenarea clădirilor și oștenilor (grafică minimală, fără imagini)

function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function poli(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }

const _teren = {};
function deseneazaTeren(g, T, dusman) {
  const W = Math.round(T * GRID); const cheie = W + (dusman ? 'd' : 'p') + (window.devicePixelRatio || 1);
  let c = _teren[cheie];
  if (!c) {
    const dpr = window.devicePixelRatio || 1;
    c = document.createElement('canvas'); c.width = W * dpr; c.height = W * dpr;
    const t = c.getContext('2d'); t.scale(dpr, dpr);
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
      t.fillStyle = (x + y) % 2 ? (dusman ? '#7c9550' : '#77a24c') : (dusman ? '#839c56' : '#7eaa52');
      t.fillRect(x * T, y * T, T + 0.6, T + 0.6);
    }
    const r = rng(dusman ? 77 : 42);
    const flori = ['#ffffff', '#f2d14b', '#d8433a', '#4b6fd1'];
    for (let i = 0; i < 70; i++) {
      t.fillStyle = flori[i % 4]; t.globalAlpha = 0.75;
      t.beginPath(); t.arc(r() * W, r() * W, Math.max(1, T * 0.07), 0, 7); t.fill();
    }
    t.globalAlpha = 0.18; t.fillStyle = '#2d4a1c';
    for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * W; t.fillRect(x, y, T * 0.05, T * 0.22); t.fillRect(x + T * 0.1, y + T * 0.05, T * 0.05, T * 0.18); }
    t.globalAlpha = 1;
    _teren[cheie] = c;
  }
  g.drawImage(c, 0, 0, W, W);
}

function iconRes(g, res, x, y, r) {
  g.save();
  if (res === 'grau') {
    g.strokeStyle = '#9c7414'; g.lineWidth = Math.max(1, r * 0.15);
    g.beginPath(); g.moveTo(x, y + r); g.lineTo(x, y - r * 0.8); g.stroke();
    g.fillStyle = '#eab92f';
    for (const [dx, dy, a] of [[-0.3, 0.2, -0.5], [0.3, 0.2, 0.5], [-0.3, -0.25, -0.5], [0.3, -0.25, 0.5], [0, -0.7, 0]]) {
      g.beginPath(); g.ellipse(x + dx * r, y + dy * r, r * 0.22, r * 0.36, a, 0, 7); g.fill();
    }
  } else {
    const aur = res === 'galbeni';
    g.fillStyle = aur ? '#f5c518' : '#d3d9de'; g.strokeStyle = aur ? '#a8820a' : '#717d86'; g.lineWidth = Math.max(1, r * 0.18);
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
    g.fillStyle = aur ? '#a8820a' : '#4c5862'; g.font = `bold ${r * 1.15}px Nunito, Arial, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(aur ? 'G' : 'L', x, y + r * 0.08);
  }
  g.restore();
}

// o: {t, sel, constructie, progres, distrus, viata, unghi, faraNivel}
function deseneazaCladire(g, T, tip, nivel, x, y, o = {}) {
  const d = CLADIRI[tip], s = d.size, px = x * T, py = y * T, w = s * T;
  if (o.distrus) {
    g.fillStyle = 'rgba(60,45,30,.35)'; rr(g, px + T * 0.1, py + T * 0.1, w - T * 0.2, w - T * 0.2, T * 0.2); g.fill();
    const r = rng(x * 31 + y * 17);
    for (let i = 0; i < s * s * 4; i++) {
      g.fillStyle = ['#6b5a48', '#8a7a66', '#4e4236'][i % 3];
      g.fillRect(px + T * 0.15 + r() * (w - T * 0.5), py + T * 0.15 + r() * (w - T * 0.5), T * (0.15 + r() * 0.2), T * (0.12 + r() * 0.15));
    }
    return;
  }
  const m = T * 0.08, X = px + m, Y = py + m, S = w - 2 * m, u = S / 10, cx = px + w / 2, cy = py + w / 2;
  const lw = Math.max(1, T * 0.07);
  g.lineWidth = lw; g.lineJoin = 'round';
  // umbră
  if (tip !== 'zid') { g.fillStyle = 'rgba(0,0,0,.18)'; rr(g, X + T * 0.08, Y + T * 0.12, S, S, u * 1.2); g.fill(); }
  const contur = '#4a3520';
  switch (tip) {
    case 'primarie': {
      g.fillStyle = '#d9c49a'; g.strokeStyle = contur; rr(g, X, Y, S, S, u); g.fill(); g.stroke();
      g.fillStyle = '#f4ead2'; g.fillRect(X + u * 1.2, Y + u * 4.2, S - u * 2.4, u * 4.8); g.strokeRect(X + u * 1.2, Y + u * 4.2, S - u * 2.4, u * 4.8);
      g.fillStyle = '#b23a2e'; poli(g, [X + u * 0.5, Y + u * 4.6, cx, Y + u * 1.0, X + S - u * 0.5, Y + u * 4.6]); g.fill(); g.stroke();
      g.fillStyle = '#6b3f22'; g.fillRect(cx - u * 0.9, Y + u * 6.6, u * 1.8, u * 2.4);
      g.fillStyle = '#86b6dc'; g.fillRect(X + u * 2.2, Y + u * 5.4, u * 1.4, u * 1.3); g.fillRect(X + S - u * 3.6, Y + u * 5.4, u * 1.4, u * 1.3);
      // steagul tricolor
      g.strokeStyle = '#3a2a1a'; g.beginPath(); g.moveTo(cx, Y + u * 1.0); g.lineTo(cx, Y - u * 1.6); g.stroke();
      const fw = u * 0.7, fh = u * 1.3, fx = cx + lw / 2, fy = Y - u * 1.6;
      g.fillStyle = '#002B7F'; g.fillRect(fx, fy, fw, fh); g.fillStyle = '#FCD116'; g.fillRect(fx + fw, fy, fw, fh); g.fillStyle = '#CE1126'; g.fillRect(fx + fw * 2, fy, fw, fh);
      break;
    }
    case 'moara': {
      g.fillStyle = '#e8d9a8'; g.strokeStyle = contur; g.beginPath(); g.arc(cx, cy, S * 0.36, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#8b5a2b'; g.beginPath(); g.arc(cx, cy, S * 0.15, 0, 7); g.fill(); g.stroke();
      g.save(); g.translate(cx, cy); g.rotate((o.t || 0) / 700);
      for (let k = 0; k < 4; k++) {
        g.rotate(Math.PI / 2); g.fillStyle = '#fbf6ea'; g.fillRect(S * 0.06, -u * 0.6, S * 0.44, u * 1.2); g.strokeRect(S * 0.06, -u * 0.6, S * 0.44, u * 1.2);
      }
      g.restore();
      g.fillStyle = '#5a3a1c'; g.beginPath(); g.arc(cx, cy, u * 0.6, 0, 7); g.fill();
      break;
    }
    case 'mina': {
      g.fillStyle = '#8a7660'; g.strokeStyle = contur;
      g.beginPath(); g.moveTo(X, Y + S); g.quadraticCurveTo(X + S * 0.05, Y + S * 0.1, cx, Y + S * 0.08); g.quadraticCurveTo(X + S * 0.95, Y + S * 0.1, X + S, Y + S); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#6d5c49'; g.beginPath(); g.arc(X + S * 0.3, Y + S * 0.42, u * 1.2, 0, 7); g.fill();
      g.fillStyle = '#231a12'; g.beginPath(); g.moveTo(cx - u * 2.2, Y + S); g.lineTo(cx - u * 2.2, Y + S * 0.62); g.arc(cx, Y + S * 0.62, u * 2.2, Math.PI, 0); g.lineTo(cx + u * 2.2, Y + S); g.closePath(); g.fill();
      g.strokeStyle = '#7a4f24'; g.lineWidth = lw * 1.4; g.beginPath(); g.moveTo(cx - u * 2.6, Y + S); g.lineTo(cx - u * 2.6, Y + S * 0.55); g.lineTo(cx + u * 2.6, Y + S * 0.55); g.lineTo(cx + u * 2.6, Y + S); g.stroke();
      g.lineWidth = lw;
      g.fillStyle = '#f2c94c'; g.strokeStyle = '#9a7313';
      for (const [a, b] of [[0.72, 0.38], [0.8, 0.5], [0.28, 0.66]]) { g.beginPath(); g.arc(X + S * a, Y + S * b, u * 0.75, 0, 7); g.fill(); g.stroke(); }
      break;
    }
    case 'hambar': {
      g.strokeStyle = '#3a1c10';
      g.fillStyle = '#a24e2e'; g.fillRect(X + u * 0.8, Y + u * 3.6, S - u * 1.6, S - u * 3.8); g.strokeRect(X + u * 0.8, Y + u * 3.6, S - u * 1.6, S - u * 3.8);
      g.fillStyle = '#5c2a19'; poli(g, [X, Y + u * 4, cx, Y + u * 0.4, X + S, Y + u * 4]); g.fill(); g.stroke();
      g.strokeStyle = '#f3e7d0'; g.lineWidth = lw * 1.2; const dx = cx - u * 1.8, dy = Y + u * 5.6, dw = u * 3.6, dh = u * 4;
      g.strokeRect(dx, dy, dw, dh); g.beginPath(); g.moveTo(dx, dy); g.lineTo(dx + dw, dy + dh); g.moveTo(dx + dw, dy); g.lineTo(dx, dy + dh); g.stroke();
      g.lineWidth = lw;
      break;
    }
    case 'vistierie': {
      g.fillStyle = '#cfc6b4'; g.strokeStyle = '#6a6153'; rr(g, X, Y, S, S, u); g.fill(); g.stroke();
      g.strokeStyle = '#2e1a0b'; g.fillStyle = '#7a4a24'; rr(g, X + u * 1.4, Y + u * 3.6, S - u * 2.8, S - u * 5, u * 0.6); g.fill(); g.stroke();
      g.fillStyle = '#5a3418'; rr(g, X + u * 1.4, Y + u * 2.2, S - u * 2.8, u * 2.2, u); g.fill(); g.stroke();
      g.fillStyle = '#e2b53a'; g.fillRect(X + u * 1.4, Y + u * 5.2, S - u * 2.8, u * 0.9);
      g.fillStyle = '#f5d76e'; g.fillRect(cx - u * 0.7, Y + u * 4.6, u * 1.4, u * 1.8); g.strokeRect(cx - u * 0.7, Y + u * 4.6, u * 1.4, u * 1.8);
      iconRes(g, 'galbeni', X + u * 2.6, Y + u * 1.8, u * 0.9); iconRes(g, 'lei', X + S - u * 2.4, Y + u * 1.6, u * 0.9);
      break;
    }
    case 'cazarma': {
      g.strokeStyle = '#3c2612'; g.fillStyle = '#8c6239'; g.fillRect(X, Y + u * 2.4, S, S - u * 2.4); g.strokeRect(X, Y + u * 2.4, S, S - u * 2.4);
      g.fillStyle = '#8c6239';
      const n = 7; for (let i = 0; i < n; i++) { const sx = X + (S / n) * i; poli(g, [sx, Y + u * 2.5, sx + S / n / 2, Y + u * 1.2, sx + S / n, Y + u * 2.5]); g.fill(); g.stroke(); }
      g.strokeStyle = 'rgba(40,24,10,.5)'; for (let i = 1; i < n; i++) { const sx = X + (S / n) * i; g.beginPath(); g.moveTo(sx, Y + u * 2.5); g.lineTo(sx, Y + S); g.stroke(); }
      g.fillStyle = '#efe4cc'; g.strokeStyle = '#5e4a2c'; poli(g, [cx - u * 3, Y + S - u * 1.2, cx, Y + u * 3.6, cx + u * 3, Y + S - u * 1.2]); g.fill(); g.stroke();
      g.strokeStyle = '#d9dde0'; g.lineWidth = lw * 1.6; g.beginPath();
      g.moveTo(cx - u * 1.6, Y + u * 5.2); g.lineTo(cx + u * 1.6, Y + u * 8.4); g.moveTo(cx + u * 1.6, Y + u * 5.2); g.lineTo(cx - u * 1.6, Y + u * 8.4); g.stroke();
      g.lineWidth = lw; g.fillStyle = '#CE1126'; poli(g, [X + S - u * 1.2, Y + u * 0.2, X + S - u * 1.2, Y + u * 2, X + S + u * 0.4, Y + u * 1.1]); g.fill();
      break;
    }
    case 'turn': {
      g.fillStyle = '#b9b2a3'; g.strokeStyle = '#4f483d'; g.beginPath(); g.arc(cx, cy, S * 0.45, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#a39b8b';
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.save(); g.translate(cx + Math.cos(a) * S * 0.38, cy + Math.sin(a) * S * 0.38); g.rotate(a); g.fillRect(-u * 0.8, -u * 0.8, u * 1.6, u * 1.6); g.strokeRect(-u * 0.8, -u * 0.8, u * 1.6, u * 1.6); g.restore(); }
      g.fillStyle = '#857e70'; g.beginPath(); g.arc(cx, cy, S * 0.25, 0, 7); g.fill(); g.stroke();
      g.save(); g.translate(cx, cy); g.rotate(o.unghi != null ? o.unghi : -0.7);
      g.fillStyle = '#3d7a3a'; g.strokeStyle = '#fff'; g.beginPath(); g.arc(0, 0, u * 1.2, 0, 7); g.fill(); g.stroke();
      g.strokeStyle = '#6b4a22'; g.beginPath(); g.arc(u * 0.4, 0, u * 1.7, -1.1, 1.1); g.stroke();
      g.restore();
      break;
    }
    case 'tun': {
      g.fillStyle = '#7b5b3a'; g.strokeStyle = contur; rr(g, X + u, Y + u, S - u * 2, S - u * 2, u * 1.5); g.fill(); g.stroke();
      g.fillStyle = '#5a4128'; g.beginPath(); g.arc(cx, cy, S * 0.28, 0, 7); g.fill(); g.stroke();
      g.save(); g.translate(cx, cy); g.rotate(o.unghi != null ? o.unghi : -0.8);
      g.fillStyle = '#2b2b2b'; g.strokeStyle = '#111'; rr(g, -u * 0.8, -u * 1.05, S * 0.52, u * 2.1, u * 0.8); g.fill(); g.stroke();
      g.fillStyle = '#444'; g.fillRect(S * 0.52 - u * 1.4, -u * 1.3, u * 0.9, u * 2.6);
      g.restore();
      g.fillStyle = '#3a3a3a'; g.beginPath(); g.arc(cx, cy, u * 1.1, 0, 7); g.fill();
      break;
    }
    case 'zid': {
      const cul = ['#a9a39a', '#b3ab9c', '#c2b7a0', '#9d9fa6', '#c9b27d', '#7d7d86'][Math.max(0, Math.min(5, nivel - 1))];
      g.fillStyle = cul; g.strokeStyle = '#4b4a46'; rr(g, px + T * 0.05, py + T * 0.05, T * 0.9, T * 0.9, T * 0.14); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = Math.max(0.6, T * 0.04); g.beginPath();
      g.moveTo(px + T * 0.1, py + T * 0.5); g.lineTo(px + T * 0.9, py + T * 0.5); g.moveTo(px + T * 0.5, py + T * 0.12); g.lineTo(px + T * 0.5, py + T * 0.5);
      g.moveTo(px + T * 0.3, py + T * 0.5); g.lineTo(px + T * 0.3, py + T * 0.88); g.moveTo(px + T * 0.72, py + T * 0.5); g.lineTo(px + T * 0.72, py + T * 0.88); g.stroke();
      break;
    }
  }
  if (o.constructie) {
    g.save(); rr(g, px + 1, py + 1, w - 2, w - 2, T * 0.15); g.clip();
    g.strokeStyle = 'rgba(214,170,90,.75)'; g.lineWidth = Math.max(1.5, T * 0.1);
    for (let k = -w; k < w * 2; k += T * 0.5) { g.beginPath(); g.moveTo(px + k, py); g.lineTo(px + k - w, py + w); g.stroke(); }
    g.restore();
    const p = Math.max(0, Math.min(1, o.progres || 0));
    g.fillStyle = 'rgba(0,0,0,.6)'; rr(g, px + T * 0.15, py + w - T * 0.42, w - T * 0.3, T * 0.3, T * 0.15); g.fill();
    g.fillStyle = '#FCD116'; rr(g, px + T * 0.18, py + w - T * 0.39, Math.max(T * 0.1, (w - T * 0.36) * p), T * 0.24, T * 0.12); g.fill();
  }
  if (tip !== 'zid' && !o.faraNivel && nivel > 0) {
    const bx = px + w - T * 0.36, by = py + w - T * 0.36 - (o.constructie ? T * 0.4 : 0), br = Math.max(5, T * 0.3);
    g.fillStyle = '#002B7F'; g.strokeStyle = '#FCD116'; g.lineWidth = Math.max(1, T * 0.07);
    g.beginPath(); g.arc(bx, by, br, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.font = `800 ${br * 1.25}px Nunito, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(nivel, bx, by + br * 0.06);
  }
  if (o.sel) {
    g.save(); g.strokeStyle = '#FCD116'; g.lineWidth = Math.max(2, T * 0.12); g.setLineDash([T * 0.35, T * 0.2]);
    g.lineDashOffset = -((o.t || 0) / 60) % 100; rr(g, px - 1, py - 1, w + 2, w + 2, T * 0.2); g.stroke(); g.restore();
  }
  if (o.viata != null && o.viata < 1) {
    const bw = Math.max(T * 0.9, w * 0.8), bx = px + (w - bw) / 2, by = py - T * 0.05;
    g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(bx, by, bw, Math.max(3, T * 0.18));
    g.fillStyle = o.viata > 0.5 ? '#5fd35f' : o.viata > 0.25 ? '#f2c94c' : '#e8513f';
    g.fillRect(bx + 1, by + 1, (bw - 2) * Math.max(0, o.viata), Math.max(1, T * 0.18 - 2));
  }
}

function deseneazaOsten(g, T, tip, x, y, o = {}) {
  const d = OSTENI[tip]; const px = x * T, py = y * T;
  const r = T * (tip === 'pandur' ? 0.42 : tip === 'calaret' ? 0.38 : 0.3);
  g.save(); g.translate(px, py);
  g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(0, r * 0.7, r * 0.9, r * 0.4, 0, 0, 7); g.fill();
  if (o.lovit) { g.translate(Math.cos(o.dir || 0) * r * 0.25, Math.sin(o.dir || 0) * r * 0.25); }
  g.lineWidth = Math.max(1, T * 0.07); g.strokeStyle = '#fff'; g.fillStyle = d.culoare;
  if (tip === 'calaret') {
    g.save(); g.rotate(o.dir || 0); g.fillStyle = '#6b4423'; g.beginPath(); g.ellipse(0, 0, r * 1.1, r * 0.6, 0, 0, 7); g.fill(); g.stroke(); g.restore();
    g.fillStyle = d.culoare; g.beginPath(); g.arc(0, 0, r * 0.5, 0, 7); g.fill(); g.stroke();
  } else {
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.stroke();
    if (tip === 'haiduc') { g.fillStyle = '#1d1d1d'; g.fillRect(-r * 0.75, -r * 0.95, r * 1.5, r * 0.45); g.fillRect(-r * 0.4, -r * 1.3, r * 0.8, r * 0.45); }
    if (tip === 'arcas') { g.strokeStyle = '#e8d29a'; g.beginPath(); g.arc(0, 0, r * 0.65, (o.dir || 0) - 1.2, (o.dir || 0) + 1.2); g.stroke(); }
    if (tip === 'pandur') { g.fillStyle = '#c9ccd1'; g.strokeStyle = '#555'; rr(g, -r * 0.45, -r * 0.55, r * 0.9, r * 1.1, r * 0.3); g.fill(); g.stroke(); }
  }
  g.restore();
  if (o.viata != null && o.viata < 1) {
    const bw = T * 0.7; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(px - bw / 2, py - r - T * 0.22, bw, Math.max(2, T * 0.12));
    g.fillStyle = o.viata > 0.5 ? '#5fd35f' : '#e8513f'; g.fillRect(px - bw / 2, py - r - T * 0.22, bw * Math.max(0, o.viata), Math.max(2, T * 0.12));
  }
}

function deseneazaMini(canvas, tip, osten) {
  const css = 46, dpr = window.devicePixelRatio || 1;
  canvas.width = css * dpr; canvas.height = css * dpr; canvas.style.width = css + 'px'; canvas.style.height = css + 'px';
  const g = canvas.getContext('2d'); g.scale(dpr, dpr);
  if (osten) { deseneazaOsten(g, 40, tip, css / 2 / 40, css / 2 / 40 + 0.05, {}); return; }
  const s = CLADIRI[tip].size; const T = (css - 6) / s;
  g.translate(3, 5); deseneazaCladire(g, T, tip, 1, 0, 0, { faraNivel: true, t: 0 });
}
