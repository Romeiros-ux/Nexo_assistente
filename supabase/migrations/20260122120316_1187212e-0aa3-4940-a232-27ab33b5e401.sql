-- RBAC + escopo por unidade + auditoria

-- 1) Enums
create type public.app_role as enum ('secretaria', 'ti', 'coordenacao', 'diretor');
create type public.document_status as enum ('vigente', 'substituido', 'arquivado');

-- 2) Unidades
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.units enable row level security;

-- 3) Perfis (dados de usuário; roles ficam em tabela separada)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text,
  full_name text,
  unit_id uuid null references public.units(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 4) Roles (separado; evita escalonamento de privilégio)
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- 5) Funções auxiliares (SECURITY DEFINER para evitar recursão RLS)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

create or replace function public.role_rank(_role public.app_role)
returns int
language sql
immutable
set search_path = public
as $$
  select case _role
    when 'diretor' then 1
    when 'coordenacao' then 2
    when 'secretaria' then 3
    when 'ti' then 4
  end
$$;

create or replace function public.user_max_role_rank(_user_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(public.role_rank(role)), 0)
  from public.user_roles
  where user_id = _user_id
$$;

create or replace function public.user_primary_role(_user_id uuid)
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_roles
  where user_id = _user_id
  order by public.role_rank(role) desc
  limit 1
$$;

create or replace function public.user_unit_id(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select unit_id
  from public.profiles
  where user_id = _user_id
  limit 1
$$;

-- 6) Trigger timestamps
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'tr_units_updated_at') then
    create trigger tr_units_updated_at
    before update on public.units
    for each row
    execute function public.update_updated_at_column();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'tr_profiles_updated_at') then
    create trigger tr_profiles_updated_at
    before update on public.profiles
    for each row
    execute function public.update_updated_at_column();
  end if;
end $$;

-- 7) Perfil automático no signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

-- Attach trigger to auth.users (allowed; it's a trigger only)
-- Note: Supabase manages auth schema, but this trigger is a standard pattern.
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
  end if;
end $$;

-- 8) Documentos (metadados) — controle por unidade + papel mínimo
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  unit_id uuid null references public.units(id) on delete set null,
  type text not null,
  version text not null,
  status public.document_status not null default 'vigente',
  effective_date date,
  min_role public.app_role not null default 'diretor',
  storage_bucket text,
  storage_path text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents enable row level security;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'tr_documents_updated_at') then
    create trigger tr_documents_updated_at
    before update on public.documents
    for each row
    execute function public.update_updated_at_column();
  end if;
end $$;

-- 9) Auditoria
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role,
  unit_id uuid,
  action text not null,
  resource_type text,
  resource_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create or replace function public.audit_enrich()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- force server-side identity
  new.user_id := auth.uid();
  new.role := public.user_primary_role(auth.uid());
  new.unit_id := public.user_unit_id(auth.uid());
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'tr_audit_enrich') then
    create trigger tr_audit_enrich
    before insert on public.audit_logs
    for each row
    execute function public.audit_enrich();
  end if;
end $$;

-- 10) Políticas RLS

-- Units: leitura para autenticados; escrita somente TI
create policy "Units: read authenticated"
on public.units
for select
to authenticated
using (true);

create policy "Units: write only TI"
on public.units
for all
to authenticated
using (public.has_role(auth.uid(), 'ti'))
with check (public.has_role(auth.uid(), 'ti'));

-- Profiles: usuário vê/atualiza apenas o próprio; TI vê todos
create policy "Profiles: self read"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Profiles: TI read all"
on public.profiles
for select
to authenticated
using (public.has_role(auth.uid(), 'ti'));

create policy "Profiles: self update"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Bloqueia inserts manuais (criado por trigger)
create policy "Profiles: no direct insert"
on public.profiles
for insert
to authenticated
with check (false);

-- Roles: somente TI gerencia; usuário pode ler as próprias roles
create policy "Roles: self read"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Roles: TI manage"
on public.user_roles
for all
to authenticated
using (public.has_role(auth.uid(), 'ti'))
with check (public.has_role(auth.uid(), 'ti'));

-- Documents:
-- TI: acesso total
-- Outros: precisa estar ativo, atender papel mínimo e escopo (global ou própria unidade)
create or replace function public.can_access_document(_user_id uuid, _doc_unit_id uuid, _min_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- TI sempre
    public.has_role(_user_id, 'ti')
    or (
      -- usuário ativo
      exists (select 1 from public.profiles p where p.user_id = _user_id and p.is_active = true)
      and
      -- papel mínimo
      public.user_max_role_rank(_user_id) >= public.role_rank(_min_role)
      and
      -- escopo: global (unit_id null) ou unidade do usuário (diretor/afins)
      (
        _doc_unit_id is null
        or _doc_unit_id = public.user_unit_id(_user_id)
        or public.user_max_role_rank(_user_id) >= public.role_rank('secretaria')
      )
    )
$$;

create policy "Documents: read by permission"
on public.documents
for select
to authenticated
using (public.can_access_document(auth.uid(), unit_id, min_role));

-- CRUD somente TI
create policy "Documents: TI write"
on public.documents
for all
to authenticated
using (public.has_role(auth.uid(), 'ti'))
with check (public.has_role(auth.uid(), 'ti'));

-- Audit logs: inserir para autenticados (enriquecimento server-side); ler apenas TI
create policy "Audit: insert authenticated"
on public.audit_logs
for insert
to authenticated
with check (true);

create policy "Audit: TI read"
on public.audit_logs
for select
to authenticated
using (public.has_role(auth.uid(), 'ti'));

-- 11) Índices
create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_documents_unit_id on public.documents(unit_id);
create index if not exists idx_documents_status on public.documents(status);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
