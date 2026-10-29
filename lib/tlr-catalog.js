const endpoint = 'https://tlrsport.es/wp-content/excel/data.php';
const source = 'https://tlrsport.es/tlr-tarifas-marca/';
const cache = new Map();
const fields = ['marca_id', 'modelo_id', 'combustible_id', 'motor_id', 'potencia_id'];
const decode = value => value.replace(/<[^>]*>/g, '').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n))).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
function options(html) {
  return [...html.matchAll(/<option\b[^>]*value=["']([^"']*)["'][^>]*>([\s\S]*?)<\/option>/gi)].filter(m => m[1]).map(m => ({value:decode(m[1]),label:decode(m[2])}));
}
function results(html) {
  const values = {};
  for (const m of html.matchAll(/<span\b[^>]*class=["']titulo_tabla["'][^>]*>([\s\S]*?)<\/span>\s*<span\b[^>]*class=["']resultado_tabla["'][^>]*>([\s\S]*?)<\/span>/gi)) values[decode(m[1])] = decode(m[2]);
  const stockPower = Number(values['Potencia de Origen:']);
  const referencePower = Number(values['Potencia Stage 1:']);
  if (!stockPower || !referencePower) throw Error('No hay resultados verificables para esta versión.');
  const launch = (values['Año de Lanzamiento:'] || '').match(/\b(?:19|20)\d{2}\b/);
  return {stockPower,referencePower,generation:values['Versión:'] || '',launch:launch ? launch[0] : '',torqueText:values['Par Stage 1:'] || 'A confirmar',sourceUrl:source};
}
async function load(params) {
  const body = new URLSearchParams(); let gap = false;
  for (const field of fields) {
    const value = params.get(field);
    if (!value) {gap = true; continue;}
    if (gap || value.length > 120 || /[\x00-\x1f]/.test(value)) throw Error('Selección no válida.');
    body.set(field,value);
  }
  const key = body.toString(); const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;
  const response = await fetch(body.size ? endpoint : 'https://tlrsport.es/tlr-tarifas/', {method:body.size ? 'POST':'GET', ...(body.size ? {body}:{}),signal:AbortSignal.timeout(12000)});
  if (!response.ok) throw Error('El catálogo TLR no está disponible.');
  const html = await response.text();
  if (html.length > 1500000) throw Error('Respuesta inesperada de TLR.');
  let data;
  if (!body.size) {
    const brands = [...html.matchAll(/tlr-tarifas-marca\/\?marca=([^"<>]+)/g)].map(m=>decodeURIComponent(decode(m[1])));
    data = {options:[...new Set(brands)].map(value=>({value,label:value.toUpperCase()}))};
  } else data = body.has('potencia_id') ? {result:results(html)} : {options:options(html)};
  if (data.options && !data.options.length) throw Error('No hay opciones disponibles para esta selección.');
  if (cache.size >= 300) cache.delete(cache.keys().next().value);
  cache.set(key,{expires:Date.now()+3600000,data}); return data;
}
module.exports = {load,options,results};
