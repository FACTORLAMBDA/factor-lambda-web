const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{randomUUID}=require('node:crypto');
const pkg=path.join(__dirname,'../work/pglite/package'),{PGlite}=require(path.join(pkg,'dist/index.cjs')),{btree_gist}=require(path.join(pkg,'dist/contrib/btree_gist.cjs'));
(async()=>{const db=new PGlite({extensions:{btree_gist}});try{
 await db.exec('create schema extensions;create role anon;create role authenticated;create role service_role;');
 for(const file of ['repro-quotes','direct-repro-bookings','admin-booking-actions','consultation-bookings','private-calendar','repro-keyword-blocks','calendar-closures','calendar-closures'])await db.exec(fs.readFileSync('database/'+file+'.sql','utf8'));
 const start='2028-01-06T00:00:00+01:00',end='2028-01-07T00:00:00+01:00';
 const result=(await db.query('select fl_calendar_closure_save(null,$1,$2,$3,$4) as result',['Festivo','Cerrado',start,end])).rows[0].result;
 for(const fn of ["fl_repro_busy('2028-01-06','live')","fl_consult_busy('2028-01-06','german','live')","fl_consult_busy('2028-01-06','joaquin','test')"])assert.equal((await db.query('select * from '+fn)).rows.length,1);
 assert.equal((await db.query("select * from fl_repro_busy('2028-01-07','live')")).rows.length,0);
 const id=randomUUID();await db.query('insert into fl_quote_requests(id,customer,vehicle,config,stripe_mode) values($1,$2,$3,$4,$5)',[id,{}, {},{flow:'direct-v1'},'live']);
 await assert.rejects(()=>db.query("insert into fl_repro_bookings(quote_id,stripe_mode,starts_at,ends_at,state,resource) values($1,'live',$2,$3,'held','repro')",[id,'2028-01-06T09:00:00+01:00','2028-01-06T10:00:00+01:00']),e=>e.code==='23P01');
 await db.query('select fl_calendar_closure_delete($1)',[result.id]);
 assert.equal((await db.query("select * from fl_repro_busy('2028-01-06','live')")).rows.length,0);
 await db.exec('set role anon');await assert.rejects(()=>db.query('select * from fl_calendar_closures'));await db.exec('reset role');
 console.log('PASS closures: repeat migration, all public resources, boundaries, checkout guard, removal and private access.');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
