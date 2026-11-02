const assert=require('node:assert/strict');const stripe=require('../lib/stripe-payments');
const keys=['STRIPE_MODE','STRIPE_LIVE_APPROVED','STRIPE_CHECKOUT_ENABLED','STRIPE_SECRET_KEY','STRIPE_PUBLISHABLE_KEY','STRIPE_WEBHOOK_SECRET'];const original=Object.fromEntries(keys.map(k=>[k,process.env[k]]));const fetchOriginal=global.fetch;
(async()=>{try{
for(const k of keys)delete process.env[k];assert.equal(stripe.configuration().enabled,false);assert.throws(stripe.requireEnabled);
Object.assign(process.env,{STRIPE_MODE:'test',STRIPE_CHECKOUT_ENABLED:'true',STRIPE_SECRET_KEY:'sk_test_mock',STRIPE_PUBLISHABLE_KEY:'pk_test_mock',STRIPE_WEBHOOK_SECRET:'whsec_mock'});assert.equal(stripe.configuration().enabled,true);
for(const [key,value]of [['STRIPE_SECRET_KEY','sk_live_forbidden'],['STRIPE_PUBLISHABLE_KEY','pk_live_forbidden'],['STRIPE_MODE','live'],['STRIPE_CHECKOUT_ENABLED','false']]){const saved=process.env[key];process.env[key]=value;assert.equal(stripe.configuration().enabled,false);assert.throws(stripe.requireEnabled);process.env[key]=saved;}
global.fetch=async()=>({ok:true,json:async()=>({livemode:true})});await assert.rejects(()=>stripe.request('checkout/sessions'),/entorno/);
global.fetch=async()=>({ok:true,json:async()=>({livemode:false})});assert.equal((await stripe.request('checkout/sessions')).livemode,false);
global.fetch=async()=>({ok:false});await assert.rejects(()=>stripe.request('checkout/sessions'),/Stripe/);
Object.assign(process.env,{STRIPE_MODE:'live',STRIPE_SECRET_KEY:'rk_live_mock',STRIPE_PUBLISHABLE_KEY:'pk_live_mock',STRIPE_LIVE_APPROVED:'false'});assert.equal(stripe.configuration().enabled,false);process.env.STRIPE_LIVE_APPROVED='true';assert.equal(stripe.configuration().enabled,true);global.fetch=async()=>({ok:true,json:async()=>({livemode:true})});assert.equal((await stripe.request('checkout/sessions')).livemode,true);process.env.STRIPE_CHECKOUT_ENABLED='false';assert.equal(stripe.configuration().enabled,false);
console.log('PASS Stripe: disabled default, restricted keys, matching key environments, separate live approval, mode-mismatch rejection and provider errors. No external requests.');
}finally{global.fetch=fetchOriginal;for(const k of keys){if(original[k]===undefined)delete process.env[k];else process.env[k]=original[k];}}})();
