const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const pkg=process.env.PGLITE_TEST_PACKAGE||path.join(__dirname,'../work/pglite/package');
const {PGlite}=require(path.join(pkg,'dist/index.cjs')),{btree_gist}=require(path.join(pkg,'dist/contrib/btree_gist.cjs'));
const {appointment}=require('../lib/admin-calendar');
(async()=>{const db=new PGlite({extensions:{btree_gist}});try{
 await db.exec('create schema extensions;create role anon;create role authenticated;create role service_role;');
 for(const file of ['repro-quotes','direct-repro-bookings','admin-booking-actions','consultation-bookings','private-calendar','private-calendar'])await db.exec(fs.readFileSync('database/'+file+'.sql','utf8'));
 const a=appointment('2028-01-02T02:15','2028-01-02T03:45');
 async function save(id=null,expected=null,time=a,resource='repro'){return(await db.query('select public.fl_private_calendar_save($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) as result',[id,expected,time,'Prueba interna',{name:'Cliente',email:'test@example.com',phone:'34600000000'},'SEAT Leon','Notas',resource,'test','Petición cliente','taller@factorlambda.com'])).rows[0].result;}
 const created=await save();let q=(await db.query('select * from fl_quote_requests where id=$1',[created.id])).rows[0];assert.equal(q.status,'pending');assert.equal(q.total_cents,null);assert.equal(q.config.manualAppointment,true);
 assert.equal((await db.query("select * from fl_repro_busy('2028-01-02','test')")).rows.length,1);
 await assert.rejects(()=>save(),e=>e.code==='23P01');await save(null,null,a,'consult-german');
 let listing=(await db.query('select fl_private_calendar_list($1,$2) as rows',[a.start,a.end])).rows[0].rows;assert.equal(listing.length,2);
 const moved=await save(created.id,created.revision,appointment('2028-12-31T23:15','2029-01-01T01:00'));
 await assert.rejects(()=>save(created.id,created.revision),e=>e.code==='40001');
 await db.query('select fl_private_calendar_cancel($1,$2,$3)',[created.id,'Anulación','taller@factorlambda.com']);assert.equal((await db.query('select state from fl_repro_bookings where quote_id=$1',[created.id])).rows[0].state,'released');
 const paid=await save(null,null,appointment('2028-03-05T01:00','2028-03-05T02:00'));
 await db.query("update fl_quote_requests set status='paid',base_cents=10000,total_cents=10000,stripe_session_id='cs_keep',config=config-'manualAppointment'||jsonb_build_object('flow','direct-v1','brand','TLR SPORT','pricing',jsonb_build_object('dynoGrossCents',0)) where id=$1",[paid.id]);
 await save(paid.id,paid.revision,appointment('2029-06-03T04:00','2029-06-03T06:00'));
 q=(await db.query('select * from fl_quote_requests where id=$1',[paid.id])).rows[0];assert.equal(q.status,'paid');assert.equal(q.total_cents,10000);assert.equal(q.stripe_session_id,'cs_keep');
 const pending=await save(null,null,appointment('2028-04-02T00:00','2028-04-02T01:00'));await db.query("update fl_quote_requests set config=config-'manualAppointment' where id=$1",[pending.id]);await assert.rejects(()=>save(pending.id,pending.revision),e=>e.code==='P0001');
 await db.exec('set role anon');await assert.rejects(()=>db.query('select fl_private_calendar_list($1,$2)',[a.start,a.end]));await db.exec('reset role');
 assert.throws(()=>appointment('2027-03-28T02:30','2027-03-28T04:00'),/no existe/);
 assert.throws(()=>appointment('2028-01-01T24:00','2028-01-02T01:00'),/válida/);
 console.log('PASS calendar SQL: migration twice, weekends/overnight/future years, atomic overlaps, public busy integration, revisions, paid immutability, unpaid protection, manual cancellation, anonymous denial, DST.');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
