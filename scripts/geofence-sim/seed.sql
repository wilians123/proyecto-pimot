-- Datos reversibles para la demostración local de geocercas; no es una migración.
begin;

insert into public.cabezales (placa, marca, modelo, estado, notas)
values
  ('TEST-GF-A', 'PIMOT TEST', 'A', 'activo', '[GEOFENCE-TEST]'),
  ('TEST-GF-B', 'PIMOT TEST', 'B', 'activo', '[GEOFENCE-TEST]'),
  ('TEST-GF-C', 'PIMOT TEST', 'C', 'activo', '[GEOFENCE-TEST]')
on conflict (placa) do update
set marca = excluded.marca,
    modelo = excluded.modelo,
    estado = excluded.estado,
    notas = excluded.notas;

insert into public.viajes (
  origen,
  destino,
  estado,
  cabezal_id,
  tipo_servicio,
  fecha_inicio,
  fecha_estimada,
  lat_origen,
  lng_origen,
  lat_destino,
  lng_destino,
  notas
)
select
  'Puerto Barrios',
  'TEST DESTINO',
  'programado',
  c.id,
  'flete',
  now(),
  now() + interval '1 hour',
  15.640187,
  -88.546492,
  15.678341,
  -88.506870,
  '[GEOFENCE-TEST]'
from public.cabezales c
where c.placa in ('TEST-GF-A', 'TEST-GF-B', 'TEST-GF-C')
  and not exists (
    select 1
    from public.viajes v
    where v.cabezal_id = c.id
      and v.notas like '%[GEOFENCE-TEST]%'
      and v.estado in ('programado', 'en_transito', 'en_destino', 'de_vuelta')
      and v.deleted_at is null
  );

commit;
