const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const pkg=path.join(__dirname,'../work/pglite/package'),{PGlite}=require(path.join(pkg,'dist/index.cjs')),{btree_gist}=require(path.join(pkg,'dist/contrib/btree_gist.cjs'));
const {appointment}=require('../lib/admin-calendar');
(async()=>{const db=new PGlite({extensions:{btree_gist}});try{
 await db.exec('create schema extensions;create role anon;create role authenticated;create role service_role;');
 for(const file of ['repro-quotes','direct-repro-bookings','admin-booking-actions','consultation-bookings','private-calendar','calendar-closures','mechanics-calendar','mechanics-calendar'])await db.exec(fs.readFileSync('database/'+file+'.sql','utf8'));
 const a=appointment('2028-01-03T09:00','2028-01-03T10:00');
 async function save(resource){return db.query('select fl_private_calendar_save(null,null,$1,$2,$3,$4,$5,$6,$7,$8,$9)',[a,'Mantenimiento',{name:'Test'},'Audi','',resource,'test','Alta manual','taller']);}
 await save('mechanics');await save('mechanics');await save('mechanics');
 await save('consult-german');await assert.rejects(()=>save('consult-german'),e=>e.code==='23P01');
 await save('consult-joaquin');await assert.rejects(()=>save('consult-joaquin'),e=>e.code==='23P01');
 console.log('PASS parallel mechanics appointments, idempotent migration, German/Joaquin capacity retained.');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
