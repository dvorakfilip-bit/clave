-- Clave – opravy z code review (logika databáze)

-- ---------------------------------------------------------------------------
-- Kolize lekcí: zrušená lekce sál neblokuje (lze dát náhradu), souběžné ukládání
-- dvou organizátorů se řadí za sebe (zámek na místnost a den).
-- ---------------------------------------------------------------------------
create or replace function check_lesson_overlap() returns trigger language plpgsql as $$
declare
  new_start time;
  new_end time;
begin
  select starts_at into new_start from time_slots where id = new.start_slot_id and day_id = new.day_id;
  select ends_at into new_end from time_slots where id = new.end_slot_id and day_id = new.day_id;
  if new_start is null or new_end is null or new_end <= new_start then
    raise exception 'Neplatný rozsah slotů lekce' using errcode = 'check_violation';
  end if;
  if new.cancelled then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.room_id::text || new.day_id::text, 0));
  if exists (
    select 1 from lessons l
    join time_slots s on s.id = l.start_slot_id
    join time_slots e on e.id = l.end_slot_id
    where l.room_id = new.room_id and l.day_id = new.day_id and l.id <> new.id and not l.cancelled
      and s.starts_at < new_end and e.ends_at > new_start
  ) then
    raise exception 'V této místnosti a čase už je jiná lekce' using errcode = 'exclusion_violation';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Změna časového slotu: lekce v něm dostanou štítek „Změna“ a znovu se zkontrolují
-- kolize; slot s lekcemi nelze přesunout na jiný den.
-- ---------------------------------------------------------------------------
create function time_slot_changed() returns trigger language plpgsql as $$
begin
  if new.day_id <> old.day_id and exists (
    select 1 from lessons where start_slot_id = new.id or end_slot_id = new.id
  ) then
    raise exception 'Slot s lekcemi nelze přesunout na jiný den' using errcode = 'check_violation';
  end if;
  if (new.starts_at, new.ends_at) is distinct from (old.starts_at, old.ends_at) then
    -- Úprava lekcí spustí i kontrolu kolizí (lessons_overlap) s novými časy slotu.
    update lessons set changed_at = now() where start_slot_id = new.id or end_slot_id = new.id;
  end if;
  return null;
end;
$$;

create trigger time_slots_changed after update on time_slots
  for each row execute function time_slot_changed();

-- Slot uprostřed vícehodinové lekce nelze smazat (krajní sloty hlídá cizí klíč).
create function time_slot_in_use() returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from lessons l
    join time_slots s on s.id = l.start_slot_id
    join time_slots e on e.id = l.end_slot_id
    where l.day_id = old.day_id and s.starts_at <= old.starts_at and e.ends_at >= old.ends_at
  ) and exists (select 1 from festivals where id = old.festival_id) then -- při mazání festivalu nic nehlídat
    raise exception 'Ve slotu jsou lekce' using errcode = 'foreign_key_violation';
  end if;
  return old;
end;
$$;

create trigger time_slots_in_use before delete on time_slots
  for each row execute function time_slot_in_use();

-- ---------------------------------------------------------------------------
-- Festival nesmí zůstat bez hlavního organizátora. Funkce běží s právy vlastníka,
-- aby viděla všechny členy i po odebrání sebe sama; hlídá jen odchod hlavního organizátora.
-- ---------------------------------------------------------------------------
create or replace function keep_lead_organizer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role <> 'lead_organizer' then
    return null;
  end if;
  if tg_op = 'UPDATE' and new.role = 'lead_organizer' and new.festival_id = old.festival_id then
    return null;
  end if;
  if not exists (select 1 from festivals where id = old.festival_id) then
    return null; -- maže se celý festival
  end if;
  if not exists (select 1 from festival_members where festival_id = old.festival_id and role = 'lead_organizer') then
    raise exception 'Festival musí mít alespoň jednoho hlavního organizátora' using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Pozvánka učitele se označí jako přijatá, jen když se profil opravdu propojil.
-- ---------------------------------------------------------------------------
create or replace function accept_invitations() returns int
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_email citext;
  inv record;
  accepted int := 0;
begin
  if me is null then
    return 0;
  end if;
  select email into my_email from auth.users where id = me;
  if my_email is null then
    return 0;
  end if;

  for inv in
    select * from invitations
    where email = my_email and status = 'pending' and expires_at > now()
  loop
    if inv.role = 'teacher' then
      update teacher_profiles set user_id = me
      where id = inv.teacher_profile_id and user_id is null
        and not exists (select 1 from teacher_profiles where user_id = me);
      if not found then
        continue; -- účet už má jiný profil učitele – pozvánka zůstane, organizátor ji vidí
      end if;
    else
      insert into festival_members (festival_id, user_id, role)
      values (inv.festival_id, me, inv.role::text::festival_role)
      on conflict (festival_id, user_id) do update
        set role = case when excluded.role = 'lead_organizer' then excluded.role else festival_members.role end;
    end if;
    update invitations set status = 'accepted' where id = inv.id;
    accepted := accepted + 1;
  end loop;
  return accepted;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profil učitele sdílený s jiným festivalem si organizátor nesmí propojit se svým účtem
-- (jinak by převzal medailonek, který používají ostatní festivaly).
-- ---------------------------------------------------------------------------
create function shared_with_foreign_festival(tid uuid, fid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not is_platform_admin() and exists (
    select 1 from festival_teachers ft
    where ft.teacher_profile_id = tid and ft.festival_id <> fid and not is_organizer(ft.festival_id));
$$;

create or replace function link_teacher_account(fid uuid, tid uuid, uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_organizer(fid)
     or not exists (select 1 from festival_teachers where festival_id = fid and teacher_profile_id = tid) then
    raise exception 'Nedostatečná oprávnění' using errcode = 'insufficient_privilege';
  end if;
  if uid = auth.uid() and shared_with_foreign_festival(tid, fid) then
    raise exception 'Profil učitele používá i jiný festival – se svým účtem ho propojit nemůžeš' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from teacher_profiles where user_id = uid) then
    raise exception 'Tento účet už má profil učitele' using errcode = 'unique_violation';
  end if;
  update teacher_profiles set user_id = uid where id = tid and user_id is null;
  if not found then
    raise exception 'Profil učitele už je propojený s jiným účtem' using errcode = 'unique_violation';
  end if;
end;
$$;

drop policy "invitations write" on invitations;
create policy "invitations write" on invitations for all
  using (case when role = 'teacher' then is_organizer(festival_id) else is_lead_organizer(festival_id) end)
  with check (
    (case when role = 'teacher' then is_organizer(festival_id) else is_lead_organizer(festival_id) end)
    and (role <> 'teacher' or status <> 'pending' or (
      exists (
        select 1 from festival_teachers ft
        where ft.festival_id = invitations.festival_id and ft.teacher_profile_id = invitations.teacher_profile_id)
      and not (email = (auth.jwt() ->> 'email') and shared_with_foreign_festival(teacher_profile_id, festival_id))))
  );

-- ---------------------------------------------------------------------------
-- Úpravy přes service klíč (seed, skripty) a v SQL editoru Supabase nejsou omezené
-- na hlavního organizátora – nemají přihlášeného uživatele.
-- ---------------------------------------------------------------------------
create or replace function guard_festival_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or coalesce(current_setting('request.jwt.claims', true), '') = '' then
    return new;
  end if;
  if (new.slug, new.status) is distinct from (old.slug, old.status) and not is_lead_organizer(old.id) then
    raise exception 'Adresu a stav festivalu mění jen hlavní organizátor' using errcode = 'insufficient_privilege';
  end if;
  if (new.colors, new.font, new.logo_wide_url, new.logo_square_url, new.banner_url)
     is distinct from (old.colors, old.font, old.logo_wide_url, old.logo_square_url, old.banner_url)
     and not is_lead_organizer(old.id) then
    raise exception 'Vzhled festivalu mění jen hlavní organizátor' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Smazání účtu: i festivalové medailonky a fotky učitele, pozvánky na jeho e-mail.
-- Soubory fotek maže aplikace přes Storage API (seznam vrací my_teacher_data).
-- ---------------------------------------------------------------------------
create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Nejsi přihlášený' using errcode = 'insufficient_privilege';
  end if;
  if exists (
    select 1 from festival_members m
    where m.user_id = me and m.role = 'lead_organizer'
      and not exists (select 1 from festival_members o
                      where o.festival_id = m.festival_id and o.role = 'lead_organizer' and o.user_id <> me)
  ) then
    raise exception 'Jsi jediný hlavní organizátor festivalu. Nejdřív předej roli někomu jinému.' using errcode = 'check_violation';
  end if;
  update invitations set status = 'revoked' where invited_by = me and status = 'pending';
  delete from invitations where email = (select email from auth.users where id = me);
  update festival_teachers set photo_url = null, bio_cs = null, bio_en = null
    where teacher_profile_id in (select id from teacher_profiles where user_id = me);
  update teacher_profiles set photo_url = null, bio_cs = null, bio_en = null where user_id = me;
  delete from teacher_profile_revisions where profile_id in (select id from teacher_profiles where user_id = me);
  delete from auth.users where id = me;
end;
$$;

-- Fotky (aktuální, z historie i festivalové) a festivaly učitele – pro úklid před smazáním účtu.
create function my_teacher_data() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'images', coalesce((
      select jsonb_agg(distinct url) from (
        select tp.photo_url as url from teacher_profiles tp where tp.user_id = auth.uid()
        union all
        select r.previous ->> 'photo_url' from teacher_profile_revisions r
          join teacher_profiles tp on tp.id = r.profile_id where tp.user_id = auth.uid()
        union all
        select ft.photo_url from festival_teachers ft
          join teacher_profiles tp on tp.id = ft.teacher_profile_id where tp.user_id = auth.uid()
      ) x where url is not null), '[]'::jsonb),
    'slugs', coalesce((
      select jsonb_agg(f.slug) from festival_teachers ft
        join teacher_profiles tp on tp.id = ft.teacher_profile_id
        join festivals f on f.id = ft.festival_id
      where tp.user_id = auth.uid()), '[]'::jsonb)
  );
$$;

-- Učitel smí smazat i fotky, které pro něj nahrály festivaly (při smazání účtu).
create policy "images delete own teacher" on storage.objects for delete to authenticated
  using (
    bucket_id = 'images' and split_part(name, '/', 1) = 'festival-teachers'
    and split_part(name, '/', 3) = (select id::text from public.teacher_profiles where user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Poslední návštěva festivalu podle času serveru (hodiny v telefonu můžou jít špatně).
-- ---------------------------------------------------------------------------
create function touch_festival_visit(fid uuid, only_if_missing boolean default false) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  seen timestamptz;
begin
  if me is null then
    return null;
  end if;
  if only_if_missing then
    insert into festival_visits (user_id, festival_id) values (me, fid) on conflict do nothing;
  else
    insert into festival_visits (user_id, festival_id, last_seen_at) values (me, fid, now())
    on conflict (user_id, festival_id) do update set last_seen_at = now();
  end if;
  select last_seen_at into seen from festival_visits where user_id = me and festival_id = fid;
  return seen;
end;
$$;

revoke execute on function shared_with_foreign_festival(uuid, uuid), my_teacher_data(),
  touch_festival_visit(uuid, boolean) from public, anon;
grant execute on function shared_with_foreign_festival(uuid, uuid), my_teacher_data(),
  touch_festival_visit(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Indexy pro časté dotazy a mazání
-- ---------------------------------------------------------------------------
create index if not exists personal_selections_lesson_idx on personal_selections (lesson_id) where lesson_id is not null;
create index if not exists personal_selections_party_idx on personal_selections (party_id) where party_id is not null;
create index if not exists lesson_teachers_teacher_idx on lesson_teachers (teacher_profile_id);
create index if not exists festival_teachers_teacher_idx on festival_teachers (teacher_profile_id);
create index if not exists festival_members_user_idx on festival_members (user_id);
create index if not exists teacher_revisions_profile_idx on teacher_profile_revisions (profile_id, created_at desc);
create index if not exists lessons_room_day_idx on lessons (room_id, day_id);
create index if not exists lessons_start_slot_idx on lessons (start_slot_id);
create index if not exists lessons_end_slot_idx on lessons (end_slot_id);
create index if not exists time_slots_day_idx on time_slots (day_id, starts_at);
