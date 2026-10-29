const assert=require('node:assert/strict');
const {options,results,load}=require('../lib/tlr-catalog');
assert.deepEqual(options('<option value="">Elige</option><option value="Golf">Golf &amp; GTI</option>'),[{value:'Golf',label:'Golf & GTI'}]);
const field=(key,value,cls='titulo_tabla')=>`<span class="${cls}">${key}</span> <span class="resultado_tabla">${value}</span>`;
const data=results(field('Potencia de Origen:','245')+field('Potencia Stage 1:','320')+field('Par Stage 1:','70-80Nm')+field('Precio:','450','precio_tabla'));
assert.equal(data.stockPower,245);assert.equal(data.referencePower,320);assert.equal(data.torqueText,'70-80Nm');assert.equal(JSON.stringify(data).includes('450'),false);
assert.throws(()=>results('<html>Error</html>'));
assert.rejects(()=>load(new URLSearchParams({motor_id:'x'}))).then(()=>console.log('PASS TLR: option decoding, power, literal torque, no public price, invalid response and selection.'));
