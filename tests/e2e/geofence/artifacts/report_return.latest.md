# Geofence E2E Simulation Report

Config: inicio 150m, llegada 75m, salida 120m, retorno 150m.
Origen usado: 15.69455, -88.57833.

| fase | index | estado anterior | estado nuevo | transicion | distancia origen m | distancia destino m |
| --- | ---: | --- | --- | --- | ---: | ---: |
ida | 1 | programado | en_transito | en_transito | 111 | 131305
ida | 1183 | en_transito | en_destino | en_destino | 131416 | 0
vuelta | 4 | en_destino | de_vuelta | de_vuelta | 130971 | 445
vuelta | 1182 | de_vuelta | finalizado | finalizado | 111 | 131305

Final state: finalizado