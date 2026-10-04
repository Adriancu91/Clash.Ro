-- =====================================================================
--  CLASH OF ROMÂNIA — baza de date Supabase
--  Cum se folosește: Supabase → SQL Editor → New query → lipești TOT
--  fișierul → Run. Poți să-l rulezi de mai multe ori fără probleme.
-- =====================================================================

-- ---------- TABELE ----------

create table if not exists public.players (
  id          uuid primary key references auth.users(id) on delete cascade,
  nume        text not null unique check (char_length(nume) between 3 and 20),
  regiune     text not null,
  state       jsonb not null default '{}'::jsonb,
  galbeni     integer not null default 0 check (galbeni >= 0),
  trofee      integer not null default 0 check (trofee >= 0),
  scut_pana   timestamptz,
  blocat      boolean not null default false,
  creat       timestamptz not null default now(),
  actualizat  timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.cereri (
  id         bigint generated always as identity primary key,
  player_id  uuid not null references public.players(id) on delete cascade,
  nume       text not null,
  suma       integer not null check (suma between 1 and 100000),
  pachet     text,
  motiv      text,
  status     text not null default 'nou'
             check (status in ('nou','asteptare','aprobat','respins')),
  nota       text,
  creat      timestamptz not null default now(),
  decis      timestamptz
);
create index if not exists cereri_status_idx on public.cereri(status, creat);
create index if not exists cereri_player_idx on public.cereri(player_id, creat desc);

create table if not exists public.atacuri (
  id             bigint generated always as identity primary key,
  atacator       uuid references public.players(id) on delete set null,
  aparator       uuid references public.players(id) on delete cascade,
  atacator_nume  text,
  aparator_nume  text,
  stele          int not null,
  procent        int not null,
  lei            int not null default 0,
  grau           int not null default 0,
  trofee         int not null default 0,
  aplicat        boolean not null default false,
  creat          timestamptz not null default now()
);
create index if not exists atacuri_aparator_idx on public.atacuri(aparator, aplicat);
create index if not exists atacuri_atacator_idx on public.atacuri(atacator, creat desc);

create table if not exists public.jurnal_galbeni (
  id         bigint generated always as identity primary key,
  player_id  uuid references public.players(id) on delete cascade,
  delta      int not null,
  motiv      text,
  creat      timestamptz not null default now()
);

-- ---------- SECURITATE (RLS) ----------

alter table public.players        enable row level security;
alter table public.admins         enable row level security;
alter table public.cereri         enable row level security;
alter table public.atacuri        enable row level security;
alter table public.jurnal_galbeni enable row level security;

create or replace function public.este_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

drop policy if exists players_citire  on public.players;
drop policy if exists players_update  on public.players;
drop policy if exists cereri_citire   on public.cereri;
drop policy if exists atacuri_citire  on public.atacuri;
drop policy if exists jurnal_citire   on public.jurnal_galbeni;

create policy players_citire on public.players for select to authenticated using (true);
create policy players_update on public.players for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy cereri_citire on public.cereri for select to authenticated
  using (player_id = auth.uid() or public.este_admin());
create policy atacuri_citire on public.atacuri for select to authenticated
  using (atacator = auth.uid() or aparator = auth.uid() or public.este_admin());
create policy jurnal_citire on public.jurnal_galbeni for select to authenticated
  using (player_id = auth.uid() or public.este_admin());

-- Jucătorii pot citi, dar pot modifica DOAR progresul lor (state).
-- Galbenii, trofeele și scutul se schimbă numai prin funcțiile de mai jos.
revoke all on public.players, public.admins, public.cereri, public.atacuri, public.jurnal_galbeni from anon, authenticated;
grant select on public.players, public.cereri, public.atacuri, public.jurnal_galbeni to authenticated;
grant update (state, actualizat) on public.players to authenticated;

-- ---------- FUNCȚII PENTRU JUCĂTORI ----------

create or replace function public.creeaza_jucator(p_nume text, p_regiune text)
returns public.players language plpgsql security definer set search_path = public as $$
declare r public.players;
begin
  if auth.uid() is null then raise exception 'Nu ești autentificat'; end if;
  p_nume := trim(coalesce(p_nume, ''));
  if char_length(p_nume) < 3 or char_length(p_nume) > 20 then
    raise exception 'Numele trebuie să aibă între 3 și 20 de caractere';
  end if;
  if p_regiune not in ('maramures','crisana','banat','transilvania','bucovina','moldova','muntenia','oltenia','dobrogea') then
    raise exception 'Regiune necunoscută';
  end if;
  select * into r from public.players where id = auth.uid();
  if found then return r; end if;
  if exists (select 1 from public.players where lower(nume) = lower(p_nume)) then
    raise exception 'Numele este deja luat. Alege altul.';
  end if;
  insert into public.players(id, nume, regiune) values (auth.uid(), p_nume, p_regiune) returning * into r;
  return r;
end $$;

create or replace function public.cheltuie_galbeni(p_suma int, p_motiv text)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if p_suma is null or p_suma < 1 or p_suma > 100000 then raise exception 'Sumă invalidă'; end if;
  update public.players set galbeni = galbeni - p_suma
   where id = auth.uid() and galbeni >= p_suma and not blocat
   returning galbeni into v;
  if not found then raise exception 'Nu ai destui galbeni.'; end if;
  insert into public.jurnal_galbeni(player_id, delta, motiv) values (auth.uid(), -p_suma, left(coalesce(p_motiv,''), 100));
  return v;
end $$;

create or replace function public.cere_galbeni(p_suma int, p_motiv text, p_pachet text)
returns public.cereri language plpgsql security definer set search_path = public as $$
declare j public.players; r public.cereri; n int;
begin
  select * into j from public.players where id = auth.uid();
  if not found then raise exception 'Jucător inexistent'; end if;
  if j.blocat then raise exception 'Contul tău este blocat.'; end if;
  if p_suma is null or p_suma < 1 or p_suma > 100000 then
    raise exception 'Poți cere între 1 și 100.000 de galbeni.';
  end if;
  select count(*) into n from public.cereri where player_id = j.id and status in ('nou','asteptare');
  if n >= 3 then raise exception 'Ai deja 3 cereri fără răspuns. Așteaptă să fie aprobate.'; end if;
  insert into public.cereri(player_id, nume, suma, pachet, motiv)
  values (j.id, j.nume, p_suma, nullif(left(coalesce(p_pachet,''), 40), ''), nullif(left(coalesce(p_motiv,''), 200), ''))
  returning * into r;
  return r;
end $$;

create or replace function public.cumpara_scut(p_ore int)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare pret int; t timestamptz;
begin
  if p_ore = 24 then pret := 100; elsif p_ore = 72 then pret := 250;
  else raise exception 'Durată invalidă'; end if;
  update public.players
     set galbeni = galbeni - pret,
         scut_pana = greatest(coalesce(scut_pana, now()), now()) + make_interval(hours => p_ore)
   where id = auth.uid() and galbeni >= pret and not blocat
   returning scut_pana into t;
  if not found then raise exception 'Nu ai destui galbeni.'; end if;
  insert into public.jurnal_galbeni(player_id, delta, motiv) values (auth.uid(), -pret, 'Scut ' || p_ore || 'h');
  return t;
end $$;

create or replace function public.gaseste_adversar(p_tinta uuid default null)
returns table(id uuid, nume text, regiune text, trofee int, state jsonb, lei int, grau int)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare eu public.players; a public.players; pl int; pg int;
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
  select coalesce(sum(x.lei),0), coalesce(sum(x.grau),0) into pl, pg
    from public.atacuri x where x.aparator = a.id and not x.aplicat;
  return query select a.id, a.nume, a.regiune, a.trofee, a.state,
    greatest(0, floor(0.2 * greatest(0, coalesce((a.state->'res'->>'lei')::numeric, 0) - pl)))::int,
    greatest(0, floor(0.2 * greatest(0, coalesce((a.state->'res'->>'grau')::numeric, 0) - pg)))::int;
end $$;

create or replace function public.inregistreaza_atac(p_aparator uuid, p_stele int, p_procent int, p_lei int, p_grau int)
returns public.atacuri language plpgsql security definer set search_path = public as $$
declare eu public.players; a public.players; r public.atacuri;
        pl int; pg int; ml int; mg int; t int; ultim timestamptz;
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

  select coalesce(sum(lei),0), coalesce(sum(grau),0) into pl, pg
    from public.atacuri where aparator = a.id and not aplicat;
  ml := greatest(0, floor(0.2 * greatest(0, coalesce((a.state->'res'->>'lei')::numeric, 0) - pl)))::int;
  mg := greatest(0, floor(0.2 * greatest(0, coalesce((a.state->'res'->>'grau')::numeric, 0) - pg)))::int;
  ml := floor(ml * p_procent / 100.0)::int;
  mg := floor(mg * p_procent / 100.0)::int;
  p_lei  := least(greatest(coalesce(p_lei, 0), 0), ml);
  p_grau := least(greatest(coalesce(p_grau, 0), 0), mg);

  if p_stele > 0 then t := 5 + p_stele * 5; else t := -5; end if;
  update public.players set trofee = greatest(0, trofee + t), scut_pana = null where id = eu.id;
  update public.players
     set trofee = greatest(0, trofee - t),
         scut_pana = case when p_stele > 0 then now() + make_interval(hours => p_stele * 2) else scut_pana end
   where id = a.id;

  insert into public.atacuri(atacator, aparator, atacator_nume, aparator_nume, stele, procent, lei, grau, trofee)
  values (eu.id, a.id, eu.nume, a.nume, p_stele, p_procent, p_lei, p_grau, t)
  returning * into r;
  return r;
end $$;

create or replace function public.revendica_atacuri()
returns setof public.atacuri language sql security definer set search_path = public as $$
  update public.atacuri set aplicat = true
   where aparator = auth.uid() and not aplicat
  returning *;
$$;

-- ---------- FUNCȚII PENTRU ADMIN ----------

create or replace function public.admin_decide(p_id bigint, p_status text, p_nota text)
returns public.cereri language plpgsql security definer set search_path = public as $$
declare r public.cereri;
begin
  if not public.este_admin() then raise exception 'Doar adminul poate face asta.'; end if;
  if p_status not in ('aprobat','respins','asteptare') then raise exception 'Status invalid'; end if;
  select * into r from public.cereri where id = p_id for update;
  if not found then raise exception 'Cererea nu există.'; end if;
  if r.status in ('aprobat','respins') then raise exception 'Cererea a fost deja decisă.'; end if;
  update public.cereri
     set status = p_status,
         nota = coalesce(nullif(trim(coalesce(p_nota,'')), ''), nota),
         decis = case when p_status = 'asteptare' then null else now() end
   where id = p_id
   returning * into r;
  if p_status = 'aprobat' then
    update public.players set galbeni = galbeni + r.suma where id = r.player_id;
    insert into public.jurnal_galbeni(player_id, delta, motiv) values (r.player_id, r.suma, 'Cerere aprobată #' || r.id);
  end if;
  return r;
end $$;

create or replace function public.admin_da_galbeni(p_player uuid, p_suma int, p_motiv text)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if not public.este_admin() then raise exception 'Doar adminul poate face asta.'; end if;
  if p_suma is null or p_suma = 0 or abs(p_suma) > 1000000 then raise exception 'Sumă invalidă'; end if;
  update public.players set galbeni = greatest(0, galbeni + p_suma) where id = p_player returning galbeni into v;
  if not found then raise exception 'Jucător inexistent'; end if;
  insert into public.jurnal_galbeni(player_id, delta, motiv)
  values (p_player, p_suma, coalesce(nullif(trim(coalesce(p_motiv,'')), ''), 'Admin'));
  return v;
end $$;

create or replace function public.admin_blocheaza(p_player uuid, p_blocat boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.este_admin() then raise exception 'Doar adminul poate face asta.'; end if;
  update public.players set blocat = p_blocat where id = p_player;
end $$;

-- ---------- DREPTURI PE FUNCȚII ----------

revoke all on function public.este_admin()                                   from public, anon;
revoke all on function public.creeaza_jucator(text, text)                    from public, anon;
revoke all on function public.cheltuie_galbeni(int, text)                    from public, anon;
revoke all on function public.cere_galbeni(int, text, text)                  from public, anon;
revoke all on function public.cumpara_scut(int)                              from public, anon;
revoke all on function public.gaseste_adversar(uuid)                         from public, anon;
revoke all on function public.inregistreaza_atac(uuid, int, int, int, int)   from public, anon;
revoke all on function public.revendica_atacuri()                            from public, anon;
revoke all on function public.admin_decide(bigint, text, text)               from public, anon;
revoke all on function public.admin_da_galbeni(uuid, int, text)              from public, anon;
revoke all on function public.admin_blocheaza(uuid, boolean)                 from public, anon;

grant execute on function public.este_admin()                                 to authenticated;
grant execute on function public.creeaza_jucator(text, text)                  to authenticated;
grant execute on function public.cheltuie_galbeni(int, text)                  to authenticated;
grant execute on function public.cere_galbeni(int, text, text)                to authenticated;
grant execute on function public.cumpara_scut(int)                            to authenticated;
grant execute on function public.gaseste_adversar(uuid)                       to authenticated;
grant execute on function public.inregistreaza_atac(uuid, int, int, int, int) to authenticated;
grant execute on function public.revendica_atacuri()                          to authenticated;
grant execute on function public.admin_decide(bigint, text, text)             to authenticated;
grant execute on function public.admin_da_galbeni(uuid, int, text)            to authenticated;
grant execute on function public.admin_blocheaza(uuid, boolean)               to authenticated;
