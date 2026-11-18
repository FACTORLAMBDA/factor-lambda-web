# Calendario privado del taller

Acceso: https://www.factorlambda.com/panel-presupuestos.html. Se conserva QUOTE_ADMIN_PASSWORD. El acceso es compartido por los tres responsables; taller@factorlambda.com identifica la cuenta del taller, no una autenticación nueva por correo ni tres usuarios independientes.

## Activación

En el SQL Editor de Supabase ejecutar `database/private-calendar.sql`, después de las migraciones anteriores de reservas y consultas. Es repetible y no borra citas ni pagos. No requiere nuevas variables de Vercel. Hasta instalarlo, el calendario muestra las reservas existentes en lectura y mantiene disponible Presupuestos.

## Gestión

- Día, semana, mes y lista. Fecha libre para navegar a cualquier año. Horario privado 00:00–24:00, incluidos fines de semana y festivos.
- Título, fecha/hora de inicio y fin, descripción, cliente, contacto, vehículo y calendario asignado.
- Crear citas internas, editar y mover citas confirmadas, arrastrar y cambiar duración, anular conservando historial. No modifica importes ni ejecuta cobros ni reembolsos.
- Reprogramaciones, consultas de Joaquín y taller de Germán comparten los mismos recursos y exclusión de solapamientos que las reservas públicas. Una retención de pago activa también impide superponer otra cita en el mismo recurso.
- Las citas web solo se confirman tras el webhook verificado de Stripe. Las internas se confirman por intervención del taller, sin fingir que están pagadas. Las solicitudes web sin pago se muestran separadas y no se pueden convertir en confirmadas desde el editor.
- El calendario se actualiza cada 30 segundos mientras está visible y no se está editando. Las escrituras detectan cambios concurrentes mediante revisión y bloqueos de fila.
- Mover/anular no envía correos automáticos. El taller avisa al cliente utilizando los enlaces de contacto.
- Las anulaciones son lógicas, no borrados definitivos de pagos ni del historial.

Los horarios, antelación y límite de reserva de los clientes no cambian. La libertad horaria es solo privada. Todas las fechas se interpretan en Europe/Madrid, incluido el cambio de horario; las horas inexistentes se rechazan.

## Verificación

`node tests/private-calendar-api.cjs`
`node tests/private-calendar-sql.cjs` (PGlite local o PGLITE_TEST_PACKAGE)
`node tests/private-calendar-browser.cjs` (Playwright y Edge)

Las pruebas usan datos ficticios y no envían correos ni cobran a clientes.
