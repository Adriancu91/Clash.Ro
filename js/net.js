'use strict';
// Legătura cu serverul (Supabase). Dacă nu e configurat în config.js,
// jocul merge în "mod demo": totul se salvează doar pe telefonul tău.

const NET = (() => {
  const cfg = window.CONFIG || {};
  const areServer = !!(cfg.SUPABASE_URL && cfg.SUPABASE_KEY && window.supabase && window.supabase.createClient);

  const ERORI = [
    [/Invalid login credentials/i, 'Email sau parolă greșită.'],
    [/User already registered/i, 'Există deja un cont cu acest email.'],
    [/Email not confirmed/i, 'Emailul nu e confirmat încă. Verifică-ți inboxul (și Spam).'],
    [/Password should be at least/i, 'Parola trebuie să aibă cel puțin 6 caractere.'],
    [/Unable to validate email|invalid format|valid email/i, 'Adresa de email nu e validă.'],
    [/Failed to fetch|NetworkError|Load failed|network/i, 'Nu există conexiune la internet.'],
    [/rate limit|too many/i, 'Prea multe încercări. Mai așteaptă puțin.'],
    [/JWT expired|invalid JWT/i, 'Sesiunea a expirat. Intră din nou în cont.'],
  ];
  const traduce = m => { for (const [r, t] of ERORI) if (r.test(m)) return t; return m; };
  const ver = ({ data, error }) => { if (error) throw new Error(traduce(error.message || 'Eroare')); return data; };
  const iso = () => new Date().toISOString();

  if (areServer) {
    const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
    let user = null;
    return {
      demo: false,
      idCurent: () => user && user.id,
      async sesiune() { const { data } = await sb.auth.getSession(); user = data.session ? data.session.user : null; return user; },
      async intra(email, parola) { const d = ver(await sb.auth.signInWithPassword({ email, password: parola })); user = d.user; return user; },
      async inregistrare(email, parola) {
        const d = ver(await sb.auth.signUp({ email, password: parola }));
        if (!d.session) { const e = new Error('Ți-am trimis un email de confirmare. Deschide linkul din email, apoi intră în cont.'); e.confirmare = true; throw e; }
        user = d.user; return user;
      },
      async iesi() { await sb.auth.signOut(); user = null; },
      async jucator() { if (!user) return null; return ver(await sb.from('players').select('*').eq('id', user.id).maybeSingle()); },
      async creeazaJucator(nume, regiune) { return ver(await sb.rpc('creeaza_jucator', { p_nume: nume, p_regiune: regiune })); },
      async salveaza(state) { ver(await sb.from('players').update({ state, actualizat: iso() }).eq('id', user.id)); },
      async cheltuie(suma, motiv) { return ver(await sb.rpc('cheltuie_galbeni', { p_suma: suma, p_motiv: motiv })); },
      async cere(suma, motiv, pachet) { return ver(await sb.rpc('cere_galbeni', { p_suma: suma, p_motiv: motiv || '', p_pachet: pachet || '' })); },
      async cererileMele() { return ver(await sb.from('cereri').select('*').eq('player_id', user.id).order('creat', { ascending: false }).limit(20)); },
      async adversar(tinta) { const d = ver(await sb.rpc('gaseste_adversar', { p_tinta: tinta || null })); return (d && d[0]) || null; },
      async atac(aparator, stele, procent, lei, grau, sare) {
        const baza = { p_aparator: aparator, p_stele: stele, p_procent: procent, p_lei: lei, p_grau: grau };
        const r = await sb.rpc('inregistreaza_atac', { ...baza, p_sare: sare || 0 });
        // compatibil cu baza de date veche (înainte de supabase_v2.sql)
        if (r.error && /function|schema cache/i.test(r.error.message || '')) return ver(await sb.rpc('inregistreaza_atac', baza));
        return ver(r);
      },
      async folosesteCetate() { const r = await sb.rpc('foloseste_cetate'); if (r.error && !/function|schema cache/i.test(r.error.message || '')) ver(r); },
      async areClanuri() { const r = await sb.from('clanuri').select('id', { head: true, count: 'exact' }).limit(1); return !r.error; },
      // ---- clan ----
      async cautaClanuri(text) { return ver(await sb.rpc('cauta_clanuri', { p_text: text || '' })) || []; },
      async clan(id) { return ver(await sb.from('clanuri').select('*').eq('id', id).maybeSingle()); },
      async creeazaClan(nume, descriere, tip, trofeeMin, steag) { return ver(await sb.rpc('creeaza_clan', { p_nume: nume, p_descriere: descriere, p_tip: tip, p_trofee_min: trofeeMin, p_steag: steag })); },
      async intraInClan(id) { return ver(await sb.rpc('intra_in_clan', { p_clan: id })); },
      async parasesteClan() { ver(await sb.rpc('paraseste_clan')); },
      async schimbaRol(id, rol) { ver(await sb.rpc('schimba_rol', { p_player: id, p_rol: rol })); },
      async editeazaClan(descriere, tip, trofeeMin, steag) { ver(await sb.rpc('editeaza_clan', { p_descriere: descriere, p_tip: tip, p_trofee_min: trofeeMin, p_steag: steag })); },
      async membri(clanId) { return ver(await sb.from('players').select('id,nume,trofee,clan_rol,regiune,actualizat').eq('clan_id', clanId).order('trofee', { ascending: false })); },
      async cereriClan(clanId) { return ver(await sb.from('clan_cereri').select('*').eq('clan_id', clanId).order('creat')); },
      async raspundeCerere(id, da) { ver(await sb.rpc('raspunde_cerere', { p_cerere: id, p_accept: da })); },
      async mesaje(clanId, dupa) { let q = sb.from('mesaje').select('*').eq('clan_id', clanId).order('id', { ascending: false }).limit(60); if (dupa) q = q.gt('id', dupa); return (ver(await q) || []).reverse(); },
      async mesajeActualizate(clanId, ids) { if (!ids.length) return []; return ver(await sb.from('mesaje').select('id,date').in('id', ids)) || []; },
      async trimiteMesaj(text) { ver(await sb.rpc('trimite_mesaj', { p_text: text })); },
      async cereTrupe(text, cap) { ver(await sb.rpc('cere_trupe', { p_text: text, p_cap: cap })); },
      async doneaza(id, tip, nivel) { return ver(await sb.rpc('doneaza', { p_mesaj: id, p_tip: tip, p_nivel: nivel })); },
      async razboiCurent() { return ver(await sb.rpc('razboi_curent')); },
      async razboiMembri(id) { return ver(await sb.from('razboi_membri').select('*').eq('razboi_id', id).order('pozitie')) || []; },
      async razboiAtacuri(id) { return ver(await sb.from('razboi_atacuri').select('*').eq('razboi_id', id).order('id')) || []; },
      async cautareRazboi(clanId) { return ver(await sb.from('razboi_cautari').select('*').eq('clan_id', clanId).maybeSingle()); },
      async cautaRazboi(n) { return ver(await sb.rpc('cauta_razboi', { p_marime: n })); },
      async anuleazaCautareRazboi() { ver(await sb.rpc('anuleaza_cautare_razboi')); },
      async atacRazboi(rid, tinta, stele, procent) { return ver(await sb.rpc('ataca_razboi', { p_razboi: rid, p_tinta: tinta, p_stele: stele, p_procent: procent })); },
      async revendica() { return ver(await sb.rpc('revendica_atacuri')) || []; },
      async cumparaScut(ore) { return ver(await sb.rpc('cumpara_scut', { p_ore: ore })); },
      async clasament() { return ver(await sb.from('players').select('id,nume,regiune,trofee').eq('blocat', false).order('trofee', { ascending: false }).limit(50)); },
      async regiuni() {
        const d = ver(await sb.from('players').select('regiune').eq('blocat', false).limit(5000));
        const m = {}; for (const r of d) m[r.regiune] = (m[r.regiune] || 0) + 1; return m;
      },
      async jucatoriRegiune(reg) {
        return ver(await sb.from('players').select('id,nume,trofee,scut_pana').eq('regiune', reg).eq('blocat', false).order('trofee', { ascending: false }).limit(30));
      },
      // ---- admin ----
      async esteAdmin() { return !!ver(await sb.rpc('este_admin')); },
      async cereriAdmin(status) {
        let q = sb.from('cereri').select('*').order('creat', { ascending: status === 'nou' || status === 'asteptare' }).limit(200);
        if (status) q = q.eq('status', status);
        return ver(await q);
      },
      async numarCereri() {
        const { count, error } = await sb.from('cereri').select('id', { count: 'exact', head: true }).eq('status', 'nou');
        if (error) throw new Error(traduce(error.message)); return count || 0;
      },
      async decide(id, status, nota) { return ver(await sb.rpc('admin_decide', { p_id: id, p_status: status, p_nota: nota || '' })); },
      async jucatoriAdmin() { return ver(await sb.from('players').select('id,nume,regiune,galbeni,trofee,blocat,actualizat,creat').order('actualizat', { ascending: false }).limit(1000)); },
      async daGalbeni(id, suma, motiv) { return ver(await sb.rpc('admin_da_galbeni', { p_player: id, p_suma: suma, p_motiv: motiv || '' })); },
      async blocheaza(id, b) { ver(await sb.rpc('admin_blocheaza', { p_player: id, p_blocat: b })); },
      async jurnal() { return ver(await sb.from('jurnal_galbeni').select('*, players(nume)').order('creat', { ascending: false }).limit(100)); },
    };
  }

  // ======================= MOD DEMO (fără server) =======================
  const K = 'clash_romania_demo_v1';
  const gol = () => ({ player: null, cereri: [], jurnal: [], nid: 1 });
  const ia = () => { try { return JSON.parse(localStorage.getItem(K)) || gol(); } catch (e) { return gol(); } };
  const pune = d => { try { localStorage.setItem(K, JSON.stringify(d)); } catch (e) { /* plin */ } };
  const err = m => { throw new Error(m); };
  function cheltuieDemo(suma, motiv) {
    const d = ia(); if (!d.player || d.player.galbeni < suma) err('Nu ai destui galbeni.');
    d.player.galbeni -= suma; d.jurnal.unshift({ id: d.nid++, player_id: 'demo', delta: -suma, motiv, creat: iso(), players: { nume: d.player.nume } });
    pune(d); return d;
  }
  return {
    demo: true,
    idCurent: () => 'demo',
    async sesiune() { return ia().player ? { id: 'demo' } : null; },
    async intra() { return { id: 'demo' }; },
    async inregistrare() { return { id: 'demo' }; },
    async iesi() {},
    async jucator() { return ia().player; },
    async creeazaJucator(nume, regiune) {
      const d = ia(); nume = String(nume || '').trim();
      if (nume.length < 3 || nume.length > 20) err('Numele trebuie să aibă între 3 și 20 de caractere');
      d.player = { id: 'demo', nume, regiune, state: {}, galbeni: 0, trofee: 0, scut_pana: null, blocat: false, creat: iso(), actualizat: iso() };
      pune(d); return d.player;
    },
    async salveaza(state) { const d = ia(); if (d.player) { d.player.state = state; d.player.actualizat = iso(); pune(d); } },
    async cheltuie(suma, motiv) { return cheltuieDemo(suma, motiv).player.galbeni; },
    async cere(suma, motiv, pachet) {
      const d = ia(); if (!d.player) err('Jucător inexistent');
      if (d.player.blocat) err('Contul tău este blocat.');
      if (!(suma >= 1 && suma <= 100000)) err('Poți cere între 1 și 100.000 de galbeni.');
      if (d.cereri.filter(c => c.status === 'nou' || c.status === 'asteptare').length >= 3) err('Ai deja 3 cereri fără răspuns. Așteaptă să fie aprobate.');
      const c = { id: d.nid++, player_id: 'demo', nume: d.player.nume, suma, pachet: pachet || null, motiv: motiv || null, status: 'nou', nota: null, creat: iso(), decis: null };
      d.cereri.unshift(c); pune(d); return c;
    },
    async cererileMele() { return ia().cereri.slice(0, 20); },
    async adversar() { return null; },
    async atac() { err('Nu există alți jucători în modul demo.'); },
    async folosesteCetate() {},
    async areClanuri() { return false; },
    async revendica() { return []; },
    async cumparaScut(ore) {
      const pret = ore === 24 ? 100 : 250; const d = cheltuieDemo(pret, 'Scut ' + ore + 'h');
      const baza = Math.max(Date.now(), d.player.scut_pana ? Date.parse(d.player.scut_pana) : 0);
      d.player.scut_pana = new Date(baza + ore * 3600000).toISOString(); pune(d); return d.player.scut_pana;
    },
    async clasament() { const p = ia().player; return p ? [{ id: 'demo', nume: p.nume, regiune: p.regiune, trofee: p.trofee }] : []; },
    async regiuni() { const p = ia().player; return p ? { [p.regiune]: 1 } : {}; },
    async jucatoriRegiune(reg) { const p = ia().player; return p && p.regiune === reg ? [{ id: 'demo', nume: p.nume, trofee: p.trofee, scut_pana: p.scut_pana }] : []; },
    // ---- admin (demo) ----
    async esteAdmin() { return true; },
    async cereriAdmin(status) {
      const l = ia().cereri.filter(c => !status || c.status === status);
      return (status === 'nou' || status === 'asteptare') ? l.slice().reverse() : l;
    },
    async numarCereri() { return ia().cereri.filter(c => c.status === 'nou').length; },
    async decide(id, status, nota) {
      const d = ia(); const c = d.cereri.find(x => x.id === id); if (!c) err('Cererea nu există.');
      if (c.status === 'aprobat' || c.status === 'respins') err('Cererea a fost deja decisă.');
      c.status = status; if (nota && nota.trim()) c.nota = nota.trim(); c.decis = status === 'asteptare' ? null : iso();
      if (status === 'aprobat' && d.player) {
        d.player.galbeni += c.suma;
        d.jurnal.unshift({ id: d.nid++, player_id: 'demo', delta: c.suma, motiv: 'Cerere aprobată #' + c.id, creat: iso(), players: { nume: d.player.nume } });
      }
      pune(d); return c;
    },
    async jucatoriAdmin() { const p = ia().player; return p ? [{ id: p.id, nume: p.nume, regiune: p.regiune, galbeni: p.galbeni, trofee: p.trofee, blocat: p.blocat, actualizat: p.actualizat, creat: p.creat }] : []; },
    async daGalbeni(id, suma, motiv) {
      const d = ia(); if (!d.player) err('Jucător inexistent');
      d.player.galbeni = Math.max(0, d.player.galbeni + suma);
      d.jurnal.unshift({ id: d.nid++, player_id: 'demo', delta: suma, motiv: motiv || 'Admin', creat: iso(), players: { nume: d.player.nume } });
      pune(d); return d.player.galbeni;
    },
    async blocheaza(id, b) { const d = ia(); if (d.player) { d.player.blocat = b; pune(d); } },
    async jurnal() { return ia().jurnal.slice(0, 100); },
    resetDemo() { localStorage.removeItem(K); },
  };
})();
