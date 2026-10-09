-- Clave – základní schéma (PRD v0.7, kap. 10)

create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Typy
-- ---------------------------------------------------------------------------

create type festival_status as enum ('draft', 'published', 'archived');
create type festival_role as enum ('lead_organizer', 'organizer');
create type invitation_role as enum ('lead_organizer', 'organizer', 'teacher');
create type invitation_status as enum ('pending', 'accepted', 'revoked');

-- ---------------------------------------------------------------------------
-- Uživatelé
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  email citext not null unique,
  locale text not null default 'cs' check (locale in ('cs', 'en')),
  created_at timestamptz not null default now()
);

create table platform_admins (
  user_id uuid primary key references profiles (id) on delete cascade
);

-- Profil se založí automaticky při registraci (Google / magic link).
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Festival
-- ---------------------------------------------------------------------------

create table festivals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description_cs text,
  description_en text,
  start_date date not null,
  end_date date not null,
  timezone text not null default 'Europe/Prague',
  status festival_status not null default 'draft',
  -- Vizuální identita (kap. 7.2): barvy v pořadí hlavní, doplňková, zvýrazňující, podklad, text
  colors text[] not null default array['#C8102E'],
  font text not null default 'inter',
  logo_wide_url text,
  logo_square_url text,
  banner_url text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (cardinality(colors) between 1 and 5)
);

create table festival_members (
  festival_id uuid not null references festivals (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role festival_role not null,
  created_at timestamptz not null default now(),
  primary key (festival_id, user_id)
);

create table days (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references festivals (id) on delete cascade,
  date date not null,
  unique (festival_id, date)
);

create table time_slots (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references festivals (id) on delete cascade,
  day_id uuid not null references days (id) on delete cascade,
  starts_at time not null,
  ends_at time not null,
  check (ends_at > starts_at)
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references festivals (id) on delete cascade,
  name text not null,
  position int not null default 0
);

create table styles (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references festivals (id) on delete cascade,
  name text not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- ---------------------------------------------------------------------------
-- Učitelé (globální profily, kap. 4)
-- ---------------------------------------------------------------------------

create table teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references profiles (id) on delete set null,
  name text not null,
  photo_url text,
  bio_cs text,
  bio_en text,
  updated_at timestamptz not null default now()
);

create table teacher_profile_revisions (
  id bigint generated always as identity primary key,
  profile_id uuid not null references teacher_profiles (id) on delete cascade,
  author_id uuid references profiles (id) on delete set null,
  previous jsonb not null,
  created_at timestamptz not null default now()
);

create table festival_teachers (
  festival_id uuid not null references festivals (id) on delete cascade,
  teacher_profile_id uuid not null references teacher_profiles (id) on delete cascade,
  primary key (festival_id, teacher_profile_id)
);

-- ---------------------------------------------------------------------------
-- Program
-- ---------------------------------------------------------------------------

create table lessons (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references festivals (id) on delete cascade,
  day_id uuid not null references days (id) on delete restrict,
  start_slot_id uuid not null references time_slots (id) on delete restrict,
  end_slot_id uuid not null references time_slots (id) on delete restrict,
  room_id uuid not null references rooms (id) on delete restrict,
  style_id uuid references styles (id) on delete set null,
  title_cs text,
  title_en text,
  description_cs text,
  description_en text,
  -- 0–3 po 0,5; 0 = nejlehčí / pro všechny úrovně
  level numeric(2, 1) not null default 0 check (level between 0 and 3 and level * 2 = floor(level * 2)),
  cancelled boolean not null default false,
  -- Čas poslední změny důležité pro účastníky (čas, místnost, učitel, zrušení) – kap. 5.3
  changed_at timestamptz,
  updated_at timestamptz not null default now(),
  check (coalesce(title_cs, title_en) is not null)
);

create table lesson_teachers (
  lesson_id uuid not null references lessons (id) on delete cascade,
  teacher_profile_id uuid not null references teacher_profiles (id) on delete restrict,
  primary key (lesson_id, teacher_profile_id)
);

create table parties (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references festivals (id) on delete cascade,
  day_id uuid not null references days (id) on delete restrict,
  starts_at time not null,
  -- Konec může být po půlnoci (ends_at < starts_at = následující den)
  ends_at time,
  room_id uuid references rooms (id) on delete restrict,
  place text,
  title_cs text,
  title_en text,
  description_cs text,
  description_en text,
  cancelled boolean not null default false,
  changed_at timestamptz,
  updated_at timestamptz not null default now(),
  check (coalesce(title_cs, title_en) is not null)
);

create table info_pages (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references festivals (id) on delete cascade,
  position int not null default 0,
  title_cs text,
  title_en text,
  body_cs text,
  body_en text
);

-- ---------------------------------------------------------------------------
-- Účastník
-- ---------------------------------------------------------------------------

create table personal_selections (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles (id) on delete cascade,
  lesson_id uuid references lessons (id) on delete cascade,
  party_id uuid references parties (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(lesson_id, party_id) = 1),
  unique (user_id, lesson_id),
  unique (user_id, party_id)
);

create table festival_visits (
  user_id uuid not null references profiles (id) on delete cascade,
  festival_id uuid not null references festivals (id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, festival_id)
);

-- ---------------------------------------------------------------------------
-- Správa
-- ---------------------------------------------------------------------------

create table invitations (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references festivals (id) on delete cascade,
  email citext not null,
  role invitation_role not null,
  teacher_profile_id uuid references teacher_profiles (id) on delete cascade,
  invited_by uuid references profiles (id) on delete set null,
  status invitation_status not null default 'pending',
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now()
);

create table change_log (
  id bigint generated always as identity primary key,
  festival_id uuid not null references festivals (id) on delete cascade,
  actor_id uuid references profiles (id) on delete set null,
  entity text not null,
  entity_id uuid,
  action text not null,
  data jsonb,
  created_at timestamptz not null default now()
);

create index on time_slots (day_id, starts_at);
create index on lessons (festival_id, day_id);
create index on parties (festival_id, day_id);
create index on personal_selections (user_id);
create index on change_log (festival_id, created_at desc);
create index on invitations (email) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Pomocné funkce pro oprávnění
-- ---------------------------------------------------------------------------

create function is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

create function is_organizer(fid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_platform_admin()
      or exists (select 1 from festival_members where festival_id = fid and user_id = auth.uid());
$$;

create function is_lead_organizer(fid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_platform_admin()
      or exists (select 1 from festival_members
                 where festival_id = fid and user_id = auth.uid() and role = 'lead_organizer');
$$;

create function festival_is_public(fid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from festivals where id = fid and status in ('published', 'archived'));
$$;

create function can_read_festival(fid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select festival_is_public(fid) or is_organizer(fid);
$$;

-- Organizátor smí upravit medailonek učitele, který je přiřazen k jeho festivalu.
create function can_edit_teacher(tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_platform_admin()
      or exists (select 1 from teacher_profiles where id = tid and user_id = auth.uid())
      or exists (select 1 from festival_teachers ft
                 join festival_members fm on fm.festival_id = ft.festival_id
                 where ft.teacher_profile_id = tid and fm.user_id = auth.uid());
$$;

-- Vyhledání účtu podle přesného e-mailu (kap. 4 – ochrana soukromí).
create function find_user_by_email(lookup citext) returns table (id uuid, display_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name from profiles p
  where p.email = lookup
    and (is_platform_admin() or exists (select 1 from festival_members where user_id = auth.uid()));
$$;

-- ---------------------------------------------------------------------------
-- Triggery
-- ---------------------------------------------------------------------------

create function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger lessons_touch before update on lessons for each row execute function touch_updated_at();
create trigger parties_touch before update on parties for each row execute function touch_updated_at();
create trigger teacher_profiles_touch before update on teacher_profiles for each row execute function touch_updated_at();

-- Štítek „Změna“: jen změny důležité pro účastníky.
create function mark_lesson_changed() returns trigger language plpgsql as $$
begin
  if (new.day_id, new.start_slot_id, new.end_slot_id, new.room_id, new.cancelled)
     is distinct from (old.day_id, old.start_slot_id, old.end_slot_id, old.room_id, old.cancelled) then
    new.changed_at := now();
  end if;
  return new;
end;
$$;

create trigger lessons_changed before update on lessons for each row execute function mark_lesson_changed();

create function mark_party_changed() returns trigger language plpgsql as $$
begin
  if (new.day_id, new.starts_at, new.ends_at, new.room_id, new.place, new.cancelled)
     is distinct from (old.day_id, old.starts_at, old.ends_at, old.room_id, old.place, old.cancelled) then
    new.changed_at := now();
  end if;
  return new;
end;
$$;

create trigger parties_changed before update on parties for each row execute function mark_party_changed();

create function mark_lesson_teachers_changed() returns trigger language plpgsql as $$
begin
  update lessons set changed_at = now() where id = coalesce(new.lesson_id, old.lesson_id);
  return null;
end;
$$;

create trigger lesson_teachers_changed after insert or delete on lesson_teachers
  for each row execute function mark_lesson_teachers_changed();

-- Historie medailonku (kap. 5.4 – učitel vidí, kdo a kdy změnil).
create function record_teacher_revision() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.name, new.photo_url, new.bio_cs, new.bio_en)
     is distinct from (old.name, old.photo_url, old.bio_cs, old.bio_en) then
    insert into teacher_profile_revisions (profile_id, author_id, previous)
    values (old.id, auth.uid(), jsonb_build_object(
      'name', old.name, 'photo_url', old.photo_url, 'bio_cs', old.bio_cs, 'bio_en', old.bio_en));
  end if;
  return new;
end;
$$;

create trigger teacher_profiles_revision before update on teacher_profiles
  for each row execute function record_teacher_revision();

-- V jednom slotu a místnosti jen jedna lekce (kap. 5.4).
create function check_lesson_overlap() returns trigger language plpgsql as $$
declare
  new_start time;
  new_end time;
begin
  select starts_at into new_start from time_slots where id = new.start_slot_id and day_id = new.day_id;
  select ends_at into new_end from time_slots where id = new.end_slot_id and day_id = new.day_id;
  if new_start is null or new_end is null or new_end <= new_start then
    raise exception 'Neplatný rozsah slotů lekce' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from lessons l
    join time_slots s on s.id = l.start_slot_id
    join time_slots e on e.id = l.end_slot_id
    where l.room_id = new.room_id and l.day_id = new.day_id and l.id <> new.id
      and s.starts_at < new_end and e.ends_at > new_start
  ) then
    raise exception 'V této místnosti a čase už je jiná lekce' using errcode = 'exclusion_violation';
  end if;
  return new;
end;
$$;

create trigger lessons_overlap before insert or update on lessons
  for each row execute function check_lesson_overlap();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table platform_admins enable row level security;
alter table festivals enable row level security;
alter table festival_members enable row level security;
alter table days enable row level security;
alter table time_slots enable row level security;
alter table rooms enable row level security;
alter table styles enable row level security;
alter table teacher_profiles enable row level security;
alter table teacher_profile_revisions enable row level security;
alter table festival_teachers enable row level security;
alter table lessons enable row level security;
alter table lesson_teachers enable row level security;
alter table parties enable row level security;
alter table info_pages enable row level security;
alter table personal_selections enable row level security;
alter table festival_visits enable row level security;
alter table invitations enable row level security;
alter table change_log enable row level security;

-- Profily: jen vlastní
create policy "own profile read" on profiles for select using (id = auth.uid() or is_platform_admin());
create policy "own profile update" on profiles for update using (id = auth.uid());
create policy "own profile delete" on profiles for delete using (id = auth.uid());

create policy "admins read" on platform_admins for select using (is_platform_admin());
create policy "admins write" on platform_admins for all using (is_platform_admin()) with check (is_platform_admin());

-- Festival
create policy "festival read" on festivals for select using (status in ('published', 'archived') or is_organizer(id));
create policy "festival create" on festivals for insert with check (is_platform_admin());
create policy "festival update" on festivals for update using (is_organizer(id));
create policy "festival delete" on festivals for delete using (is_platform_admin());

create policy "members read" on festival_members for select using (is_organizer(festival_id) or user_id = auth.uid());
create policy "members write" on festival_members for all
  using (is_lead_organizer(festival_id)) with check (is_lead_organizer(festival_id));

-- Data programu: číst smí každý u zveřejněného festivalu, psát organizátor
create policy "days read" on days for select using (can_read_festival(festival_id));
create policy "days write" on days for all using (is_organizer(festival_id)) with check (is_organizer(festival_id));
create policy "slots read" on time_slots for select using (can_read_festival(festival_id));
create policy "slots write" on time_slots for all using (is_organizer(festival_id)) with check (is_organizer(festival_id));
create policy "rooms read" on rooms for select using (can_read_festival(festival_id));
create policy "rooms write" on rooms for all using (is_organizer(festival_id)) with check (is_organizer(festival_id));
create policy "styles read" on styles for select using (can_read_festival(festival_id));
create policy "styles write" on styles for all using (is_organizer(festival_id)) with check (is_organizer(festival_id));
create policy "lessons read" on lessons for select using (can_read_festival(festival_id));
create policy "lessons write" on lessons for all using (is_organizer(festival_id)) with check (is_organizer(festival_id));
create policy "parties read" on parties for select using (can_read_festival(festival_id));
create policy "parties write" on parties for all using (is_organizer(festival_id)) with check (is_organizer(festival_id));
create policy "info read" on info_pages for select using (can_read_festival(festival_id));
create policy "info write" on info_pages for all using (is_organizer(festival_id)) with check (is_organizer(festival_id));

create policy "lesson teachers read" on lesson_teachers for select
  using (exists (select 1 from lessons l where l.id = lesson_id and can_read_festival(l.festival_id)));
create policy "lesson teachers write" on lesson_teachers for all
  using (exists (select 1 from lessons l where l.id = lesson_id and is_organizer(l.festival_id)))
  with check (exists (select 1 from lessons l where l.id = lesson_id and is_organizer(l.festival_id)));

-- Učitelé: profily jsou veřejné
create policy "teachers read" on teacher_profiles for select using (true);
create policy "teachers create" on teacher_profiles for insert
  with check (is_platform_admin() or exists (select 1 from festival_members where user_id = auth.uid()));
create policy "teachers update" on teacher_profiles for update using (can_edit_teacher(id));

create policy "revisions read" on teacher_profile_revisions for select using (can_edit_teacher(profile_id));

create policy "festival teachers read" on festival_teachers for select using (can_read_festival(festival_id));
create policy "festival teachers write" on festival_teachers for all
  using (is_organizer(festival_id)) with check (is_organizer(festival_id));

-- Osobní program: soukromý
create policy "own selections" on personal_selections for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own visits" on festival_visits for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Pozvánky
create policy "invitations read" on invitations for select
  using (is_organizer(festival_id) or email = (select email from profiles where id = auth.uid()));
create policy "invitations write" on invitations for all
  using (case when role = 'teacher' then is_organizer(festival_id) else is_lead_organizer(festival_id) end)
  with check (case when role = 'teacher' then is_organizer(festival_id) else is_lead_organizer(festival_id) end);

-- Log změn
create policy "log read" on change_log for select using (is_organizer(festival_id));
create policy "log insert" on change_log for insert with check (is_organizer(festival_id) and actor_id = auth.uid());
