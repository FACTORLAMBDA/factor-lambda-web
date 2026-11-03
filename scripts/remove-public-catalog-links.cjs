const fs=require('node:fs');
const path=require('node:path');
const blocked=/br[-\s.]?performance|brp-barcelona/i;
function clean(value){
  if(Array.isArray(value))return value.map(clean);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key,item])=>!(typeof item==='string'&&blocked.test(item)&&key!=='source')).map(([key,item])=>[key,key==='source'&&typeof item==='string'&&blocked.test(item)?'Catálogo de vehículos':clean(item)]));
  return value;
}
const root=path.join(__dirname,'../outputs');
const files=['vehicle-generations.json',...fs.readdirSync(path.join(root,'vehicle-catalog')).filter(name=>name.endsWith('.json')).map(name=>'vehicle-catalog/'+name)];
for(const file of files){const target=path.join(root,file);const data=clean(JSON.parse(fs.readFileSync(target,'utf8')));fs.writeFileSync(target,JSON.stringify(data));}
console.log('Removed third-party branding/links from '+files.length+' public catalogue files; vehicle data retained.');
