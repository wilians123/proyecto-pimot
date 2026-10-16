-- Configura y escala la falta de señal a los 10, 20 y 30 minutos.
alter table public.geofence_viaje_estado
  add column if not exists inactividad_alertada_desde timestamptz,
  add column if not exists inactividad_etapa_alerta integer not null default 0;

insert into public.config_alertas (tipo, umbral_minutos, activo, notificar_push)
select 'inactividad_prolongada', 10, true, true
where not exists (
  select 1 from public.config_alertas where tipo = 'inactividad_prolongada'
);

create or replace function public.geofence_verificar_inactividad_viaje(
  p_viaje_id uuid,
  p_ultima_senal_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_estado text;
  v_cabezal_id uuid;
  v_codigo text;
  v_placa text;
  v_activa boolean;
  v_alertada_desde timestamptz;
  v_etapa_actual integer;
  v_etapa_objetivo integer;
  v_etapa_siguiente integer;
  v_minutos_sin_senal integer;
  v_mensaje text;
  v_nivel text;
begin
  if not public.puede_operar_viajes() then
    raise exception 'No autorizado para verificar inactividad de geocerca.'
      using errcode = '42501';
  end if;
  if p_ultima_senal_at is null then
    return jsonb_build_object('ok', true, 'timestamp_desconocido', true);
  end if;

  -- El bloqueo evita que dos ejecuciones del cron envíen el mismo escalón.
  select inactividad_alertada_desde, inactividad_etapa_alerta
    into v_alertada_desde, v_etapa_actual
  from public.geofence_viaje_estado
  where viaje_id = p_viaje_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'estado_geofence_no_encontrado');
  end if;

  select v.estado, v.cabezal_id, v.codigo, c.placa
    into v_estado, v_cabezal_id, v_codigo, v_placa
  from public.viajes v
  left join public.cabezales c on c.id = v.cabezal_id
  where v.id = p_viaje_id and v.deleted_at is null;
  if not found or v_cabezal_id is null then
    return jsonb_build_object('ok', true, 'omitida', 'viaje_sin_unidad');
  end if;
  if v_estado <> 'en_transito' then
    return jsonb_build_object('ok', true, 'omitida', 'viaje_no_en_transito');
  end if;
  if p_ultima_senal_at > now() + interval '5 minutes' then
    return jsonb_build_object('ok', true, 'timestamp_futuro', true);
  end if;

  select activo into v_activa
  from public.config_alertas
  where tipo = 'inactividad_prolongada'
  order by updated_at desc, id desc
  limit 1;
  if not found or v_activa is distinct from true then
    return jsonb_build_object('ok', true, 'omitida', 'alerta_inactividad_desactivada');
  end if;

  v_minutos_sin_senal := greatest(
    0, floor(extract(epoch from (now() - p_ultima_senal_at)) / 60)::integer
  );

  if p_ultima_senal_at >= now() - interval '10 minutes' then
    update public.geofence_viaje_estado
    set inactividad_alertada_desde = null,
        inactividad_etapa_alerta = 0,
        updated_at = now()
    where viaje_id = p_viaje_id;
    update public.alertas
    set estado = 'resuelta', updated_at = now()
    where viaje_id = p_viaje_id
      and tipo = 'inactividad_prolongada'
      and estado in ('pendiente', 'enviada', 'vista');
    return jsonb_build_object('ok', true, 'senal_recuperada', true);
  end if;

  if v_alertada_desde is distinct from p_ultima_senal_at then
    v_etapa_actual := 0;
  end if;
  v_etapa_objetivo := case
    when v_minutos_sin_senal >= 30 then 3
    when v_minutos_sin_senal >= 20 then 2
    when v_minutos_sin_senal >= 10 then 1
    else 0
  end;

  if v_etapa_objetivo = 0 or coalesce(v_etapa_actual, 0) >= v_etapa_objetivo then
    return jsonb_build_object(
      'ok', true,
      'alerta_generada', false,
      'etapa_alerta', coalesce(v_etapa_actual, 0),
      'minutos_sin_senal', v_minutos_sin_senal
    );
  end if;

  -- Si el cron se pausó y ya se rebasaron varios umbrales, manda un aviso
  -- pendiente por ciclo para respetar la secuencia de escalamiento.
  v_etapa_siguiente := coalesce(v_etapa_actual, 0) + 1;
  v_mensaje := case v_etapa_siguiente
    when 1 then format(
      'La unidad %s del viaje %s no reporta señal GPS desde hace %s minutos. Verifique que esté en movimiento y siga su ruta actual.',
      coalesce(v_placa, 'sin placa'), coalesce(v_codigo, p_viaje_id::text), v_minutos_sin_senal
    )
    when 2 then format(
      'La unidad %s del viaje %s continúa sin señal GPS desde hace %s minutos. Por favor verifique su movimiento y ruta.',
      coalesce(v_placa, 'sin placa'), coalesce(v_codigo, p_viaje_id::text), v_minutos_sin_senal
    )
    else format(
      'La unidad %s del viaje %s continúa sin señal GPS por más de 30 minutos. Por favor revise su estado y confirme que siga su ruta.',
      coalesce(v_placa, 'sin placa'), coalesce(v_codigo, p_viaje_id::text)
    )
  end;
  v_nivel := case when v_etapa_siguiente = 3 then 'critico' else 'advertencia' end;

  insert into public.alertas (viaje_id, tipo, nivel, mensaje, estado, canal_push)
  values (p_viaje_id, 'inactividad_prolongada', v_nivel, v_mensaje, 'pendiente', true);
  update public.geofence_viaje_estado
  set inactividad_alertada_desde = p_ultima_senal_at,
      inactividad_etapa_alerta = v_etapa_siguiente,
      updated_at = now()
  where viaje_id = p_viaje_id;

  return jsonb_build_object(
    'ok', true,
    'alerta_generada', true,
    'etapa_alerta', v_etapa_siguiente,
    'minutos_sin_senal', v_minutos_sin_senal
  );
end;
$$;

alter function public.geofence_verificar_inactividad_viaje(uuid, timestamptz) owner to postgres;
revoke all on function public.geofence_verificar_inactividad_viaje(uuid, timestamptz) from public, anon;
grant execute on function public.geofence_verificar_inactividad_viaje(uuid, timestamptz) to service_role;

-- Rechaza alertas de inactividad si el viaje no está exactamente en tránsito.
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
  if new.canal_push = false and new.mensaje like '[PRUEBA]%' then return new; end if;
  if new.tipo not in (
    'inicio_viaje', 'llegada_destino', 'retorno_viaje', 'finalizacion_viaje',
    'velocidad_excesiva', 'retraso_operativo', 'inactividad_prolongada'
  ) then return new; end if;
  if new.viaje_id is null then return null; end if;

  select cabezal_id, estado into v_cabezal_id, v_estado
  from public.viajes where id = new.viaje_id and deleted_at is null;
  if not found or v_cabezal_id is null then return null; end if;

  v_estado_requerido := case new.tipo
    when 'inicio_viaje' then 'en_transito'
    when 'llegada_destino' then 'en_destino'
    when 'retorno_viaje' then 'de_vuelta'
    when 'finalizacion_viaje' then 'finalizado'
    when 'inactividad_prolongada' then 'en_transito'
    else null
  end;
  if v_estado_requerido is not null and v_estado <> v_estado_requerido then return null; end if;
  if new.tipo in ('velocidad_excesiva', 'retraso_operativo')
    and v_estado not in ('en_transito', 'en_destino', 'de_vuelta') then return null; end if;
  return new;
end;
$$;

alter function public.validar_alerta_viaje_asignado() owner to postgres;
revoke all on function public.validar_alerta_viaje_asignado() from public, anon;
grant execute on function public.validar_alerta_viaje_asignado() to authenticated, service_role;

notify pgrst, 'reload schema';
