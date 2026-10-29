const assert=require('node:assert/strict');const {engines}=require('../outputs/vehicle-filter');const {generations}=require('../outputs/vehicle-generations.json');
const leon=generations.filter(g=>g.make==='seat'&&g.model==='Leon');assert.equal(leon.length,6);
const iii=leon.find(g=>g.id==='leon-5f');assert.equal(engines(iii,null,'Gasolina').length,11);assert.equal(engines(iii,null,'Diesel').length,5);assert.equal(engines(iii,null,'Gas').length,1);
const fl=leon.find(g=>g.id==='leon-5f-fl');assert.equal(engines(fl,2017,'Gasolina').some(({engine:e})=>e[1]==='1.5 TSI'),false);assert.equal(engines(fl,2019,'Gasolina').some(({engine:e})=>e[1]==='1.5 TSI'),true);
assert.equal(engines(leon.find(g=>g.id==='leon-kl'),2022,'Diesel').length,2);assert.equal(engines(leon.find(g=>g.id==='leon-kl'),2022).some(({engine:e})=>e[1]==='1.9 TDI'),false);
for(const g of generations){assert.ok(g.engines.length);assert.ok(g.sourceUrl.startsWith('https://www.br-performance.com/'));for(const e of g.engines)assert.ok(Number.isInteger(e[2])&&e[2]>0);}
console.log('PASS: six Leon generations, generation/year/fuel filter, no old diesel in KL and source metadata.');
