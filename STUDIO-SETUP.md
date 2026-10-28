# Factor Lambda Studio y FL AGENT

## Activar fotos a 3D

El visor Three.js, la muestra y la importacion GLB funcionan sin claves.
La conversion de fotos usa el API Multi-Image to 3D de Meshy:
https://docs.meshy.ai/en/api/multi-image-to-3d

Configurar estas variables privadas en Vercel y volver a desplegar:

- MESHY_API_KEY: cuenta de Meshy con creditos.
- STUDIO_SIGNING_SECRET: secreto aleatorio de al menos 32 bytes para firmar los recibos.
- TURNSTILE_SITE_KEY y TURNSTILE_SECRET_KEY: widget Cloudflare Turnstile autorizado para factorlambda.com, www.factorlambda.com y el dominio Vercel que se utilice.
- ENABLE_3D_GENERATION=true: activar solo cuando cuenta, creditos y verificacion esten listos.

No guardar secretos en archivos publicos ni en Git. Las fotos se reducen en el
navegador y se envian a Meshy con consentimiento; no se guardan en este proyecto.
Los trabajos continúan en Meshy al cerrar la pagina. El recibo firmado se conserva
en sessionStorage para volver a consultar el trabajo en la misma pestaña. Los enlaces
de descarga del proveedor pueden caducar. El cliente puede descargar el GLB terminado.

La geometria es aproximada. No se obtiene un CAD medido ni se garantiza que un
coche venga separado en carroceria, ruedas y escapes. Las piezas generadas se colocan
con controles manuales. Para sustituir piezas originales hace falta un modelo con
mallas separadas, o editarlo previamente en una herramienta 3D.

No se ha ejecutado ninguna generacion de pago durante la implementacion.
Prueba de contrato sin consumir creditos: `node tests/studio-api.cjs`.
Antes de activar en produccion: verificar coste y cuota de Meshy, probar modelos
reales, CORS del GLB y tiempos de espera con una generacion supervisada.

## Tarifas de FL AGENT

Editar outputs/fl-agent-prices.json. services contiene importes con IVA; quoteOnly
contiene servicios sin precio final. priceType=from significa precio desde.
La primera tabla facilitada por el propietario tiene prioridad sobre conceptos
repetidos en la segunda. Todos los importes incluyen IVA segun su confirmacion.
Los descuentos y precios clubs requieren acreditar sus condiciones ante el taller.

El agente consulta la tabla de forma determinista: no hay un LLM conectado y no
inventa importes. La conversacion vive en memoria en la pagina. El enlace de WhatsApp
incluye el historial y el cliente decide enviarlo; la web no lo envia automaticamente.
Una recarga o el boton de borrar eliminan el historial de esta interfaz.
