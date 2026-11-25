const assert=require('node:assert/strict'),{Readable,PassThrough}=require('node:stream'),{createHmac}=require('node:crypto');
let calls=0;const secret='test-webhook-key';
const verify=(raw,header)=>header===sign(raw);
const sign=raw=>'t=123,v1='+createHmac('sha256',secret).update(raw).digest('hex');
require.cache[require.resolve('../lib/quote-service')]={loaded:true,exports:{configured:()=>true,paymentsReady:()=>true,verifyWebhook:verify,paymentEvent:async()=>{calls++;}}};
require.cache[require.resolve('../lib/vip-service')]={loaded:true,exports:{paymentEvent:async()=>{calls++;}}};
const hook=require('../api/stripe-webhook');
async function invoke(req,signature){req.method='POST';req.headers={'stripe-signature':signature};let status,payload;await hook(req,{setHeader(){},status(n){status=n;return {json(v){payload=v;}};}});return {status,payload};}
(async()=>{
 const raw=Buffer.from('{ "type": "invoice.paid", "data": { "name": "Prueba á" } }\n');
 const original=Readable.from([raw]);await new Promise(resolve=>{original.resume();original.on('end',resolve);});
 const restored=new PassThrough(),on=original.on.bind(original);original.read=restored.read.bind(restored);original.on=original.addListener=(name,cb)=>name==='data'||name==='end'?restored.on(name,cb):on(name,cb);restored.end(raw);let getterReads=0;Object.defineProperty(original,'body',{get(){getterReads++;return JSON.parse(raw);}});
 assert.equal((await invoke(original,sign(raw))).status,200);assert.equal(getterReads,0);assert.equal(calls,2);
 assert.equal((await invoke(Readable.from([raw]),sign(raw))).status,200);assert.equal(calls,4);
 assert.equal((await invoke(Readable.from([Buffer.from('{}')]),sign(raw))).status,400);assert.equal(calls,4);
 assert.equal((await invoke(Readable.from([Buffer.alloc(1048577)]),'bad')).status,413);
 const buffered={body:raw};assert.equal((await invoke(buffered,sign(raw))).status,200);
 console.log('PASS Vercel restored raw stream, lazy body getter untouched, exact bytes, tampering rejection and 1 MiB limit');
})().catch(e=>{console.error(e);process.exitCode=1;});
