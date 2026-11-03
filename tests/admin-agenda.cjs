const assert=require('node:assert/strict');
const service=require('../lib/quote-service');
const original=global.fetch;
process.env.QUOTE_ADMIN_PASSWORD='test-private';process.env.SUPABASE_URL='https://mock.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='sb_secret_mock';
(async()=>{try{
  let requests=0;
  global.fetch=async url=>{requests++;const parsed=new URL(url);assert.deepEqual(parsed.searchParams.getAll('config->appointment->>day'),['gte.2026-11-02','lte.2026-11-08']);assert.ok(parsed.searchParams.get('select').includes('fl_repro_bookings(state)'));assert.ok(!parsed.searchParams.get('select').includes('version'));return {ok:true,status:200,json:async()=>[]};};
  await assert.rejects(()=>service.listAgenda({headers:{}},'2026-11-02','2026-11-08'),/autorizado/);assert.equal(requests,0);
  const req={headers:{authorization:'Bearer test-private'}};
  await assert.rejects(()=>service.listAgenda(req,'2026-02-30','2026-03-01'),/válido/);
  await assert.rejects(()=>service.listAgenda(req,'2026-01-01','2026-12-31'),/válido/);
  assert.deepEqual(await service.listAgenda(req,'2026-11-02','2026-11-08'),[]);assert.equal(requests,1);
  console.log('PASS private agenda authentication, bounded date range, database booking state and no signing tokens.');
}finally{global.fetch=original;}})().catch(e=>{console.error(e);process.exitCode=1;});
