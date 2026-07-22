/* // CHANGE: geofence migration fix - normalize the start counter and allow the return leg state safely. */
alter table public.viajes
  add column if not exists lecturas_inicio_confirm integer;

alter table public.viajes
  alter column lecturas_inicio_confirm set default 0;

update public.viajes
set lecturas_inicio_confirm = 0
where lecturas_inicio_confirm is null;

alter table public.viajes
  alter column lecturas_inicio_confirm set not null;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.viajes'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%estado%'
      and pg_get_constraintdef(c.oid) not ilike '%de_vuelta%'
  loop
    execute format('alter table public.viajes drop constraint %I', constraint_name);
  end loop;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.viajes'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%estado%'
      and pg_get_constraintdef(c.oid) ilike '%de_vuelta%'
  ) then
    alter table public.viajes
      add constraint viajes_estado_check
      check (estado in ('programado','en_transito','en_destino','de_vuelta','finalizado','cancelado'));
  end if;
end $$;

notify pgrst, 'reload schema';
