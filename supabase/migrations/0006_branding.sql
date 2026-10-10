-- Clave – vizuální identita festivalu a obrázky (PRD 7.2)

-- ---------------------------------------------------------------------------
-- Úložiště obrázků: veřejně čitelné, max 2 MB, jen obrázky
-- Cesty:
--   festivals/<festival_id>/…                    logo, banner (hlavní organizátor)
--   teachers/<teacher_profile_id>/…              globální fotka učitele (kdo smí upravit medailonek)
--   festival-teachers/<festival_id>/<teacher_id>/…  fotka učitele jen pro festival (organizátor)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create function can_write_image(object_name text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  parts text[] := string_to_array(object_name, '/');
begin
  if auth.uid() is null or array_length(parts, 1) < 3 then
    return false;
  end if;
  if parts[1] = 'festivals' then
    return is_lead_organizer(parts[2]::uuid);
  elsif parts[1] = 'teachers' then
    return can_edit_teacher(parts[2]::uuid);
  elsif parts[1] = 'festival-teachers' and array_length(parts, 1) >= 4 then
    return is_organizer(parts[2]::uuid)
       and exists (select 1 from festival_teachers
                   where festival_id = parts[2]::uuid and teacher_profile_id = parts[3]::uuid);
  end if;
  return false;
exception when invalid_text_representation then
  return false;
end;
$$;

revoke execute on function can_write_image(text) from public, anon;
grant execute on function can_write_image(text) to authenticated;

create policy "images insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and can_write_image(name));
create policy "images update" on storage.objects for update to authenticated
  using (bucket_id = 'images' and can_write_image(name))
  with check (bucket_id = 'images' and can_write_image(name));
create policy "images delete" on storage.objects for delete to authenticated
  using (bucket_id = 'images' and can_write_image(name));

-- ---------------------------------------------------------------------------
-- Vizuální identitu (barvy, písmo, logo, banner) mění jen hlavní organizátor
-- ---------------------------------------------------------------------------
create or replace function guard_festival_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
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

alter table festivals add constraint festivals_font_known
  check (font in ('inter', 'poppins', 'montserrat', 'nunito', 'playfair'));
