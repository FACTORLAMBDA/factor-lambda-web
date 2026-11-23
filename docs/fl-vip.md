# FL VIP

## Implementado

- FL Essential: 599 centimos al mes / 6999 al ano, 5% en los tres servicios indicados.
- FL Performance: 999 / 11699, 10%, incluyendo electronica.
- FL Elite: 1420 / 16499, 15%, incluyendo diagnosis, tarjeta fisica e inspeccion anual.
- Euros y precios finales con IVA incluido; Stripe Tax, nunca sumar otro 21% al precio.
- Supabase Auth por enlace personal, sesiones HttpOnly/Secure/SameSite.
- DNI/NIE validado y cifrado AES-GCM. Numero privado FL-DNI. Un hash HMAC unico
  evita registrar el mismo documento en varias cuentas. No se usa el DNI en URLs,
  referidos ni en metadatos de Stripe. La clave debe permanecer estable.
- Referidos con codigo aleatorio, 2 puntos de bienvenida y 1 por amigo nuevo cuyo
  primer pago se confirma; ledger idempotente. Puntos alternativos al plan, nunca
  se acumulan con el 5/10/15% ni descuentan cuotas. Un punto equivale a un 1% y se
  consume al canjearlo en una factura del taller (maximo 100% de una factura).
- Carnet PDF por correo despues de invoice.paid y descargable con membresia activa.
- Vehiculos/modificaciones privados, portal de Stripe y panel Clientes VIP.
- Canjes e inspecciones registrados por personal del taller, sin devoluciones.
- Reembolsos/disputas/fraude suspenden ventajas y revierten puntos no fiables.

## Antes de activar cobros

1. Ejecutar database/vip-memberships.sql en el proyecto existente.
2. Revisar politica de privacidad, renovacion/cancelacion y condiciones del club.
   Los documentos existentes del taller no se cambian automaticamente.
3. Configurar la misma direccion PUBLIC_SITE_URL que la web de produccion.
4. Crear tres Products en Stripe y seis Prices recurrentes, EUR, tax_behavior
   inclusive. Cada nivel tiene su propio Product. Usar los importes anteriores.
5. Confirmar el tax_code de los Products; no copiar un codigo por aproximacion.
   Tax Settings debe estar active y Espana tener registro active antes de cobrar.
   El usuario confirmo que la empresa ya esta registrada para IVA en Espana.
6. Guardar los seis VIP_PRICE_* y VIP_TAX_CONFIRMED=true en Vercel solo despues de
   verificar una previsualizacion de factura con domicilio fiscal en Espana.
7. Configurar Customer Portal para mostrar facturas, actualizar pago y cancelar
   al final de periodo. Desactivar cambios de producto/precio no controlados.
8. Ampliar el webhook existente sin quitar los eventos de presupuestos:
   checkout.session.completed, checkout.session.async_payment_succeeded,
   checkout.session.expired, customer.subscription.created,
   customer.subscription.updated, customer.subscription.deleted,
   invoice.paid, invoice.payment_failed, invoice.payment_action_required,
   charge.refunded, charge.dispute.created, radar.early_fraud_warning.created.
9. Probar en entorno aislado alta, renovacion, pago fallido, cancelacion, factura
   duplicada, canje, referido, devolucion y envio del carnet. Nunca probar con una
   tarjeta real del cliente. La pagina de retorno no activa ventajas por si sola.
10. Activar VIP_ENABLED=true y volver a publicar solo al verificar esos puntos.

No se modifica el acceso existente del taller ni la agenda. VIP_ENABLED es false
por defecto: la pagina informa de la activacion pendiente y no admite cobros.
La conexion MCP de Stripe permite lecturas, pero las mutaciones devolvieron una
peticion repetida de autorizacion; no se crearon registros fiscales ni tarifas.

## Pruebas locales

node tests/vip-sql.cjs
node tests/vip-service.cjs
node tests/vip-identity.cjs
node tests/vip-browser.cjs
node tests/private-calendar-browser.cjs

El SQL usa RLS y solo service_role accede a estas tablas y funciones. El backend
deriva la identidad de Supabase Auth; no confia en un userId enviado por clientes.
La administracion requiere la contrasena actual del panel. El DNI no se envia a
Stripe. La tarjeta adjunta al correo contiene el identificador pedido por el usuario.
