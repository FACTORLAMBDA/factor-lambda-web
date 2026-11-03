const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'../outputs');const blocked=/br[-\s.]?performance|brp-barcelona/i;
function inspect(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())inspect(file);else if(/\.(html|js|json)$/.test(file))assert.equal(blocked.test(fs.readFileSync(file,'utf8')),false,path.relative(root,file));}}
inspect(root);console.log('PASS no removed third-party branding or links in public HTML, JS or JSON.');
