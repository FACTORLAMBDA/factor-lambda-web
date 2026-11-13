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
 const batch=require('../data/revo-verified-2026-11-13.json');
 for(const [generationId,engineIndex,stockPower,engineLabel,netCents]of batch.entries){
  const result=await price({generationId,engineIndex,brand:'REVO',stage:'Stage 1',dyno:true});
  assert.equal(result.totalCents,netCents+Math.round(netCents*.21)+8000,engineLabel+' '+stockPower);
 }
 const oldCupra=await price({generationId:'leon-5f-fl',engineIndex:11,brand:'REVO',stage:'Stage 1',dyno:true});
 assert.equal(oldCupra.totalCents,75760);
 const gpfCupra=await price({generationId:'leon-5f-fl',engineIndex:10,brand:'REVO',stage:'Stage 1',dyno:true});
 assert.equal(gpfCupra.totalCents,80479);
 await assert.rejects(()=>price({generationId:'catalog-2ccbc5766b717923',engineIndex:0,brand:'REVO',stage:'Stage 1',dyno:true}),/No hay una tarifa REVO/);
 await assert.rejects(()=>price({generationId:'golf8',engineIndex:14,stage:'Stage 1',brand:'REVO',dyno:true}),/No hay una tarifa REVO/);
 await assert.rejects(()=>price({generationId:'golf8',engineIndex:16,stage:'Stage 2',brand:'REVO',dyno:true}),/No hay una tarifa REVO/);
 const original=rows[0].stockPower;rows[0].stockPower=190;
 await assert.rejects(()=>price({...rows[0],dyno:true}),/revisión/);rows[0].stockPower=original;
 console.log('PASS verified REVO tariffs, exact vehicle/stage matching, 21% VAT, gross 80 EUR dyno, hybrid and unverified stage rejected. No payments created.');
})().catch(e=>{console.error(e);process.exitCode=1;});
