-- Clave – krátký název festivalu pod ikonou aplikace na ploše telefonu (PWA)

alter table festivals
  add column short_name text,
  add constraint festivals_short_name_length check (short_name is null or char_length(short_name) between 1 and 15);
