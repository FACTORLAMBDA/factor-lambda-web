# Tarifas de FL AGENT

Editar outputs/fl-agent-prices.json. services contiene importes con IVA; quoteOnly
contiene servicios sin precio final. priceType=from significa precio desde.
La primera tabla facilitada por el propietario tiene prioridad sobre conceptos
repetidos en la segunda. Todos los importes incluyen IVA segun su confirmacion.
Los descuentos y precios clubs requieren acreditar sus condiciones ante el taller.

El agente consulta la tabla de forma determinista: no hay un LLM conectado y no
inventa importes. La conversacion vive en memoria en la pagina. El enlace de WhatsApp
incluye el historial y el cliente decide enviarlo; la web no lo envia automaticamente.
Una recarga o el boton de borrar eliminan el historial de esta interfaz.
