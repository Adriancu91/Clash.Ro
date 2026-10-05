-- =====================================================================
--  CLASH OF ROMÂNIA — v2: sare, ligi/scut ca în CoC, clanuri, donații,
--  cetatea clanului și războaie între clanuri.
--  Se rulează DUPĂ supabase.sql. Se poate rula de mai multe ori.
-- =====================================================================

-- ---------- coloane noi ----------
alter table public.atacuri add column if not exists sare int not null default 0;

create table if not exists public.clanuri (
  id          bigint generated always as identity primary key,
  nume        text not null unique check (char_length(nume) between 3 and 20),
  descriere   text not null default '' check (char_length(descriere) <= 200),
  tip         text not null default 'deschis' check (tip in ('deschis','inchis')),
  trofee_min  int not null default 0 check (trofee_min >= 0),
  steag       jsonb not null default '{}'::jsonb,
  victorii    int not null default 0,
  creat       timestamptz not null default now()
);

alter table public.players add column if not exists cetate   jsonb not null default '[]'::jsonb;
alter table public.players add column if not exists clan_id  bigint references public.clanuri(id) on delete set null;
alter table public.players add column if not exists clan_rol text check (clan_rol in ('lider','colider','batran','membru'));
create index if not exists players_clan_idx on public.players(clan_id);

create table if not exists public.clan_cereri (
  id         bigint generated always as identity primary key,
  clan_id    bigint not null references public.clanuri(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  nume       text not null,
  creat      timestamptz not null default now(),
  unique (clan_id, player_id)
);

create table if not exists public.mesaje (
  id         bigint generated always as identity primary key,
  clan_id    bigint not null references public.clanuri(id) on delete cascade,
  player_id  uuid references public.players(id) on delete set null,
  nume       text,
  tip        text not null default 'chat' check (tip in ('chat','donatie','sistem')),
  text       text not null default '' check (char_length(text) <= 300),
  date       jsonb not null default '{}'::jsonb,
  creat      timestamptz not null default now()
);
create index if not exists mesaje_clan_idx on public.mesaje(clan_id, id desc);

create table if not exists public.razboaie (
  id         bigint generated always as identity primary key,
  clan_a     bigint references public.clanuri(id) on delete set null,
  clan_b     bigint references public.clanuri(id) on delete set null,
  nume_a     text, nume_b text,
  marime     int not null,
  start      timestamptz not null,
  sfarsit    timestamptz not null,
  stele_a    int not null default 0, stele_b int not null default 0,
  procent_a  numeric not null default 0, procent_b numeric not null default 0,
  terminat   boolean not null default false,
  castigator bigint,
  creat      timestamptz not null default now()
);
create table if not exists public.razboi_cautari (
  clan_id  bigint primary key references public.clanuri(id) on delete cascade,
  marime   int not null,
  creat    timestamptz not null default now()
);
create table if not exists public.razboi_membri (
  razboi_id  bigint not null references public.razboaie(id) on delete cascade,
  clan_id    bigint not null,
  player_id  uuid not null references public.players(id) on delete cascade,
  nume       text not null,
  pozitie    int not null,
  th         int not null default 1,
  baza       jsonb not null default '{}'::jsonb,
  atacuri    int not null default 0,
  primary key (razboi_id, player_id)
);
create table if not exists public.razboi_atacuri (
  id         bigint generated always as identity primary key,
  razboi_id  bigint not null references public.razboaie(id) on delete cascade,
  clan_id    bigint not null,
  atacator   uuid not null,
  atacator_nume text,
  tinta      uuid not null,
  tinta_nume text,
  stele      int not null,
  procent    int not null,
  stele_noi  int not null default 0,
  creat      timestamptz not null default now()
);

-- ---------- securitate ----------
alter table public.clanuri        enable row level security;
alter table public.clan_cereri    enable row level security;
alter table public.mesaje         enable row level security;
alter table public.razboaie       enable row level security;
alter table public.razboi_cautari enable row level security;
alter table public.razboi_membri  enable row level security;
alter table public.razboi_atacuri enable row level security;

create or replace function public.clanul_meu()
returns bigint language sql stable security definer set search_path = public as $$
  select clan_id from public.players where id = auth.uid();
$$;

drop policy if exists clanuri_citire on public.clanuri;
drop policy if exists clan_cereri_citire on public.clan_cereri;
drop policy if exists mesaje_citire on public.mesaje;
drop policy if exists razboaie_citire on public.razboaie;
drop policy if exists razboi_membri_citire on public.razboi_membri;
drop policy if exists razboi_atacuri_citire on public.razboi_atacuri;
drop policy if exists razboi_cautari_citire on public.razboi_cautari;

create policy clanuri_citire on public.clanuri for select to authenticated using (true);
create policy clan_cereri_citire on public.clan_cereri for select to authenticated using (clan_id = public.clanul_meu() or player_id = auth.uid());
create policy mesaje_citire on public.mesaje for select to authenticated using (clan_id = public.clanul_meu());
create policy razboaie_citire on public.razboaie for select to authenticated using (clan_a = public.clanul_meu() or clan_b = public.clanul_meu());
create policy razboi_membri_citire on public.razboi_membri for select to authenticated
  using (exists (select 1 from public.razboaie r where r.id = razboi_id and (r.clan_a = public.clanul_meu() or r.clan_b = public.clanul_meu())));
create policy razboi_atacuri_citire on public.razboi_atacuri for select to authenticated
  using (exists (select 1 from public.razboaie r where r.id = razboi_id and (r.clan_a = public.clanul_meu() or r.clan_b = public.clanul_meu())));
create policy razboi_cautari_citire on public.razboi_cautari for select to authenticated using (clan_id = public.clanul_meu());

revoke all on public.clanuri, public.clan_cereri, public.mesaje, public.razboaie, public.razboi_cautari, public.razboi_membri, public.razboi_atacuri from anon, authenticated;
grant select on public.clanuri, public.clan_cereri, public.mesaje, public.razboaie, public.razboi_cautari, public.razboi_membri, public.razboi_atacuri to authenticated;

-- ---------- ajutoare ----------
create or replace function public.loc_osten(p_tip text)
returns int language sql immutable as $$
  select case p_tip
    when 'haiduc' then 1 when 'arcas' then 1 when 'pandur' then 5 when 'calaret' then 1 when 'berbec' then 2
    when 'aerostat' then 5 when 'solomonar' then 4 when 'zana' then 14 when 'zmeu' then 20 when 'capcaun' then 25
    when 'ortac' then 6 when 'balaur' then 30
    when 'strigoi' then 2 when 'haitas' then 5 when 'iele' then 8 when 'moroi' then 30 when 'babaCloanta' then 12
    else null end;
$$;

create or replace function public.mesaj_sistem(p_clan bigint, p_text text)
returns void language sql security definer set search_path = public as $$
  insert into public.mesaje(clan_id, tip, text) values (p_clan, 'sistem', left(p_text, 300));
$$;

-- ---------- atac între jucători (cu sare, scut și trofee ca în CoC) ----------
drop function if exists public.gaseste_adversar(uuid);
create or replace function public.gaseste_adversar(p_tinta uuid default null)
returns table(id uuid, nume text, regiune text, trofee int, state jsonb, cetate jsonb, lei int, grau int, sare int)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare eu public.players; a public.players; pl int; pg int; ps int;
begin
  select * into eu from public.players p where p.id = auth.uid();
  if not found then raise exception 'Jucător inexistent'; end if;
  if p_tinta is not null then
    select * into a from public.players p
     where p.id = p_tinta and p.id <> eu.id and not p.blocat and p.state ? 'cladiri'
       and (p.scut_pana is null or p.scut_pana < now());
    if not found then raise exception 'Jucătorul nu poate fi atacat acum (are scut).'; end if;
  else
    select * into a from public.players p
     where p.id <> eu.id and not p.blocat and p.state ? 'cladiri'
       and (p.scut_pana is null or p.scut_pana < now())
     order by abs(p.trofee - eu.trofee) + random() * 300
     limit 1;
    if not found then return; end if;
  end if;
  select coalesce(sum(x.lei),0), coalesce(sum(x.grau),0), coalesce(sum(x.sare),0) into pl, pg, ps
    from public.atacuri x where x.aparator = a.id and not x.aplicat;
  return query select a.id, a.nume, a.regiune, a.trofee, a.state, a.cetate,
    greatest(0, floor(0.2 * greatest(0, coalesce((a.state->'res'->>'lei')::numeric, 0) - pl)))::int,
    greatest(0, floor(0.2 * greatest(0, coalesce((a.state->'res'->>'grau')::numeric, 0) - pg)))::int,
    greatest(0, floor(0.1 * greatest(0, coalesce((a.state->'res'->>'sare')::numeric, 0) - ps)))::int;
end $$;

drop function if exists public.inregistreaza_atac(uuid, int, int, int, int);
create or replace function public.inregistreaza_atac(p_aparator uuid, p_stele int, p_procent int, p_lei int, p_grau int, p_sare int default 0)
returns public.atacuri language plpgsql security definer set search_path = public as $$
declare eu public.players; a public.players; r public.atacuri;
        pl int; pg int; ps int; ml int; mg int; ms int; t int; ultim timestamptz; scut interval;
begin
  select * into eu from public.players where id = auth.uid() for update;
  if not found then raise exception 'Jucător inexistent'; end if;
  if eu.blocat then raise exception 'Contul tău este blocat.'; end if;
  if p_stele is null or p_stele not between 0 and 3 or p_procent is null or p_procent not between 0 and 100 then
    raise exception 'Date de luptă invalide';
  end if;
  select max(creat) into ultim from public.atacuri where atacator = eu.id;
  if ultim is not null and ultim > now() - interval '20 seconds' then
    raise exception 'Prea repede! Mai așteaptă puțin între atacuri.';
  end if;
  select * into a from public.players where id = p_aparator for update;
  if not found or a.id = eu.id then raise exception 'Adversar invalid'; end if;
  if a.scut_pana is not null and a.scut_pana > now() then raise exception 'Adversarul are scut activ.'; end if;

  select coalesce(sum(lei),0), coalesce(sum(grau),0), coalesce(sum(sare),0) into pl, pg, ps
    from public.atacuri where aparator = a.id and not aplicat;
  ml := greatest(0, floor(0.2 * greatest(0, coalesce((a.state->'res'->>'lei')::numeric, 0) - pl)))::int;
  mg := greatest(0, floor(0.2 * greatest(0, coalesce((a.state->'res'->>'grau')::numeric, 0) - pg)))::int;
  ms := greatest(0, floor(0.1 * greatest(0, coalesce((a.state->'res'->>'sare')::numeric, 0) - ps)))::int;
  ml := floor(ml * p_procent / 100.0)::int; mg := floor(mg * p_procent / 100.0)::int; ms := floor(ms * p_procent / 100.0)::int;
  p_lei  := least(greatest(coalesce(p_lei, 0), 0), ml);
  p_grau := least(greatest(coalesce(p_grau, 0), 0), mg);
  p_sare := least(greatest(coalesce(p_sare, 0), 0), ms);

  -- trofee ca în CoC: depind de diferența de trofee
  if p_stele > 0 then t := least(59, greatest(5, round(30 + (a.trofee - eu.trofee) / 12.0)::int));
  else t := -least(59, greatest(5, round(30 + (eu.trofee - a.trofee) / 12.0)::int)); end if;
  -- scut ca în CoC: 30% -> 12h, 60% -> 14h, 90% -> 16h
  scut := case when p_procent >= 90 then interval '16 hours' when p_procent >= 60 then interval '14 hours'
               when p_procent >= 30 then interval '12 hours' else null end;

  update public.players set trofee = greatest(0, trofee + t), scut_pana = null where id = eu.id;
  update public.players
     set trofee = greatest(0, trofee - t),
         scut_pana = case when scut is not null then now() + scut else scut_pana end
   where id = a.id;

  insert into public.atacuri(atacator, aparator, atacator_nume, aparator_nume, stele, procent, lei, grau, sare, trofee)
  values (eu.id, a.id, eu.nume, a.nume, p_stele, p_procent, p_lei, p_grau, p_sare, t)
  returning * into r;
  return r;
end $$;

-- ---------- clanuri ----------
create or replace function public.creeaza_clan(p_nume text, p_descriere text, p_tip text, p_trofee_min int, p_steag jsonb)
returns public.clanuri language plpgsql security definer set search_path = public as $$
declare eu public.players; c public.clanuri;
begin
  select * into eu from public.players where id = auth.uid() for update;
  if not found then raise exception 'Jucător inexistent'; end if;
  if eu.blocat then raise exception 'Contul tău este blocat.'; end if;
  if eu.clan_id is not null then raise exception 'Ești deja într-un clan.'; end if;
  p_nume := trim(coalesce(p_nume, ''));
  if char_length(p_nume) < 3 or char_length(p_nume) > 20 then raise exception 'Numele clanului: 3–20 caractere.'; end if;
  if exists (select 1 from public.clanuri where lower(nume) = lower(p_nume)) then raise exception 'Există deja un clan cu acest nume.'; end if;
  insert into public.clanuri(nume, descriere, tip, trofee_min, steag)
  values (p_nume, left(coalesce(p_descriere, ''), 200), case when p_tip = 'inchis' then 'inchis' else 'deschis' end, greatest(0, coalesce(p_trofee_min, 0)), coalesce(p_steag, '{}'::jsonb))
  returning * into c;
  update public.players set clan_id = c.id, clan_rol = 'lider' where id = eu.id;
  perform public.mesaj_sistem(c.id, eu.nume || ' a întemeiat clanul.');
  return c;
end $$;

create or replace function public.cauta_clanuri(p_text text default '')
returns table(id bigint, nume text, descriere text, tip text, trofee_min int, steag jsonb, victorii int, membri int, trofee int)
language sql stable security definer set search_path = public as $$
  select c.id, c.nume, c.descriere, c.tip, c.trofee_min, c.steag, c.victorii,
         (select count(*)::int from public.players p where p.clan_id = c.id),
         (select coalesce(sum(p.trofee), 0)::int from public.players p where p.clan_id = c.id)
    from public.clanuri c
   where coalesce(p_text, '') = '' or c.nume ilike '%' || p_text || '%'
   order by 9 desc, c.id
   limit 50;
$$;

create or replace function public.intra_in_clan(p_clan bigint)
returns text language plpgsql security definer set search_path = public as $$
declare eu public.players; c public.clanuri; n int;
begin
  select * into eu from public.players where id = auth.uid() for update;
  if eu.clan_id is not null then raise exception 'Ieși întâi din clanul tău.'; end if;
  select * into c from public.clanuri where id = p_clan;
  if not found then raise exception 'Clanul nu există.'; end if;
  if eu.trofee < c.trofee_min then raise exception 'Îți trebuie cel puțin % trofee.', c.trofee_min; end if;
  select count(*) into n from public.players where clan_id = c.id;
  if n >= 50 then raise exception 'Clanul e plin (50 de membri).'; end if;
  if c.tip = 'inchis' then
    insert into public.clan_cereri(clan_id, player_id, nume) values (c.id, eu.id, eu.nume) on conflict do nothing;
    perform public.mesaj_sistem(c.id, eu.nume || ' vrea să intre în clan.');
    return 'cerere';
  end if;
  update public.players set clan_id = c.id, clan_rol = 'membru' where id = eu.id;
  delete from public.clan_cereri where player_id = eu.id;
  perform public.mesaj_sistem(c.id, eu.nume || ' a intrat în clan.');
  return 'intrat';
end $$;

create or replace function public.raspunde_cerere(p_cerere bigint, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare eu public.players; q public.clan_cereri; n int;
begin
  select * into eu from public.players where id = auth.uid();
  select * into q from public.clan_cereri where id = p_cerere;
  if not found then raise exception 'Cererea nu mai există.'; end if;
  if eu.clan_id is distinct from q.clan_id or eu.clan_rol not in ('lider','colider','batran') then raise exception 'Nu ai dreptul.'; end if;
  delete from public.clan_cereri where id = q.id;
  if p_accept then
    select count(*) into n from public.players where clan_id = q.clan_id;
    if n >= 50 then raise exception 'Clanul e plin.'; end if;
    update public.players set clan_id = q.clan_id, clan_rol = 'membru' where id = q.player_id and clan_id is null;
    if found then perform public.mesaj_sistem(q.clan_id, q.nume || ' a fost primit în clan de ' || eu.nume || '.'); end if;
  end if;
end $$;

create or replace function public.paraseste_clan()
returns void language plpgsql security definer set search_path = public as $$
declare eu public.players; urm uuid;
begin
  select * into eu from public.players where id = auth.uid() for update;
  if eu.clan_id is null then return; end if;
  update public.players set clan_id = null, clan_rol = null where id = eu.id;
  if eu.clan_rol = 'lider' then
    select id into urm from public.players where clan_id = eu.clan_id
      order by case clan_rol when 'colider' then 0 when 'batran' then 1 else 2 end, trofee desc limit 1;
    if urm is null then delete from public.clanuri where id = eu.clan_id; return; end if;
    update public.players set clan_rol = 'lider' where id = urm;
  end if;
  perform public.mesaj_sistem(eu.clan_id, eu.nume || ' a părăsit clanul.');
end $$;

create or replace function public.schimba_rol(p_player uuid, p_rol text)
returns void language plpgsql security definer set search_path = public as $$
declare eu public.players; el public.players;
        rang_eu int; rang_el int; rang_nou int;
begin
  select * into eu from public.players where id = auth.uid();
  select * into el from public.players where id = p_player;
  if eu.clan_id is null or el.clan_id is distinct from eu.clan_id or el.id = eu.id then raise exception 'Nu se poate.'; end if;
  rang_eu := case eu.clan_rol when 'lider' then 3 when 'colider' then 2 when 'batran' then 1 else 0 end;
  rang_el := case el.clan_rol when 'lider' then 3 when 'colider' then 2 when 'batran' then 1 else 0 end;
  rang_nou := case p_rol when 'lider' then 3 when 'colider' then 2 when 'batran' then 1 when 'membru' then 0 when 'afara' then -1 else null end;
  if rang_nou is null then raise exception 'Rol invalid.'; end if;
  if rang_eu < 2 or rang_el >= rang_eu then raise exception 'Nu ai dreptul.'; end if;
  if p_rol = 'lider' then
    if eu.clan_rol <> 'lider' then raise exception 'Doar liderul poate preda conducerea.'; end if;
    update public.players set clan_rol = 'colider' where id = eu.id;
    update public.players set clan_rol = 'lider' where id = el.id;
    perform public.mesaj_sistem(eu.clan_id, el.nume || ' este noul lider.');
  elsif p_rol = 'afara' then
    update public.players set clan_id = null, clan_rol = null where id = el.id;
    perform public.mesaj_sistem(eu.clan_id, el.nume || ' a fost dat afară de ' || eu.nume || '.');
  else
    if rang_nou >= rang_eu then raise exception 'Nu ai dreptul.'; end if;
    update public.players set clan_rol = p_rol where id = el.id;
    perform public.mesaj_sistem(eu.clan_id, el.nume || ' este acum ' || case p_rol when 'colider' then 'colider' when 'batran' then 'bătrân' else 'membru' end || '.');
  end if;
end $$;

create or replace function public.editeaza_clan(p_descriere text, p_tip text, p_trofee_min int, p_steag jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare eu public.players;
begin
  select * into eu from public.players where id = auth.uid();
  if eu.clan_id is null or eu.clan_rol not in ('lider','colider') then raise exception 'Nu ai dreptul.'; end if;
  update public.clanuri set descriere = left(coalesce(p_descriere, ''), 200), tip = case when p_tip = 'inchis' then 'inchis' else 'deschis' end,
    trofee_min = greatest(0, coalesce(p_trofee_min, 0)), steag = coalesce(p_steag, steag) where id = eu.clan_id;
end $$;

create or replace function public.trimite_mesaj(p_text text)
returns void language plpgsql security definer set search_path = public as $$
declare eu public.players; ultim timestamptz;
begin
  select * into eu from public.players where id = auth.uid();
  if eu.clan_id is null then raise exception 'Nu ești într-un clan.'; end if;
  if eu.blocat then raise exception 'Contul tău este blocat.'; end if;
  p_text := trim(coalesce(p_text, ''));
  if p_text = '' then return; end if;
  select max(creat) into ultim from public.mesaje where player_id = eu.id and tip = 'chat';
  if ultim is not null and ultim > now() - interval '1 second' then raise exception 'Prea repede.'; end if;
  insert into public.mesaje(clan_id, player_id, nume, tip, text) values (eu.clan_id, eu.id, eu.nume, 'chat', left(p_text, 300));
end $$;

-- ---------- donații și cetatea clanului ----------
create or replace function public.cere_trupe(p_text text, p_cap int)
returns void language plpgsql security definer set search_path = public as $$
declare eu public.players; ultim timestamptz; folosit int;
begin
  select * into eu from public.players where id = auth.uid();
  if eu.clan_id is null then raise exception 'Nu ești într-un clan.'; end if;
  select max(creat) into ultim from public.mesaje where player_id = eu.id and tip = 'donatie';
  if ultim is not null and ultim > now() - interval '5 minutes' then raise exception 'Poți cere oșteni o dată la 5 minute.'; end if;
  select coalesce(sum(public.loc_osten(x->>'tip')), 0) into folosit from jsonb_array_elements(eu.cetate) x;
  p_cap := least(45, greatest(10, coalesce(p_cap, 10)));
  if folosit >= p_cap then raise exception 'Cetatea ta e deja plină.'; end if;
  update public.mesaje set date = date || '{"inchis": true}'::jsonb where player_id = eu.id and tip = 'donatie' and not coalesce((date->>'inchis')::boolean, false);
  insert into public.mesaje(clan_id, player_id, nume, tip, text, date)
  values (eu.clan_id, eu.id, eu.nume, 'donatie', left(coalesce(nullif(trim(p_text), ''), 'Am nevoie de oșteni!'), 120),
          jsonb_build_object('cap', p_cap, 'umplut', folosit, 'primit', '[]'::jsonb, 'inchis', false));
end $$;

create or replace function public.doneaza(p_mesaj bigint, p_tip text, p_nivel int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare eu public.players; m public.mesaje; loc int; d jsonb; umplut int; cap int;
begin
  select * into eu from public.players where id = auth.uid();
  select * into m from public.mesaje where id = p_mesaj for update;
  if not found or m.tip <> 'donatie' then raise exception 'Cererea nu mai există.'; end if;
  if eu.clan_id is distinct from m.clan_id then raise exception 'Nu ești în acest clan.'; end if;
  if m.player_id = eu.id then raise exception 'Nu-ți poți dona singur.'; end if;
  loc := public.loc_osten(p_tip);
  if loc is null then raise exception 'Oștean necunoscut.'; end if;
  d := m.date; umplut := coalesce((d->>'umplut')::int, 0); cap := coalesce((d->>'cap')::int, 10);
  if coalesce((d->>'inchis')::boolean, false) or umplut + loc > cap then raise exception 'Nu mai e loc în cetatea lui.'; end if;
  p_nivel := least(10, greatest(1, coalesce(p_nivel, 1)));
  d := jsonb_set(d, '{primit}', (d->'primit') || jsonb_build_array(jsonb_build_object('tip', p_tip, 'nivel', p_nivel, 'de', eu.nume)));
  d := jsonb_set(d, '{umplut}', to_jsonb(umplut + loc));
  if umplut + loc >= cap then d := jsonb_set(d, '{inchis}', 'true'::jsonb); end if;
  update public.mesaje set date = d where id = m.id;
  update public.players set cetate = cetate || jsonb_build_array(jsonb_build_object('tip', p_tip, 'nivel', p_nivel)) where id = m.player_id;
  return d;
end $$;

create or replace function public.foloseste_cetate()
returns void language sql security definer set search_path = public as $$
  update public.players set cetate = '[]'::jsonb where id = auth.uid();
$$;

-- ---------- războaie între clanuri ----------
create or replace function public.finalizeaza_razboaie()
returns void language plpgsql security definer set search_path = public as $$
declare r public.razboaie; w bigint;
begin
  for r in select * from public.razboaie where not terminat and sfarsit <= now() for update loop
    w := case when r.stele_a > r.stele_b then r.clan_a when r.stele_b > r.stele_a then r.clan_b
              when r.procent_a > r.procent_b then r.clan_a when r.procent_b > r.procent_a then r.clan_b else null end;
    update public.razboaie set terminat = true, castigator = w where id = r.id;
    if w is not null then update public.clanuri set victorii = victorii + 1 where id = w; end if;
    if r.clan_a is not null then perform public.mesaj_sistem(r.clan_a, 'Războiul cu ' || r.nume_b || ' s-a terminat: ' || r.stele_a || ' – ' || r.stele_b || ' stele.'); end if;
    if r.clan_b is not null then perform public.mesaj_sistem(r.clan_b, 'Războiul cu ' || r.nume_a || ' s-a terminat: ' || r.stele_b || ' – ' || r.stele_a || ' stele.'); end if;
  end loop;
end $$;

create or replace function public.porneste_razboi(p_a bigint, p_b bigint, p_marime int)
returns bigint language plpgsql security definer set search_path = public as $$
declare rid bigint; na text; nb text; n int;
begin
  select least(p_marime,
    (select count(*) from public.players where clan_id = p_a and not blocat and state ? 'cladiri'),
    (select count(*) from public.players where clan_id = p_b and not blocat and state ? 'cladiri')) into n;
  if n < 1 then return null; end if;
  select nume into na from public.clanuri where id = p_a; select nume into nb from public.clanuri where id = p_b;
  insert into public.razboaie(clan_a, clan_b, nume_a, nume_b, marime, start, sfarsit)
  values (p_a, p_b, na, nb, n, now() + interval '1 hour', now() + interval '24 hours') returning id into rid;
  insert into public.razboi_membri(razboi_id, clan_id, player_id, nume, pozitie, th, baza)
  select rid, x.clan_id, x.id, x.nume, row_number() over (partition by x.clan_id order by x.th desc, x.trofee desc), x.th,
         jsonb_build_object('cladiri', x.state->'cladiri', 'eroi', x.state->'eroi', 'cetate', x.cetate)
    from (select p.*, coalesce((select max((c->>'nivel')::int) from jsonb_array_elements(p.state->'cladiri') c where c->>'tip' = 'primarie'), 1) as th,
                 row_number() over (partition by p.clan_id order by p.trofee desc) as rn
            from public.players p where p.clan_id in (p_a, p_b) and not p.blocat and p.state ? 'cladiri') x
   where x.rn <= n;
  delete from public.razboi_cautari where clan_id in (p_a, p_b);
  perform public.mesaj_sistem(p_a, 'Război găsit cu ' || nb || '! Ziua de pregătire a început (lupta în 1 oră).');
  perform public.mesaj_sistem(p_b, 'Război găsit cu ' || na || '! Ziua de pregătire a început (lupta în 1 oră).');
  return rid;
end $$;

create or replace function public.cauta_razboi(p_marime int)
returns text language plpgsql security definer set search_path = public as $$
declare eu public.players; alt bigint; n int;
begin
  perform public.finalizeaza_razboaie();
  select * into eu from public.players where id = auth.uid();
  if eu.clan_id is null or eu.clan_rol not in ('lider','colider') then raise exception 'Doar liderul sau colider-ul pornește războaie.'; end if;
  if exists (select 1 from public.razboaie where not terminat and (clan_a = eu.clan_id or clan_b = eu.clan_id)) then raise exception 'Clanul e deja în război.'; end if;
  select count(*) into n from public.players where clan_id = eu.clan_id and not blocat;
  p_marime := least(greatest(coalesce(p_marime, 5), 1), 50, n);
  select clan_id into alt from public.razboi_cautari where clan_id <> eu.clan_id
    and not exists (select 1 from public.razboaie where not terminat and (clan_a = razboi_cautari.clan_id or clan_b = razboi_cautari.clan_id))
    order by abs(marime - p_marime), creat limit 1 for update skip locked;
  if alt is not null then
    perform public.porneste_razboi(alt, eu.clan_id, p_marime);
    return 'gasit';
  end if;
  insert into public.razboi_cautari(clan_id, marime) values (eu.clan_id, p_marime)
    on conflict (clan_id) do update set marime = excluded.marime, creat = now();
  perform public.mesaj_sistem(eu.clan_id, eu.nume || ' caută un război (' || p_marime || ' contra ' || p_marime || ').');
  return 'caut';
end $$;

create or replace function public.anuleaza_cautare_razboi()
returns void language plpgsql security definer set search_path = public as $$
declare eu public.players;
begin
  select * into eu from public.players where id = auth.uid();
  if eu.clan_rol not in ('lider','colider') then raise exception 'Nu ai dreptul.'; end if;
  delete from public.razboi_cautari where clan_id = eu.clan_id;
end $$;

create or replace function public.ataca_razboi(p_razboi bigint, p_tinta uuid, p_stele int, p_procent int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare eu public.players; r public.razboaie; me public.razboi_membri; tm public.razboi_membri;
        vechi int; noi int; pa numeric; pb numeric;
begin
  perform public.finalizeaza_razboaie();
  select * into eu from public.players where id = auth.uid();
  select * into r from public.razboaie where id = p_razboi for update;
  if not found or r.terminat then raise exception 'Războiul s-a terminat.'; end if;
  if now() < r.start then raise exception 'Încă e ziua de pregătire.'; end if;
  select * into me from public.razboi_membri where razboi_id = r.id and player_id = eu.id for update;
  if not found then raise exception 'Nu faci parte din acest război.'; end if;
  if me.atacuri >= 2 then raise exception 'Ți-ai folosit ambele atacuri.'; end if;
  select * into tm from public.razboi_membri where razboi_id = r.id and player_id = p_tinta;
  if not found or tm.clan_id = me.clan_id then raise exception 'Țintă invalidă.'; end if;
  p_stele := least(3, greatest(0, coalesce(p_stele, 0))); p_procent := least(100, greatest(0, coalesce(p_procent, 0)));
  select coalesce(max(stele), 0) into vechi from public.razboi_atacuri where razboi_id = r.id and tinta = p_tinta;
  noi := greatest(0, p_stele - vechi);
  insert into public.razboi_atacuri(razboi_id, clan_id, atacator, atacator_nume, tinta, tinta_nume, stele, procent, stele_noi)
  values (r.id, me.clan_id, eu.id, eu.nume, p_tinta, tm.nume, p_stele, p_procent, noi);
  update public.razboi_membri set atacuri = atacuri + 1 where razboi_id = r.id and player_id = eu.id;
  select coalesce(sum(b), 0) / r.marime into pa from (select max(procent) b from public.razboi_atacuri where razboi_id = r.id and clan_id = r.clan_a group by tinta) s;
  select coalesce(sum(b), 0) / r.marime into pb from (select max(procent) b from public.razboi_atacuri where razboi_id = r.id and clan_id = r.clan_b group by tinta) s;
  update public.razboaie set
    stele_a = stele_a + case when me.clan_id = r.clan_a then noi else 0 end,
    stele_b = stele_b + case when me.clan_id = r.clan_b then noi else 0 end,
    procent_a = pa, procent_b = pb
   where id = r.id;
  return jsonb_build_object('stele_noi', noi);
end $$;

create or replace function public.razboi_curent()
returns public.razboaie language plpgsql security definer set search_path = public as $$
declare eu public.players; r public.razboaie;
begin
  perform public.finalizeaza_razboaie();
  select * into eu from public.players where id = auth.uid();
  if eu.clan_id is null then return null; end if;
  select * into r from public.razboaie where clan_a = eu.clan_id or clan_b = eu.clan_id order by id desc limit 1;
  return r;
end $$;

-- ---------- drepturi ----------
do $$
declare f text;
begin
  foreach f in array array[
    'clanul_meu()', 'mesaj_sistem(bigint, text)', 'gaseste_adversar(uuid)', 'inregistreaza_atac(uuid, int, int, int, int, int)',
    'creeaza_clan(text, text, text, int, jsonb)', 'cauta_clanuri(text)', 'intra_in_clan(bigint)', 'raspunde_cerere(bigint, boolean)',
    'paraseste_clan()', 'schimba_rol(uuid, text)', 'editeaza_clan(text, text, int, jsonb)', 'trimite_mesaj(text)',
    'cere_trupe(text, int)', 'doneaza(bigint, text, int)', 'foloseste_cetate()', 'finalizeaza_razboaie()',
    'porneste_razboi(bigint, bigint, int)', 'cauta_razboi(int)', 'anuleaza_cautare_razboi()', 'ataca_razboi(bigint, uuid, int, int)', 'razboi_curent()'
  ] loop
    execute 'revoke all on function public.' || f || ' from public, anon';
  end loop;
  foreach f in array array[
    'clanul_meu()', 'gaseste_adversar(uuid)', 'inregistreaza_atac(uuid, int, int, int, int, int)',
    'creeaza_clan(text, text, text, int, jsonb)', 'cauta_clanuri(text)', 'intra_in_clan(bigint)', 'raspunde_cerere(bigint, boolean)',
    'paraseste_clan()', 'schimba_rol(uuid, text)', 'editeaza_clan(text, text, int, jsonb)', 'trimite_mesaj(text)',
    'cere_trupe(text, int)', 'doneaza(bigint, text, int)', 'foloseste_cetate()',
    'cauta_razboi(int)', 'anuleaza_cautare_razboi()', 'ataca_razboi(bigint, uuid, int, int)', 'razboi_curent()'
  ] loop
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
end $$;
