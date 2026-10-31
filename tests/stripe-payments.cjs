const assert=require('node:assert/strict');const stripe=require('../lib/stripe-payments');
const keys=['STRIPE_MODE','STRIPE_CHECKOUT_ENABLED','STRIPE_SECRET_KEY','STRIPE_PUBLISHABLE_KEY','STRIPE_WEBHOOK_SECRET'];const original=Object.fromEntries(keys.map(k=>[k,process.env[k]]));const fetchOriginal=global.fetch;
(async()=>{try{
for(const k of keys)delete process.env[k];assert.equal(stripe.configuration().enabled,false);assert.throws(stripe.requireTestMode);
Object.assign(process.env,{STRIPE_MODE:'test',STRIPE_CHECKOUT_ENABLED:'true',STRIPE_SECRET_KEY:'sk_test_mock',STRIPE_PUBLISHABLE_KEY:'pk_test_mock',STRIPE_WEBHOOK_SECRET:'whsec_mock'});assert.equal(stripe.configuration().enabled,true);
for(const [key,value]of [['STRIPE_SECRET_KEY','sk_live_forbidden'],['STRIPE_PUBLISHABLE_KEY','pk_live_forbidden'],['STRIPE_MODE','live'],['STRIPE_CHECKOUT_ENABLED','false']]){const saved=process.env[key];process.env[key]=value;assert.equal(stripe.configuration().enabled,false);assert.throws(stripe.requireTestMode);process.env[key]=saved;}
global.fetch=async()=>({ok:true,json:async()=>({livemode:true})});await assert.rejects(()=>stripe.request('checkout/sessions'),/pruebas/);
global.fetch=async()=>({ok:true,json:async()=>({livemode:false})});assert.equal((await stripe.request('checkout/sessions')).livemode,false);
global.fetch=async()=>({ok:false});await assert.rejects(()=>stripe.request('checkout/sessions'),/Stripe/);
console.log('PASS Stripe configuration: disabled default, test keys only, production blocked, live responses rejected and provider errors handled.');
}finally{global.fetch=fetchOriginal;for(const k of keys){if(original[k]===undefined)delete process.env[k];else process.env[k]=original[k];}}})();
