const assert=require('node:assert/strict'),details=require('../lib/vip-cancellations');
(async()=>{const base={user_id:'u',subscription_id:'sub',customer_id:'cus',status:'active',cancel_at_period_end:true};let calls=0;
 const [m]=await details([base],async()=>{calls++;return {id:'sub',customer:'cus',canceled_at:1795600000,cancellation_details:{feedback:'too_expensive',comment:'Motivo del cliente'}};});assert.equal(m.cancellation.reason,'Precio demasiado alto');assert.equal(m.cancellation.comment,'Motivo del cliente');assert.ok(m.cancellation.requestedAt);assert.equal(base.cancellation,undefined);
 const [missing]=await details([base],async()=>({id:'sub',customer:'cus',cancellation_details:{reason:'cancellation_requested'}}));assert.equal(missing.cancellation.reason,'No indicado por el cliente');
 const [blocked]=await details([base],async()=>({id:'sub',customer:'other',cancellation_details:{comment:'Private'}}));assert.equal(blocked.cancellation.unavailable,true);assert.ok(!JSON.stringify(blocked).includes('Private'));
 await details([{...base,cancel_at_period_end:false}],async()=>{throw Error('Should not fetch');});assert.equal(calls,1);
 console.log('PASS cancellation reason, missing feedback, ownership isolation and no unnecessary retrieval');
})().catch(e=>{console.error(e);process.exitCode=1;});
