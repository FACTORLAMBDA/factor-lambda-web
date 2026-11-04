const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),service=require('../lib/quote-service');
Object.assign(process.env,{SUPABASE_URL:'https://mock.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'sb_secret_mock',QUOTE_LINK_SECRET:'mock-secret',TURNSTILE_SECRET_KEY:'mock',STRIPE_MODE:'test',RESEND_API_KEY:'mock',QUOTE_EMAIL_FROM:'Factor Lambda <test@example.com>'});
const original=global.fetch,response=data=>({ok:true,status:200,json:async()=>structuredClone(data)}),rows=new Map();let mails=0,failMail=false;
global.fetch=async(url,options={})=>{const u=new URL(url);
 if(u.hostname==='challenges.cloudflare.com')return response({success:true});
 if(u.hostname==='mock.supabase.co'){
  assert.ok(!u.pathname.includes('/rpc/'),'Fallback must never reserve a slot');
  if(options.method==='POST'){const q=JSON.parse(options.body);assert.equal(q.total_cents,undefined);assert.equal(q.base_cents,undefined);assert.equal(q.config.appointment,undefined);assert.equal(q.config.priceFallback,true);assert.ok(options.headers.Prefer.includes('ignore-duplicates'));if(rows.has(q.id))return response([]);q.status='pending';q.delivery={};rows.set(q.id,q);return response([q]);}
  const q=rows.get(u.searchParams.get('id').slice(3));assert.ok(q);if(options.method==='PATCH')Object.assign(q,JSON.parse(options.body));return response([q]);
 }
 if(u.hostname==='api.resend.com'){if(failMail)throw Error('Simulated email outage');const data=JSON.parse(options.body);assert.ok(data.text.includes('Referencia:'));assert.ok(!data.text.includes('Pago confirmado'));if(data.to[0]==='flgarage@factorlambda.com'){assert.match(data.text,/Preferencia de cita \(sin reservar\)/);assert.match(data.text,/600000000/);}else assert.match(data.text,/ningún cobro ni confirmado ninguna cita/);mails++;return response({id:'mail-'+mails});}
 throw Error('Fallback must not contact Stripe or other providers');
};
(async()=>{try{
 const input={generationId:'leon-5f',engineIndex:2,stage:'Stage 1',brand:'TLR SPORT',dyno:true,name:'Test',email:'test@example.com',phone:'600000000',notes:'Consulta',day:'2026-12-01',time:'08:00',requestKey:randomUUID(),challenge:'mock',fallbackConsent:true,totalCents:1};
 await assert.rejects(()=>service.fallbackLead({...input,fallbackConsent:false}),/Acepta/);assert.equal(rows.size,0);
 const first=await service.fallbackLead(input);assert.ok(first.saved&&first.notified&&first.receipt);assert.equal(rows.size,1);assert.equal(mails,2);
 const again=await service.fallbackLead(input);assert.equal(again.reference,first.reference);assert.equal(rows.size,1);assert.equal(mails,2);
 const q=rows.get(first.reference);assert.equal(q.status,'pending');assert.equal(q.config.requestedAppointment.time,'08:00');assert.equal(q.customer.phone,'34600000000');
 failMail=true;const saved=await service.fallbackLead({...input,requestKey:randomUUID()});assert.ok(saved.saved);assert.equal(saved.notified,false);assert.equal(rows.size,2);
 console.log('PASS fallback: consent and challenge, validated lead, idempotent save, no amount/Stripe/hold, staff notice and customer receipt, saved even during email outage. All services mocked.');
}finally{global.fetch=original;}})().catch(e=>{console.error(e);process.exitCode=1;});
