# FL VIP

## Implementado

- FL Essential: 599 centimos al mes / 6999 al ano, 5% en los tres servicios indicados.
- FL Performance: 999 / 11699, 10%, incluyendo electronica.
- FL Elite: 1420 / 16499, 15%, incluyendo diagnosis, tarjeta fisica e inspeccion anual.
- Euros y precios finales con IVA incluido; Stripe Tax, nunca sumar otro 21% al precio.
- Supabase Auth por correo y contrasena, sesiones HttpOnly/Secure/SameSite.
  Alta con confirmacion unica del correo; recuperacion con enlace de un solo uso,
  contrasena nueva y cierre global de sesiones. Acceso habitual sin enlaces.
  OAuth Google/Azure con PKCE y estado ligado a cookie de diez minutos.
  Los botones consultan /auth/v1/settings y solo se habilitan si el proveedor
  esta realmente activo. Google y Azure estaban desactivados el 2026-11-23.
  Deben configurarse sus aplicaciones en Google Cloud / Microsoft Entra y sus
  credenciales en Supabase, sin publicarlas en el frontend ni en este repositorio.
  Autorizar en Supabase el redirect de la web:
  https://www.factorlambda.com/api/vip?action=oauth-callback&state=*
  El callback de cada aplicacion OAuth es el que indica Supabase en el proveedor.
  No se ha desactivado la confirmacion de correo ni rebajado la seguridad del proyecto.
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
## Configuracion de produccion (2026-11-23)

- Migracion ejecutada en Supabase elcfswloiysqldedcxcb: Success. No rows returned.
- Registro fiscal ES activo, confirmado por el titular: taxreg_1UeyRQRxloPkHv3vo87VUz9b.
- Categoria Servicios generales confirmada por el titular: txcd_20030000.
- Previsualizacion de factura ES: total 599, base 495, IVA incluido 104 centimos;
  automatic_tax complete y taxability_reason standard_rated. No se hizo un cargo.
- Portal bpc_1UeyTZRxloPkHv3vrFgkMqui: facturas, actualizacion de tarjeta,
  cancelacion al final del periodo y sin cambios de plan.
- Webhook we_1UXJoHRxloPkHv3vDJ8iPR3U ampliado con los eventos enumerados arriba.
- Tarifas guardadas en Vercel; VIP_ENABLED=true tras la verificacion 2FA del titular.

| Variable | Price de Stripe (live, EUR, IVA incluido) |
| --- | --- |
| VIP_PRICE_ESSENTIAL_MONTHLY | price_1UeySVRxloPkHv3vFUCFDkNm |
| VIP_PRICE_ESSENTIAL_ANNUAL | price_1UeySwRxloPkHv3v8XxSSlAB |
| VIP_PRICE_PERFORMANCE_MONTHLY | price_1UeySYRxloPkHv3vw8GXo8dX |
| VIP_PRICE_PERFORMANCE_ANNUAL | price_1UeySzRxloPkHv3vW5Pc44Tx |
| VIP_PRICE_ELITE_MONTHLY | price_1UeyScRxloPkHv3vHpaEY2SK |
| VIP_PRICE_ELITE_ANNUAL | price_1UeyT3RxloPkHv3vkHoaSuQo |

Publicado en Vercel: BXCuD3mVTuuWbCvr53EnfHTq2M4P, estado Ready, Production.
Verificacion publica: /api/vip?action=config devuelve enabled=true, checkout=true,
test=false y los seis importes correctos.
Las pruebas locales usan Stripe simulado; no equivalen a una compra real ni a una
prueba completa del ciclo de suscripcion en un sandbox de Stripe.

## Pruebas locales

## Descuentos y referidos

- Bienvenida: 2% una sola vez tras el primer pago confirmado.
- Cada amigo distinto con primer pago confirmado aporta 1%; renovar no suma otro.
- El campo de invitacion acepta el codigo aleatorio o el enlace de Factor Lambda.
  Nunca usa el DNI del amigo. Se debe indicar antes del primer Checkout.
- Invitacion conservada en este navegador hasta 30 dias para sobrevivir a la
  confirmacion de correo o al retorno de Google. El cliente puede revisarla.
- El 2% y el saldo por amigos no se acumulan con otras promociones ni con el
  descuento del plan, y nunca reducen la cuota de suscripcion.
- El panel muestra bienvenida pendiente, numero de amigos con pago valido,
  porcentaje de amigos pendiente, usado y disponible. Al consumir saldo se cuenta
  primero la bienvenida y despues los amigos.
- En Clientes VIP, "Descontar saldo aplicado en factura" registra el porcentaje
  que el taller ya ha descontado, con numero de factura y confirmacion. No cambia
  facturas ni hace reembolsos. El historial queda guardado, no se borran movimientos.
- Se reutiliza la funcion SQL fl_vip_redeem ya instalada: bloqueo transaccional,
  saldo suficiente y numero de factura unico por cliente/modo.
- Edicion manual: database/vip-points-adjustment.sql instalada en produccion
  (Success. No rows returned). "Editar puntos" fija un saldo nuevo con motivo,
  autor propietario/taller y movimiento de ajuste; nunca borra el ledger. Valida
  el saldo anterior con bloqueo de fila para evitar pisar un canje concurrente.
  Un identificador de operacion evita aplicar dos veces el mismo ajuste.
- Correo de bienvenida: probado con Resend simulado, tras invoice.paid valido,
  adjunto FL-VIP.pdf de dos caras con nombre y numero FL-DNI; sin correo antes
  del pago, sin duplicado al repetir el evento. No se hizo un cargo real.
- Wallet no conectado: el PDF no es un pase firmado. Apple requiere Pass Type ID
  y certificado; Google requiere cuenta emisora Wallet y permiso de publicacion.
- Pruebas de SQL y navegador simuladas, sin cargos ni modificaciones a clientes reales.

## Pruebas de regresion

node tests/vip-sql.cjs
node tests/vip-rewards.cjs
node tests/vip-rewards-sql.cjs
node tests/vip-rewards-browser.cjs
node tests/vip-points-adjustment.cjs
node tests/vip-admin-adjustment.cjs
node tests/vip-admin-adjustment-browser.cjs
node tests/vip-welcome-email.cjs
node tests/vip-service.cjs
node tests/vip-identity.cjs
node tests/vip-auth.cjs
node tests/vip-auth-browser.cjs
node tests/vip-browser.cjs
node tests/private-calendar-browser.cjs

El SQL usa RLS y solo service_role accede a estas tablas y funciones. El backend
deriva la identidad de Supabase Auth; no confia en un userId enviado por clientes.
La administracion requiere la contrasena actual del panel. El DNI no se envia a
Stripe. La tarjeta adjunta al correo contiene el identificador pedido por el usuario.
