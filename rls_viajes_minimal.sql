-- rls_viajes_minimal.sql
-- Optional minimal policies for local/manual testing if RLS blocks authenticated users.
-- Review before production use.

alter table public.viajes enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'viajes'
      and policyname = 'viajes_authenticated_select'
  ) then
    create policy viajes_authenticated_select
      on public.viajes
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'viajes'
      and policyname = 'viajes_authenticated_insert'
  ) then
    create policy viajes_authenticated_insert
      on public.viajes
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'viajes'
      and policyname = 'viajes_authenticated_update'
  ) then
    create policy viajes_authenticated_update
      on public.viajes
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

notify pgrst, 'reload schema';
