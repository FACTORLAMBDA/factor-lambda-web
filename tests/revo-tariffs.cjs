const assert=require('node:assert/strict');
const rows=require('../data/repro-tariffs.json');
const {price}=require('../lib/repro-tariffs');
(async()=>{
 for(const row of rows){
  const input={...row,dyno:false};
  const plain=await price(input),dyno=await price({...input,dyno:true});
  assert.equal(plain.totalCents,row.netCents+Math.round(row.netCents*.21));
  assert.equal(dyno.totalCents,plain.totalCents+8000);
  assert.equal(dyno.sourceUrl,row.sourceUrl);
 }
 const troc=await price({generationId:'catalog-71b6949d59aceb75',engineIndex:6,stage:'Stage 1',brand:'REVO',dyno:true});
 assert.equal(troc.totalCents,80479);
 await assert.rejects(()=>price({generationId:'golf8',engineIndex:14,stage:'Stage 1',brand:'REVO',dyno:true}),/No hay una tarifa REVO/);
 await assert.rejects(()=>price({generationId:'golf8',engineIndex:16,stage:'Stage 2',brand:'REVO',dyno:true}),/No hay una tarifa REVO/);
 const original=rows[0].stockPower;rows[0].stockPower=190;
 await assert.rejects(()=>price({...rows[0],dyno:true}),/revisión/);rows[0].stockPower=original;
 console.log('PASS verified REVO tariffs, exact vehicle/stage matching, 21% VAT, gross 80 EUR dyno, hybrid and unverified stage rejected. No payments created.');
})().catch(e=>{console.error(e);process.exitCode=1;});
