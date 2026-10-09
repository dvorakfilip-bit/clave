-- Clave – osobní program účastníka (etapa 2)

-- Výběr přihlášeného uživatele pro jeden festival (lekce i párty).
create function my_selections(fid uuid)
returns table (lesson_id uuid, party_id uuid, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.lesson_id, s.party_id, s.created_at
  from personal_selections s
  left join lessons l on l.id = s.lesson_id
  left join parties p on p.id = s.party_id
  where s.user_id = auth.uid()
    and coalesce(l.festival_id, p.festival_id) = fid;
$$;

-- Smazání vlastního účtu včetně všech dat (PRD 6.5 – GDPR).
-- Profil učitele zůstává bez vazby na účet; u lekcí zůstane jen jméno, medailonek a fotka se smažou (PRD 4).
create function delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Nejsi přihlášený' using errcode = 'insufficient_privilege';
  end if;
  update teacher_profiles set photo_url = null, bio_cs = null, bio_en = null where user_id = me;
  delete from teacher_profile_revisions where profile_id in (select id from teacher_profiles where user_id = me);
  delete from auth.users where id = me;
end;
$$;

revoke execute on function delete_my_account() from anon;
