-- Persiste evidencia de origen de forma atómica y evita perder máximos
-- cuando dos ejecuciones del planificador procesan el mismo tracker.
create or replace function public.geofence_actualizar_evidencia(
  p_viaje_id uuid,
  p_en_origen_visto boolean,
  p_max_dist_origen_m double precision
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.puede_operar_viajes() then
    raise exception 'No autorizado para actualizar evidencia de geocerca.'
      using errcode = '42501';
  end if;

  if p_max_dist_origen_m is null or p_max_dist_origen_m < 0 then
    raise exception 'Distancia de origen inválida.'
      using errcode = '22023';
  end if;

  update public.geofence_viaje_estado
  set en_origen_visto = coalesce(en_origen_visto, false) or coalesce(p_en_origen_visto, false),
      max_dist_origen_m = greatest(max_dist_origen_m, p_max_dist_origen_m),
      updated_at = now()
  where viaje_id = p_viaje_id;

  return found;
end;
$$;

alter function public.geofence_actualizar_evidencia(uuid, boolean, double precision) owner to postgres;
revoke all on function public.geofence_actualizar_evidencia(uuid, boolean, double precision) from public, anon;
grant execute on function public.geofence_actualizar_evidencia(uuid, boolean, double precision) to service_role;

-- Las alertas que describen un viaje requieren un viaje existente y un
-- cabezal asignado. Las notificaciones operativas también validan el estado
-- que les corresponde para no alertar sobre unidades fuera de operación.
create or replace function public.validar_alerta_viaje_asignado()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_cabezal_id uuid;
  v_estado text;
  v_estado_requerido text;
begin
  -- Conserva los registros de prueba manuales, que no envían push.
  if new.canal_push = false and new.mensaje like '[PRUEBA]%' then
    return new;
  end if;

  if new.tipo not in (
    'inicio_viaje',
    'llegada_destino',
    'retorno_viaje',
    'finalizacion_viaje',
    'velocidad_excesiva',
    'retraso_operativo',
    'inactividad_prolongada'
  ) then
    return new;
  end if;

  if new.viaje_id is null then
    return null;
  end if;

  select cabezal_id, estado
  into v_cabezal_id, v_estado
  from public.viajes
  where id = new.viaje_id
    and deleted_at is null;

  if not found or v_cabezal_id is null then
    return null;
  end if;

  v_estado_requerido := case new.tipo
    when 'inicio_viaje' then 'en_transito'
    when 'llegada_destino' then 'en_destino'
    when 'retorno_viaje' then 'de_vuelta'
    when 'finalizacion_viaje' then 'finalizado'
    else null
  end;

  if v_estado_requerido is not null and v_estado <> v_estado_requerido then
    return null;
  end if;

  if new.tipo in ('velocidad_excesiva', 'retraso_operativo', 'inactividad_prolongada')
    and v_estado not in ('en_transito', 'en_destino', 'de_vuelta') then
    return null;
  end if;

  return new;
end;
$$;

alter function public.validar_alerta_viaje_asignado() owner to postgres;
revoke all on function public.validar_alerta_viaje_asignado() from public, anon;
grant execute on function public.validar_alerta_viaje_asignado() to authenticated, service_role;

drop trigger if exists trg_validar_alerta_viaje_asignado on public.alertas;
create trigger trg_validar_alerta_viaje_asignado
  before insert on public.alertas
  for each row
  execute function public.validar_alerta_viaje_asignado();

notify pgrst, 'reload schema';
