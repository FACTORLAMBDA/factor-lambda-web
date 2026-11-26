const fs=require('node:fs'),path=require('node:path');
function clean(value){
 if(typeof value!=='string'||!value.includes('class="tooltip">'))return value;
 return value.slice(value.indexOf('class="tooltip">')+'class="tooltip">'.length).trim();
}
function fix(data){let changed=0;for(const g of Array.isArray(data)?data:data.generations||[])for(const engine of g.engines||[]){const label=clean(engine[1]);if(label!==engine[1]){engine[1]=label;changed++;}}return changed;}
if(require.main===module){const root=path.resolve(__dirname,'../outputs'),files=['vehicle-generations.json',...fs.readdirSync(path.join(root,'vehicle-catalog')).filter(f=>f.endsWith('.json')&&f!=='index.json').map(f=>'vehicle-catalog/'+f)];for(const file of files){const target=path.join(root,file);if(!fs.existsSync(target))continue;const data=JSON.parse(fs.readFileSync(target,'utf8')),count=fix(data);if(count){fs.writeFileSync(target,JSON.stringify(data));console.log(file+': '+count+' etiquetas corregidas');}}}
module.exports={clean,fix};
