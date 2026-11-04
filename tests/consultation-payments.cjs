const assert=require('node:assert/strict'),service=require('../lib/quote-service'),consultations=require('../lib/consultations');
Object.assign(process.env,{QUOTES_ENABLED:'true',SUPABASE_URL:'https://mock.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'sb_secret_mock',QUOTE_ADMIN_PASSWORD:'mock',QUOTE_LINK_SECRET:'mock-secret',TURNSTILE_SECRET_KEY:'mock',TURNSTILE_SITE_KEY:'mock',STRIPE_MODE:'test',STRIPE_CHECKOUT_ENABLED:'true',STRIPE_SECRET_KEY:'rk_test_mock',STRIPE_PUBLISHABLE_KEY:'pk_test_mock',STRIPE_WEBHOOK_SECRET:'whsec_mock',RESEND_API_KEY:'mock',QUOTE_EMAIL_FROM:'Factor Lambda <test@example.com>'});
const original=global.fetch,response=data=>({ok:true,status:200,json:async()=>structuredClone(data),text:async()=>JSON.stringify(data)}),empty=()=>({ok:true,status:204});
let q,confirmed=false,mails=0,sessions=0;
global.fetch=async(url,options={})=>{const u=new URL(url);
 if(u.hostname==='challenges.cloudflare.com')return response({success:true});
 if(u.hostname==='mock.supabase.co'){
  if(u.pathname.includes('/rpc/')){const action=u.pathname.split('/').pop(),data=JSON.parse(options.body);
   if(action==='fl_consult_hold'){assert.equal(data.p_config.pricing.totalCents,2500);q={id:data.p_id,version:data.p_version,customer:data.p_customer,vehicle:data.p_vehicle,config:data.p_config,status:'sent',base_cents:2500,total_cents:2500,stripe_mode:'test',notification_status:'pending'};return response(q);}
   if(action==='fl_repro_begin_checkout'||action==='fl_repro_end_checkout')return empty();
   if(action==='fl_repro_transition'){assert.equal(data.p_state,'confirmed');confirmed=true;return empty();}throw Error(action);
  }
  if(u.searchParams.get('notification_status')==='eq.pending'&&q.notification_status!=='pending')return response([]);
  if(options.method==='PATCH')Object.assign(q,JSON.parse(options.body));return response([q]);
 }
 if(u.hostname==='api.stripe.com'){if(options.method==='POST'){sessions++;const form=new URLSearchParams(options.body);assert.equal(form.get('line_items[0][price_data][unit_amount]'),'2500');assert.match(form.get('line_items[0][price_data][product_data][name]'),/Consulta telefónica/);assert.equal(form.get('allowed_payment_method_types[0]'),'card');}return response({id:'cs_test_consult',livemode:false,status:'open',payment_status:'unpaid',amount_total:2500,currency:'eur',ui_mode:'embedded_page',client_secret:'mock_secret',metadata:{quote_id:q.id,quote_version:q.version}});}
 if(u.hostname==='api.resend.com'){assert.ok(confirmed);mails++;const data=JSON.parse(options.body);assert.match(data.text,/25 €/);assert.match(data.text,/Germán/);assert.match(data.text,/Fecha:/);assert.ok(!data.text.includes('Reprogramación TLR'));assert.deepEqual(data.bcc,['flgarage@factorlambda.com']);return response({id:'mail'});}
 throw Error('Unexpected network destination');
};
(async()=>{try{
 let day=new Date(Date.now()+8*86400000).toISOString().slice(0,10);while([0,6].includes(new Date(day+'T12:00:00Z').getUTCDay()))day=new Date(Date.parse(day+'T12:00:00Z')+86400000).toISOString().slice(0,10);
 const lead={mode:'phone',topic:'mechanics',name:'Test',email:'test@example.com',phone:'600000000',vehicle:'SEAT Leon',plate:'TEST',notes:'Dudas',accepted:true,day,time:'08:00',challenge:'mock',totalCents:1};
 assert.equal(consultations.lead({...lead,mode:'visit'}).service.totalCents,3000);assert.equal(consultations.lead({...lead,topic:'online-quote'}).service.totalCents,3000);assert.equal(consultations.lead({...lead,topic:'exhausts'}).service.professional,'joaquin');
 assert.throws(()=>consultations.lead({...lead,topic:'other-help'}));assert.throws(()=>consultations.appointment(day,'15:30','german'));assert.equal(consultations.appointment(day,'15:30','joaquin').endTime,'16:00');
 const winter=consultations.appointment('2027-01-11','08:00','german',new Date('2027-01-01'));assert.equal(winter.start,'2027-01-11T07:00:00.000Z');
 const result=await service.consultBooking(lead);assert.equal(result.totalCents,2500);assert.equal(q.status,'sent');assert.equal(mails,0);assert.equal(confirmed,false);
 await service.checkout(result.id,result.token,true);await service.checkout(result.id,result.token,true);assert.equal(sessions,1);assert.equal((await service.checkoutStatus(result.id,result.token)).status,'open');assert.equal(confirmed,false);
 const event={type:'checkout.session.completed',livemode:false,data:{object:{id:'cs_test_consult',livemode:false,payment_status:'paid',amount_total:2500,currency:'eur',metadata:{quote_id:q.id,quote_version:q.version}}}};
 await assert.rejects(()=>service.paymentEvent({...event,data:{object:{...event.data.object,amount_total:1}}}));assert.equal(confirmed,false);
 await service.paymentEvent(event);await service.paymentEvent(event);assert.equal(q.status,'paid');assert.equal(mails,1);
 console.log('PASS consultation: server fixed prices, deadlines, professional routing, hold saved before Stripe, no confirmation before paid webhook, spoofed amount rejected, session reuse, one branded confirmation mail. Providers mocked.');
}finally{global.fetch=original;}})().catch(e=>{console.error(e);process.exitCode=1;});
