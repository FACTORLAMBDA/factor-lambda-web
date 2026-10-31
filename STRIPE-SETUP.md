# Stripe Embedded Checkout: pruebas, sin cobros reales

## Estado y alcance

La integracion incrusta Checkout dentro de /presupuesto.html. Sustituye al pago
que antes redirigia a checkout.stripe.com. Solo cobra el importe de un presupuesto
revisado en el panel: base con IVA + 50 EUR si se selecciono banco de potencia.
No hay una tarifa inventada de reprogramacion ni se aceptan importes del navegador.

La agenda /citas.html sigue siendo una demostracion sin reservas ni pagos. Sus
tarifas actuales son presencial 30 EUR, telefonica 25 EUR y presupuesto online
30 EUR, IVA incluido, pero no se cobran desde esta integracion: primero hace falta
conectar la agenda y bloquear las horas de forma persistente. Esta integracion
no inventa una fecha ni confirma automaticamente una cita de reprogramacion.

No se han configurado claves ni efectuado operaciones reales en Stripe durante
la implementacion. Las pruebas automaticas de proveedor utilizan dobles de prueba.

## 1. Stripe: sandbox o modo de prueba

1. Entrar en Stripe y seleccionar un sandbox/modo de prueba. No usar modo real.
2. Copiar la clave publicable pk_test_... y la secreta sk_test_... desde API keys.
   No compartir la clave secreta por chat, GitHub ni formularios del cliente.
3. Crear un destino webhook de tipo snapshot para la cuenta propia, version
   2026-10-28.endive, URL https://www.factorlambda.com/api/stripe-webhook.
   En un despliegue Preview usar su URL HTTPS exacta, accesible sin login de Vercel.
4. Suscribir checkout.session.completed y checkout.session.async_payment_succeeded.
   Copiar el secreto de firma whsec_... de ESE destino de prueba.
5. Configurar en Branding/Checkout el logo, fondo y boton naranja. El formulario
   seguro tiene opciones de fuente limitadas por Stripe; la pagina conserva Teko.
6. Habilitar tarjetas. El codigo permite solo card y redirect_on_completion=never:
   no envia al cliente a una pagina de Checkout alojada fuera de la web.
   La autenticacion bancaria/3DS puede abrir una ventana de seguridad del emisor.
7. Apple Pay/Google Pay dependen de la cuenta, navegador, dispositivo y dominio.
   Registrar los dominios que Stripe solicite en Payment method domains. No son
   un requisito para comprobar primero el pago basico con tarjeta de prueba.

## 2. Vercel: variables del servidor

En Project > Settings > Environment Variables, preferentemente primero Preview:

| Variable | Valor |
| --- | --- |
| STRIPE_MODE | test |
| STRIPE_CHECKOUT_ENABLED | true, solo despues de configurar lo siguiente |
| STRIPE_PUBLISHABLE_KEY | pk_test_... |
| STRIPE_SECRET_KEY | sk_test_... (Sensitive) |
| STRIPE_WEBHOOK_SECRET | whsec_... del destino de prueba (Sensitive) |
| PUBLIC_SITE_URL | URL HTTPS canonica del entorno elegido |

No anadir prefijos NEXT_PUBLIC ni VITE a claves secretas. Solo la publicable llega
al navegador al abrir el formulario. No se guardan datos de tarjeta en la web.
No basta con anadir variables: hacer Redeploy del entorno despues del cambio.
La aplicacion RECHAZA sk_live_, pk_live_ y STRIPE_MODE=live; no existe un interruptor
que habilite cobros reales. Para pasar a real se necesita otro cambio revisado y
autorizado por el propietario despues de comprobar el sandbox.

El flujo de presupuestos existente necesita tambien las variables descritas en
PRESUPUESTOS-SETUP.md: QUOTES_ENABLED=true, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
QUOTE_ADMIN_PASSWORD, QUOTE_LINK_SECRET, TURNSTILE_SITE_KEY/SECRET_KEY y el correo
RESEND_API_KEY/QUOTE_EMAIL_FROM. WhatsApp solo es necesario para solicitudes con
ese consentimiento. En pruebas usar exclusivamente emails y numeros propios.
Los correos de presupuesto/pago se marcan PRUEBA - SIN COBRO REAL.

## 3. Base de datos

Ejecutar database/repro-quotes.sql en Supabase. Si la tabla ya existe, la ultima
sentencia anade stripe_mode sin alterar los presupuestos anteriores. Mantener RLS
y la service-role key exclusivamente en el backend. El importe aprobado no debe
editarse despues de enviar el enlace ni despues de comenzar un pago.

## 4. Recorrido de comprobacion

1. Crear una solicitud con tus datos de prueba. Revisarla en /panel-presupuestos.html
   y aprobar el importe real que hayas presupuestado, no un precio de ejemplo fijo.
2. Abrir el enlace firmado recibido. Verificar base, suplemento e IVA incluido.
3. Aceptar condiciones y pulsar ABRIR PAGO DE PRUEBA. Debe aparecer el iframe de
   Stripe en la misma pagina, junto al aviso de que no se realizan cobros reales.
4. Tarjeta de prueba correcta: 4242 4242 4242 4242, caducidad futura y CVC de prueba.
   Nunca introducir una tarjeta real. Comprobar tambien rechazo y autenticacion
   siguiendo https://docs.stripe.com/testing.
5. Ver la operacion en el sandbox de Stripe y el webhook con respuesta 200.
6. La web no debe confirmar hasta que el webhook verifique firma, sesion, version,
   moneda, importe y modo test y guarde paid. El callback del iframe NO basta.
7. Comprobar el correo de PRUEBA, recargar el enlace y reenviar el mismo webhook:
   no debe duplicar el correo ni permitir pagar de nuevo.
8. Probar firma invalida, enlace alterado y claves live: deben rechazarse.

Si Stripe termina pero el webhook tarda, la pagina espera hasta 30 segundos y
permite actualizar el estado sin iniciar otro cobro. Nunca muestra confirmacion
por un parametro return=success introducido a mano.

## 5. Pruebas y ejecucion local

node tests/repro-quotes.cjs
node tests/stripe-payments.cjs

Con Node 22 o superior y un .env privado configurado:

node --env-file=.env server.js

Escuchar eventos de prueba con Stripe CLI:

stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded --forward-to localhost:3000/api/stripe-webhook

El whsec_ del CLI es distinto del destino de Vercel; usarlo solo en el .env local.
PUBLIC_SITE_URL se usa para enlaces enviados, asi que para pruebas completas con
correo es preferible el dominio HTTPS del Preview. El webhook debe recibir el
cuerpo original sin convertirlo a JSON antes de verificar la firma. Si el hosting
lo transforma, la funcion falla de forma cerrada y responde 400, nunca marca paid.

## Referencias oficiales

- https://docs.stripe.com/payments/accept-a-payment?payment-ui=checkout&ui=embedded-page
- https://docs.stripe.com/payments/checkout/custom-success-page?payment-ui=embedded-page
- https://docs.stripe.com/webhooks
- https://docs.stripe.com/testing
