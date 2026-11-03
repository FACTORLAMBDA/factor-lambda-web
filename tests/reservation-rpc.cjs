const assert=require('node:assert/strict');
const {rpc}=require('../lib/repro-reservations');
const originalFetch=global.fetch;
process.env.SUPABASE_URL='https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY='sb_secret_mock';
(async()=>{try{
  for(const status of [200,204]){
    global.fetch=async()=>({ok:true,status,text:async()=>'',json:async()=>{throw Error('Empty response');}});
    for(const name of ['fl_repro_begin_checkout','fl_repro_end_checkout','fl_repro_transition'])assert.equal(await rpc(name,{}),null);
  }
  global.fetch=async()=>({ok:true,status:200,text:async()=>'[{"starts_at":"example"}]'});
  assert.deepEqual(await rpc('fl_repro_busy',{}),[{starts_at:'example'}]);
  console.log('PASS RPC: empty 200/204 mutation responses and JSON data responses. No network calls.');
}finally{global.fetch=originalFetch;}})().catch(error=>{console.error(error);process.exitCode=1;});
