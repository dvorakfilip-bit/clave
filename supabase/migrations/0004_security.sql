-- Clave – bezpečnostní opravy před zveřejněním

-- ---------------------------------------------------------------------------
-- C1: e-mail v profilu nesmí uživatel měnit (pozvánky a role stojí na e-mailu)
-- ---------------------------------------------------------------------------
revoke insert, update, delete on profiles from anon, authenticated;
grant update (display_name, locale) on profiles to authenticated;

-- E-mail se bere z ověřeného účtu (auth.users), ne z profilu.
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

-- Pozvánky vidí pozvaný podle ověřeného e-mailu; organizátorské pozvánky jen hlavní organizátor.
drop policy "invitations read" on invitations;
create policy "invitations read" on invitations for select using (
  email = (auth.jwt() ->> 'email')
  or (role = 'teacher' and is_organizer(festival_id))
  or is_lead_organizer(festival_id)
);

-- ---------------------------------------------------------------------------
-- H1/H2: profily učitelů
-- ---------------------------------------------------------------------------
-- Profily se zakládají jen přes create_teacher; vazbu na účet mění jen funkce.
revoke insert, update on teacher_profiles from anon, authenticated;
grant update (name, photo_url, bio_cs, bio_en) on teacher_profiles to authenticated;
drop policy "teachers create" on teacher_profiles;

-- Medailonek učitele s vlastním účtem upravuje jen on (a správce platformy);
-- organizátoři upravují jen profily bez účtu.
create or replace function can_edit_teacher(tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_platform_admin()
      or exists (select 1 from teacher_profiles where id = tid and user_id = auth.uid())
      or exists (select 1 from teacher_profiles tp
                 join festival_teachers ft on ft.teacher_profile_id = tp.id
                 join festival_members fm on fm.festival_id = ft.festival_id
                 where tp.id = tid and tp.user_id is null and fm.user_id = auth.uid());
$$;

drop policy "teachers update" on teacher_profiles;
create policy "teachers update" on teacher_profiles for update
  using (can_edit_teacher(id)) with check (can_edit_teacher(id));

-- Propojit lze jen profil, který ještě nemá účet.
create or replace function link_teacher_account(fid uuid, tid uuid, uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_organizer(fid)
     or not exists (select 1 from festival_teachers where festival_id = fid and teacher_profile_id = tid) then
    raise exception 'Nedostatečná oprávnění' using errcode = 'insufficient_privilege';
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

-- Učitelská pozvánka jen na profil přiřazený k festivalu.
drop policy "invitations write" on invitations;
create policy "invitations write" on invitations for all
  using (case when role = 'teacher' then is_organizer(festival_id) else is_lead_organizer(festival_id) end)
  with check (
    (case when role = 'teacher' then is_organizer(festival_id) else is_lead_organizer(festival_id) end)
    and (role <> 'teacher' or exists (
      select 1 from festival_teachers ft
      where ft.festival_id = invitations.festival_id and ft.teacher_profile_id = invitations.teacher_profile_id))
  );

-- Lekce smí mít jen učitele svého festivalu.
drop policy "lesson teachers write" on lesson_teachers;
create policy "lesson teachers write" on lesson_teachers for all
  using (exists (select 1 from lessons l where l.id = lesson_id and is_organizer(l.festival_id)))
  with check (exists (
    select 1 from lessons l
    join festival_teachers ft on ft.festival_id = l.festival_id and ft.teacher_profile_id = lesson_teachers.teacher_profile_id
    where l.id = lesson_id and is_organizer(l.festival_id)));

-- ---------------------------------------------------------------------------
-- M1: odkazy jen v rámci jednoho festivalu
-- ---------------------------------------------------------------------------
alter table days add constraint days_festival_id_id_key unique (festival_id, id);
alter table time_slots add constraint time_slots_festival_id_id_key unique (festival_id, id);
alter table rooms add constraint rooms_festival_id_id_key unique (festival_id, id);
alter table styles add constraint styles_festival_id_id_key unique (festival_id, id);

alter table time_slots add constraint time_slots_same_festival_day
  foreign key (festival_id, day_id) references days (festival_id, id) on delete cascade;
alter table lessons add constraint lessons_same_festival_day
  foreign key (festival_id, day_id) references days (festival_id, id) on delete restrict;
alter table lessons add constraint lessons_same_festival_start
  foreign key (festival_id, start_slot_id) references time_slots (festival_id, id) on delete restrict;
alter table lessons add constraint lessons_same_festival_end
  foreign key (festival_id, end_slot_id) references time_slots (festival_id, id) on delete restrict;
alter table lessons add constraint lessons_same_festival_room
  foreign key (festival_id, room_id) references rooms (festival_id, id) on delete restrict;
alter table lessons add constraint lessons_same_festival_style
  foreign key (festival_id, style_id) references styles (festival_id, id) on delete set null (style_id);
alter table parties add constraint parties_same_festival_day
  foreign key (festival_id, day_id) references days (festival_id, id) on delete restrict;
alter table parties add constraint parties_same_festival_room
  foreign key (festival_id, room_id) references rooms (festival_id, id) on delete restrict;

-- ---------------------------------------------------------------------------
-- M2 + L5: festival – formát barev, https odkazy, adresu a stav mění jen hlavní organizátor
-- ---------------------------------------------------------------------------
create function valid_colors(c text[]) returns boolean
language sql immutable as $$
  select coalesce(bool_and(x ~ '^#[0-9A-Fa-f]{6}$'), true) from unnest(c) as x;
$$;

alter table festivals add constraint festivals_colors_format check (valid_colors(colors));
alter table festivals add constraint festivals_urls_https check (
  coalesce(logo_wide_url, 'https://') ~ '^https://'
  and coalesce(logo_square_url, 'https://') ~ '^https://'
  and coalesce(banner_url, 'https://') ~ '^https://'
);
alter table teacher_profiles add constraint teacher_profiles_photo_https check (coalesce(photo_url, 'https://') ~ '^https://');

create function guard_festival_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.slug, new.status) is distinct from (old.slug, old.status) and not is_lead_organizer(old.id) then
    raise exception 'Adresu a stav festivalu mění jen hlavní organizátor' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger festivals_guard before update on festivals
  for each row execute function guard_festival_update();

-- ---------------------------------------------------------------------------
-- M4: vyhledání účtu podle e-mailu jen pro organizátora daného festivalu, bez jména
-- ---------------------------------------------------------------------------
drop function find_user_by_email(citext);
create function find_user_by_email(lookup citext, fid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select p.id from profiles p
  where p.email = lookup and is_organizer(fid);
$$;

-- ---------------------------------------------------------------------------
-- L1: smazání účtu – srozumitelná chyba a zrušení pozvánek
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
  update teacher_profiles set photo_url = null, bio_cs = null, bio_en = null where user_id = me;
  delete from teacher_profile_revisions where profile_id in (select id from teacher_profiles where user_id = me);
  delete from auth.users where id = me;
end;
$$;

-- ---------------------------------------------------------------------------
-- M3: funkce nejsou veřejně spustitelné; nepřihlášení jen pomocné funkce pro RLS
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function is_platform_admin(), is_organizer(uuid), is_lead_organizer(uuid),
  festival_is_public(uuid), can_read_festival(uuid), can_edit_teacher(uuid), valid_colors(text[]) to anon;
