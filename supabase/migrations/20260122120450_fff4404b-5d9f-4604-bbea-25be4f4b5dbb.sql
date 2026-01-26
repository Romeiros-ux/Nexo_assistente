-- Fix linter: audit_logs insert policy too permissive
-- Remove permissive policy, create restrictive one
drop policy if exists "Audit: insert authenticated" on public.audit_logs;

-- Only allow inserts for active users
create policy "Audit: insert only active users"
on public.audit_logs
for insert
to authenticated
with check (
  exists (
    select 1 
    from public.profiles 
    where user_id = auth.uid() 
      and is_active = true
  )
);