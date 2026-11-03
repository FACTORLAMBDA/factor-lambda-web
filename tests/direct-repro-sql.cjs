const fs=require('node:fs');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const path=require('node:path');const pkg=process.env.PGLITE_TEST_PACKAGE||path.join(__dirname,'../work/pglite/package');
const {PGlite}=require(path.join(pkg,'dist/index.cjs'));const {btree_gist}=require(path.join(pkg,'dist/contrib/btree_gist.cjs'));
(async()=>{const db=new PGlite({extensions:{btree_gist}});try{
 await db.exec('create schema extensions; create role anon; create role authenticated; create role service_role;');
 await db.exec(fs.readFileSync('database/repro-quotes.sql','utf8'));
 const sql=fs.readFileSync('database/direct-repro-bookings.sql','utf8');await db.exec(sql);await db.exec(sql);
 const customer={name:'Test',email:'test@example.com'},vehicle={model:'Test'},pricing={country:'ES',currency:'eur',softwareNetCents:40000,softwareVatCents:8400,softwareGrossCents:48400,dynoGrossCents:10000,totalCents:58400};
 const config={flow:'direct-v1',brand:'TLR SPORT',dyno:true,pricing,checkoutExpiresAt:Math.floor(Date.now()/1000)+3600};
 const future=await db.query("select ((current_date+8+((8-extract(isodow from current_date+8)::integer)%7))::text) as day");const day=future.rows[0].day;
 async function hold(start='08:00',end='10:30',mode='test',c=config){const id=randomUUID();await db.query('select public.fl_repro_hold($1,$2,$3,$4,$5,$6,($7::text)::timestamp at time zone \'Europe/Madrid\',($8::text)::timestamp at time zone \'Europe/Madrid\')',[id,randomUUID(),JSON.stringify(customer),JSON.stringify(vehicle),JSON.stringify(c),mode,day+' '+start,day+' '+end]);return id;}
 const first=await hold();assert.equal((await db.query('select * from public.fl_repro_busy($1,$2)',[day,'test'])).rows.length,1);
 await assert.rejects(()=>hold('08:30','11:00'),e=>e.code==='23P01');assert.equal((await db.query('select count(*)::int n from public.fl_quote_requests')).rows[0].n,1);
 await hold('10:30','13:00');await hold('08:00','10:30','live');
 await db.query('select public.fl_repro_begin_checkout($1)',[first]);await assert.rejects(()=>db.query('select public.fl_repro_transition($1,$2)',[first,'released']));
 await db.query('select public.fl_repro_end_checkout($1)',[first]);await db.query('select public.fl_repro_transition($1,$2)',[first,'released']);
 const replacement=await hold();await db.query('select public.fl_repro_transition($1,$2)',[replacement,'confirmed']);await db.query('select public.fl_repro_transition($1,$2)',[replacement,'released']);
 assert.equal((await db.query('select state from public.fl_repro_bookings where quote_id=$1',[replacement])).rows[0].state,'confirmed');
 await assert.rejects(()=>hold('12:00','14:30'));
 await assert.rejects(()=>hold('14:00','16:30','test',{...config,pricing:{...pricing,dynoGrossCents:5000,totalCents:53400}}));
 const perms=await db.query("select has_function_privilege('anon','public.fl_repro_hold(uuid,uuid,jsonb,jsonb,jsonb,text,timestamptz,timestamptz)','execute') as anon, has_function_privilege('service_role','public.fl_repro_hold(uuid,uuid,jsonb,jsonb,jsonb,text,timestamptz,timestamptz)','execute') as service");assert.deepEqual(perms.rows[0],{anon:false,service:true});
 await db.exec('set role anon');await assert.rejects(()=>db.query('select * from public.fl_repro_bookings'));await db.exec('reset role');
 console.log('PASS PostgreSQL: migration twice, atomic quote+hold rollback on collision, adjacent slots, test/live isolation, create/cancel race guard, confirmed booking retained, shift/price checks, anonymous access denied. Local test database only.');
}finally{await db.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
