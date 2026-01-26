-- 1) Extensões para busca por similaridade
create extension if not exists pg_trgm;

-- 2) Storage: bucket para documentos (arquivos físicos ficam no storage, nunca no banco)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- 3) Metadados e indexação: expandir tabela documents
alter table public.documents
  add column if not exists source_type text not null default 'file', -- 'file' | 'link'
  add column if not exists source_url text,
  add column if not exists thematic_area text,
  add column if not exists doc_kind text,
  add column if not exists reference_year integer,
  add column if not exists published_at date,
  add column if not exists valid_from date,
  add column if not exists valid_to date,
  add column if not exists tags_manual text[] not null default '{}'::text[],
  add column if not exists keywords_manual text[] not null default '{}'::text[],
  add column if not exists tags_auto text[] not null default '{}'::text[],
  add column if not exists keywords_auto text[] not null default '{}'::text[],
  add column if not exists extracted_text text,
  add column if not exists group_key text,
  add column if not exists content_tsv tsvector;

-- 4) Índices para performance
create index if not exists idx_documents_unit_id on public.documents (unit_id);
create index if not exists idx_documents_status on public.documents (status);
create index if not exists idx_documents_min_role on public.documents (min_role);
create index if not exists idx_documents_thematic_area on public.documents (thematic_area);
create index if not exists idx_documents_doc_kind on public.documents (doc_kind);
create index if not exists idx_documents_reference_year on public.documents (reference_year);
create index if not exists idx_documents_group_key on public.documents (group_key);
create index if not exists idx_documents_title_trgm on public.documents using gin (title gin_trgm_ops);
create index if not exists idx_documents_content_tsv on public.documents using gin (content_tsv);

-- 5) Triggers: updated_at + tsvector
-- updated_at trigger
drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
before update on public.documents
for each row execute function public.update_updated_at_column();

-- Função para recomputar content_tsv
create or replace function public.documents_refresh_tsv()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.content_tsv :=
    setweight(to_tsvector('simple', coalesce(new.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.description,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(new.tags_manual,' '),'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(new.keywords_manual,' '),'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(new.tags_auto,' '),'')), 'C') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(new.keywords_auto,' '),'')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.extracted_text,'')), 'D');
  return new;
end;
$$;

drop trigger if exists trg_documents_refresh_tsv on public.documents;
create trigger trg_documents_refresh_tsv
before insert or update of title, description, tags_manual, keywords_manual, tags_auto, keywords_auto, extracted_text
on public.documents
for each row execute function public.documents_refresh_tsv();

-- 6) RPCs para o pipeline (sem SQL raw no backend function)
-- 6.1) Encontrar documentos similares por título (escopo por unidade+tipo+area)
create or replace function public.find_similar_documents(
  _title text,
  _type text,
  _thematic_area text,
  _unit_id uuid
)
returns table (
  id uuid,
  title text,
  similarity real,
  published_at date,
  effective_date date,
  created_at timestamptz,
  status document_status,
  version text
)
language sql
stable
security definer
set search_path = public
as $$
  select d.id,
         d.title,
         greatest(similarity(d.title, _title), similarity(coalesce(d.description,''), _title))::real as similarity,
         d.published_at,
         d.effective_date,
         d.created_at,
         d.status,
         d.version
  from public.documents d
  where d.type = _type
    and (d.thematic_area is not distinct from _thematic_area)
    and (d.unit_id is not distinct from _unit_id)
    and can_access_document(auth.uid(), d.unit_id, d.min_role)
  order by similarity desc
  limit 20;
$$;

-- 6.2) Recalcular vigente/substituído dentro de um group_key
create or replace function public.refresh_document_status_for_group(_group_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_top uuid;
begin
  if _group_key is null or length(trim(_group_key)) = 0 then
    return;
  end if;

  -- somente TI pode acionar (pipeline server-side)
  if not has_role(auth.uid(), 'ti'::app_role) then
    raise exception 'not authorized';
  end if;

  select array_agg(d.id order by coalesce(d.published_at, d.effective_date, d.created_at::date) desc, d.updated_at desc)
  into v_ids
  from public.documents d
  where d.group_key = _group_key;

  if v_ids is null or array_length(v_ids, 1) is null then
    return;
  end if;

  v_top := v_ids[1];

  update public.documents
  set status = case when id = v_top then 'vigente'::document_status else 'substituido'::document_status end
  where id = any(v_ids);
end;
$$;

-- 7) Políticas de Storage (governança por documento)
-- Observação: policies em storage.objects precisam estar no schema storage.
-- Select: permitido se existir um registro em public.documents com o mesmo bucket/path e o usuário puder acessar.
drop policy if exists "Documents bucket: read by permission" on storage.objects;
create policy "Documents bucket: read by permission"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.documents d
    where d.storage_bucket = storage.objects.bucket_id
      and d.storage_path = storage.objects.name
      and can_access_document(auth.uid(), d.unit_id, d.min_role)
  )
);

-- Insert/Update/Delete: apenas TI
drop policy if exists "Documents bucket: TI write" on storage.objects;
create policy "Documents bucket: TI write"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'documents' and has_role(auth.uid(), 'ti'::app_role)
)
with check (
  bucket_id = 'documents' and has_role(auth.uid(), 'ti'::app_role)
);
