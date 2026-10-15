-- Solo elimina viajes, cabezales y chasis marcados como prueba.
begin;

delete from public.viajes
where notas like '%[GEOFENCE-TEST]%'
   or cabezal_id in (
     select id
     from public.cabezales
     where placa like 'TEST-GF-%'
        or notas like '%[GEOFENCE-TEST]%'
   );

delete from public.cabezales
where placa like 'TEST-GF-%'
   or notas like '%[GEOFENCE-TEST]%';

delete from public.chasis
where placa like 'TEST-GF-%'
   or notas like '%[GEOFENCE-TEST]%';

commit;
