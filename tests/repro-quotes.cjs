const assert=require('node:assert/strict');const {createHmac}=require('node:crypto');const {Readable}=require('node:stream');
const service=require('../lib/quote-service');const api=require('../api/repro-quotes');const webhook=require('../api/stripe-webhook');
const env={QUOTES_ENABLED:'true',PUBLIC_SITE_URL:'https://www.factorlambda.com',SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-db',QUOTE_ADMIN_PASSWORD:'test-admin-secret',QUOTE_LINK_SECRET:'test-link-secret',TURNSTILE_SITE_KEY:'test-site',TURNSTILE_SECRET_KEY:'test-turnstile',RESEND_API_KEY:'test-mail',QUOTE_EMAIL_FROM:'test@example.com',WHATSAPP_ACCESS_TOKEN:'test-wa',WHATSAPP_PHONE_NUMBER_ID:'123',WHATSAPP_GRAPH_VERSION:'v99.0',WHATSAPP_QUOTE_TEMPLATE:'test_template',STRIPE_SECRET_KEY:'sk_test_fake',STRIPE_WEBHOOK_SECRET:'whsec_test_fake'};
Object.assign(process.env,env);let quotes=[],emails=[],messages=[],stripeCreates=0;const originalFetch=global.fetch;
const response=value=>({ok:true,status:200,json:async()=>structuredClone(value)});
global.fetch=async(input,options={})=>{const url=new URL(input);if(url.hostname==='test.supabase.co'){
 let rows=quotes.filter(q=>[...url.searchParams].every(([key,value])=>!['id','status','notification_status'].includes(key)||(value.startsWith('eq.')?q[key]===value.slice(3):value.startsWith('in.(')?value.slice(4,-1).split(',').includes(q[key]):true)));
 if(options.method==='POST'){const q={status:'pending',delivery:{},notification_status:'pending',created_at:new Date().toISOString(),...JSON.parse(options.body)};quotes.push(q);rows=[q];}
 if(options.method==='PATCH'){const patch=JSON.parse(options.body);rows.forEach(q=>Object.assign(q,structuredClone(patch)));}return response(rows);
 }if(url.hostname==='challenges.cloudflare.com')return response({success:true});
 if(url.hostname==='api.resend.com'){emails.push(JSON.parse(options.body));return response({id:'email-'+emails.length});}
 if(url.hostname==='graph.facebook.com'){messages.push(JSON.parse(options.body));return response({messages:[{id:'wa-'+messages.length}]});}
 if(url.hostname==='api.stripe.com'){if(options.method==='POST'){const form=new URLSearchParams(options.body);assert.equal(form.get('line_items[0][price_data][unit_amount]'),'55000');stripeCreates++;return response({id:'cs_test',url:'https://checkout.stripe.com/c/test'});}return response({id:'cs_test',status:'open',payment_status:'unpaid',url:'https://checkout.stripe.com/c/test'});}
 throw Error('Unexpected external request: '+url.hostname);
};
async function apiCall(method,url,body,authorization){let status,payload;await api({method,url,body,headers:{authorization}},{setHeader(){},status(code){status=code;return{json(value){payload=value;}}}});return{status,payload};}
(async()=>{
 process.env.QUOTES_ENABLED='false';assert.equal((await apiCall('POST','/api/repro-quotes',{})).status,503);process.env.QUOTES_ENABLED='true';
 assert.equal((await apiCall('GET','/api/repro-quotes?action=list')).status,401);
 const lead={vehicle:'Volkswagen Golf',engine:'2.0 TSI GTI 245 CV',year:2022,name:'Prueba',email:'test@example.com',phone:'+34 600 000 000',brand:'REVO',dyno:true,notes:'Prueba',emailConsent:true,whatsappConsent:true,challenge:'test'};
 assert.throws(()=>service.validateLead({...lead,year:1800}));assert.throws(()=>service.validateLead({...lead,emailConsent:false}));
 const noYear=service.validateLead({...lead,year:undefined,generationId:'leon-5f',engineIndex:2});assert.equal(noYear.vehicle.year,undefined);assert.match(noYear.vehicle.engine,/110 CV.*2014–2016/);assert.throws(()=>service.validateLead({...lead,generationId:'leon-5f',engineIndex:999}));
 const created=await apiCall('POST','/api/repro-quotes',lead);assert.equal(created.status,201);assert.equal(emails.length,0);const id=created.payload.reference;assert.equal(quotes[0].vehicle.model,'Volkswagen Golf');assert.equal(quotes[0].vehicle.reference,undefined);assert.equal(quotes[0].total_cents,undefined);
 const authorization='Bearer '+env.QUOTE_ADMIN_PASSWORD;
 const approved=await apiCall('POST','/api/repro-quotes?action=approve',{id,baseCents:50000},authorization);assert.equal(approved.status,200);assert.equal(approved.payload.status,'sent');assert.equal(quotes[0].total_cents,55000);assert.equal(emails.length,1);assert.equal(messages.length,1);assert.ok(messages[0].template.components[0].parameters[3].text.includes('/presupuesto.html'));
 await apiCall('POST','/api/repro-quotes?action=approve',{id,baseCents:50000},authorization);assert.equal(emails.length,1);assert.equal(messages.length,1);
 const link=new URL(approved.payload.link),token=link.searchParams.get('token');assert.equal((await apiCall('GET','/api/repro-quotes?id='+id+'&token=wrong')).status,403);
 const publicResult=await apiCall('GET','/api/repro-quotes?id='+id+'&token='+token);assert.equal(publicResult.payload.totalCents,55000);assert.equal(publicResult.payload.customer,undefined);
 assert.equal((await apiCall('POST','/api/repro-quotes?action=checkout',{id,token,accepted:false})).status,400);
 await apiCall('POST','/api/repro-quotes?action=checkout',{id,token,accepted:true,totalCents:1});await apiCall('POST','/api/repro-quotes?action=checkout',{id,token,accepted:true});assert.equal(stripeCreates,1);
 const event={type:'checkout.session.completed',data:{object:{id:'cs_test',payment_status:'paid',amount_total:55000,currency:'eur',metadata:{quote_id:id,quote_version:quotes[0].version}}}};
 await assert.rejects(()=>service.paymentEvent({...event,data:{object:{...event.data.object,amount_total:1}}}));
 const raw=Buffer.from(JSON.stringify(event)),timestamp=String(Math.floor(Date.now()/1000)),sig=createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(timestamp+'.').update(raw).digest('hex');
 assert.equal(service.verifyWebhook(raw,'t='+timestamp+',v1='+sig),true);assert.equal(service.verifyWebhook(Buffer.from('{}'),'t='+timestamp+',v1='+sig),false);
 async function hook(){const req=Readable.from([raw]);req.method='POST';req.headers={'stripe-signature':'t='+timestamp+',v1='+sig};let status;await webhook(req,{status(code){status=code;return{json(){}}}});return status;}
 assert.equal(await hook(),200);assert.equal(await hook(),200);assert.equal(quotes[0].status,'paid');assert.equal(emails.length,2);assert.ok(emails[1].text.includes('acordar y confirmar la fecha'));assert.equal((await apiCall('POST','/api/repro-quotes?action=checkout',{id,token,accepted:true})).status,409);
 console.log('PASS: consent, catalog validation, private access, manual approval, +50 bank fee, email/WhatsApp mocks, signed cart, Stripe session reuse, webhook validation and duplicate confirmation protection. No real messages or payments.');
})().finally(()=>global.fetch=originalFetch);
