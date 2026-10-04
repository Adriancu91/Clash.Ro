-- Rulează asta în Supabase → SQL Editor DUPĂ ce ți-ai făcut cont în joc.
-- Te face admin, ca să poți intra în panoul de control (admin.html).
-- Dacă ai folosit alt email la înregistrare, schimbă-l mai jos.

insert into public.admins (user_id)
select id from auth.users where email = 'adriancu91@gmail.com'
on conflict do nothing;

-- Verificare: trebuie să apară emailul tău mai jos.
select u.email from public.admins a join auth.users u on u.id = a.user_id;
