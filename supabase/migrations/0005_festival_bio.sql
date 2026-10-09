-- Clave – vlastní verze medailonku učitele pro festival
-- Globální medailonek spravuje učitel (dokud nemá účet, tak organizátoři jeho festivalů).
-- Organizátor může pro svůj festival napsat vlastní text a dát jinou fotku – zobrazí se jen na jeho festivalu.

alter table festival_teachers
  add column bio_cs text,
  add column bio_en text,
  add column photo_url text,
  add constraint festival_teachers_photo_https check (coalesce(photo_url, 'https://') ~ '^https://');

-- Učitel vidí svou historii změn a může se vrátit k předchozí verzi; jména autorů jsou jinak skrytá.
create function my_teacher_revisions()
returns table (id bigint, created_at timestamptz, by_me boolean, previous jsonb)
language sql stable security definer set search_path = public as $$
  select r.id, r.created_at, r.author_id = auth.uid(), r.previous
  from teacher_profile_revisions r
  join teacher_profiles tp on tp.id = r.profile_id
  where tp.user_id = auth.uid()
  order by r.created_at desc
  limit 50;
$$;

revoke execute on function my_teacher_revisions() from public, anon;
grant execute on function my_teacher_revisions() to authenticated;
