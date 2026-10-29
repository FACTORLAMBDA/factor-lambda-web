# Presupuestos de reprogramacion

## Estado

La web no publica un precio de repro. El propietario revisa cada solicitud y fija
el precio base con IVA desde /panel-presupuestos.html. El servidor anade 5000 centimos
si se ha solicitado banco. El enlace enviado abre /presupuesto.html, y el cobro se
realiza en Stripe Checkout. La confirmacion de pago depende del webhook firmado,
no del retorno del navegador. No se reserva automaticamente una cita ni se bloquean
horarios: el taller acuerda la fecha con el cliente tras valorar el coche.

Sin configuracion, el formulario ofrece enviar la solicitud por WhatsApp al taller.
No afirma que una solicitud, correo o presupuesto haya sido enviado automaticamente.

## Servicios que deben configurarse en Vercel

1. Crear una base de datos Supabase y ejecutar database/repro-quotes.sql. Mantener
   habilitado RLS y no dar acceso a las claves anonimas. Guardar SUPABASE_URL y
   SUPABASE_SERVICE_ROLE_KEY solo en variables privadas del servidor.
2. Definir QUOTE_ADMIN_PASSWORD y QUOTE_LINK_SECRET con secretos aleatorios distintos
   de al menos 32 caracteres. El panel usa la clave solo en memoria; no la pone en
   enlaces ni en localStorage. Cerrar la sesion al terminar.
3. Configurar Turnstile: TURNSTILE_SITE_KEY y TURNSTILE_SECRET_KEY. Autorizar los
   dominios de produccion y prueba que se vayan a usar.
4. Verificar el dominio de correo en Resend. Configurar RESEND_API_KEY y QUOTE_EMAIL_FROM
   con un remitente del dominio verificado. Las respuestas y copia de los presupuestos
   se dirigen a flgarage@factorlambda.com.
5. Configurar WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_GRAPH_VERSION
   con la version soportada por vuestra aplicacion Meta. Aprobar una plantilla de
   utilidad y poner su nombre en WHATSAPP_QUOTE_TEMPLATE. El cuerpo debe tener cuatro
   parametros en este orden: nombre del cliente, referencia, total con IVA y enlace
   completo al carrito. WHATSAPP_TEMPLATE_LANGUAGE debe coincidir exactamente con
   la plantilla aprobada (por defecto es). Solo se envia a quien lo haya solicitado.
6. Completar Stripe y guardar STRIPE_SECRET_KEY. Habilitar los metodos de pago de la
   cuenta; los monederos se muestran segun elegibilidad del cliente. Crear webhook
   para https://www.factorlambda.com/api/stripe-webhook y guardar STRIPE_WEBHOOK_SECRET.
   Suscribir checkout.session.completed y checkout.session.async_payment_succeeded.
7. Definir PUBLIC_SITE_URL con el dominio HTTPS canonico. Poner QUOTES_ENABLED=true
   solo cuando la tabla y los servicios esten preparados y probados en modo test.

No se han enviado correos, mensajes ni cobros reales durante la implementacion.
Pruebas con proveedores simulados: node tests/repro-quotes.cjs.

## Envio y recuperacion

El boton Enviar presupuesto guarda el precio antes de contactar con los proveedores.
Si un proveedor falla, el panel muestra el envio parcial y conserva los identificadores
confirmados. Reintentar con el mismo importe. El correo usa Idempotency-Key; Meta
puede haber aceptado un mensaje aunque se pierda su respuesta, por lo que un reintento
manual tras ese caso puede duplicar el WhatsApp. Revisar el estado del proveedor.
No cambiar el importe de un presupuesto cuyo enlace ya se haya enviado.
Un estado sending bloqueado por un corte requiere revision por el administrador
antes de restablecerlo. El estado notification_status usa el mismo criterio para
la confirmacion de pago. No resetearlo sin comprobar el envio en el proveedor.

## Catalogo de referencia

outputs/repro-catalog.json contiene solo diez fichas publicas contrastadas, con
su enlace de origen y fecha de consulta. No es el catalogo completo de BR-Performance.
La descarga automatizada de la web devolvio HTTP 403. Para ampliarlo a todas las
marcas/modelos hace falta una exportacion o acceso autorizado a una fuente completa.
No hay un scraper que evite ese bloqueo.

Solo se reutilizan los campos factuales de identificacion y potencia/par. No se
copian sus precios, textos comerciales, garantias, marcas graficas ni curvas. Los
resultados se identifican como referencia externa, no como resultados garantizados
de TLR SPORT o REVO. El servidor vuelve a resolver la ficha para evitar que el cliente
manipule los valores enviados en la solicitud.

Para ampliar, anadir registros con id unico, make, model, generation, from, to,
engine, stage, stockPower, referencePower, stockTorque, referenceTorque y sourceUrl.
