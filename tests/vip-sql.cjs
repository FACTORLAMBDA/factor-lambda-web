const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PGlite}=require(path.resolve('work/pglite/package/dist/index.cjs'));
(async()=>{const db=new PGlite();try{
 await db.exec('create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;create role service_role;');
 const sql=fs.readFileSync('database/vip-memberships.sql','utf8');await db.exec(sql);await db.exec(sql);
 const sponsor=randomUUID(),friend=randomUUID();for(const id of [sponsor,friend]){await db.query('insert into auth.users values($1)',[id]);await db.query('insert into fl_vip_profiles(id,email,name) values($1,$2,$3)',[id,id+'@example.com','Prueba']);}
 await db.query('update fl_vip_profiles set referrer_id=$1 where id=$2',[sponsor,friend]);
 for(const id of [sponsor,friend]){const claim=(await db.query("select fl_vip_checkout_claim($1,'test','elite','monthly') as m",[id])).rows[0].m;assert.ok(claim.checkout_attempt);const repeated=(await db.query("select fl_vip_checkout_claim($1,'test','elite','monthly') as m",[id])).rows[0].m;assert.equal(claim.checkout_attempt,repeated.checkout_attempt);await db.query("update fl_vip_memberships set subscription_id=$2,status='active' where user_id=$1",[id,'sub_'+id]);await db.query("select fl_vip_paid($1,$2,'test',$3,1420,now()+interval '30 days')",['in_'+id,id,'sub_'+id]);await db.query("select fl_vip_paid($1,$2,'test',$3,1420,now()+interval '30 days')",['in_'+id,id,'sub_'+id]);}
 assert.equal(Number((await db.query('select sum(delta) balance from fl_vip_points where user_id=$1',[sponsor])).rows[0].balance),3);
 await assert.rejects(()=>db.query("select fl_vip_checkout_claim($1,'test','elite','monthly')",[sponsor]));
 await db.query("select fl_vip_redeem($1,'test',2,'FAC-1')",[sponsor]);await assert.rejects(()=>db.query("select fl_vip_redeem($1,'test',2,'FAC-2')",[sponsor]));
 await db.query("select fl_vip_claim($1,'test','inspection','Primera inspección')",[sponsor]);await assert.rejects(()=>db.query("select fl_vip_claim($1,'test','inspection','Duplicada')",[sponsor]));
 await db.query('select fl_vip_revoke_invoice($1)',['in_'+friend]);await db.query('select fl_vip_revoke_invoice($1)',['in_'+friend]);assert.equal(Number((await db.query('select sum(delta) balance from fl_vip_points where user_id=$1',[sponsor])).rows[0].balance),0);
 await db.exec('set role anon');await assert.rejects(()=>db.query('select * from fl_vip_profiles'));await assert.rejects(()=>db.query("select fl_vip_redeem($1,'test',1,'attack')",[sponsor]));await db.exec('reset role');
 console.log('PASS VIP SQL migration, duplicate payment safety, 2 welcome points, 1 paid referral, checkout guard, redemption balance, annual inspection uniqueness, refund reversal and private access.');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
