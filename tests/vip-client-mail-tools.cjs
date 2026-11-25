const assert=require('node:assert/strict');
Object.assign(process.env,{SUPABASE_URL:'https://project.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test',STRIPE_MODE:'test',VIP_IDENTITY_SECRET:'test-secret-at-least-32-characters',RESEND_API_KEY:'test',QUOTE_EMAIL_FROM:'VIP <vip@example.com>',QUOTE_ADMIN_PASSWORD:'test-admin'});
const identity=require('../lib/vip-identity'),id='12345678-1234-1234-1234-123456789abc';let p={id,name:'Cliente',email:'old@example.com',phone:'',code:'FL-ABC1234567'},authEmail=p.email,rate=true,authCalls=0;
const m={user_id:id,status:'active',plan:'elite',paid_until:'2030-01-01',risk:false};const mails=[];
class Query{constructor(table){this.table=table;}select(){return this;}eq(){return this;}update(v){if(this.table==='fl_vip_profiles')p={...p,...v};return this;}single(){return Promise.resolve({data:this.table==='fl_vip_profiles'?p:m});}maybeSingle(){return this.single();}then(resolve){resolve({data:null});}}
const db={from:t=>new Query(t),rpc:async()=>({data:rate}),auth:{admin:{getUserById:async()=>({data:{user:{email:authEmail}}}),updateUserById:async(_id,v)=>{authCalls++;authEmail=v.email;return {data:{user:{email:authEmail}}};}}}};
require.cache[require.resolve('@supabase/supabase-js')]={loaded:true,exports:{createClient:()=>db}};
global.fetch=async(_url,options)=>{mails.push(JSON.parse(options.body));return {ok:true};};const vip=require('../lib/vip-service');
(async()=>{const req={headers:{authorization:'Bearer test-admin'}},base={userId:id,confirmed:true},op=()=>({...base,action:'resend-welcome',operation:require('node:crypto').randomUUID()});
 await assert.rejects(()=>vip.adminAction(req,op()),/DNI/);assert.equal(mails.length,0);
 await assert.rejects(()=>vip.adminAction(req,{...base,action:'edit-client',name:'Cliente',email:'new@example.com',emailConfirm:'bad@example.com',expectedEmail:p.email}));assert.equal(authCalls,0);
 await vip.adminAction(req,{...base,action:'edit-client',name:'Cliente nuevo',phone:'123',email:'new@example.com',emailConfirm:'new@example.com',expectedEmail:p.email,dni:'12345678Z'});
 assert.equal(authEmail,'new@example.com');assert.equal(p.email,authEmail);assert.equal(p.phone,'123');assert.equal(identity.reveal(p),'12345678Z');assert.equal(mails[0].to[0],'old@example.com');
 await vip.adminAction(req,op());assert.equal(mails.at(-1).to[0],'new@example.com');assert.equal(mails.at(-1).attachments[0].filename,'FL-VIP.pdf');assert.match(mails.at(-1).text,/Deberás presentar este carnet/);assert.match(mails.at(-1).html,/Deberás presentar este carnet/);
 const count=mails.length;rate=false;await assert.rejects(()=>vip.adminAction(req,op()),/minuto/);assert.equal(mails.length,count);
 m.status='inactive';await assert.rejects(()=>vip.adminAction(req,op()),/vigente/);
 await assert.rejects(()=>vip.adminAction({headers:{}},op()),/autorizado/);
 console.log('PASS admin email/access synchronization, validated DNI, card send guard, welcome resend, presentation notice, rate limit and authorization; mocked only');
})().catch(e=>{console.error(e);process.exitCode=1;});
