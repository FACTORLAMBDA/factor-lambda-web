const assert=require('node:assert/strict');const handler=require('../api/car-studio');
const originalFetch=global.fetch;
async function call(method,url,body){let status=200,data;await handler({method,url,body,headers:{'content-type':'application/json'}},{setHeader(){},status(code){status=code;return{json(value){data=value;}}}});return{status,data};}
(async()=>{
 process.env.ENABLE_3D_GENERATION='false';assert.equal((await call('GET','/api/car-studio')).data.enabled,false);assert.equal((await call('POST','/api/car-studio',{})).status,503);
 Object.assign(process.env,{ENABLE_3D_GENERATION:'true',MESHY_API_KEY:'test',STUDIO_SIGNING_SECRET:'test-secret-not-production',TURNSTILE_SITE_KEY:'test',TURNSTILE_SECRET_KEY:'test'});
 assert.equal((await call('POST','/api/car-studio',{images:[],token:'x'})).status,400);
 let providerCalls=0;global.fetch=async url=>{if(String(url).includes('siteverify'))return{json:async()=>({success:false})};providerCalls++;throw Error('Unexpected call');};
 assert.equal((await call('POST','/api/car-studio',{images:['data:image/jpeg;base64,YQ=='],token:'x'})).status,403);assert.equal(providerCalls,0);
 global.fetch=async(url,opts)=>{if(String(url).includes('siteverify'))return{json:async()=>({success:true})};providerCalls++;return opts.method==='POST'?{ok:true,json:async()=>({result:'test-task-id'})}:{ok:true,json:async()=>({status:'SUCCEEDED',progress:100,model_urls:{glb:'https://assets.meshy.ai/test/model.glb'}})};};
 const job=await call('POST','/api/car-studio',{images:['data:image/jpeg;base64,YQ=='],token:'x'});assert.equal(job.status,202);assert.ok(job.data.receipt);
 assert.equal((await call('GET','/api/car-studio?receipt='+encodeURIComponent(job.data.receipt+'x'))).status,403);
 const status=await call('GET','/api/car-studio?receipt='+encodeURIComponent(job.data.receipt));assert.equal(status.data.status,'SUCCEEDED');assert.match(status.data.modelUrl,/assets.meshy.ai/);console.log('PASS: API disabled mode, validation, challenge, signed receipts and polling with mocked provider; no paid requests');
})().finally(()=>global.fetch=originalFetch);
