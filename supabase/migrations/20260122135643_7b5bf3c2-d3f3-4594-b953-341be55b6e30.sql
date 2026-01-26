-- Fix linter WARN: keep extensions out of public schema
create schema if not exists extensions;

-- Move pg_trgm extension to extensions schema (idempotent)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_trgm') then
    execute 'alter extension pg_trgm set schema extensions';
  end if;
end
$$;