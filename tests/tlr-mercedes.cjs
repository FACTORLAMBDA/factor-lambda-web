const assert=require('node:assert/strict'),tlr=require('../lib/tlr-catalog'),tariffs=require('../lib/repro-tariffs');
const original=tlr.load;
let wrongGeneration=false;
tlr.load=async p=>{
 assert.equal(p.get('marca_id'),'mercedes');
 if(!p.has('modelo_id'))return {options:[{value:'A',label:'A'},{value:'B',label:'B'}]};
 assert.equal(p.get('modelo_id'),'A');
 if(!p.has('combustible_id'))return {options:[{value:'Gasolina',label:'Gasolina'}]};
 if(!p.has('motor_id'))return {options:[{value:'A220',label:'A220'},{value:'220 2000 T',label:'220 2000 T'}]};
 assert.equal(p.get('motor_id'),'220 2000 T');
 if(!p.has('potencia_id'))return {options:[{value:'190',label:'190'}]};
 return {result:{stockPower:190,referencePower:250,generation:wrongGeneration?'W176':'W177',launch:'2018',priceNetCents:40000,sourceUrl:'https://tlrsport.es/tlr-tarifas/'}};
};
(async()=>{try{
 const data={generationId:'catalog-7a27e8773998ffe4',engineIndex:11,brand:'TLR SPORT',stage:'Stage 1',dyno:true};
 const result=await tariffs.price(data);assert.equal(result.totalCents,58400);assert.equal(result.softwareNetCents,40000);assert.equal(result.dynoGrossCents,10000);
 wrongGeneration=true;await assert.rejects(()=>tariffs.price(data),/generación/);
 assert.deepEqual(tariffs.tlrLabels({make:'mercedes',model:'A / A Berline',period:'W176'},['Gasolina','220 (2.0T)',190]),{model:'A',motor:'220 (2.0T)'});
 console.log('PASS verified Mercedes model/motor aliases, 190 CV W177 exact generation, 21% IVA plus gross bank, different generation rejected. Provider mocked.');
}finally{tlr.load=original;}})().catch(e=>{console.error(e);process.exitCode=1;});
