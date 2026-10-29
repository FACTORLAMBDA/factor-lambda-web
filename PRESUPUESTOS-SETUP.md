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

Marca y modelo se consultan a TLR SPORT mediante /api/tlr-catalog. A continuacion
se elige generacion, combustible y motor/potencia en vehicle-generations.json.
Esta segunda fuente contiene fichas factuales verificadas de BR-Performance:
las seis generaciones del Leon y referencias iniciales de Golf y Audi S3.
La cobertura es parcial, no una importacion completa. Los modelos no verificados
ofrecen entrada manual y nunca muestran motores de otras generaciones.
Los intervalos de motor se muestran en cada variante. No se pide un ano exacto
en el selector: se guarda el intervalo de la variante elegida, sin inventar un ano.
El servidor resuelve generationId y engineIndex contra el catalogo local y no
confia en nombres, cifras o periodos enviados desde el navegador. La entrada
manual conserva su pregunta de ano para vehiculos que no aparecen en las tablas.
El Leon III contiene las 17 variantes de la captura aportada: 11 gasolina,
5 diesel y 1 gas, con los anos y potencias de serie de dicha referencia.
Solo se muestran resultados TLR si motor, potencia y generacion coinciden de forma
explicita. De lo contrario, se solicita valoracion sin inventar cifras de rendimiento.
Se mantiene el texto literal del par: no se inventa un par original ni se interpreta
un intervalo ambiguo como una cifra garantizada. No se muestran las tarifas de TLR.
El importe final sigue introduciendose y confirmandose desde el panel privado.

Cache de una hora, consultas con limite de tiempo y campos acotados, URL fija de
origen y sin insertar HTML remoto en la web. Si TLR falla, se ofrece entrada manual.
La integracion depende del formato/disponibilidad de su formulario publico; no es
una API contractual ni una copia completa de su base de datos. Las solicitudes
guardan la identificacion del coche, no confian en cifras o precios del navegador.
Los datos BR se usan para identificar motores; no se copian sus precios ni se
atribuyen sus resultados a TLR SPORT o REVO. Conservar URL y fecha al ampliar fichas.
