const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),service=require('../lib/quote-service');
Object.assign(process.env,{SUPABASE_URL:'https://mock.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'sb_secret_mock',QUOTE_ADMIN_PASSWORD:'admin-test',QUOTE_LINK_SECRET:'mock-link',STRIPE_MODE:'test',STRIPE_CHECKOUT_ENABLED:'true',STRIPE_SECRET_KEY:'rk_test_mock',STRIPE_PUBLISHABLE_KEY:'pk_test_mock',STRIPE_WEBHOOK_SECRET:'whsec_mock'});
const original=global.fetch,response=data=>({ok:true,status:200,json:async()=>structuredClone(data),text:async()=>JSON.stringify(data)});
let q,state,sessionStatus,paymentStatus,expires,race,creating;
function reset({paid=false,direct=false,session=false}={}){q={id:randomUUID(),version:randomUUID(),status:paid?'paid':'sent',customer:{name:'Test'},vehicle:{model:'Test'},config:direct?{flow:'direct-v1'}:{},stripe_session_id:session?'cs_test_archive':null,stripe_mode:'test',total_cents:3000};state=direct?'held':null;sessionStatus='open';paymentStatus='unpaid';expires=0;race=false;creating=false;}
global.fetch=async(url,options={})=>{const u=new URL(url);
 if(u.hostname==='mock.supabase.co'){
  if(u.pathname.includes('/rpc/')){const data=JSON.parse(options.body);assert.equal(u.pathname.split('/').pop(),'fl_repro_transition');assert.equal(data.p_state,'released');if(creating)return {ok:false,status:400,json:async()=>({code:'P0001'})};state='released';return {ok:true,status:204};}
  if(options.method==='PATCH'){
   const data=JSON.parse(options.body);if(race&&data.status==='sending'){q.status='paid';race=false;}
   if(u.searchParams.get('status')&&u.searchParams.get('status')!=='eq.'+q.status)return response([]);
   Object.assign(q,data);
  }
  return response([q]);
 }
 if(u.hostname==='api.stripe.com'){
  if(options.method==='POST'){assert.ok(u.pathname.endsWith('/expire'));expires++;sessionStatus='expired';}
  return response({id:'cs_test_archive',status:sessionStatus,payment_status:paymentStatus,livemode:false,amount_total:3000,currency:'eur',metadata:{quote_id:q.id,quote_version:q.version}});
 }
 throw Error('Unexpected destination');
};
(async()=>{try{
 const req={headers:{authorization:'Bearer admin-test'}},act=()=>service.adminAction(req,{id:q.id,action:'archive',confirmed:true,reason:'Solicitud de prueba'});
 reset();await assert.rejects(()=>service.adminAction({headers:{}},{id:q.id,action:'archive',confirmed:true,reason:'Test'}),/autorizado/);assert.ok(!q.config.adminArchived);
 await act();assert.ok(q.config.adminArchived);assert.equal(q.status,'sent');assert.equal(q.config.adminHistory.length,1);await act();assert.equal(q.config.adminHistory.length,1);
 reset({direct:true,session:true});await act();assert.equal(expires,1);assert.equal(state,'released');assert.ok(q.config.adminArchived);assert.equal(q.stripe_session_id,'cs_test_archive');
 reset({session:true});await act();assert.equal(expires,1);assert.ok(q.config.adminArchived);
 reset({paid:true,direct:true,session:true});await assert.rejects(act,/pagado/);assert.equal(expires,0);assert.ok(!q.config.adminArchived);
 reset({session:true});paymentStatus='paid';sessionStatus='complete';await assert.rejects(act,/recibido el pago/);assert.equal(q.status,'sent');assert.ok(!q.config.adminArchived);
 reset();race=true;await assert.rejects(act,/cambiado/);assert.equal(q.status,'paid');assert.ok(!q.config.adminArchived);
 reset({direct:true});creating=true;await assert.rejects(act);assert.equal(state,'held');assert.ok(!q.config.adminArchived);
 console.log('PASS archive: authorized soft archive, direct hold released, open Stripe expired, session/history retained, paid and in-flight operations protected, concurrent paid update not overwritten. All services mocked.');
}finally{global.fetch=original;}})().catch(e=>{console.error(e);process.exitCode=1;});
