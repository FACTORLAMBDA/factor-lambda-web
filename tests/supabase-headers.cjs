const assert=require('node:assert/strict');const {databaseHeaders}=require('../lib/supabase-headers');
assert.deepEqual(databaseHeaders('sb_secret_mock'),{apikey:'sb_secret_mock'});
assert.deepEqual(databaseHeaders('eyJ.mock.legacy'),{apikey:'eyJ.mock.legacy',Authorization:'Bearer eyJ.mock.legacy'});
assert.throws(()=>databaseHeaders('sb_publishable_mock'));assert.throws(()=>databaseHeaders(''));assert.throws(()=>databaseHeaders(undefined));
console.log('PASS Supabase: modern secret uses apikey only, legacy JWT bearer compatibility, public/empty keys rejected. No real keys or network requests.');
