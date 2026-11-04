const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),path=require('node:path');
const pkg=path.join(__dirname,'../work/pglite/package'),{PGlite}=require(path.join(pkg,'dist/index.cjs')),{btree_gist}=require(path.join(pkg,'dist/contrib/btree_gist.cjs'));
const consultations=require('../lib/consultations');
(async()=>{const db=new PGlite({extensions:{btree_gist}});try{
 await db.exec('create schema extensions; create role anon; create role authenticated; create role service_role;');
 for(const file of ['database/repro-quotes.sql','database/direct-repro-bookings.sql','database/admin-booking-actions.sql','database/consultation-bookings.sql','database/consultation-bookings.sql'])await db.exec(fs.readFileSync(file,'utf8'));
 let day=new Date(Date.now()+8*86400000).toISOString().slice(0,10);while([0,6].includes(new Date(day+'T12:00:00Z').getUTCDay()))day=new Date(Date.parse(day+'T12:00:00Z')+86400000).toISOString().slice(0,10);
 const data={mode:'phone',topic:'mechanics',name:'Test',email:'test@example.com',phone:'600000000',vehicle:'SEAT Leon',plate:'TEST',notes:'Consulta',accepted:true};
 async function hold(extra={},time='08:00',mode='test',tamper){const lead=consultations.lead({...data,...extra}),id=randomUUID(),appointment=consultations.appointment(day,time,lead.service.professional);const config={...lead.config,appointment,checkoutExpiresAt:Math.floor(Date.now()/1000)+3600};if(tamper)config.pricing.totalCents=1;await db.query('select public.fl_consult_hold($1,$2,$3,$4,$5,$6)',[id,randomUUID(),lead.customer,lead.vehicle,config,mode]);return id;}
 const first=await hold();assert.equal((await db.query('select total_cents from public.fl_quote_requests where id=$1',[first])).rows[0].total_cents,2500);
 await assert.rejects(()=>hold({mode:'visit'}),e=>e.code==='23P01');
 const other=await hold({topic:'tuning'});await hold({},'08:00','live');
 const visit=await hold({mode:'visit'},'08:30');assert.equal((await db.query('select total_cents from public.fl_quote_requests where id=$1',[visit])).rows[0].total_cents,3000);
 const online=await hold({topic:'online-quote'},'09:00');assert.equal((await db.query('select total_cents from public.fl_quote_requests where id=$1',[online])).rows[0].total_cents,3000);
 await assert.rejects(()=>hold({},'10:00','test',true));
 assert.equal((await db.query('select * from public.fl_repro_busy($1,$2)',[day,'test'])).rows.length,0);
 assert.equal((await db.query('select * from public.fl_consult_busy($1,$2,$3)',[day,'joaquin','test'])).rows.length,1);
 await db.query('select public.fl_repro_begin_checkout($1)',[first]);await db.query('select public.fl_repro_end_checkout($1)',[first]);await db.query('select public.fl_repro_transition($1,$2)',[first,'confirmed']);await db.query("update public.fl_quote_requests set status='paid' where id=$1",[first]);
 const moved=consultations.appointment(day,'10:30','german');await db.query('select public.fl_consult_admin_move($1,$2,$3)',[first,moved,'Cliente']);
 await db.query('select public.fl_repro_admin_action($1,$2,$3,$4)',[first,'cancel',null,'Cliente']);assert.equal((await db.query('select status from public.fl_quote_requests where id=$1',[first])).rows[0].status,'paid');
 await db.exec('set role anon');await assert.rejects(()=>db.query('select public.fl_consult_busy($1,$2,$3)',[day,'german','test']));await db.exec('reset role');
 console.log('PASS consultation PostgreSQL: migration twice, fixed 25/30 EUR prices, atomic collision, professional/mode isolation, shared transitions, admin move/cancel without refund, anonymous denial.');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
