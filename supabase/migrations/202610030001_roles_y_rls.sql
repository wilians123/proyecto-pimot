-- =====================================================================
-- PIMOT - Control de acceso por roles (RLS)        202610030001
-- Ejecutar COMPLETO en Supabase -> SQL Editor (una sola ejecucion).
-- Es una transaccion unica e idempotente: si algo falla, no queda nada
-- a medias. Se puede volver a correr sin problema.
--
-- Roles:  admin (propietario) | operativo (encargado) | visualizador (piloto)
--
-- Que corrige (hallazgos del dump de la BD):
--  1. get_user_rol() ignoraba profiles.activo: un usuario desactivado
--     conservaba permisos de escritura.
--  2. Las politicas SELECT usaban solo auth.role()='authenticated':
--     cualquier cuenta (incluso desactivada o sin perfil) leia todo.
--  3. actualizar_estado_viaje_automatico() e incrementar_lecturas_fuera_destino()
--     son SECURITY DEFINER, sin validar rol y con EXECUTE para anon/authenticated:
--     cualquiera con la anon key (publica) podia cambiar estados de viajes.
--  4. gps_logs: la politica service_role_inserta_gps (WITH CHECK true) aplicaba
--     a todos los roles: cualquiera podia insertar posiciones falsas.
--  5. handle_new_user() tomaba el rol de user_metadata (editable en signUp):
--     con registro publico habilitado, cualquiera podia crearse como admin.
--  6. Politicas mas amplias que la matriz de permisos (operativo borraba
--     clientes/rentas, creaba pilotos y cabezales, cancelaba viajes, etc.).
--
-- IMPORTANTE (paso manual, fuera de SQL):
--  Supabase -> Authentication -> Sign In / Providers -> desactivar
--  "Allow new users to sign up". Los usuarios se crean solo desde /api/usuarios.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Prechequeo: evita dejar el sistema sin administradores.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.profiles where rol = 'admin' and activo) then
    raise exception 'ABORTADO: no hay ningun administrador activo en public.profiles. '
                    'Crea o reactiva uno antes de ejecutar este script.';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. get_user_rol(): devuelve el rol SOLO si el perfil existe y esta activo.
--    Misma firma, asi todas las politicas existentes y futuras respetan "activo".
-- ---------------------------------------------------------------------
create or replace function public.get_user_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.rol
  from public.profiles p
  where p.id = auth.uid()
    and p.activo = true;
$$;

alter function public.get_user_rol() owner to postgres;
revoke all on function public.get_user_rol() from public;
grant execute on function public.get_user_rol() to anon, authenticated, service_role;

-- Helper: quien puede operar viajes (admin, operativo o el servidor).
create or replace function public.puede_operar_viajes()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(public.get_user_rol() in ('admin', 'operativo'), false)
    or coalesce(
         nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
         nullif(current_setting('request.jwt.claim.role', true), ''),
         ''
       ) = 'service_role'
    or session_user in ('postgres', 'supabase_admin');
$$;

alter function public.puede_operar_viajes() owner to postgres;
revoke all on function public.puede_operar_viajes() from public, anon;
grant execute on function public.puede_operar_viajes() to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2. handle_new_user(): el rol ya NO se toma de user_metadata (editable por
--    el propio usuario en signUp). Solo de app_metadata, que unicamente puede
--    escribir el servidor (service role). Sin rol valido -> 'visualizador'.
--    REQUIERE que /api/usuarios envie app_metadata: { rol } (lo hace la Fase 4).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text;
begin
  v_rol := lower(coalesce(new.raw_app_meta_data ->> 'rol', ''));
  if v_rol not in ('admin', 'operativo', 'visualizador') then
    v_rol := 'visualizador';
  end if;

  insert into public.profiles (id, nombre, rol)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), split_part(new.email, '@', 1)),
    v_rol
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

alter function public.handle_new_user() owner to postgres;

-- El trigger sobre auth.users no aparece en el dump (solo cubre el esquema
-- public). Se crea solo si no existe ya uno que ejecute handle_new_user.
do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_proc p      on p.oid = t.tgfoid
    join pg_namespace n on n.oid = p.pronamespace
    where t.tgrelid = 'auth.users'::regclass
      and not t.tgisinternal
      and n.nspname = 'public'
      and p.proname = 'handle_new_user'
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. RPC SECURITY DEFINER: solo admin, operativo o el servidor.
--    Se conserva EXACTAMENTE la logica original; solo se agrega el guard.
-- ---------------------------------------------------------------------
create or replace function public.actualizar_estado_viaje_automatico(
  p_viaje_id        uuid,
  p_estado_nuevo    text,
  p_fecha_timestamp timestamp with time zone default now()
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_estado_actual   text;
  v_bloqueado       boolean;
  v_updates         jsonb := '{}'::jsonb;
begin
  -- Guard de acceso (nuevo)
  if not public.puede_operar_viajes() then
    raise exception 'No autorizado para cambiar el estado de un viaje.'
      using errcode = '42501';
  end if;

  -- Leer estado actual para validar la transicion
  select estado, bloqueado
  into v_estado_actual, v_bloqueado
  from public.viajes
  where id = p_viaje_id
    and deleted_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'viaje_no_encontrado');
  end if;

  -- Validar transicion: solo se permiten las rutas del diagrama de estados
  if not (
    (v_estado_actual = 'programado'  and p_estado_nuevo = 'en_transito') or
    (v_estado_actual = 'en_transito' and p_estado_nuevo = 'en_destino')  or
    (v_estado_actual = 'en_destino'  and p_estado_nuevo = 'de_vuelta')   or
    (v_estado_actual = 'de_vuelta'   and p_estado_nuevo = 'finalizado')
  ) then
    return jsonb_build_object(
      'ok', false,
      'error', 'transicion_invalida',
      'desde', v_estado_actual,
      'hacia', p_estado_nuevo
    );
  end if;

  -- Aplicar campos especificos por transicion
  case p_estado_nuevo
    when 'en_transito' then
      update public.viajes set
        estado        = 'en_transito',
        bloqueado     = true,
        fecha_inicio  = coalesce(fecha_inicio, p_fecha_timestamp),
        updated_at    = now()
      where id = p_viaje_id;

    when 'en_destino' then
      update public.viajes set
        estado                 = 'en_destino',
        fecha_llegada_destino  = p_fecha_timestamp,
        lecturas_fuera_destino = 0,
        updated_at             = now()
      where id = p_viaje_id;

    when 'de_vuelta' then
      update public.viajes set
        estado                 = 'de_vuelta',
        fecha_salida_destino   = p_fecha_timestamp,
        lecturas_fuera_destino = 0,
        updated_at             = now()
      where id = p_viaje_id;

    when 'finalizado' then
      update public.viajes set
        estado      = 'finalizado',
        fecha_fin   = p_fecha_timestamp,
        updated_at  = now()
      where id = p_viaje_id;
  end case;

  return jsonb_build_object('ok', true, 'estado_nuevo', p_estado_nuevo);
end;
$$;

alter function public.actualizar_estado_viaje_automatico(uuid, text, timestamp with time zone) owner to postgres;

create or replace function public.incrementar_lecturas_fuera_destino(p_viaje_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_nuevo_valor integer;
begin
  -- Guard de acceso (nuevo)
  if not public.puede_operar_viajes() then
    raise exception 'No autorizado para modificar lecturas de un viaje.'
      using errcode = '42501';
  end if;

  update public.viajes
  set
    lecturas_fuera_destino = lecturas_fuera_destino + 1,
    updated_at             = now()
  where id = p_viaje_id
    and estado = 'en_destino'
    and deleted_at is null
  returning lecturas_fuera_destino into v_nuevo_valor;

  return coalesce(v_nuevo_valor, 0);
end;
$$;

alter function public.incrementar_lecturas_fuera_destino(uuid) owner to postgres;

-- Quitar EXECUTE a anon / public (la anon key es publica en el navegador)
revoke all on function public.actualizar_estado_viaje_automatico(uuid, text, timestamp with time zone) from public, anon;
grant execute on function public.actualizar_estado_viaje_automatico(uuid, text, timestamp with time zone) to authenticated, service_role;

revoke all on function public.incrementar_lecturas_fuera_destino(uuid) from public, anon;
grant execute on function public.incrementar_lecturas_fuera_destino(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 4. Politicas RLS por rol.
--    Se eliminan TODAS las politicas actuales de estas tablas y se recrean.
--    El service role (rutas API del servidor) ignora RLS: geocercas, Navixy y
--    el alta de usuarios no se ven afectados.
-- ---------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'alertas', 'cabezales', 'chasis', 'clientes', 'config_alertas',
        'estado_viaje_log', 'gps_logs', 'navixy_trackers', 'pilotos',
        'profiles', 'rentas_chasis', 'reportes', 'tipos_renta', 'viajes'
      )
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

alter table public.alertas          enable row level security;
alter table public.cabezales        enable row level security;
alter table public.chasis           enable row level security;
alter table public.clientes         enable row level security;
alter table public.config_alertas   enable row level security;
alter table public.estado_viaje_log enable row level security;
alter table public.gps_logs         enable row level security;
alter table public.navixy_trackers  enable row level security;
alter table public.pilotos          enable row level security;
alter table public.profiles         enable row level security;
alter table public.rentas_chasis    enable row level security;
alter table public.reportes         enable row level security;
alter table public.tipos_renta      enable row level security;
alter table public.viajes           enable row level security;

-- ===== profiles ======================================================
-- Cada usuario ve su propia fila (necesaria para saber si esta desactivado);
-- el admin ve y actualiza todas. Altas via trigger / service role.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.get_user_rol()) = 'admin');

create policy profiles_update_admin on public.profiles for update to authenticated
  using ((select public.get_user_rol()) = 'admin')
  with check ((select public.get_user_rol()) = 'admin');

-- ===== viajes ========================================================
-- Leen los 3 roles (el piloto consulta viajes activos). Escriben admin y
-- operativo. Cancelar o eliminar (borrado logico) es solo del admin.
create policy viajes_select on public.viajes for select to authenticated
  using ((select public.get_user_rol()) in ('admin', 'operativo', 'visualizador'));

create policy viajes_insert on public.viajes for insert to authenticated
  with check ((select public.get_user_rol()) in ('admin', 'operativo'));

create policy viajes_update on public.viajes for update to authenticated
  using ((select public.get_user_rol()) in ('admin', 'operativo'))
  with check (
    (select public.get_user_rol()) = 'admin'
    or ((select public.get_user_rol()) = 'operativo'
        and estado <> 'cancelado'
        and deleted_at is null)
  );

create policy viajes_delete on public.viajes for delete to authenticated
  using ((select public.get_user_rol()) = 'admin');

-- ===== pilotos =======================================================
-- Leen los 3 roles (join de viajes y lista de contacto). Escribe solo admin.
create policy pilotos_select on public.pilotos for select to authenticated
  using ((select public.get_user_rol()) in ('admin', 'operativo', 'visualizador'));

create policy pilotos_insert on public.pilotos for insert to authenticated
  with check ((select public.get_user_rol()) = 'admin');

create policy pilotos_update on public.pilotos for update to authenticated
  using ((select public.get_user_rol()) = 'admin')
  with check ((select public.get_user_rol()) = 'admin');

create policy pilotos_delete on public.pilotos for delete to authenticated
  using ((select public.get_user_rol()) = 'admin');

-- ===== cabezales y chasis ============================================
-- Leen los 3 roles (join de viajes). Alta/baja: admin. Estado: admin y operativo.
create policy cabezales_select on public.cabezales for select to authenticated
  using ((select public.get_user_rol()) in ('admin', 'operativo', 'visualizador'));
create policy cabezales_insert on public.cabezales for insert to authenticated
  with check ((select public.get_user_rol()) = 'admin');
create policy cabezales_update on public.cabezales for update to authenticated
  using ((select public.get_user_rol()) in ('admin', 'operativo'))
  with check ((select public.get_user_rol()) in ('admin', 'operativo'));
create policy cabezales_delete on public.cabezales for delete to authenticated
  using ((select public.get_user_rol()) = 'admin');

create policy chasis_select on public.chasis for select to authenticated
  using ((select public.get_user_rol()) in ('admin', 'operativo', 'visualizador'));
create policy chasis_insert on public.chasis for insert to authenticated
  with check ((select public.get_user_rol()) = 'admin');
create policy chasis_update on public.chasis for update to authenticated
  using ((select public.get_user_rol()) in ('admin', 'operativo'))
  with check ((select public.get_user_rol()) in ('admin', 'operativo'));
create policy chasis_delete on public.chasis for delete to authenticated
  using ((select public.get_user_rol()) = 'admin');

-- ===== clientes ======================================================
-- NOTA: el visualizador conserva SELECT porque useViajes trae el cliente del
-- viaje (join). La interfaz oculta el modulo; la restriccion por columna
-- (telefono, correo, direccion) no es posible con RLS.
create policy clientes_select on public.clientes for select to authenticated
  using ((select public.get_user_rol()) in ('admin', 'operativo', 'visualizador'));
create policy clientes_insert on public.clientes for insert to authenticated
  with check ((select public.get_user_rol()) in ('admin', 'operativo'));
create policy clientes_update on public.clientes for update to authenticated
  using ((select public.get_user_rol()) in ('admin', 'operativo'))
  with check ((select public.get_user_rol()) in ('admin', 'operativo'));
create policy clientes_delete on public.clientes for delete to authenticated
  using ((select public.get_user_rol()) = 'admin');

-- ===== rentas_chasis =================================================
create policy rentas_select on public.rentas_chasis for select to authenticated
  using ((select public.get_user_rol()) in ('admin', 'operativo'));
create policy rentas_insert on public.rentas_chasis for insert to authenticated
  with check ((select public.get_user_rol()) in ('admin', 'operativo'));
create policy rentas_update on public.rentas_chasis for update to authenticated
  using ((select public.get_user_rol()) in ('admin', 'operativo'))
  with check ((select public.get_user_rol()) in ('admin', 'operativo'));
create policy rentas_delete on public.rentas_chasis for delete to authenticated
  using ((select public.get_user_rol()) = 'admin');

-- ===== tipos_renta (catalogo) ========================================
create policy tipos_renta_select on public.tipos_renta for select to authenticated
  using ((select public.get_user_rol()) in ('admin', 'operativo'));
create policy tipos_renta_insert on public.tipos_renta for insert to authenticated
  with check ((select public.get_user_rol()) = 'admin');
create policy tipos_renta_update on public.tipos_renta for update to authenticated
  using ((select public.get_user_rol()) = 'admin')
  with check ((select public.get_user_rol()) = 'admin');
create policy tipos_renta_delete on public.tipos_renta for delete to authenticated
  using ((select public.get_user_rol()) = 'admin');

-- ===== alertas =======================================================
-- Las alertas las inserta el servidor (service role). Admin y operativo
-- leen y actualizan su estado (vista/resuelta).
create policy alertas_select on public.alertas for select to authenticated
  using ((select public.get_user_rol()) in ('admin', 'operativo'));
create policy alertas_insert on public.alertas for insert to authenticated
  with check ((select public.get_user_rol()) = 'admin');
create policy alertas_update on public.alertas for update to authenticated
  using ((select public.get_user_rol()) in ('admin', 'operativo'))
  with check ((select public.get_user_rol()) in ('admin', 'operativo'));
create policy alertas_delete on public.alertas for delete to authenticated
  using ((select public.get_user_rol()) = 'admin');

-- ===== config_alertas ================================================
create policy config_alertas_select on public.config_alertas for select to authenticated
  using ((select public.get_user_rol()) in ('admin', 'operativo'));
create policy config_alertas_insert on public.config_alertas for insert to authenticated
  with check ((select public.get_user_rol()) = 'admin');
create policy config_alertas_update on public.config_alertas for update to authenticated
  using ((select public.get_user_rol()) = 'admin')
  with check ((select public.get_user_rol()) = 'admin');
create policy config_alertas_delete on public.config_alertas for delete to authenticated
  using ((select public.get_user_rol()) = 'admin');

-- ===== estado_viaje_log (auditoria: solo lectura e insercion) ========
-- El trigger log_cambio_estado_viaje es SECURITY DEFINER, no depende de esto.
create policy estado_log_select on public.estado_viaje_log for select to authenticated
  using ((select public.get_user_rol()) in ('admin', 'operativo'));
create policy estado_log_insert on public.estado_viaje_log for insert to authenticated
  with check ((select public.get_user_rol()) in ('admin', 'operativo'));

-- ===== gps_logs ======================================================
-- Solo lectura para usuarios (el piloto ve el seguimiento). Las posiciones
-- las inserta el servidor con service role. Se elimina service_role_inserta_gps
-- (WITH CHECK true), que dejaba insertar a cualquiera.
create policy gps_logs_select on public.gps_logs for select to authenticated
  using ((select public.get_user_rol()) in ('admin', 'operativo', 'visualizador'));

-- ===== navixy_trackers ===============================================
create policy navixy_trackers_select on public.navixy_trackers for select to authenticated
  using ((select public.get_user_rol()) in ('admin', 'operativo', 'visualizador'));
create policy navixy_trackers_insert on public.navixy_trackers for insert to authenticated
  with check ((select public.get_user_rol()) = 'admin');
create policy navixy_trackers_update on public.navixy_trackers for update to authenticated
  using ((select public.get_user_rol()) = 'admin')
  with check ((select public.get_user_rol()) = 'admin');
create policy navixy_trackers_delete on public.navixy_trackers for delete to authenticated
  using ((select public.get_user_rol()) = 'admin');

-- ===== reportes (historial de exportaciones) =========================
create policy reportes_select on public.reportes for select to authenticated
  using (generado_por = (select auth.uid()) or (select public.get_user_rol()) = 'admin');
create policy reportes_insert on public.reportes for insert to authenticated
  with check (
    (select public.get_user_rol()) in ('admin', 'operativo')
    and generado_por = (select auth.uid())
  );

-- ---------------------------------------------------------------------
-- 5. Proteccion de profiles (a nivel de base de datos):
--    - Nadie cambia su propio rol ni su propio estado "activo".
--    - No se puede degradar, desactivar ni borrar al ULTIMO admin activo.
--    (Las sesiones sin usuario, como el SQL Editor, omiten la regla 1.)
-- ---------------------------------------------------------------------
create or replace function public.proteger_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and auth.uid() is not null and new.id = auth.uid() then
    if new.rol is distinct from old.rol or new.activo is distinct from old.activo then
      raise exception 'No puedes cambiar tu propio rol ni tu propio estado.'
        using errcode = '42501';
    end if;
  end if;

  if old.rol = 'admin' and old.activo
     and (tg_op = 'DELETE' or new.rol <> 'admin' or not new.activo)
     and not exists (
       select 1 from public.profiles
       where rol = 'admin' and activo and id <> old.id
     )
  then
    raise exception 'Debe existir al menos un administrador activo.'
      using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

alter function public.proteger_profiles() owner to postgres;
revoke all on function public.proteger_profiles() from public, anon, authenticated;

drop trigger if exists trg_profiles_proteger on public.profiles;
create trigger trg_profiles_proteger
  before update or delete on public.profiles
  for each row execute function public.proteger_profiles();

commit;

-- =====================================================================
-- VERIFICACION (PRUEBAS EJECUTADAS Y RESULTADOS)
-- =====================================================================
-- a) Politicas resultantes:
--    select tablename, policyname, cmd from pg_policies
--    where schemaname = 'public' order by tablename, cmd, policyname;
--
| tablename        | policyname             | cmd    |
| ---------------- | ---------------------- | ------ |
| alertas          | alertas_delete         | DELETE |
| alertas          | alertas_insert         | INSERT |
| alertas          | alertas_select         | SELECT |
| alertas          | alertas_update         | UPDATE |
| cabezales        | cabezales_delete       | DELETE |
| cabezales        | cabezales_insert       | INSERT |
| cabezales        | cabezales_select       | SELECT |
| cabezales        | cabezales_update       | UPDATE |
| chasis           | chasis_delete          | DELETE |
| chasis           | chasis_insert          | INSERT |
| chasis           | chasis_select          | SELECT |
| chasis           | chasis_update          | UPDATE |
| clientes         | clientes_delete        | DELETE |
| clientes         | clientes_insert        | INSERT |
| clientes         | clientes_select        | SELECT |
| clientes         | clientes_update        | UPDATE |
| config_alertas   | config_alertas_delete  | DELETE |
| config_alertas   | config_alertas_insert  | INSERT |
| config_alertas   | config_alertas_select  | SELECT |
| config_alertas   | config_alertas_update  | UPDATE |
| estado_viaje_log | estado_log_insert      | INSERT |
| estado_viaje_log | estado_log_select      | SELECT |
| gps_logs         | gps_logs_select        | SELECT |
| navixy_trackers  | navixy_trackers_delete | DELETE |
| navixy_trackers  | navixy_trackers_insert | INSERT |
| navixy_trackers  | navixy_trackers_select | SELECT |
| navixy_trackers  | navixy_trackers_update | UPDATE |
| pilotos          | pilotos_delete         | DELETE |
| pilotos          | pilotos_insert         | INSERT |
| pilotos          | pilotos_select         | SELECT |
| pilotos          | pilotos_update         | UPDATE |
| profiles         | profiles_select        | SELECT |
| profiles         | profiles_update_admin  | UPDATE |
| rentas_chasis    | rentas_delete          | DELETE |
| rentas_chasis    | rentas_insert          | INSERT |
| rentas_chasis    | rentas_select          | SELECT |
| rentas_chasis    | rentas_update          | UPDATE |
| reportes         | reportes_insert        | INSERT |
| reportes         | reportes_select        | SELECT |
| tipos_renta      | tipos_renta_delete     | DELETE |
| tipos_renta      | tipos_renta_insert     | INSERT |
| tipos_renta      | tipos_renta_select     | SELECT |
| tipos_renta      | tipos_renta_update     | UPDATE |
| viajes           | viajes_delete          | DELETE |
| viajes           | viajes_insert          | INSERT |
| viajes           | viajes_select          | SELECT |
| viajes           | viajes_update          | UPDATE |
--
-- b) Trigger de alta de perfiles en auth.users:
--    select t.tgname, p.proname from pg_trigger t join pg_proc p on p.oid = t.tgfoid
--    where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal;
--
| tgname               | proname         |
| -------------------- | --------------- |
| on_auth_user_created | handle_new_user |
--
-- c) Usuarios sin perfil (deberia devolver 0 filas):
--    select u.id, u.email from auth.users u
--    left join public.profiles p on p.id = u.id where p.id is null;
--
Success. No rows returned
--
-- d) Usuarios por rol y estado:
--    select rol, activo, count(*) from public.profiles group by 1, 2 order by 1, 2;
--
| rol       | activo | count |
| --------- | ------ | ----- |
| admin     | true   | 1     |
| operativo | true   | 1     |
--
-- e) EXECUTE de las RPC (anon NO debe aparecer):
--    select routine_name, grantee from information_schema.routine_privileges
--    where routine_schema = 'public'
--      and routine_name in ('actualizar_estado_viaje_automatico',
--                           'incrementar_lecturas_fuera_destino')
--    order by 1, 2;
--
| routine_name                       | grantee       |
| ---------------------------------- | ------------- |
| actualizar_estado_viaje_automatico | authenticated |
| actualizar_estado_viaje_automatico | postgres      |
| actualizar_estado_viaje_automatico | service_role  |
| incrementar_lecturas_fuera_destino | authenticated |
| incrementar_lecturas_fuera_destino | postgres      |
| incrementar_lecturas_fuera_destino | service_role  |