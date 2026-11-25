const assert=require('node:assert/strict');
const calls=[];
const query={select(){return this;},eq(){return this;},single(){return Promise.resolve({id:'12345678-1234-1234-1234-123456789abc'});},update(v){calls.push(v);return this;},upsert(v){calls.push(v);return Promise.resolve(v);},then(resolve){resolve({});}};
const run=require('../lib/vip-admin-clients')({admin:r=>{if(!r.allowed)throw Error('Unauthorized');},db:()=>({from:()=>query,rpc:(name,args)=>{calls.push(args);return Promise.resolve({});}}),result:async q=>q,mode:()=> 'test',fail:m=>{throw Error(m);}});
(async()=>{
 const base={userId:'12345678-1234-1234-1234-123456789abc',confirmed:true};
 await assert.rejects(()=>run({},base),/Unauthorized/);
 await assert.rejects(()=>run({allowed:true},{...base,action:'gift-grant',plan:'invented',expiresAt:'2099-01-01'}));
 await run({allowed:true},{...base,action:'gift-grant',plan:'elite',expiresAt:new Date(Date.now()+86400000).toISOString(),note:'Regalo de prueba'});
 assert.equal(calls.at(-1).p_plan,'elite');assert.equal(calls.at(-1).p_mode,'test');
 await run({allowed:true},{...base,action:'edit-client',name:'Cliente prueba',phone:'123'});assert.deepEqual(calls.at(-1),{name:'Cliente prueba',phone:'123'});
 await run({allowed:true},{...base,action:'gift-revoke'});assert.equal(calls.at(-1).revoked,true);
 console.log('VIP client edits and complimentary grants: OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
