# Festivos y cierres

El panel permite crear, editar y eliminar cierres generales, por dias completos
(fecha final incluida) o por franjas. El motivo interno no se muestra al cliente.
Se aplican a reprogramaciones y consultas; no cancelan citas ni devuelven pagos.
Las citas manuales siguen permitidas durante los cierres.

Ejecutar database/calendar-closures.sql despues de las demas migraciones de agenda.
La migracion conserva las reglas de disponibilidad existentes mediante funciones
privadas auxiliares. No ejecutar migraciones antiguas que reemplacen fl_repro_busy
o fl_consult_busy despues de esta sin volver a integrar los cierres.

Los cierres afectan a todos los profesionales y entornos. Se guardan en Madrid y
se bloquean tambien al crear la reserva, no solo al consultar horas disponibles.
Una reserva que ya estaba en proceso conserva su retencion hasta que caduque.

Colores de mecanico: David naranja, German verde, Mazius rojo, Gerson azul.
Las citas anuladas o liberadas mantienen el color de estado.
