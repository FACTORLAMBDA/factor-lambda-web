// Provider tariffs are net EUR; the workshop dyno supplements already include VAT.
const VAT_PERCENT = 21;
const DYNO_GROSS_CENTS = Object.freeze({'REVO':8000,'TLR SPORT':10000});
function totals(netCents,brand,dyno){
  if(!Number.isSafeInteger(netCents)||netCents<=0||netCents>10000000)throw Error('Tarifa base no valida.');
  if(!Object.hasOwn(DYNO_GROSS_CENTS,brand)||typeof dyno!=='boolean')throw Error('Seleccion de servicio no valida.');
  const softwareVatCents=Math.round(netCents*VAT_PERCENT/100);
  const softwareGrossCents=netCents+softwareVatCents;
  const dynoGrossCents=dyno?DYNO_GROSS_CENTS[brand]:0;
  return {currency:'eur',country:'ES',vatPercent:VAT_PERCENT,softwareNetCents:netCents,softwareVatCents,softwareGrossCents,dynoGrossCents,totalCents:softwareGrossCents+dynoGrossCents};
}
function netPrice(value){
  if(typeof value!=='string')return null;
  const raw=value.trim().replace(/\s*€\s*$/,'').trim();
  if(!/^\d+(?:[.,]\d{1,2})?$/.test(raw))return null;
  const cents=Math.round(Number(raw.replace(',','.'))*100);
  return Number.isSafeInteger(cents)&&cents>0&&cents<=10000000?cents:null;
}
module.exports={totals,netPrice};
