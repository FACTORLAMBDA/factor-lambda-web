# Preparacion de produccion: aun sin activar cobros

Actualizado 2026-11-02 por peticion expresa del propietario de aceptar pagos reales.
El codigo permite claves restringidas rk_live_... y distingue pruebas/produccion.
No se ha cambiado ninguna variable de Vercel ni se ha realizado ningun cargo.

## Activacion controlada

Mantener STRIPE_CHECKOUT_ENABLED=false mientras se completan los pasos siguientes:

1. En Production de Vercel: STRIPE_PUBLISHABLE_KEY=pk_live_..., STRIPE_SECRET_KEY=
   rk_live_..., STRIPE_WEBHOOK_SECRET=whsec_... del destino real verificado.
2. STRIPE_MODE=live y STRIPE_LIVE_APPROVED=false durante la preparacion.
3. Configurar Supabase y ejecutar database/repro-quotes.sql, incluida la migracion
   que permite stripe_mode test/live. Conservar RLS y las claves solo en servidor.
4. Configurar QUOTES_ENABLED, secretos del panel/enlace y Turnstile, ademas del correo
   Resend. No activar el envio de presupuestos hasta verificar destinatarios y remitente.
5. El webhook real escucha checkout.session.completed y
   checkout.session.async_payment_succeeded en /api/stripe-webhook. Un destino
   marcado activo en Stripe no prueba que haya entregas correctas a la aplicacion.
6. Validar primero este recorrido en sandbox, con sus propias claves rk_test_/pk_test_
   y webhook, sin reutilizar presupuestos de un entorno en el otro.
7. Solo despues de completar las comprobaciones y la autorizacion del propietario:
   STRIPE_LIVE_APPROVED=true y STRIPE_CHECKOUT_ENABLED=true; hacer Redeploy.

El cambio a live no convierte los presupuestos test en cobrables: crear una solicitud
nueva y aprobar su importe en el entorno live. La base con IVA y el banco de 50 EUR
se toman de la base de datos, nunca del navegador ni del catalogo BR.

La clave restringida requiere Checkout Sessions con escritura para crear y cerrar
sesiones. No otorgar permisos de pagos/transferencias ajenos a este flujo. Si Stripe
rechaza permisos adicionales, revisar el recurso exacto en los registros antes de
ampliar el acceso. Usar una clave dedicada a esta web y reducir los permisos excesivos.

La agenda de citas sigue en demostracion sin bloqueo persistente de huecos. Esta
activacion solo prepara el pago de presupuestos de reprogramacion revisados.

Las pruebas automatizadas test/live utilizan proveedores simulados. No sustituyen
la comprobacion del sandbox ni acreditan la conexion real a la cuenta del propietario.
