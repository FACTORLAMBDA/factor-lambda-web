const {generations}=require('../outputs/vehicle-generations.json');
const tlr=require('./tlr-catalog');
const {totals}=require('./repro-pricing');
const overrides=require('../data/repro-tariffs.json');
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function fail(message){const error=new Error(message);error.status=422;throw error;}
function engineName(value,model){
  let text=String(value).replace(/\([^)]*\)/g,'').trim();
  if(model&&norm(text).startsWith(norm(model)))text=text.slice(String(model).length).trim();
  return norm(text.replace(/\b(\d)[.,](\d)\b/g,(_,a,b)=>String(Number(a+b)*100)).replace(/\bGPF\b/gi,''));
}
function unique(options,predicate){const matches=options.filter(predicate);return matches.length===1?matches[0].value:null;}
async function options(params){return(await tlr.load(new URLSearchParams(params))).options||[];}
async function price(data){
  const generation=generations.find(g=>g.id===data.generationId);
  const index=Number(data.engineIndex),stage=data.stage||'Stage 1';
  if(!generation||!Number.isInteger(index)||!generation.engines[index])fail('Selecciona una versión del catálogo para calcular su tarifa.');
  const engine=generation.engines[index];
  const stages=generation.stages?.[index];
  if(stages?!stages.some(ref=>ref.stage===stage):stage!=='Stage 1'||!generation.references?.[index])fail('Preparación no disponible para este motor.');
  if(!['TLR SPORT','REVO'].includes(data.brand))fail('Para pagar, elige TLR SPORT o REVO. Si necesitas asesoramiento, contacta con el taller antes de reservar.');
  const saved=overrides.find(row=>row.generationId===generation.id&&row.engineIndex===index&&row.stage===stage&&row.brand===data.brand);
  if(saved){if(saved.currency!=='eur'||saved.country!=='ES'||saved.includesVat!==false||!saved.sourceUrl||!saved.verifiedAt)fail('La tarifa necesita revisión.');return{...totals(saved.netCents,data.brand,data.dyno===true),sourceUrl:saved.sourceUrl,provider:data.brand,stage};}
  if(data.brand==='REVO')fail('No hay una tarifa REVO verificada en euros para esta versión. No se realizará ningún cargo.');
  if(stage!=='Stage 1')fail('TLR no publica una tarifa verificable de esta preparación. No se realizará ningún cargo.');
  const params={marca_id:generation.make};
  const models=await options(params);
  const modelLabel=generation.model+(/\bGPF\b/i.test(engine[1])?' GPF':'');
  params.modelo_id=unique(models,item=>norm(item.label)===norm(modelLabel));
  if(!params.modelo_id)fail('No se puede vincular esta versión a una única tarifa TLR. No se realizará ningún cargo.');
  params.combustible_id=unique(await options(params),item=>norm(item.label)===norm(engine[0]));
  if(!params.combustible_id)fail('No hay tarifa publicada para este combustible.');
  params.motor_id=unique(await options(params),item=>engineName(item.label,generation.model)===engineName(engine[1],generation.model));
  if(!params.motor_id)fail('La tarifa de este motor no está verificada. No se realizará ningún cargo.');
  params.potencia_id=unique(await options(params),item=>Number(item.value)===engine[2]);
  if(!params.potencia_id)fail('No hay tarifa para esta potencia de serie.');
  const result=(await tlr.load(new URLSearchParams(params))).result;
  const generationText=norm(generation.name+' '+generation.period);
  if(result.generation&&!generationText.includes(norm(result.generation)))fail('La generación publicada por TLR no coincide con el vehículo seleccionado.');
  // A launch year alone does not establish compatibility across later ECU generations.
  if(!result.generation&&(!generation.from||String(generation.from)!==String(result.launch)))fail('La ficha TLR no identifica esta generación con suficiente precisión para cobrar automáticamente.');
  if(result.stockPower!==engine[2]||result.priceNetCents===null)fail('No hay un precio exacto publicado para esta versión.');
  return {...totals(result.priceNetCents,data.brand,data.dyno===true),sourceUrl:result.sourceUrl,provider:data.brand,stage};
}
module.exports={price,engineName};
