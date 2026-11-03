const assert=require('node:assert/strict');const {createHmac}=require('node:crypto');
const service=require('../lib/quote-service');const reservations=require('../lib/repro-reservations');const tariffs=require('../lib/repro-tariffs');const tlr=require('../lib/tlr-catalog');
const oldFetch=global.fetch,oldLoad=tlr.load;
Object.assign(process.env,{QUOTES_ENABLED:'true',SUPABASE_URL:'https://mock.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'sb_secret_mock',QUOTE_ADMIN_PASSWORD:'mock',QUOTE_LINK_SECRET:'mock-secret',TURNSTILE_SECRET_KEY:'mock',TURNSTILE_SITE_KEY:'mock',STRIPE_MODE:'test',STRIPE_CHECKOUT_ENABLED:'true',STRIPE_SECRET_KEY:'rk_test_mock',STRIPE_PUBLISHABLE_KEY:'pk_test_mock',STRIPE_WEBHOOK_SECRET:'whsec_mock',RESEND_API_KEY:'mock',QUOTE_EMAIL_FROM:'Factor Lambda <test@example.com>'});
const response=data=>({ok:true,status:200,json:async()=>structuredClone(data),text:async()=>JSON.stringify(data)});
const emptyResponse=()=>({ok:true,status:204,json:async()=>{throw Error('Empty body is not JSON');},text:async()=>{throw Error('204 body must not be read');}});
let q,held=false,busy=[],mailCount=0,sessions=0,sessionStatus='open',confirmed=false;
tlr.load=async params=>{
 if(params.has('potencia_id'))return {result:{stockPower:110,referencePower:130,generation:'5F',launch:'2012',priceNetCents:40000,sourceUrl:'https://tlrsport.es/tlr-tarifas-marca/'}};
 if(params.has('motor_id'))return {options:[{value:'110',label:'110'}]};
 if(params.has('combustible_id'))return {options:[{value:'1200 TSI',label:'1200 TSI'}]};
 if(params.has('modelo_id'))return {options:[{value:'Gasolina',label:'Gasolina'}]};
 return {options:[{value:'Leon',label:'Leon'}]};
};
global.fetch=async(url,options={})=>{
 const parsed=new URL(url);if(parsed.hostname==='challenges.cloudflare.com')return response({success:true});
 if(parsed.hostname==='mock.supabase.co'){
  assert.equal(options.headers.Authorization,undefined);
  if(parsed.pathname.includes('/rpc/')){const data=JSON.parse(options.body),name=parsed.pathname.split('/').pop();
   if(name==='fl_repro_pending')return response([]);
   if(name==='fl_repro_busy')return response(busy);
   if(name==='fl_repro_hold'){assert.equal(data.p_config.pricing.totalCents,58400);assert.equal(data.p_config.pricing.dynoGrossCents,10000);held=true;q={id:data.p_id,version:data.p_version,customer:data.p_customer,vehicle:data.p_vehicle,config:data.p_config,stripe_mode:data.p_mode,status:'sent',total_cents:58400,base_cents:48400,notification_status:'pending'};return response(q);}
   if(name==='fl_repro_begin_checkout'){if(!held)throw Error('Not held');return emptyResponse();}
   if(name==='fl_repro_end_checkout')return emptyResponse();
   if(name==='fl_repro_transition'){if(data.p_state==='confirmed'){assert.ok(held);confirmed=true;}if(data.p_state==='released')held=false;return emptyResponse();}
   throw Error('Unexpected RPC '+name);
  }
  if(parsed.searchParams.get('notification_status')==='eq.pending'&&q.notification_status!=='pending')return response([]);
  if(options.method==='PATCH')Object.assign(q,JSON.parse(options.body));return response([q]);
 }
 if(parsed.hostname==='api.stripe.com'){
  if(options.method==='POST'&&!parsed.pathname.endsWith('/expire')){sessions++;const form=new URLSearchParams(options.body);assert.equal(form.get('line_items[0][price_data][unit_amount]'),'58400');assert.equal(form.get('allowed_payment_method_types[0]'),'card');assert.equal(form.get('ui_mode'),'embedded_page');assert.equal(form.get('expires_at'),String(q.config.checkoutExpiresAt));}
  if(parsed.pathname.endsWith('/expire'))sessionStatus='expired';
  return response({id:'cs_test_direct',livemode:false,status:sessionStatus,payment_status:'unpaid',ui_mode:'embedded_page',client_secret:'mock_secret',amount_total:58400,currency:'eur',metadata:{quote_id:q.id,quote_version:q.version}});
 }
 if(parsed.hostname==='api.resend.com'){mailCount++;const data=JSON.parse(options.body);assert.ok(confirmed);assert.match(data.text,/Cita confirmada:/);assert.match(data.html,/email-factor-lambda-banner.png/);assert.match(data.html,/flgarage@factorlambda.com/);return response({id:'mail-mock'});}
 throw Error('Unexpected destination '+parsed.hostname);
};
(async()=>{try{
 const selected={generationId:'leon-5f',engineIndex:2,stage:'Stage 1',brand:'TLR SPORT',dyno:true};
 // Find the engine by its immutable catalogue entry rather than assuming an index.
 const generation=require('../outputs/vehicle-generations.json').generations.find(g=>g.id==='leon-5f');selected.engineIndex=generation.engines.findIndex(e=>e[1].startsWith('1.2 TSI')&&e[2]===110);
 const calculated=await tariffs.price(selected);assert.equal(calculated.totalCents,58400);
 await assert.rejects(()=>tariffs.price({...selected,brand:'REVO'}),/REVO/);
 await assert.rejects(()=>tariffs.price({...selected,brand:'Sin preferencia'}),/elige/);
 assert.equal(tariffs.engineName('1200 TSI','Leon'),tariffs.engineName('1.2 TSI (2014 - 2016)','Leon'));
 const winter=reservations.appointment('2027-01-11','08:00',true,new Date('2027-01-01'));assert.equal(winter.start,'2027-01-11T07:00:00.000Z');
 const summer=reservations.appointment('2027-06-07','08:00',false,new Date('2027-06-01'));assert.equal(summer.start,'2027-06-07T06:00:00.000Z');
 assert.throws(()=>reservations.appointment('2027-01-10','08:00',true,new Date('2027-01-01')));
 assert.throws(()=>reservations.appointment('2027-01-11','11:00',true,new Date('2027-01-01')));
 let future=new Date(Date.now()+7*86400000);while([0,6].includes(future.getUTCDay()))future.setUTCDate(future.getUTCDate()+1);const day=future.toISOString().slice(0,10);
 const lead={...selected,day,time:'08:00',name:'Prueba',email:'test@example.com',phone:'600000000',emailConsent:true,accepted:true,challenge:'mock',expectedTotalCents:58400};
 await assert.rejects(()=>service.directBooking({...lead,expectedTotalCents:1}),/cambiado/);assert.equal(q,undefined);
 const result=await service.directBooking({...lead,totalCents:1});assert.equal(mailCount,0);assert.equal(result.pricing.totalCents,58400);assert.equal(q.customer.whatsappConsent,false);
 const expected=createHmac('sha256',process.env.QUOTE_LINK_SECRET).update(q.id+':'+q.version).digest('base64url');assert.equal(result.token,expected);
 const paidEvent={type:'checkout.session.completed',livemode:false,data:{object:{id:'cs_test_direct',livemode:false,payment_status:'paid',amount_total:58400,currency:'eur',metadata:{quote_id:q.id,quote_version:q.version}}}};
 await service.checkout(result.id,result.token,true);await service.checkout(result.id,result.token,true);assert.equal(sessions,1);
 busy=[{starts_at:q.config.appointment.start.replace('.000Z','+00:00'),ends_at:q.config.appointment.end.replace('.000Z','+00:00')}];
 const slots=await service.directSlots(day,true);assert.equal(slots.slots.find(s=>s.start==='08:00').available,false);assert.equal(slots.slots.find(s=>s.start==='14:00').available,true);
 await assert.rejects(()=>service.paymentEvent({...paidEvent,data:{object:{...paidEvent.data.object,amount_total:1}}}));assert.equal(confirmed,false);
 await service.paymentEvent(paidEvent);await service.paymentEvent(paidEvent);assert.equal(mailCount,1);assert.equal(confirmed,true);assert.equal(q.status,'paid');
 console.log('PASS direct: exact tariff, VAT+gross bank, tampered amount rejected, future weekday/DST/shift validation, hold-before-Stripe, reuse, overlapping availability, webhook-only confirmation, one branded mail. Providers mocked.');
}finally{global.fetch=oldFetch;tlr.load=oldLoad;}})().catch(error=>{console.error(error);process.exitCode=1;});
