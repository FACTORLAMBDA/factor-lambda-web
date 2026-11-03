const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('outputs/repro-wizard.js','utf8');
const code=source.slice(source.indexOf('function recommend('),source.indexOf('\n',source.indexOf('function recommend(')));
for(const make of ['AUDI','Volkswagen','Ford','SEAT','Škoda','Porsche','BMW','Mercedes-Benz','Toyota','Alfa Romeo']){
  const select={value:'',options:[{value:'REVO'},{value:'TLR SPORT'}]};
  const recommend=new Function('$',code+';return recommend;')(id=>id==='lead-brand'?select:null);
  recommend({make});assert.equal(select.value,['BMW','Mercedes-Benz','Toyota','Alfa Romeo'].includes(make)?'TLR SPORT':'REVO');
  assert.equal(select.options.filter(o=>o.textContent.includes('Recomendado')).length,1);
}
console.log('PASS brand recommendations including accents, case, and alternative provider preserved.');
