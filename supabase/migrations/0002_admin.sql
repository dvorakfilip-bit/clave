-- Clave – správa festivalu (etapa 3)

-- Přijetí pozvánek po přihlášení: role se přiřadí podle e-mailu účtu (PRD 4.1).
create function accept_invitations() returns int
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
  select email into my_email from profiles where id = me;

  for inv in
    select * from invitations
    where email = my_email and status = 'pending' and expires_at > now()
  loop
    if inv.role = 'teacher' then
      update teacher_profiles set user_id = me
      where id = inv.teacher_profile_id and user_id is null;
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

-- Festival nesmí zůstat bez hlavního organizátora (PRD 4).
create function keep_lead_organizer() returns trigger language plpgsql as $$
declare
  fid uuid := coalesce(old.festival_id, new.festival_id);
begin
  if not exists (select 1 from festivals where id = fid) then
    return null; -- maže se celý festival
  end if;
  if not exists (select 1 from festival_members where festival_id = fid and role = 'lead_organizer') then
    raise exception 'Festival musí mít alespoň jednoho hlavního organizátora' using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create constraint trigger festival_members_keep_lead
  after update or delete on festival_members
  deferrable initially deferred
  for each row execute function keep_lead_organizer();

-- Seznam organizátorů festivalu se jmény (profily jinak vidí jen jejich majitel).
create function festival_organizers(fid uuid)
returns table (user_id uuid, display_name text, email citext, role festival_role)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.display_name, p.email, m.role
  from festival_members m join profiles p on p.id = m.user_id
  where m.festival_id = fid and is_organizer(fid)
  order by m.role, p.display_name;
$$;

-- Vyhledání učitelů podle jména napříč platformou (PRD 4 – učitelé jsou veřejní).
create index teacher_profiles_name_idx on teacher_profiles (lower(name));

-- Organizátor zakládá učitele i bez účtu; přiřadí ho rovnou ke svému festivalu.
create function create_teacher(fid uuid, teacher_name text, bio_cs text default null, bio_en text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  tid uuid;
begin
  if not is_organizer(fid) then
    raise exception 'Nedostatečná oprávnění' using errcode = 'insufficient_privilege';
  end if;
  insert into teacher_profiles (name, bio_cs, bio_en) values (teacher_name, bio_cs, bio_en) returning id into tid;
  insert into festival_teachers (festival_id, teacher_profile_id) values (fid, tid);
  return tid;
end;
$$;

-- Povýšení existujícího účtu na učitele: propojí profil učitele s účtem (PRD 4).
create function link_teacher_account(fid uuid, tid uuid, uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_organizer(fid)
     or not exists (select 1 from festival_teachers where festival_id = fid and teacher_profile_id = tid) then
    raise exception 'Nedostatečná oprávnění' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from teacher_profiles where user_id = uid and id <> tid) then
    raise exception 'Tento účet už má jiný profil učitele' using errcode = 'unique_violation';
  end if;
  update teacher_profiles set user_id = uid where id = tid;
end;
$$;
